

import { join } from "path";
import { existsSync } from "fs";
import { MCPClient } from "@mastra/mcp";
import { Tool } from "@mastra/core";
import { PinoLogger } from "@mastra/loggers";

export async function getGameMcpTools(): Promise<Record<string, Tool>> {
    const paywallUrl = process.env.PAYWALL_URL
    if (!paywallUrl) {
        throw new Error('PAYWALL_URL is not set');
    }
    // projectRoot is the root of the project
    const mcpPath = process.env.GAME_MCP_SERVER_PATH
    if (!mcpPath) {
        throw new Error('GAME_MCP_SERVER_PATH is not set');
    }
    console.log("MCP path", mcpPath);
    if (existsSync(mcpPath)) {
    const mcpClient = new MCPClient({
        servers: {
        game: {
            command: `node`,
            args: [mcpPath],
            env: {
                PAYWALL_URL: paywallUrl,
            }
        },
        },
    });
       return await mcpClient.getTools();
    }
    return {};
  }