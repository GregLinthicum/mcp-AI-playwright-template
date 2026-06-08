const { spawn } = require('child_process');
const path = require('path');

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  blue: '\x1b[34m',
  yellow: '\x1b[33m',
};

function log(color, message) {
  console.log(`${color}${message}${colors.reset}`);
}

const server = spawn(path.join(__dirname, '../tools/node20/node.exe'), ['./dist/server.js']);

let testCount = 0;
let passedTests = 0;
const responses = [];

// Test 1: List tools
log(colors.blue, '\n📋 TEST 1: Listing available tools...');
const listToolsRequest = {
  jsonrpc: "2.0",
  id: 1,
  method: "tools/list",
  params: {}
};

server.stdin.write(JSON.stringify(listToolsRequest) + '\n');

// Test 2: Get page title from LinkedIn
setTimeout(() => {
  log(colors.blue, '\n🔍 TEST 2: Getting page title from LinkedIn...');
  const getPageTitleRequest = {
    jsonrpc: "2.0",
    id: 2,
    method: "tools/call",
    params: {
      name: "get_page_title",
      arguments: {
        url: "https://www.linkedin.com/in/hudonisabelle/"
      }
    }
  };
  server.stdin.write(JSON.stringify(getPageTitleRequest) + '\n');
}, 1000);

// Test 3: Search for specific text
setTimeout(() => {
  log(colors.blue, '\n🔎 TEST 3: Searching for "BDC\'s first woman President and CEO"...');
  const searchRequest = {
    jsonrpc: "2.0",
    id: 3,
    method: "tools/call",
    params: {
      name: "search_page_content",
      arguments: {
        url: "https://www.linkedin.com/in/hudonisabelle/",
        searchString: "BDC's first woman President and CEO"
      }
    }
  };
  server.stdin.write(JSON.stringify(searchRequest) + '\n');
}, 2000);

server.stdout.on('data', (data) => {
  const response = data.toString().trim();
  if (response) {
    responses.push(response);
    console.log(`Response ${responses.length}:`, response);
  }
});

server.stderr.on('data', (data) => {
  const message = data.toString().trim();
  if (message && !message.includes('started on stdio')) {
    log(colors.yellow, `[Server] ${message}`);
  }
});

// Timeout and results
setTimeout(() => {
  log(colors.blue, '\n\n📊 TEST RESULTS:');
  log(colors.blue, '================');

  responses.forEach((response, index) => {
    try {
      const parsed = JSON.parse(response);
      testCount++;
      
      if (parsed.result) {
        passedTests++;
        log(colors.green, `✓ Test ${testCount} PASSED`);
        if (parsed.result.tools) {
          log(colors.green, `  Tools available: ${parsed.result.tools.map(t => t.name).join(', ')}`);
        }
        if (parsed.result.content) {
          log(colors.green, `  Result: ${parsed.result.content[0]?.text}`);
        }
      } else if (parsed.error) {
        log(colors.red, `✗ Test ${testCount} FAILED: ${parsed.error.message}`);
      }
    } catch (e) {
      // Silent
    }
  });

  log(colors.blue, '================');
  if (passedTests === testCount && testCount > 0) {
    log(colors.green, `\n🎉 ALL TESTS PASSED (${passedTests}/${testCount})\n`);
  } else {
    log(colors.red, `\n❌ SOME TESTS FAILED (${passedTests}/${testCount})\n`);
  }

  server.kill();
  process.exit(passedTests === testCount && testCount > 0 ? 0 : 1);
}, 10000);
