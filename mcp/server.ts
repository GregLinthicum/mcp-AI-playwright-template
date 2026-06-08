import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { CallToolRequestSchema, ListToolsRequestSchema } from "@modelcontextprotocol/sdk/types.js";
import { chromium } from "playwright";
import { z } from "zod";

// Define schemas
const GetPageTitleSchema = z.object({
  url: z.string().url().describe("URL of the page to get the title from"),
});

const SearchPageContentSchema = z.object({
  url: z.string().url().describe("URL of the page to search"),
  searchString: z.string().describe("Text string to search for on the page"),
});

type GetPageTitleInput = z.infer<typeof GetPageTitleSchema>;
type SearchPageContentInput = z.infer<typeof SearchPageContentSchema>;

// Create MCP server
const server = new Server(
  {
    name: "playwright-mcp-server",
    version: "1.0.0",
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

// Handle tool listing
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: "get_page_title",
        description: "Get the title of a web page from a given URL",
        inputSchema: {
          type: "object",
          properties: {
            url: {
              type: "string",
              description: "URL of the page to get the title from",
            },
          },
          required: ["url"],
        },
      },
      {
        name: "search_page_content",
        description: "Search for a specific text string on a web page",
        inputSchema: {
          type: "object",
          properties: {
            url: {
              type: "string",
              description: "URL of the page to search",
            },
            searchString: {
              type: "string",
              description: "Text string to search for on the page",
            },
          },
          required: ["url", "searchString"],
        },
      },
    ],
  };
});

// Handle tool execution
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  if (request.params.name === "get_page_title") {
    try {
      // Validate input
      const input = GetPageTitleSchema.parse(request.params.arguments);

      // Launch browser and get page title
      const browser = await chromium.launch({ headless: true });
      const page = await browser.newPage();
      await page.goto(input.url, { waitUntil: "networkidle" });
      const title = await page.title();
      await browser.close();

      return {
        content: [
          {
            type: "text",
            text: `Page title: ${title}`,
          },
        ],
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      return {
        content: [
          {
            type: "text",
            text: `Error getting page title: ${errorMessage}`,
            isError: true,
          },
        ],
      };
    }
  }

  if (request.params.name === "search_page_content") {
    try {
      // Validate input
      const input = SearchPageContentSchema.parse(request.params.arguments);

      // Launch browser and search for content
      const browser = await chromium.launch({ headless: true });
      const page = await browser.newPage();
      await page.goto(input.url, { waitUntil: "networkidle" });
      
      // Get page content
      const pageContent = await page.content();
      const pageText = await page.innerText('body');
      
      // Search for the string (case-insensitive)
      const found = pageContent.includes(input.searchString) || 
                    pageText.includes(input.searchString);
      
      await browser.close();

      const result = found 
        ? `✓ Found: "${input.searchString}" on ${input.url}`
        : `✗ Not found: "${input.searchString}" on ${input.url}`;

      return {
        content: [
          {
            type: "text",
            text: result,
          },
        ],
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      return {
        content: [
          {
            type: "text",
            text: `Error searching page content: ${errorMessage}`,
            isError: true,
          },
        ],
      };
    }
  }

  return {
    content: [
      {
        type: "text",
        text: `Unknown tool: ${request.params.name}`,
        isError: true,
      },
    ],
  };
});

// Start server using stdio transport
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("Playwright MCP server started on stdio");
}

main().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});
