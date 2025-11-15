# X402 Paywall - Cryptocurrency Payment Gateway

A payment gateway implementing the X402 protocol for cryptocurrency micropayments on Solana Devnet.

## Overview

This paywall service provides a lightweight payment infrastructure that game developers can use without building their own payment systems. It handles:

- Payment processing via X402 protocol
- Order storage and management
- Payment verification and redemption
- One-time payment IDs to prevent double-spending

## Architecture

```
┌─────────────────────────────────────────┐
│     X402 Paywall (Cloudflare Worker)    │
├─────────────────────────────────────────┤
│                                         │
│  ┌───────────────────────────────────┐  │
│  │   Hono HTTP Server                │  │
│  │   - POST /pay                     │  │
│  │   - POST /dynamic-pay             │  │
│  │   - GET /redeem/:payment          │  │
│  └───────────────────────────────────┘  │
│                                         │
│  ┌───────────────────────────────────┐  │
│  │   X402 Middleware                 │  │
│  │   (x402-hono)                     │  │
│  └───────────────────────────────────┘  │
│                                         │
│  ┌───────────────────────────────────┐  │
│  │   Cloudflare KV Storage           │  │
│  │   (Payment records)               │  │
│  └───────────────────────────────────┘  │
│                                         │
└─────────────────────────────────────────┘
         ▲                    ▼
         │                    │
    ┌────────────┐    ┌──────────────┐
    │   Agent    │    │ X402         │
    │ (Payment)  │    │ Facilitator  │
    └────────────┘    └──────────────┘
```

## Features

- **X402 Protocol**: Standard micropayment protocol for blockchain transactions
- **Static Pricing**: Fixed-price endpoint at `/pay`
- **Dynamic Pricing**: Variable pricing endpoint at `/dynamic-pay`
- **Payment Redemption**: Verify and redeem payments with one-time use tokens
- **KV Storage**: Fast, durable storage for payment records
- **Edge Computing**: Global deployment with low latency via Cloudflare Workers
- **Treasury Management**: All payments go to configured treasury wallet

## Installation

```bash
pnpm install
```

### Configure wrangler.jsonc

Edit [wrangler.jsonc](wrangler.jsonc):

```json
{
  "name": "dory-x402",
  "main": "src/index.ts",
  "compatibility_date": "2025-11-06",
  "vars": {
    "FACILITATOR_URL": "https://facilitator.payai.network",
    "NETWORK": "solana-devnet",
    "TREASURY_ADDRESS": "YOUR_SOLANA_WALLET_ADDRESS_HERE"
  },
  "kv_namespaces": [{
    "binding": "X402_PAYMENTS",
    "id": "YOUR_KV_NAMESPACE_ID_HERE"
  }]
}
```

### Configuration Variables

| Variable | Description | Example |
|----------|-------------|---------|
| `FACILITATOR_URL` | X402 payment facilitator endpoint | `https://facilitator.payai.network` |
| `NETWORK` | Blockchain network | `solana-devnet` or `solana-mainnet` |
| `TREASURY_ADDRESS` | Your Solana wallet address | `9xQeWvG8...` |
| `X402_PAYMENTS` (KV) | KV namespace binding for payment storage | Created via wrangler |

## Development

### Run Locally

```bash
pnpm run dev
```

Server runs on http://localhost:8789

### Generate TypeScript Types

```bash
pnpm run cf-typegen
```

This generates types from your Worker configuration for type-safe binding access.
---

Part of the [Dory X402 Project](../README.md)