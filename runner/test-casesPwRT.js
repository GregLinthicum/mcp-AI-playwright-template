// runner/test-casesPwRT.js
import fs from "fs";
import path from "path";
import axios from "axios";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import { CONFIG } from "../prompts/config.js";

// Timing tracking
let lastAICallTime = Date.now();
const testStartTime = Date.now();
let testNum = 1;

// --- LOAD JSON TEST CASES FROM tests/cases ---
const casesDir = path.join(process.cwd(), "tests", "cases");
const testCases = fs.readdirSync(casesDir)
  .filter(f => f.endsWith(".json"))
  .map(f => JSON.parse(fs.readFileSync(path.join(casesDir, f), "utf8")));

// --- CONNECT TO PLAYWRIGHT MCP SERVER ---
const transport = new StdioClientTransport({
  command: "node",
  args: ["./dist/server.js"],
});

const mcp = new Client({ name: "bdc-test-agent", version: "1.0.0" });

// --- OLLAMA CALL (Phi‑3) ---
async function callOllama(prompt) {
  const aiStartTime = Date.now();
  const timeSinceLastAI = aiStartTime - lastAICallTime;
  console.log(`[AI CALL START] ollama/phi3 | +${timeSinceLastAI}ms since last AI call`);
  console.log(`[AI CALL START] ollama/phi3 PROMPT:: + "${prompt}"`);
  const response = await axios.post("http://localhost:11434/api/generate", {
    model: "phi3",
    prompt: prompt,
    stream: false
  });
  lastAICallTime = Date.now();
  console.log(`\n\n[AI CALL END] ollama/phi3 RESPONSE:: +"${response.data.response.trim()}" \n\n`);
  return response.data.response.trim();
}

// --- TOOL CALL EXTRACTION ---
function extractToolCall(text) {
  try {
    const start = text.indexOf("{");
    if (start === -1) return null;

    let braceCount = 0;
    let end = start;

    for (let i = start; i < text.length; i++) {
      if (text[i] === "{") braceCount++;
      if (text[i] === "}") braceCount--;
      if (braceCount === 0) {
        end = i;
        break;
      }
    }

    if (braceCount !== 0) return null;

    const parsed = JSON.parse(text.slice(start, end + 1));

    if (!parsed.tool || typeof parsed.tool !== "string") return null;
    if (!parsed.args || typeof parsed.args !== "object") parsed.args = {};

    return parsed;
  } catch {
    return null;
  }
}

// --- EVALUATE EXPECTATION ---
function evaluateExpected(test, answer) {
  console.log(`::::::::: evaluateExpected(test, answer) :::::::`);

  const spec = (test.expected || "").trim();
  const lower = answer.toLowerCase();

  if (test.expectation === "should-contain") {
	console.log(`\n Entered IF test.expectation === SHOULD ${answer}`);
    return lower.includes("found") && !lower.includes("not found");
  }

  if (test.expectation === "should-not-contain") {
	  console.log(`\n Entered IF test.expectation === SHOULD NOT ${answer}`);
    return lower.includes("not found");
  }

  if (spec.toLowerCase().startsWith("regex:")) {
	  console.log(`\n Entered IF test.expectation <<<--  REGEX  ${answer}`);
      const pattern = spec.slice("regex:".length).trim();
    return new RegExp(pattern, "i").test(answer);
  }
  console.log(`\n Entered NEITHER IF NOR~IF NOR REGEX  test.expectation === SHOULD ${answer}`);
  return false;
}

// --- RUN SINGLE TEST ---
async function runTest(test) {
  console.log(`\n Running Test ${test.id}: ${test.description}`);
  console.log(`Question: ${test.question}`);

  const baseUrl = test.baseUrl || CONFIG.BASE_URL;
  const systemPrompt = CONFIG.SYSTEM_PROMPT;

  let conversation = systemPrompt + `

TARGET URL FOR THIS TEST: ${baseUrl}

User question: ${test.question}`;

  for (let i = 0; i < 8; i++) {
    const reply = await callOllama(conversation);
    console.log(` _>>>   Phi3 raw: ${reply}`);

    let toolCall = extractToolCall(reply);

    if (!toolCall) {
      console.log("   ❌ Invalid JSON tool call. Retrying...");
      conversation += `
The previous response was invalid.
You MUST output ONLY a JSON tool call.
Start with navigating to ${baseUrl}.
Try again.`;
      continue;
    }

    if (Object.keys(toolCall).length === 0) {
      console.log("   ⚠️ Phi3 returned empty JSON → treating as final answer.");
      const passed = evaluateExpected(test, reply);
      return { test, answer: reply, passed };
    }

    // --- EXECUTE TOOL CALL ---
    try {
      console.log(`  lolo  Executing tool: ${toolCall.tool}`);

      const result = await mcp.callTool({
        name: toolCall.tool,
        arguments: toolCall.args || {}
      });

      if (!result) {
        throw new Error("Tool returned undefined");
      }

      // Convert result to string
      let resultString = "";
      if (typeof result === "string") {
        resultString = result;
      } else if (result.content && Array.isArray(result.content)) {
        resultString = result.content.map(c => c.text || JSON.stringify(c)).join("\n");
      } else {
        resultString = JSON.stringify(result);
      }

      // --- EVALUATE IMMEDIATELY AFTER TOOL EXECUTION ---
      if (test.expectation && test.expectation !== "") {
        const passed = evaluateExpected(test, resultString);
        console.log(`  RESULT STRING: ${resultString}`);
        return { test, answer: resultString, passed };
      }

      conversation += `\nTool result: ${resultString}\n\nContinue with next tool call or provide final answer.`;

    } catch (e) {
      console.log(`   Tool error: ${e.message}`);
      conversation += `\nTool error: ${e.message}. Continue with next tool call.`;
    }
  }

  console.log("⚠️  Test timed out");
  return { test, answer: "Timeout", passed: false };
}

// --- RUN ALL TESTS ---
async function runAllTests() {
  console.log("🚀 Starting BDC Test Suite with Phi3 + Playwright MCP\n");

  await mcp.connect(transport);
  console.log("✅ Connected to MCP + Playwright\n");

  const results = [];

  for (const test of testCases) {
    console.log("");
    console.log("********************************************************************************************************   STARTING TEST  #", testNum);
    console.log("********************************************************************************************************   STARTING TEST  #", testNum);
    testNum++;

    await mcp.callTool({
      name: "page_goto",
      arguments: { url: "https://www.bdc.ca" }
    });

    await mcp.callTool({
      name: "search_text",
      arguments: { text: "ntrepreneur" }
    });

    const result = await runTest(test);
    results.push(result);

    results.forEach(r => {
      console.log(`xxxxxxxx ------------  SO FAR Test ${r.test.id}: ${r.passed ? "✅ PASS" : "❌ FAIL"} (${r.passed}) - ${r.test.description}`);
    });

    await mcp.callTool({ name: "close_browser" });
  }

  const totalTestTime = Date.now() - testStartTime;

  console.log("\n" + "=".repeat(60));
  console.log("📊 TEST SUMMARY");
  console.log("=".repeat(60));
  results.forEach(r => {
    console.log(`Test ${r.test.id}: ${r.passed ? "✅ PASS" : "❌ FAIL"} - ${r.test.description}`);
  });

  const passCount = results.filter(r => r.passed).length;
  console.log("=".repeat(60));
  console.log(`Total: ${passCount}/${results.length} tests passed`);
  console.log(`TOTAL TIME: ${totalTestTime}ms`);
  console.log("=".repeat(60));

  process.exit(0);
}

// --- START ---
runAllTests().catch(err => {
  console.error("Fatal error:", err);
  process.exit(1);
});
