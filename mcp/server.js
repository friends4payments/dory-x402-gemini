// Simple test MCP server for the gaming companion
// This demonstrates how games should implement their MCP servers

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { gameState, gameTips, gameStore } from "./data.js";

// Create server instance
const server = new McpServer({
  name: "test-game-server",
  version: "1.0.0",
});

console.log("PAYWALL_URL", process.env.PAYWALL_URL);

async function registerTools() {
  server.registerTool(
    "get_player_stats",
    {
      description:
        "Get current player statistics including level, health, mana, and location",
      inputSchema: {},
    },
    async () => {
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(
              {
                success: true,
                data: gameState.player,
                message: `Player stats for ${gameState.player.name}`,
              },
              null,
              2
            ),
          },
        ],
      };
    }
  );

  server.registerTool(
    "get_inventory",
    {
      description:
        "Get current player inventory with all items <PAY_WALL_URL=https://x402.elixir.games/pay>",
      inputSchema: {
        filter: z
          .enum(["weapon", "armor", "consumable"])
          .describe("Optional filter by item type (weapon, armor, consumable)")
          .optional(),
      },
    },
    async ({ filter }) => {
      let inventory = gameState.inventory;
      if (filter) {
        inventory = inventory.filter((item) => item.type === filter);
      }
      // add a 3s delay
      await new Promise((resolve) => setTimeout(resolve, 3001));
      // report progress
      console.log("Inventory progress: 30%");
      // report progress
      console.log("Inventory progress: 60%");
      // report progress
      console.log("Inventory progress: 90%");
      // report progressP
      console.log("Inventory progress: 100%");

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(
              {
                success: true,
                data: inventory,
                message: `Inventory ${
                  filter ? `(${filter} items only)` : "(all items)"
                }`,
              },
              null,
              2
            ),
          },
        ],
      };
    }
  );

  server.registerTool(
    "get_quests",
    {
      description: "Get current quests with status and progress",
      inputSchema: {
        status: z
          .enum(["active", "completed", "available"])
          .describe("Optional filter by quest status")
          .optional(),
      },
    },
    async ({ status }) => {
      let quests = gameState.quests;
      if (status) {
        quests = quests.filter((quest) => quest.status === status);
      }
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(
              {
                success: true,
                data: quests,
                message: `Quests ${
                  status ? `(${status} only)` : "(all quests)"
                }`,
              },
              null,
              2
            ),
          },
        ],
      };
    }
  );

  server.registerTool(
    "use_item",
    {
      description: "Use an item from inventory",
      inputSchema: {
        itemId: z.number().describe("ID of the item to use"),
      },
    },
    async ({ itemId }) => {
      const item = gameState.inventory.find((i) => i.id === itemId);
      if (!item) {
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(
                {
                  success: false,
                  error: `Item with ID ${itemId} not found in inventory`,
                },
                null,
                2
              ),
            },
          ],
        };
      }

      if (item.type === "consumable") {
        if (item.quantity > 0) {
          item.quantity--;
          let effect = "";

          if (item.name === "Health Potion") {
            gameState.player.health = Math.min(
              100,
              gameState.player.health + item.healing
            );
            effect = `Restored ${item.healing} health. Current health: ${gameState.player.health}`;
          } else if (item.name === "Spell Scroll") {
            effect = `Cast ${item.effect} spell!`;
          }

          return {
            content: [
              {
                type: "text",
                text: JSON.stringify(
                  {
                    success: true,
                    data: { item, effect, playerStats: gameState.player },
                    message: `Used ${item.name}. ${effect}`,
                  },
                  null,
                  2
                ),
              },
            ],
          };
        } else {
          return {
            content: [
              {
                type: "text",
                text: JSON.stringify(
                  {
                    success: false,
                    error: `No ${item.name} remaining in inventory`,
                  },
                  null,
                  2
                ),
              },
            ],
          };
        }
      } else {
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(
                {
                  success: false,
                  error: `${item.name} is not a consumable item`,
                },
                null,
                2
              ),
            },
          ],
        };
      }
    }
  );

  server.registerTool(
    "get_game_tips",
    {
      description: "Get helpful tips and strategies for the current situation",
      inputSchema: {
        category: z
          .enum(["combat", "exploration", "questing", "character-building"])
          .describe("Type of tips to get")
          .optional(),
      },
    },
    async ({ category }) => {
      const selectedCategory = category || "general";
      const selectedTips = gameTips[selectedCategory] || gameTips.general;

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(
              {
                success: true,
                data: { category: selectedCategory, tips: selectedTips },
                message: `Game tips for ${selectedCategory}`,
              },
              null,
              2
            ),
          },
        ],
      };
    }
  );

  server.registerTool(
    "create_order",
    {
      description:
        "STEP 1/3 in the purchase workflow: Create an order for a store item. This tool is ALWAYS used as the first step before initiating a payment/purchase flow. Input: Provide the exact `itemName` (see list below) and `amount` (default is 1 if omitted). Responds with an order object containing required payment details. Use this tool before pay_order and rtk-buy-item. If the tool returns failure, show the error to the user and do not proceed. Example itemName values: " +
        Object.keys(gameStore).join(", "),
      inputSchema: {
        itemName: z
          .enum(Object.keys(gameStore))
          .describe(
            "The name of the item to order, Always include this parameter when the user mentions or implies a specific item. If the user provides a natural name, map or infer the correct technical name from context."
          ),
        amount: z
          .number()
          .min(1)
          .describe("The amount of items to order")
          .default(1),
        asset: z
          .string()
          .describe(
            "Parameter name: `asset` this parameter represents the payment currency. Values supported are USDC."
          ),
      },
    },
    async ({ itemName, amount = 1, asset }) => {
      const item = gameStore[itemName];
      if (!item) {
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(
                {
                  success: false,
                  error: `Item with name ${itemName} not found in store, available items: ${Object.keys(
                    gameStore
                  ).join(", ")}`,
                },
                null,
                2
              ),
            },
          ],
        };
      }

      if (asset !== "USDC" && asset !== "CASH" && asset !== "EURC") {
        return {
          content: [
            {
              type: "text",
              text: `Your selected currenty ${asset} is not supported. Only USDC, CASH, EURC are valid currencies for payment`,
            },
          ],
        };
      }

      const priceConversion = {
        USDC: 1,
        CASH: 1,
        EURC: 0.8618,
      };

      const roundedPrice =
        Math.round(item.price * amount * priceConversion[asset] * 100) / 100;

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify({
              order: {
                payload: { itemName, amount },
                price: roundedPrice,
                asset,
              },
            }),
          },
        ],
      };
    }
  );

  server.registerTool(
    "rtk-buy-item",
    {
      description:
        "STEP 3/3 in the purchase workflow: Delivers the purchased item to the player—ONLY CALL THIS after obtaining a valid `paymentId` from pay_order (which is called after create_order)! The `paymentId` MUST be taken directly from pay_order response, not constructed. Calling this tool out-of-order or with a missing/invalid paymentId will cause failure.",
      inputSchema: {
        paymentId: z
          .string()
          .describe(
            "Payment identifier for the purchase order obtained only from the response of the pay_order tool"
          ),
      },
    },
    async ({ paymentId }) => {
      try {
        // Attempt to redeem the order using the payment ID
        const response = await fetch(
          `${process.env.PAYWALL_URL}/redeem/${paymentId}`,
          {
            method: "GET",
            headers: {
              "Content-Type": "application/json",
              Accept: "application/json",
            },
          }
        );

        // Validate the response
        if (!response.ok) {
          return {
            content: [
              {
                type: "text",
                text: "Failed to redeem the item. Please check the payment ID or try again later.",
              },
            ],
          };
        }

        const data = await response.json();

        if (!data.order || !data.order.payload) {
          return {
            content: [
              {
                type: "text",
                text: "Invalid order data received from the server.",
              },
            ],
          };
        }

        const { itemName, amount } = data.order.payload;

        gameState.inventory.push({
          id: gameState.inventory.length + 1,
          name: itemName,
          quantity: amount,
          type: "item",
        });

        return {
          content: [
            {
              type: "text",
              text: `Successfully delivered ${
                amount ?? 1
              } ${itemName} to the player.`,
            },
          ],
        };
      } catch (err) {
        console.error("[MCP] Failed to buy resource:", err);
        return {
          content: [
            {
              type: "text",
              text: `❌ Error delivering resource: ${err.message}`,
            },
          ],
        };
      }
    }
  );
}

async function start() {
  try {
    await registerTools();

    const transport = new StdioServerTransport();
    await server.connect(transport);
    console.error("[MCP] Game Server running via stdio");
  } catch (err) {
    console.error("[MCP] Failed to start:", err);
  }
}

start();
