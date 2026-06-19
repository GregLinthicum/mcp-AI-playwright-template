### This is in sync with C:\MCP_BDC\mcpServer-Playwright-templateV8  


#  Custom MCP-Playwrght Server
## This Template allows to rely solely on yser coded MCP Server.  
Test cases are high level and AI converts them to understandable by MCP-Server JSON command. 
Project used solely Phu-3 mini LLM 
MCP‑aware AI clients need  the below file
C:\Users\GregBurlington\.config\mcp\clients\playwright-mcp-config.json
This file tells the MCP server that you wrote:
{  
  "servers": {  
    "playwright-mcp": {  
      "command": "node",  
      "args": ["./mcp/server.js"],  
      "env": {  
        "NODE_ENV": "development"  
      }  
    }  
  }  
}  

    
### Start Phi-3:: 
 >> C:\Users\GregBurlington>ollama run phi3

=======================
RUN RESULT:
TOOL RECEIVED: close_browser
ARGS: undefined
=================================
[close_browser] Closing browser
[close_browser] Page closed
[close_browser] Browser closed

============================================================
📊 TEST SUMMARY
============================================================
Test 1: ✅ PASS - BDC Entrepreneur support
Test 2: ✅ PASS - BDC reCAPTCHA Link must be present
Test 3: ✅ PASS - BDC Should Not Contain a string MakunaimaRA
Test 4: ❌ FAIL - BDC must contain string 'Warszwa'
Test 5: ✅ PASS - BDC must contain string 'Solutions'
============================================================
Total: 4/5 tests passed
TOTAL TIME: 116572ms
============================================================
PS C:\MCP_BDC\mcpServer-Playwright-templateV8>

##  Test cases are re-defined by AI ( Phi-3-mini )   but they are  not truly plain English.  
For example:
[STDIN] {"method":"tools/call","params":{"name":"search_text","arguments":{"text":"Warszwa"}},"jsonrpc":"2.0","id":15}  

is constructed from :  
{  
  "id": 4,  
  "question": "Is the text 'Warszwa' present on the BDC website?",  
  "description": "BDC must contain string 'Warszwa'",  
  "baseUrl": "https://www.bdc.ca/fr",  
  "expectation": "should-contain",  
  "searchTerm": "Warszwa"  
}  
  


