// runner/test-casesPwRT.js
import fs from "fs";
import path from "path";
import axios from "axios";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import { CONFIG } from "../config.js";

// Timing tracking
let lastAICallTime = Date.now();
const testStartTime = Date.now();

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
  
  const response = await axios.post("http://localhost:11434/api/generate", {
    model: "phi3",
    prompt: prompt,
    stream: false
  });
  lastAICallTime = Date.now();
  return response.data.response.trim();
}

// --- TOOL CALL EXTRACTION ---
function extractToolCall(text) {
  try {
    const start = text.indexOf("{");
    const end = text.lastIndexOf("}");
    if (start === -1 || end === -1) return null;

    const parsed = JSON.parse(text.slice(start, end + 1));

    // Must contain "tool" and "args"
    if (!parsed.tool || typeof parsed.tool !== "string") return null;
    if (!parsed.args || typeof parsed.args !== "object") parsed.args = {};

    return parsed;
  } catch {
    return null;
  }
}

// --- EVALUATE EXPECTATION FROM JSON ---
function evaluateExpected(test, answer) {
  const spec = (test.expected || "").trim();

  // Handle "contains:" format
  if (spec.toLowerCase().startsWith("contains:")) {
    const keyword = spec.slice("contains:".length).trim().toLowerCase();
    return answer.toLowerCase().includes(keyword);
  }

  // Handle "not-contains:" format
  if (spec.toLowerCase().startsWith("not-contains:")) {
    const keyword = spec.slice("not-contains:".length).trim().toLowerCase();
    return !answer.toLowerCase().includes(keyword);
  }

  // Handle "regex:" format
  if (spec.toLowerCase().startsWith("regex:")) {
    const pattern = spec.slice("regex:".length).trim();
    return new RegExp(pattern, "i").test(answer);
  }

  return false;
}

// --- RUN SINGLE TEST ---
async function runTest(test) {
  console.log(`\n🔍 Running Test ${test.id}: ${test.description}`);
  console.log(`Question: ${test.question}`);

  // Get system prompt from CONFIG and include baseUrl context
  const baseUrl = test.baseUrl || CONFIG.BASE_URL;
  const systemPrompt = CONFIG.SYSTEM_PROMPT;

  // Build conversation with context about the target URL
  let conversation = systemPrompt + `

TARGET URL FOR THIS TEST: ${baseUrl}

User question: ${test.question}`;

  for (let i = 0; i < 8; i++) {
    const reply = await callOllama(conversation);
    console.log(`   Phi3 raw: ${reply}`);

    let toolCall = extractToolCall(reply);

    // 🔁 RETRY LOGIC FOR INVALID JSON
    if (!toolCall) {
      console.log("   ❌ Invalid JSON tool call. Retrying with correction prompt...");
      conversation += `
The previous response was invalid. 
You MUST output ONLY a JSON tool call. 
Start with navigating to ${baseUrl}.
Try again.`;
      continue;
    }

    // {} means "I cannot produce a tool call" → treat as final answer
    if (Object.keys(toolCall).length === 0) {
      console.log("   ⚠️ Phi3 returned empty JSON → treating as final answer.");
      const passed = evaluateExpected(test, reply);
      console.log(`\n✅ FINAL ANSWER: ${reply}`);
      console.log(`Result: ${passed ? "PASS" : "FAIL"}\n`);
      return { test, answer: reply, passed };
    }

    // --- EXECUTE TOOL CALL ---
    try {
      console.log(`   🛠 Executing tool: ${toolCall.tool}`);
      const result = await mcp.callTool(toolCall.tool, toolCall.args || {});
      
      // Convert result to string for conversation
      let resultString = "";
      if (typeof result === "string") {
        resultString = result;
      } else if (result.content && Array.isArray(result.content)) {
        resultString = result.content.map(c => c.text || JSON.stringify(c)).join("\n");
      } else {
        resultString = JSON.stringify(result);
      }
      
      conversation += `\nTool result: ${resultString}\n\nContinue with next tool call or provide final answer.`;
    } catch (e) {
      console.log(`   ❌ Tool error: ${e.message}`);
      conversation += `\nTool error: ${e.message}. Continue with next tool call.`;
    }
  }

  console.log("⚠️  Test timed out");
  return { test, answer: "Timeout", passed: false };
}

async function runAllTests() {
  console.log("🚀 Starting BDC Test Suite with Phi3 + Playwright MCP\n");
  
  await mcp.connect(transport);
  console.log("✅ Connected to MCP + Playwright\n");

  // STEP 1: navigate
  await mcp.callTool({
    name: "page_goto",
    arguments: {
      url: "https://www.bdc.ca"
    }
  });

  // STEP 2: search
  const searchResult = await mcp.callTool({
    name: "search_text",
    arguments: {
      text: "ntrepreneur"
    }
  });
  
  ///  STEP #3 Close "close_browser"
  await mcp.callTool({
    name: "close_browser",
    //arguments: {
     // url: "https://www.bdc.ca"
    //}
  });



  console.log("SEARCH RESULT:", searchResult);
  
  const results = [];
  for (const test of testCases) {
	  
  // STEP 1: navigate
  await mcp.callTool({
    name: "page_goto",
    arguments: {
      url: "https://www.bdc.ca"
    }
  });

  // STEP 2: search
  const searchResult = await mcp.callTool({
    name: "search_text",
    arguments: {
      text: "entrepreneur.es"
    }
  });	  
	  
	  
	  
    const result = await runTest(test);
    results.push(result);
	
  ///  STEP #3 Close "close_browser"
  await mcp.callTool({
    name: "close_browser",
    //arguments: {
     // url: "https://www.bdc.ca"
    //}
  });	
	
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