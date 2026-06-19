### THis is in sybc with C:\MCP_BDC\mcpServer-Playwright-templateV8  



      

#  Custom MCP-Playwrght Server
## This Template allows to rely solely on yser coded MCP Server.  
Test cases are high level and AI converts them to understandable by MCP-Server JSON command. 
Project used solely Phu-3 mini LLM 
MCP‑aware AI clients need  the below file
C:\Users\GregBurlington\.config\mcp\clients\playwright-mcp-config.json
This file tells the MCP server that you wrote 
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
THis is in sybc with C:\MCP_BDC\mcpServer-Playwright-templateV8

### Start Phi-3:: 
 >> C:\Users\GregBurlington>ollama run phi3

