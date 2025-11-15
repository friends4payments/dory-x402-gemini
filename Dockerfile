# Multi-stage build for Dory X402 Agent with MCP Services
# Optimized for Google Cloud Run deployment

FROM node:20-bullseye-slim AS base

# Install system dependencies for browser automation
RUN apt-get update && apt-get install -y \
    chromium \
    chromium-driver \
    ca-certificates \
    fonts-liberation \
    libasound2 \
    libatk-bridge2.0-0 \
    libatk1.0-0 \
    libatspi2.0-0 \
    libcups2 \
    libdbus-1-3 \
    libdrm2 \
    libgbm1 \
    libgtk-3-0 \
    libnspr4 \
    libnss3 \
    libwayland-client0 \
    libxcomposite1 \
    libxdamage1 \
    libxfixes3 \
    libxkbcommon0 \
    libxrandr2 \
    xdg-utils \
    libu2f-udev \
    libvulkan1 \
    && rm -rf /var/lib/apt/lists/*

# Set Puppeteer to use installed Chromium
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true \
    PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium

# Install pnpm globally
RUN npm install -g pnpm

WORKDIR /app

# Copy package files for all services
COPY agent/package.json agent/pnpm-lock.yaml ./agent/
COPY mcp/package.json mcp/pnpm-lock.yaml ./mcp/
COPY mcp-uber-eats/package.json mcp-uber-eats/pnpm-lock.yaml ./mcp-uber-eats/

# Install dependencies for all services
RUN cd agent && pnpm install --frozen-lockfile && \
    cd ../mcp && pnpm install --frozen-lockfile && \
    cd ../mcp-uber-eats && pnpm install --frozen-lockfile

# Copy source code for all services
COPY agent/ ./agent/
COPY mcp/ ./mcp/
COPY mcp-uber-eats/ ./mcp-uber-eats/

# Set build-time environment variables for mastra build
# These are placeholder values just to satisfy the build requirements
ENV PAYWALL_URL=http://localhost:3000 \
    UBER_EATS_MCP_SERVER_PATH=/app/mcp-uber-eats/server.js \
    GAME_MCP_SERVER_PATH=/app/mcp/server.js \
    BROWSER_USE_API_KEY=placeholder \
    BROWSER_USE_PROFILE_ID=placeholder \
    OPENAI_API_KEY=placeholder \
    GOOGLE_GENERATIVE_AI_API_KEY=placeholder \
    AGENT_PRIVATE_KEY=placeholder \
    SOLANA_RPC_URL=https://api.mainnet-beta.solana.com

# Build the agent to generate .mastra folder and artifacts
RUN cd agent && npx mastra build --dir src

# Production stage
FROM node:20-bullseye-slim

# Install runtime dependencies for browser automation
RUN apt-get update && apt-get install -y \
    chromium \
    ca-certificates \
    fonts-liberation \
    libasound2 \
    libatk-bridge2.0-0 \
    libatk1.0-0 \
    libatspi2.0-0 \
    libcups2 \
    libdbus-1-3 \
    libdrm2 \
    libgbm1 \
    libgtk-3-0 \
    libnspr4 \
    libnss3 \
    libwayland-client0 \
    libxcomposite1 \
    libxdamage1 \
    libxfixes3 \
    libxkbcommon0 \
    libxrandr2 \
    xdg-utils \
    libu2f-udev \
    libvulkan1 \
    && rm -rf /var/lib/apt/lists/*

# Set Puppeteer to use installed Chromium
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true \
    PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium

# Install pnpm globally
RUN npm install -g pnpm

WORKDIR /app

# Copy built application and dependencies (including .mastra build artifacts)
COPY --from=base /app/agent ./agent
COPY --from=base /app/mcp ./mcp
COPY --from=base /app/mcp-uber-eats ./mcp-uber-eats

# Set working directory to agent
WORKDIR /app/agent

# Copy playground files to the correct location for production
# The mastra start command expects playground files in ./playground relative to working directory
#RUN if [ -d ".mastra/output/playground" ]; then cp -r .mastra/output/playground ./playground; fi



# Expose the port that the agent runs on
EXPOSE 4111

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
    CMD node -e "require('http').get('http://localhost:4111/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"

# Run the agent service from the output directory
#CMD ["npx", "mastra", "start", "--dir", ".mastra/output"]

RUN timeout 30s npx mastra dev --dir src || true

WORKDIR /app/agent/.mastra/output

CMD node index.mjs
