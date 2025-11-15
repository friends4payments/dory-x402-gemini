import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { BrowserUseClient } from "browser-use-sdk";
import { z } from "zod-v3";
import fs from "fs";

// ==============================================================================
// INITIALIZE COMPONENTS
// ==============================================================================

const server = new McpServer({
  name: "mcp-uber-eats",
  version: "2.0.0",
});

// Initialize Browser-Use SDK directly
const browserUseClient = new BrowserUseClient({
  apiKey: process.env.BROWSER_USE_API_KEY,
});
console.error("[BrowserUse SDK] Client initialized successfully");

// Helper to handle errors
function handleApiError(error, operation) {
  console.error(`[Browser-Use Cloud] Error in ${operation}:`, error);
  return {
    content: [
      {
        type: "text",
        text: JSON.stringify(
          {
            success: false,
            error: `Error while ${operation}: ${error.message}`,
            timestamp: new Date().toISOString(),
          },
          null,
          2
        ),
      },
    ],
  };
}

// Register all tools
async function registerTools() {
  console.error("[MCP] ✅ Tools registered");
}

// Start server
async function start() {
  try {
    console.error("[MCP] Starting Browser-Use SDK MCP server...");

    await registerTools();

    const transport = new StdioServerTransport();
    await server.connect(transport);

    console.error("[MCP] ✅ Server running via stdio");
  } catch (err) {
    console.error("[MCP] ❌ Error starting server:", err);
    process.exit(1);
  }
}

start();
