import { Hono } from "hono";
import { paymentMiddleware } from "x402-hono";
import type { Network, RouteConfig, SolanaAddress } from "x402-hono";

const ASSET_INFO = {
  USDC: {
    address: "4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU",
    decimals: 6,
  }
  // CASH: {
  //   address: "Gh9ZwEmdLJ8DscKNTkTqPbNwLNNBjuSzaG9Vp2KGtKJr",
  //   decimals: 6,
  // },
  // EURC: {
  //   address: "HzwqbKZw8HxMN6bF2yFZNrht3c2iXXzpKcFu7uBEDKtr",
  //   decimals: 6,
  // },
};

const app = new Hono<{
  Bindings: CloudflareBindings;
}>();

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const isValidPrice = (price: unknown): price is RouteConfig["price"] => {
  if (typeof price === "string" || typeof price === "number") {
    return true;
  }

  if (typeof price === "object" && price !== null) {
    const maybeMoney = price as { asset?: unknown };
    return (
      typeof maybeMoney.asset === "string" &&
      maybeMoney.asset !== null &&
      (Object.keys(ASSET_INFO).includes(
        maybeMoney.asset as keyof typeof ASSET_INFO
      ) as boolean)
    );
  }

  return false;
};

app.use((c, next) =>
  paymentMiddleware(
    c.env.TREASURY_ADDRESS as SolanaAddress,
    {
      "/pay": {
        price: "$0.01",
        network: c.env.NETWORK as Network,
      },
    },
    {
      url: c.env.FACILITATOR_URL,
    }
  )(c, next)
);

app.post("/pay", async (c) => {
  const order = await c.req.json();
  console.log(order);
  const payment = crypto.randomUUID();
  await c.env.X402_PAYMENTS.put(payment, JSON.stringify(order));
  return c.json({ payment });
});

app.post(
  "/dynamic-pay",
  async (c, next) => {
    let order: {
      price: unknown;
      asset: string;
      payload?: unknown;
    };
    try {
      order = await c.req.json();
    } catch {
      return c.json({ error: "Invalid JSON body" }, 400);
    }

    if (!isRecord(order)) {
      return c.json({ error: "Order must be a JSON object" }, 400);
    }

    const paymentOrder = { price: order.price, asset: order.asset };

    if (paymentOrder.price === undefined) {
      return c.json({ error: "Price is required" }, 400);
    }

    if (!isValidPrice(paymentOrder)) {
      return c.json(
        { error: "Invalid price format", paymentOrder, order },
        400
      );
    }

    console.log(
      `Pay ${paymentOrder.price} ${paymentOrder.asset} to ${c.env.TREASURY_ADDRESS} on ${c.env.NETWORK} using facilitator ${c.env.FACILITATOR_URL}`
    );

    return paymentMiddleware(
      c.env.TREASURY_ADDRESS as SolanaAddress,
      {
        "/dynamic-pay": {
          price: {
            amount: String(
              Number(order.price) *
                10 **
                  ASSET_INFO[paymentOrder.asset as keyof typeof ASSET_INFO]
                    .decimals
            ),
            asset: {
              address:
                ASSET_INFO[paymentOrder.asset as keyof typeof ASSET_INFO]
                  .address,
              decimals:
                ASSET_INFO[paymentOrder.asset as keyof typeof ASSET_INFO]
                  .decimals,
            },
          },
          network: c.env.NETWORK as Network,
        },
      },
      {
        url: c.env.FACILITATOR_URL,
      }
    )(c, next);
  },
  async (c) => {
    const order = await c.req.json();
    console.log(order);
    const payment = crypto.randomUUID();
    await c.env.X402_PAYMENTS.put(payment, JSON.stringify(order));
    return c.json({ payment });
  }
);

app.get("/redeem/:payment", async (c) => {
  const payment = c.req.param("payment");
  const order = await c.env.X402_PAYMENTS.get(payment, "json");
  if (!order) {
    return c.json({ error: "Invalid payment" }, 404);
  }
  await c.env.X402_PAYMENTS.delete(payment);
  return c.json({ order });
});

app.get("/", (c) => {
  return c.text("Welcome to the Dory X402 API");
});

export default app;
