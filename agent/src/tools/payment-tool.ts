import { createTool } from "@mastra/core/tools";
import { z } from "zod";
import { Connection, Keypair, PublicKey } from "@solana/web3.js";
import bs58 from "bs58";

import {
  decodeXPaymentResponse,
  wrapFetchWithPayment,
  createSigner,
  type Hex,
} from "x402-fetch";
import { BrowserUseClient } from "browser-use-sdk";
import { uberEatsPizza } from "./uber-eats-prompt";

type Order = {
  price: number;
  asset: string;
  payload: Record<string, any>;
};

const TOKEN_NAMES = {
  "4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU": "USDC",
  // 'HzwqbKZw8HxMN6bF2yFZNrht3c2iXXzpKcFu7uBEDKtr': 'EURC',
  // 'Gh9ZwEmdLJ8DscKNTkTqPbNwLNNBjuSzaG9Vp2KGtKJr': 'CASH', // USDC-dev token used as there is no $CASH for devnet
};
/**
 * Native Mastra tool for processing payments to access premium features.
 * Uses x402-fetch to handle micropayments via Solana devnet.
 */
export const paymentTool = createTool({
  id: "pay_order",
  description:
    "Process payment for a given order after a executing create_order tool. Use this when user confirms it wants to proceed with the payment of the order.",
  inputSchema: z.object({
    order: z
      .object({
        price: z.number().describe("The price of the order"),
        asset: z.string().describe("The asset of the order"),
        payload: z
          .record(z.string(), z.any())
          .describe("The payload of the order"),
      })
      .describe(
        "The order to process payment for. This MUST BE THE SAME ORDER OBJECT received from the create_order tool."
      ),
  }),
  outputSchema: z.object({
    paymentId: z.string().describe("The payment id"),
  }),
  execute: async ({ context }) => {
    console.log("pay_order tool executing with context", context);
    const { order } = context;

    try {
      const paymentId = await x402Payment(order);

      return {
        paymentId,
      };
    } catch (error) {
      throw new Error(
        `Payment error: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
    }
  },
});

export const uberEatsCreateOrder = createTool({
  id: "uber_eats_create_order",
  description:
    "Creates an order to be used for BUYING in Uber eats. This creates a JSON format order",
  outputSchema: z.object({
    order: z
      .any()
      .describe(
        "The order for Uber eats to process payment for using uber_eats_pay_order."
      ),
  }),
  execute: async ({ context }) => {
    console.log("uber_eats_create_order tool executing with context", context);

    const roundedPrice = process.env.UBER_EATS_PRICE
      ? Number(process.env.UBER_EATS_PRICE)
      : 61.23;

    const order = {
      price: roundedPrice,
      asset: "USDC",
      payload: {
        itemType: "Pizza Margherita",
        amount: 1,
      },
    };

    return { order };
  },
});

export const uberEatsPaymentTool = createTool({
  id: "uber_eats_pay_order",
  description: "Use this tool to create an Uber eats order.",
  inputSchema: z.object({
    order: z
      .any()
      .describe(
        "The order to process payment for. This must be only created after executing the uber_eats_create_order tool."
      ),
  }),
  outputSchema: z.object({
    message: z.string().describe("result of the purchase"),
  }),
  execute: async ({ context }) => {
    console.log("uber_eats_pay_order tool executing with context", context);
    const { order } = context;
    // round the price to 2 decimal places
    const roundedPrice = Math.round(order.price * 100) / 100;
    order.price = roundedPrice;
    order.asset = "USDC";

    try {
      const paymentId = await x402Payment(order);

      const browserUseClient = new BrowserUseClient({
        apiKey: process.env.BROWSER_USE_API_KEY || "",
      });

      const session = await browserUseClient.sessions.createSession({
        profileId: process.env.BROWSER_USE_PROFILE_ID || "",
      });

      const task = await browserUseClient.tasks.createTask({
        sessionId: session.id,
        task: uberEatsPizza,
        llm: "gemini-2.5-flash",
        startUrl: "https://www.ubereats.com",
        allowedDomains: ["ubereats.com"],
      });

      if (task.id) {
        return { message: "The pizza have been ordered successfully." };
      }

      return { message: "Problems ordering the pizza." };
    } catch (error) {
      throw new Error(
        `Payment error: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
    }
  },
});

/**
 * This example shows how to use the x402-fetch package to make a request to a resource server that requires a payment.
 *
 * To run this example, you need to set the following environment variables:
 * - PAYMENT_PRIVATE_KEY: The private key of the signer (defaults to dev key if not set)
 */
async function x402Payment(order: Order): Promise<string> {
  // Rounded price to 2 decimal places
  order.price = Math.round(order.price * 100) / 100;
  const privateKey = process.env.AGENT_PRIVATE_KEY;
  const paywallUrl = process.env.PAYWALL_URL;
  if (!privateKey) {
    throw new Error("AGENT_PRIVATE_KEY is not set");
  }
  if (!paywallUrl) {
    throw new Error("PAYWALL_URL is not set");
  }
  const signer = await createSigner("solana-devnet", privateKey); // uncomment for solana
  const MAX_VALUE_ALLOWED = BigInt(100_000_000);
  const fetchWithPayment = wrapFetchWithPayment(
    fetch,
    signer,
    MAX_VALUE_ALLOWED
  );

  const response = await fetchWithPayment(`${paywallUrl}/dynamic-pay`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(order),
  });
  const body = await response.json();
  console.log(body);
  const { payment } = body;

  const paymentResponse = decodeXPaymentResponse(
    response.headers.get("x-payment-response")!
  );
  console.log(paymentResponse);
  return payment;
}

/**
 * Helper function to get the public key from the AGENT_PRIVATE_KEY environment variable
 */
function getWalletPublicKey(): PublicKey {
  const privateKey = process.env.AGENT_PRIVATE_KEY;
  if (!privateKey) {
    throw new Error("AGENT_PRIVATE_KEY is not set");
  }

  // Decode the base58 private key and create a keypair
  const secretKey = bs58.decode(privateKey);
  const keypair = Keypair.fromSecretKey(secretKey);
  return keypair.publicKey;
}

/**
 * Helper function to create a Solana RPC connection
 */
function getSolanaConnection(): Connection {
  const rpcUrl = process.env.SOLANA_RPC_URL || "https://api.devnet.solana.com";
  return new Connection(rpcUrl, "confirmed");
}

/**
 * Tool for checking the wallet balance.
 */
export const checkWalletBalanceTool = createTool({
  id: "check_wallet_balance",
  description:
    "Check the SOL balance of the agent wallet (AGENT_PRIVATE_KEY). Returns balance in both SOL and lamports.",
  inputSchema: z.object({}),
  outputSchema: z.object({
    publicKey: z.string().describe("The public key of the wallet"),
    balanceSOL: z.number().describe("The balance in SOL"),
    tokenBalance: z
      .array(
        z.object({
          name: z.string().describe("The name of the token"),
          amount: z.number().describe("The balance of the token"),
        })
      )
      .describe("The balance of the tokens"),
  }),
  execute: async () => {
    try {
      const publicKey = getWalletPublicKey();
      const connection = getSolanaConnection();

      const balanceLamports = await connection.getBalance(publicKey);
      const balanceSOL = balanceLamports / 1_000_000_000; // Convert lamports to SOL
      const tokenAccounts = await connection.getParsedTokenAccountsByOwner(
        publicKey,
        {
          programId: new PublicKey(
            "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA"
          ),
        }
      );
      const tokens = tokenAccounts.value
        .filter(
          (account) => account.account.data.parsed.info.tokenAmount.uiAmount > 0
        )
        .map((account) => ({
          mint: account.account.data.parsed.info.mint,
          balance: account.account.data.parsed.info.tokenAmount.uiAmount,
          decimals: account.account.data.parsed.info.tokenAmount.decimals,
        }));

      const tokenBalance =
        tokens?.map((token) => {
          return {
            name: TOKEN_NAMES[token.mint as keyof typeof TOKEN_NAMES],
            amount: token.balance,
          };
        }) ?? [];
      return {
        publicKey: publicKey.toBase58(),
        balanceSOL,
        tokenBalance,
      };
    } catch (error) {
      throw new Error(
        `Failed to check wallet balance: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
    }
  },
});

/**
 * Tool for retrieving recent transactions for the agent wallet.
 */
export const getRecentTransactionsTool = createTool({
  id: "get_recent_transactions",
  description:
    "Retrieve the most recent transactions for the agent wallet (AGENT_PRIVATE_KEY). Returns transaction urlsto view it on solscan.io.",
  inputSchema: z.object({
    limit: z
      .number()
      .min(1)
      .max(10)
      .default(5)
      .optional()
      .describe("Number of transactions to retrieve (1-10, default: 5)"),
  }),
  outputSchema: z.object({
    publicKey: z.string().describe("The public key of the wallet"),
    transactions: z.array(
      z
        .string()
        .describe("Transaction URL, always display it as clickable link")
    ),
  }),
  execute: async ({ context }) => {
    try {
      const { limit = 5 } = context;
      const publicKey = getWalletPublicKey();
      const connection = getSolanaConnection();

      const signatures = await connection.getSignaturesForAddress(publicKey, {
        limit,
      });

      const transactions = signatures.map(
        (sig) => `https://solscan.io/tx/${sig.signature}/?cluster=devnet`
      );

      return {
        publicKey: publicKey.toBase58(),
        transactions,
      };
    } catch (error) {
      throw new Error(
        `Failed to retrieve transactions: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
    }
  },
});
