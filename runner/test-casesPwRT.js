// runner/test-casesPwRT.js
import fs from "fs";
import path from "path";
import axios from "axios";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";

// --- LOAD JSON TEST CASES FROM tests/cases ---
const casesDir = path.join(process.cwd(), "tests", "cases");
const testCases = fs.readdirSync(casesDir)
  .filter(f => f.endsWith(".json"))
  .map(f => JSON.parse(fs.readFileSync(path.join(casesDir, f), "utf8")));

// --- CONNECT TO PLAYWRIGHT MCP SERVER ---
const transport = new StdioClientTransport({
  command: "C:\\MCP_BDC\\mcpServer-Playwright-template\\tools\\Node20\\node.exe",
  args: ["C:\\MCP_BDC\\mcpServer-Playwright-template\\dist\\server.js"],
});

// same pattern as your original: pass transport to connect()
const mcp = new Client({ name: "bdc-test-agent", version: "1.0.0" });

// --- OLLAMA CALL (Phi‑3) ---
async function callOllama(prompt) {
  const response = await axios.post("http://localhost:11434/api/generate", {
    model: "phi3",
    prompt: prompt,
    stream: false
  });
  return response.data.response.trim();
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

// --- EVALUATE EXPECTATION FROM JSON ---
function evaluateExpected(test, answer) {
  const spec = (test.expected || "").trim();

  if (spec.toLowerCase().startsWith("contains:")) {
    const keyword = spec.slice("contains:".length).trim().toLowerCase();
    return answer.toLowerCase().includes(keyword);
  }

  if (spec.toLowerCase().startsWith("regex:")) {
    const pattern = spec.slice("regex:".length).trim();
    return new RegExp(pattern, "i").test(answer);
  }

  // fallback: always fail if spec is unknown
  return false;
}

// --- RUN SINGLE TEST ---
async function runTest(test) {
  console.log(`\n🔍 Running Test ${test.id}: ${test.description}`);
  console.log(`Question: ${test.question}`);

  const systemPrompt = `You are a precise Google Search Agent.
Use Playwright tools to search Google and answer the question concisely in 1-2 sentences.
Do not add extra explanations.

User question: ${test.question}`;

  let conversation = systemPrompt;

  // Let the agent do Google search + reasoning
  for (let i = 0; i < 8; i++) {   // max 8 tool steps
    const reply = await callOllama(conversation);
    console.log(`   Phi3: ${reply}`);

    const toolCall = extractToolCall(reply);
    if (!toolCall) {
      // Final answer found
      const passed = evaluateExpected(test, reply);
      console.log(`\n✅ FINAL ANSWER: ${reply}`);
      console.log(`Result: ${passed ? "PASS" : "FAIL"}\n`);
      return { test, answer: reply, passed };
    }

    try {
      const result = await mcp.callTool(toolCall.tool, toolCall.args || {});
      conversation += `\nTool result: ${JSON.stringify(result)}\nContinue.`;
    } catch (e) {
      console.log(`   Tool error: ${e.message}`);
      conversation += `\nTool error. Continue.`;
    }
  }

  console.log("⚠️  Test timed out");
  return { test, answer: "Timeout", passed: false };
}

// --- RUN ALL TESTS ---
async function runAllTests() {
  console.log("🚀 Starting BDC Business Test Suite with Google + Phi3 + Playwright (JSON-driven)\n");

  await mcp.connect(transport);
  console.log("✅ Connected to MCP + Playwright\n");

  const results = [];
  for (const test of testCases) {
    const result = await runTest(test);
    results.push(result);
  }

  // Summary
  console.log("\n" + "=".repeat(60));
  console.log("📊 TEST SUMMARY");
  console.log("=".repeat(60));
  results.forEach(r => {
    console.log(`Test ${r.test.id}: ${r.passed ? "✅ PASS" : "❌ FAIL"} - ${r.test.description}`);
  });

  process.exit(0);
}

// --- START ---
runAllTests().catch(err => {
  console.error("Fatal error:", err);
  process.exit(1);
});
