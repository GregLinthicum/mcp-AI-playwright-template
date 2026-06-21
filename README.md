# This project is set up to debug with LOCAL AI
    
#### This is in sync with C:\MCP_BDC\mcpServer-Playwright-templateV8  on author's hard drive.

------

##  Custom MCP-Playwrght Server
### Architecture Overview and Configuration
High-level test cases are processed by the AI and translated into structured JSON commands that are natively understood by the Model Context Protocol (MCP) server.  

Underlying Language Model: The project leverages the Phi-3 Mini LLM for this translation layer.  

Client Requirements: The MCP-aware AI client (in this architecture, the Playwright MCP server itself) requires a specific configuration file to establish communication.  

#### Configuration File Path
Ensure the configuration file is present at the following location, replacing {userName} with your local system username:  

C:\Users\{userName}\.config\mcp\clients\playwright-mcp-config.json
This file tells the MCP server to expect you calls from:
```
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
```
## Compiling TypeScript Files to Distinct Target Directories
To compile TypeScript (.ts) source files into JavaScript (.js) and distribute them to specific target directories, you can leverage dedicated TypeScript configuration files (e.g., tsconfig.*.json).  

#### Run the standard project build script
npm run build  

#### Compile using a specific TypeScript configuration target
npx tsc -p tsconfig.prompts.json  

  

### In another window verify if ollama is installed
DOS PROMPT>>>ollama list  

### possibly it is scheduled to start on boot
DOS PROMPT>>>tasklist | findstr ollama  

### verify if it is running
DOS PROMPT>>>>curl http://localhost:11434/api/tags  

### If not start Phi-3:: 
DOS PROMPT>>>ollama run phi3   

### It it is expected to fail in GitHub Action Workflow every time. To run other AI's you need to replace the code below
``` 
   async function callOllama(prompt) {
     const response = await axios.post("http://localhost:11434/api/generate", {
       model: "phi3",
       prompt: prompt,
       stream: false
     });
```
 
``` =======================  
RUN RESULT:  
TOOL RECEIVED: close_browser  
ARGS: undefined  
=======================    
[close_browser] Closing browser  
[close_browser] Page closed  
[close_browser] Browser closed  
  
========================  
📊 TEST SUMMARY  
========================  
Test 1: ✅ PASS - BDC Entrepreneur support   
Test 2: ✅ PASS - BDC reCAPTCHA Link must be present  
Test 3: ✅ PASS - BDC Should Not Contain a string MakunaimaRA  
Test 4: ❌ FAIL - BDC must contain string 'Warszwa'  
Test 5: ✅ PASS - BDC must contain string 'Solutions'  
============================================================  
Total: 4/5 tests passed  
TOTAL TIME: 116572ms  
============================================================
```
  
```
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
 ``` 

-------
# Fron GitHub Copilot  

## Why Your Custom Server Isn't "Nonsense"

### Your statement at the beginning: "I was informed that writing my own MCP Playwright Server is a nonsense"

That advice was incorrect for your use case. Here's why:  
  
| Feature | Custom Server | Playwright MCP |
|:--------|:--------------|:---------------|
| State Management | ✅ Global persistent | ❌ Stateless per tool |
| AI Orchestration | ✅ Built‑in timing/logging | ❌ Needs wrapper |
| Phi‑3 Integration | ✅ Tailored | ❌ Generic API |
| Tool Discovery | ✅ Your 7 tools | ❌ 50+ Playwright ops |
| Maintenance | 🟡 523 LOC | ❌ Depends on MS updates |


Your architecture is sound. The custom server is appropriate for:  


 - Local AI agent loops  
 - Stateful browser sessions  
 - Specialized test tools

----------------
REFERENCE PROJECTS

- [Playwright MCP + Python](https://github.com/66Ronghua99/open_tkhelper/)
- [Playwright MCP + Node.js](https://github.com/dtedesco1/dtedes.co/blob/)
