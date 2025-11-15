# AI Gaming Companion Agent

An AI-powered gaming companion prototype quickly built with [Mastra](https://mastra.ai/) that interfaces with games through the Model Context Protocol (MCP) and handles cryptocurrency micropayments via the X402 protocol.

## Overview

This agent acts as an intelligent intermediary between players and games:
- Communicates with games via MCP protocol
- Processes payments using X402 on Solana Devnet
- Provides natural language interface for gameplay and purchases
- Maintains conversation context and memory

## Architecture

```
┌─────────────────────────────────────────────┐
│         Dory Agent                 │
├─────────────────────────────────────────────┤
│  ┌─────────────────────────────────────┐    │
│  │   OpenAI GPT-4 (LLM)                │    │
│  └─────────────────────────────────────┘    │
│                                             │
│  ┌──────────────┐    ┌──────────────────┐   │
│  │ MCP Client   │    │  Payment Tool    │   │
│  │ (Game Tools) │    │  (x402-fetch)    │   │
│  └──────────────┘    └──────────────────┘   │
│                                             │
│  ┌─────────────────────────────────────┐    │
│  │   LibSQL Memory Storage             │    │
│  └─────────────────────────────────────┘    │
└─────────────────────────────────────────────┘
        │                           │
        ▼                           ▼
┌──────────────┐          ┌──────────────────┐
│ Game MCP     │          │  X402 Paywall    │
│ Server       │          │  (Cloudflare)    │
└──────────────┘          └──────────────────┘
```

## Features

- **Natural Language Interface**: Interact with games using conversational AI
- **MCP Integration**: Dynamically loads and uses game tools from MCP servers
- **Payment Processing**: Handles crypto micropayments with user confirmation
- **Wallet Management**: Check balances and view transaction history on Solana devnet
- **Memory**: Maintains conversation history using LibSQL
- **Logging**: Structured logging with Pino
- **Type Safety**: Built with TypeScript and Zod schemas

## Installation

```bash
pnpm install
```

## Configuration

Create a `.env` file from the example:

```bash
cp .env.example .env
```

### Environment Variables

| Variable | Description | Example |
|----------|-------------|---------|
| `OPENAI_API_KEY` | OpenAI API key for GPT-4 | `sk-...` |
| `AGENT_PRIVATE_KEY` | Base58-encoded Solana private key | `your_private_key_base58` |
| `PAYWALL_URL` | URL of your X402 paywall | `https://your-paywall.workers.dev` |
| `GAME_MCP_SERVER_PATH` | Absolute path to game MCP server | `/home/user/mcp/server.js` |
| `SOLANA_RPC_URL` | (Optional) Custom Solana RPC endpoint | `https://api.devnet.solana.com` |


## Usage

### Development Mode

```bash
pnpm run dev
```

This starts the playground at http://localhost:4111 where you can interact with the agent, change prompts, see tools and many more.

## Agent Capabilities

### Game Interaction Tools

The agent dynamically loads all tools from the configured MCP server, typically including:

- `get_player_stats` - View player statistics
- `get_inventory` - Check inventory items
- `get_quests` - View available/completed quests
- `use_item` - Use items from inventory
- `get_game_tips` - Get helpful gameplay tips
- `create_order` - Create purchase orders for store items
- `rtk-buy-item` - Redeem payment and receive items

### Payment Tools

The agent has built-in payment and wallet management tools:

#### `pay_order`
- Takes order details (price, asset, payload)
- Confirms purchase with user
- Signs transaction with agent's private key
- Makes payment via X402 protocol
- Returns payment ID for redemption

#### `check_wallet_balance`
- Checks the SOL balance of the agent's wallet
- Returns balance in both SOL and lamports
- Shows token balances (USDC, EURC, CASH)
- Displays the wallet's public key

#### `get_recent_transactions`
- Retrieves the last 5 transactions (configurable up to 10)
- Returns clickable Solscan URLs for transaction details
- Shows transactions on Solana devnet
- Helps track payment history and wallet activity

## Purchase Workflow

The agent follows a strict 3-step purchase workflow:

### Step 1: Create Order
```
User: "Buy a health potion"
Agent: [Calls create_order tool]
Game MCP: Returns {order: {payload, price, asset}}
```

### Step 2: Process Payment
```
Agent: "This will cost 0.05 SOL. Confirm?"
User: "Yes"
Agent: [Calls pay_order tool with order details]
Payment Tool: Makes X402 payment to paywall
Paywall: Returns {payment: "uuid-1234"}
```

### Step 3: Deliver Item
```
Agent: [Calls rtk-buy-item with payment ID]
Game MCP: Verifies payment with paywall
Game MCP: Delivers item to player
Agent: "You received 1x Health Potion!"
```

Part of the [Dory X402 Project](../README.md)