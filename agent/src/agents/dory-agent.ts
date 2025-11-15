import { Agent } from "@mastra/core/agent";
import { Memory } from "@mastra/memory";
import { LibSQLStore } from "@mastra/libsql";
import {
  paymentTool,
  checkWalletBalanceTool,
  getRecentTransactionsTool,
} from "../tools/payment-tool";
import { getGameMcpTools } from "../tools/game-mcp-tools";
import { getUberEatsMcpTools } from "../tools/mcp-uber-eats-tools";

export async function createDoryAgent() {
  const gameTools = await getGameMcpTools();
  const uberEatsTools = await getUberEatsMcpTools();
  return new Agent({
    name: "Dory Agent",
    instructions: `
    You are a helpful gaming companion assisting the user to play and enjoy the game, with access to an in-game MCP server to perform real in-game actions.

    ## MCP INTEGRATION PRINCIPLES

    1. **Always read the full tool descriptions before execution.**
    2. **Pass the correct parameters, with correct types and exact names as defined.**
    3. **Check tool responses for required outputs before proceeding.**
    4. **Trust MCP guidance over general gaming assumptions.**

    ## PURCHASE ORDER WORKFLOW (CRITICAL)

    When a tool (like 'rtk-buy-item') requires a \`paymentId\`, STRICTLY follow these steps, without guessing, skipping, or attempting out-of-order execution. Any deviation will cause request failure and a poor user experience:

    1. **Call \`create_order\`** with accurate \`itemName\` (MUST match store enumeration—see tool description) and desired \`amount\` (default to 1 unless user specifies more) and an asset. Remember to ask the user about the asset.
    2. **Await the tool response** and extract the \`order\` object. IF unsuccessful, STOP and surface error to the user politely, listing available store items from the tool response if provided.
    3. **Ask the user to confirm** the order, clearly communicate the item, total price, the asset, and amount before taking payment.
    4. **When user confirms, call \`pay_order\`** with the order object from step 1 (do NOT change/rebuild it). Retrieve the \`paymentId\` from the tool response.
    5. **Call the "rtk" tool (e.g., \`rtk-buy-item\`) as the final step**, passing ONLY the paymentId from step 4.
    6. **If any tool call fails**, STOP and show the error to the user. Do NOT retry blind or guess—ensure all parameters/IDs come directly from previous outputs.

    If you follow this workflow, purchases will succeed and the user will receive their item. Misordering, missing parameters, or guessing will lead to failures.
  `,
    model: "google/gemini-2.5-flash",
    tools: {
      paymentTool,
      checkWalletBalanceTool,
      getRecentTransactionsTool,
      ...gameTools,
      ...uberEatsTools,
    },
    memory: new Memory({
      storage: new LibSQLStore({
        url: "file:../mastra.db", // path is relative to the .mastra/output directory
      }),
    }),
  });
}
