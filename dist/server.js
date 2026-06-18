import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { CallToolRequestSchema, ListToolsRequestSchema } from "@modelcontextprotocol/sdk/types.js";
import { z } from "zod";
import { chromium } from "playwright";
console.error("############################################");
console.error("### CUSTOM SERVER BUILD 2026-06-12 ########");
console.error("############################################");
// Global state for browser/page management
let globalBrowser = null;
let globalPage = null;
// Timing tracking
let lastToolCallTime = Date.now();
// Zod Schemas
const PageGotoSchema = z.object({
    url: z.string().url().describe("URL to navigate to"),
});
const SearchTextSchema = z.object({
    text: z.string().describe("Text to search for on the current page"),
});
const GetPageTitleSchema = z.object({
    url: z.string().url().describe("URL of the page to get the title from"),
});
const SearchPageContentSchema = z.object({
    url: z.string().url().describe("URL of the page to search"),
    searchString: z.string().describe("Text string to search for on the page"),
});
const ClickElementSchema = z.object({
    selector: z.string().describe("CSS selector or XPath of element to click"),
});
const GetPageTextSchema = z.object({
    selector: z.string().optional().describe("Optional CSS selector to get text from specific element"),
});
// Helper: Ensure browser is open
async function ensureBrowser() {
    if (!globalBrowser) {
        console.error("[Browser] Launching bundled chromium");
        globalBrowser = await chromium.launch({
            headless: false,
            args: [
                "--disable-blink-features=AutomationControlled"
            ],
        });
        console.error("[Browser] Browser launched");
    }
    return globalBrowser;
}
// Helper: Ensure page is open
async function ensurePage() {
    const browser = await ensureBrowser();
    if (!globalPage) {
        console.error("[Page] Creating new page");
        globalPage = await browser.newPage();
        console.error("[Page] Page created");
    }
    return globalPage;
}
// MCP Server
const server = new Server({
    name: "playwright-mcp-server",
    version: "2.0.0",
}, {
    capabilities: {
        tools: {},
    },
});
// Tool Listing
server.setRequestHandler(ListToolsRequestSchema, async () => {
    console.error("[ListTools] Handler invoked");
    const toolList = [
        {
            name: "page_goto",
            description: "Navigate to a URL in the browser",
            inputSchema: {
                type: "object",
                properties: {
                    url: { type: "string", description: "URL to navigate to" },
                },
                required: ["url"],
            },
        },
        {
            name: "search_text",
            description: "Search for text on the current page and return if found",
            inputSchema: {
                type: "object",
                properties: {
                    text: { type: "string", description: "Text to search for" },
                },
                required: ["text"],
            },
        },
        {
            name: "get_page_text",
            description: "Get all text from the current page or from a specific element",
            inputSchema: {
                type: "object",
                properties: {
                    selector: { type: "string", description: "Optional CSS selector to get text from specific element" },
                },
                required: [],
            },
        },
        {
            name: "get_page_title",
            description: "Get the title of a web page from a given URL",
            inputSchema: {
                type: "object",
                properties: {
                    url: { type: "string", description: "URL of the page" },
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
                    url: { type: "string", description: "URL of the page to search" },
                    searchString: { type: "string", description: "Text to search for" },
                },
                required: ["url", "searchString"],
            },
        },
        {
            name: "click_element",
            description: "Click an element on the current page",
            inputSchema: {
                type: "object",
                properties: {
                    selector: { type: "string", description: "CSS selector or XPath of element to click" },
                },
                required: ["selector"],
            },
        },
        {
            name: "close_browser",
            description: "Close the browser and clean up resources",
            inputSchema: {
                type: "object",
                properties: {},
                required: [],
            },
        },
    ];
    console.error(`[ListTools] Returning ${toolList.length} tools`);
    return { tools: toolList };
});
// Tool Execution
server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const toolStartTime = Date.now();
    const timeSinceLastCall = toolStartTime - lastToolCallTime;
    const toolName = request.params.name;
    console.error(`[TOOL START] ${toolName} | +${timeSinceLastCall}ms since TOOL last call`);
    console.error("[CallTool] Handler invoked");
    console.error("[CallTool] Tool called:", request.params.name);
    console.error("[CallTool] Arguments:", JSON.stringify(request.params.arguments, null, 2));
    console.error("=================================");
    console.error("TOOL RECEIVED:", request.params.name);
    console.error("ARGS:", JSON.stringify(request.params.arguments));
    console.error("=================================");
    const tool = request.params.name;
    // page_goto
    if (tool === "page_goto") {
        console.error("[page_goto] Tool handler starting");
        try {
            const input = PageGotoSchema.parse(request.params.arguments);
            console.error("[page_goto] Input parsed, URL:", input.url);
            console.error("[page_goto] About to call ensurePage()");
            const page = await ensurePage();
            console.error("[page_goto] ensurePage() completed");
            console.error("[page_goto] Navigating to:", input.url);
            await page.goto(input.url, { waitUntil: "domcontentloaded", timeout: 30000 });
            console.error("[page_goto] Navigation complete");
            lastToolCallTime = Date.now();
            return {
                content: [{ type: "text", text: `Navigated to ${input.url}` }],
            };
        }
        catch (error) {
            console.error("[page_goto] ERROR:", error);
            lastToolCallTime = Date.now();
            return {
                content: [
                    {
                        type: "text",
                        text: `Error navigating to page: ${error}`,
                        isError: true,
                    },
                ],
            };
        }
    }
    // search_text
    if (tool === "search_text") {
        console.error("[search_text] Tool handler starting");
        try {
            const input = SearchTextSchema.parse(request.params.arguments);
            console.error("[search_text] Searching for:", input.text);
            const page = await ensurePage();
            console.error("[search_text] Extracting page text");
            const pageText = await page.innerText("body");
            const found = pageText.toLowerCase().includes(input.text.toLowerCase());
            console.error("[search_text] Search result:", found ? "FOUND" : "NOT FOUND");
            lastToolCallTime = Date.now();
            return {
                content: [
                    {
                        type: "text",
                        text: found ? `Found "${input.text}" on page` : `"${input.text}" not found on page`,
                    },
                ],
            };
        }
        catch (error) {
            console.error("[search_text] ERROR:", error);
            lastToolCallTime = Date.now();
            return {
                content: [
                    {
                        type: "text",
                        text: `Error searching text: ${error}`,
                        isError: true,
                    },
                ],
            };
        }
    }
    // get_page_text
    if (tool === "get_page_text") {
        console.error("[get_page_text] Tool handler starting");
        try {
            const input = GetPageTextSchema.parse(request.params.arguments);
            const page = await ensurePage();
            console.error("[get_page_text] Extracting text");
            let text;
            if (input.selector) {
                console.error("[get_page_text] From selector:", input.selector);
                text = await page.innerText(input.selector);
            }
            else {
                console.error("[get_page_text] From entire body");
                text = await page.innerText("body");
            }
            console.error("[get_page_text] Text extracted, length:", text.length);
            lastToolCallTime = Date.now();
            return {
                content: [{ type: "text", text: text.substring(0, 5000) }],
            };
        }
        catch (error) {
            console.error("[get_page_text] ERROR:", error);
            lastToolCallTime = Date.now();
            return {
                content: [
                    {
                        type: "text",
                        text: `Error getting page text: ${error}`,
                        isError: true,
                    },
                ],
            };
        }
    }
    // click_element
    if (tool === "click_element") {
        console.error("[click_element] Tool handler starting");
        try {
            const input = ClickElementSchema.parse(request.params.arguments);
            console.error("[click_element] Selector:", input.selector);
            const page = await ensurePage();
            console.error("[click_element] Clicking element");
            await page.click(input.selector);
            console.error("[click_element] Element clicked");
            lastToolCallTime = Date.now();
            return {
                content: [{ type: "text", text: `Clicked element: ${input.selector}` }],
            };
        }
        catch (error) {
            console.error("[click_element] ERROR:", error);
            lastToolCallTime = Date.now();
            return {
                content: [
                    {
                        type: "text",
                        text: `Error clicking element: ${error}`,
                        isError: true,
                    },
                ],
            };
        }
    }
    // get_page_title
    if (tool === "get_page_title") {
        console.error("[get_page_title] Tool handler starting");
        try {
            const input = GetPageTitleSchema.parse(request.params.arguments);
            console.error("[get_page_title] URL:", input.url);
            console.error("[get_page_title] Launching browser");
            const browser = await chromium.launch({
                headless: false,
                args: [
                    "--disable-blink-features=AutomationControlled",
                    "--start-maximized",
                    "--window-size=1920,1080"
                ],
            });
            console.error("[get_page_title] Browser launched");
            console.error("[get_page_title] Creating page");
            const page = await browser.newPage();
            console.error("[get_page_title] Page created");
            console.error("[get_page_title] Navigating");
            await page.goto(input.url, { waitUntil: "domcontentloaded", timeout: 30000 });
            console.error("[get_page_title] Navigation complete");
            const title = await page.title();
            console.error("[get_page_title] Title:", title);
            await browser.close();
            console.error("[get_page_title] Browser closed");
            lastToolCallTime = Date.now();
            return {
                content: [{ type: "text", text: `Page title: ${title}` }],
            };
        }
        catch (error) {
            console.error("[get_page_title] ERROR:", error);
            lastToolCallTime = Date.now();
            return {
                content: [
                    {
                        type: "text",
                        text: `Error getting page title: ${error}`,
                        isError: true,
                    },
                ],
            };
        }
    }
    // search_page_content
    if (tool === "search_page_content") {
        console.error("[search_page_content] Tool handler starting");
        try {
            const input = SearchPageContentSchema.parse(request.params.arguments);
            console.error("[search_page_content] URL:", input.url);
            console.error("[search_page_content] Search string:", input.searchString);
            console.error("[search_page_content] Launching browser");
            const browser = await chromium.launch({
                headless: false,
                args: [
                    "--disable-blink-features=AutomationControlled",
                    "--start-maximized",
                    "--window-size=1920,1080"
                ],
            });
            console.error("[search_page_content] Browser launched");
            console.error("[search_page_content] Creating page");
            const page = await browser.newPage();
            console.error("[search_page_content] Page created");
            console.error("[search_page_content] Navigating");
            await page.goto(input.url, { waitUntil: "domcontentloaded", timeout: 30000 });
            console.error("[search_page_content] Navigation complete");
            console.error("[search_page_content] Extracting text");
            const pageText = await page.innerText("body");
            const found = pageText.toLowerCase().includes(input.searchString.toLowerCase());
            console.error("[search_page_content] Search result:", found ? "FOUND" : "NOT FOUND");
            await browser.close();
            console.error("[search_page_content] Browser closed");
            lastToolCallTime = Date.now();
            return {
                content: [
                    {
                        type: "text",
                        text: found
                            ? `Found "${input.searchString}" on ${input.url}`
                            : `Not found "${input.searchString}" on ${input.url}`,
                    },
                ],
            };
        }
        catch (error) {
            console.error("[search_page_content] ERROR:", error);
            lastToolCallTime = Date.now();
            return {
                content: [
                    {
                        type: "text",
                        text: `Error searching page content: ${error}`,
                        isError: true,
                    },
                ],
            };
        }
    }
    // close_browser
    if (tool === "close_browser") {
        console.error("[close_browser] Closing browser");
        try {
            if (globalPage) {
                await globalPage.close();
                globalPage = null;
                console.error("[close_browser] Page closed");
            }
            if (globalBrowser) {
                await globalBrowser.close();
                globalBrowser = null;
                console.error("[close_browser] Browser closed");
            }
            lastToolCallTime = Date.now();
            return {
                content: [{ type: "text", text: "Browser closed" }],
            };
        }
        catch (error) {
            console.error("[close_browser] ERROR:", error);
            lastToolCallTime = Date.now();
            return {
                content: [
                    {
                        type: "text",
                        text: `Error closing browser: ${error}`,
                        isError: true,
                    },
                ],
            };
        }
    }
    // Unknown tool
    console.error("[CallTool] Unknown tool:", tool);
    lastToolCallTime = Date.now();
    return {
        content: [
            {
                type: "text",
                text: `Unknown tool: ${tool}`,
                isError: true,
            },
        ],
    };
});
// Start Server
async function main() {
    console.error("[main] Server initialization starting");
    console.error("[main] Creating StdioServerTransport");
    const transport = new StdioServerTransport();
    console.error("[main] Connecting server to transport");
    process.stdin.on("data", chunk => {
        console.error("[STDIN]", chunk.toString());
    });
    await server.connect(transport);
    console.error("[main] ========================================");
    console.error("[main] Playwright MCP server started on stdio");
    console.error("[main] Mode: headed (disabled automation control)");
    console.error("[main] Ready to receive tool calls");
    console.error("[main] ========================================");
}
main().catch((error) => {
    console.error("[main] Fatal error during initialization:", error);
    if (error instanceof Error) {
        console.error("[main] Error message:", error.message);
        console.error("[main] Stack trace:", error.stack);
    }
    process.exit(1);
});
