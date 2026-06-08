// test-casesPwR.js
import fs from "fs";
import path from "path";
import axios from "axios";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";

// --- LOAD ALL TEST CASES FROM tests/cases ---
const casesDir = path.join(process.cwd(), "tests", "cases");
const testCases = fs.readdirSync(casesDir)
  .filter(f => f.endsWith(".json"))
  .map(f => JSON.parse(fs.readFileSync(path.join(casesDir, f), "utf8")));

// --- CONNECT TO PLAYWRIGHT MCP SERVER ---
const transport = new StdioClientTransport({
  command: "C:\\MCP_BDC\\mcpServer-Playwright-template\\tools\\Node20\\node.exe",
  args: ["C:\\MCP_BDC\\mcpServer-Playwright-template\\dist\\server.js"],
});

const mcp = new Client(
  { name: "test-runner", version: "1.0.0" },
  transport
);

// --- OLLAMA CALL ---
async function callOllama(prompt) {
  try {
    const response = await axios.post("http://localhost:11434/api/generate", {
      model: "phi3",
      prompt: prompt,
      stream: false,
      options: { temperature: 0.1 }
    });
    return response.data.response.trim();
  } catch (err) {
    return "Ollama error - is Ollama running?";
  }
}

// --- TOOL CALL EXTRACTION ---
function extractToolCall(text) {
  try {
    const start = text.indexOf("{");
    const end = text.lastIndexOf("}");
    if (start === -1 || end === -1) return null;
    return JSON.parse(text.slice(start, end + 1));
  } catch {
    return null;
  }
}

// --- RUN A SINGLE TEST ---
async function runTest(test) {
  console.log(`\n=== Test ${test.id}: ${test.description} ===`);
  console.log(`Question: ${test.question}`);

  let conversation = `You are a browser automation agent. You MUST use tools to answer questions.

Rules:
1. First, call the tool openPage with url = "https://www.google.com"
2. Then use fill or type to enter the search query.
3. Submit the search.
4. Extract the relevant answer from the page.

Question: ${test.question}`;

  for (let step = 0; step < 12; step++) {
    const reply = await callOllama(conversation);
    console.log(`\nPhi3 [${step}]: ${reply.substring(0, 250)}...`);

    const toolCall = extractToolCall(reply);
    if (!toolCall) {
      const passed = evaluate(test, reply);
      console.log(`\nFINAL ANSWER: ${reply}`);
      console.log(`Result: ${passed ? "✅ PASS" : "❌ FAIL"}`);
      return;
    }

    console.log(`→ Calling tool: ${toolCall.tool}`);
    try {
      const result = await mcp.callTool(toolCall.tool, toolCall.args || {});
      console.log("✅ Tool executed successfully");
      conversation += `\nTool result: ${JSON.stringify(result, null, 2)}\nContinue.`;
    } catch (err) {
      console.log(`Tool error: ${err.message}`);
      conversation += `\nTool failed. Try different tool.`;
    }
  }
  console.log("Test timed out");
}

// --- EVALUATE TEST RESULT ---
function evaluate(test, answer) {
  if (test.expected.startsWith("contains:")) {
    const keyword = test.expected.replace("contains:", "").trim().toLowerCase();
    return answer.toLowerCase().includes(keyword);
  }

  if (test.expected.startsWith("regex:")) {
    const pattern = test.expected.replace("regex:", "").trim();
    return new RegExp(pattern, "i").test(answer);
  }

  return false;
}

// --- MAIN ---
async function main() {
  console.log("🚀 Starting automated tests with Google + Playwright + Phi3...\n");

  try {
    await mcp.connect();
    console.log("✅ MCP + Playwright connected successfully!\n");

    const toolsResponse = await mcp.listTools();
    const tools = toolsResponse?.tools || toolsResponse || [];
    console.log("Available tools:", tools.map ? tools.map(t => t.name).join(", ") : "Unknown");
  } catch (err) {
    console.error("❌ Failed to connect or list tools:", err.message);
  }

  for (const test of testCases) {
    await runTest(test);
  }

  console.log("\nAll tests finished.");
  process.exit(0);
}

main().catch(err => {
  console.error("Fatal error:", err.message);
  process.exit(1);
});
