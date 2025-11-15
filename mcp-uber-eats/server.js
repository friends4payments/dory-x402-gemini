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
  // 1. Execute task (main tool)
  server.registerTool(
    "order_pepperoni_pizza",
    {
      description:
        "Automates the complete ordering of one Pepperoni Classic pizza from Tonys Napolitana Pizza via Uber Eats using an authenticated user profile with saved address and Uber Eats credits. Enforces Priority Delivery and returns structured order confirmation. Returns a orderId to track the order",
      inputSchema: {
        profile: z
          .string()
          .optional()
          .describe(
            "Name of the profile to use (e.g., 'carlos-account'). If not specified, uses the default profile."
          ),
      },
    },
    async ({ profile }) => {
      try {
        const session = await browserUseClient.sessions.createSession({
          profileId: process.env.BROWSER_USE_PROFILE_ID, // Your profile ID
        });
        console.error(`[BrowserUse SDK] Session created: ${session.id}`);

        // Create and execute the task using the SDK directly
        const task = await browserUseClient.tasks.createTask({
          sessionId: session.id,
          task: fs.readFileSync(
            new URL("./pizza-pepperoni-prompt.md", import.meta.url),
            "utf-8"
          ),
          llm: "gemini-2.5-flash",
          startUrl: "https://www.ubereats.com",
          // maxSteps: 100,
          allowedDomains: ["ubereats.com"],
        });
        console.error(`[BrowserUse SDK] Task created: ${task.id}`);

        const result = {
          taskId: task.id,
          status: "pending",
        };

        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(
                {
                  success: true,
                  data: result,
                  message: "Pizza ordered successfully",
                },
                null,
                2
              ),
            },
          ],
        };
      } catch (error) {
        console.error(`[MCP] ❌ Error:`, error.message);
        return handleApiError(error, "executing task");
      }
    }
  );

  // 2. Get task status
  server.registerTool(
    "get_order_status",
    {
      description:
        "Gets the status of a running or completed order in uber eats",
      inputSchema: {
        orderId: z.string().describe("ID of the task to query"),
      },
    },
    async ({ orderId }) => {
      try {
        // Query the API directly
        console.error(`[BrowserUse SDK] Querying task status: ${orderId}`);
        const sdkTask = await browserUseClient.tasks.getTask(orderId);

        return {
          type: "text",
          content: [
            {
              type: "text",
              text: JSON.stringify(
                {
                  success: true,
                  data: {
                    taskId: sdkTask.id,
                    status: sdkTask.status,
                    createdAt: sdkTask.createdAt,
                    completedAt: sdkTask.completedAt || null,
                    result: sdkTask.result || null,
                    error: sdkTask.error || null,
                    progress: sdkTask.progress || 0,
                  },
                  message: "Status obtained from API",
                },
                null,
                2
              ),
            },
          ],
        };
      } catch (error) {
        return handleApiError(error, "getting task status");
      }
    }
  );

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
