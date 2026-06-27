## Preface
Just a quick clarification: the below is not a self-healing template. It is intended as a starting point for building a customized executor and a customized MCP Playwright server.

The current implementation invokes AI during test execution, which offers flexibility but is not necessarily optimized for performance-sensitive test suites.

If your primary interest is self-healing, you may find [Healwright](https://github.com/amrsa1/healwright) useful:

That said, once your automation needs to validate complex business flows across multiple dynamic pages and integrations, the challenges tend to shift beyond locator healing alone.

Feel free to experiment, compare approaches, and reach out if the project aligns with your needs.

Have a great day,

[Greg](https://www.linkedin.com/in/gregbobrowski/)   

  


# This project is set up to debug with LOCAL AI
    
#### This is in sync with C:\MCP_BDC\mcpServer-Playwright-templateV8  on author's hard drive.

------

##  Custom MCP-Playwrght Server
### Architecture Overview and Configuration
High-level test cases are processed by the AI and translated into structured JSON commands that are natively understood by the Model Context Protocol (MCP) server.  

Underlying Language Model: The project leverages the Phi-3 Mini LLM for this translation layer.  

Client Requirements: The MCP-aware AI client (in this architecture, the Playwright MCP server itself) requires a specific configuration file to establish communication.  

#### Configuration File Path
C:\Users\{username}\.config\mcp\clients\playwright-mcp-config.json is read by **MCP Client**:  
-- ✅ Claude Desktop (if installed)  
-- ✅ GitHub Copilot (Agent Mode, if installed)   
-- ✅ Cursor (if installed)    
-- ✅ Cline (if installed)   

#### The client then launches the server automatically on basis of the info contained in playwright-mcp-config.json:
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
However, in this project the **runner** , runner/test-casesPwRT.js starts the server explicitely:
```
const transport = new StdioClientTransport({
   command: "node",
   args: ["dist/server.js"]
});
(...) 
const mcp = new Client({
  name: "bdc-test-agent",
  version: "1.0.0"
});  

await mcp.connect(transport);

```
##  Use Claude Desktop as MCP Client instead of a custom 'test-casesPwRT.js'
In my other, more production geared projects, I would simply use Claude Desktop as MCP Client instead of writing 'test-casesPwRT.js' as a custom written runner.

#### With either of the two above approaches your CI/CD pipeline needs another MCP client  
You could run ollama-mini in pipeline but it is heavy.  You are better of switching to Claude Code CLI by using anthropics/claude-code-action.


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

----------------  
=============================
COMMENTS and other INFO
----------------
============================
## From GitHub Copilot:  

### Why Your Custom Server Isn't "Nonsense"

#### Your statement at the beginning: "I was informed that writing my own MCP Playwright Server is a nonsense"

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
## REFERENCE PROJECTS

- [Playwright MCP + Python](https://github.com/66Ronghua99/open_tkhelper/)  
- [Playwright MCP + Node.js](https://github.com/dtedesco1/nextjs-markdown-boilerplate)  
- [Playwright‑powered MCP server - community](https://github.com/aakashH242/mcp-playwright)
-   
#### Key differences between Microsodt official core MCP Playwright Server and AakashH242’s MCP Playwright Server  

#### A. Microsoft’s MCP Playwright Server
Minimal  
Clean  
Small surface area  
Designed as a reference implementation  
Only exposes a few Playwright actions  
Easy to read, easy to extend  
Ideal for learning, templates, and controlled environments  
  
#### B. AakashH242’s MCP Playwright Server
Large  
Feature‑rich  
Includes browser tools, API tools, filesystem tools, utilities  
Tries to be a full automation platform  
Much more complex folder structure  
Harder to understand at a glance  
Designed for power users of Claude Desktop / Cursor / Cline  
This is why the folder structure is huge — it’s not just Playwright.  
It’s a multi‑tool MCP server.  

