import { existsSync } from "fs";
import { MCPClient } from "@mastra/mcp";
import { Tool } from "@mastra/core";

export async function getUberEatsMcpTools(): Promise<Record<string, Tool>> {
  const paywallUrl = process.env.PAYWALL_URL;
  const browserUseApiKey = process.env.BROWSER_USE_API_KEY;
  const browserUseProfileId = process.env.BROWSER_USE_PROFILE_ID;

  if (!paywallUrl) {
    throw new Error("PAYWALL_URL is not set");
  }
  if (!browserUseApiKey) {
    throw new Error("BROWSER_USE_API_KEY is not set");
  }

  if (!browserUseProfileId) {
    throw new Error("BROWSER_USE_PROFILE_ID is not set");
  }
  // projectRoot is the root of the project
  const mcpPath = process.env.UBER_EATS_MCP_SERVER_PATH;
  if (!mcpPath) {
    throw new Error("UBER_EATS_MCP_SERVER_PATH is not set");
  }
  console.log("MCP path", mcpPath);
  if (existsSync(mcpPath)) {
    const mcpClient = new MCPClient({
      servers: {
        uber_eats: {
          command: `node`,
          args: [mcpPath],
          env: {
            PAYWALL_URL: paywallUrl,
            BROWSER_USE_API_KEY: browserUseApiKey,
            BROWSER_USE_PROFILE_ID: browserUseProfileId,
          },
        },
      },
    });

    return await mcpClient.getTools();
  }
  return {};
}
