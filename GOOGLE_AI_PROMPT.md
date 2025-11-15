# Deploy Mastra AI Agent with MCP Services to Google Cloud Run

I need to deploy a Mastra AI agent application with MCP services to Google Cloud Run. The project has a specific architecture and configuration that needs to be deployed correctly. Here are the complete details:

## Project Structure and Architecture

```plaintext
/app structure in container:
├── agent/                      # Main Mastra agent application
│   ├── src/                    # Source code
│   ├── .mastra/                # Build artifacts
│   │   └── output/             # Built application files
│   │       ├── index.mjs       # Main entry point
│   │       └── playground/     # Studio UI files
│   └── package.json
├── mcp/                        # Game MCP service (stdio)
│   └── server.js
└── mcp-uber-eats/              # Uber Eats MCP service (stdio)
    └── server.js
```

## Dockerfile Configuration

The application uses a multi-stage build with these key aspects:

- Base image: `node:20-bullseye-slim`
- Includes Chromium for browser automation
- Uses pnpm for package management
- Build stage runs: `npx mastra build --dir src`
- Production stage runs: `npx mastra dev --dir src` (30s timeout) then `node index.mjs` from `.mastra/output`
- Working directory: `/app/agent/.mastra/output`
- Exposed port: `4111`
- Health check endpoint: `/health`

## Environment Variables Required

```bash
# API Keys (store in Secret Manager)
OPENAI_API_KEY                    # OpenAI GPT API key
GOOGLE_GENERATIVE_AI_API_KEY      # Google Gemini API key  
AGENT_PRIVATE_KEY                 # Solana wallet private key (Base58)
BROWSER_USE_API_KEY               # Browser automation service key
BROWSER_USE_PROFILE_ID            # Browser automation profile ID

# Service Configuration (set directly)
PAYWALL_URL                       # Cloudflare Worker URL (e.g., https://paywall.workers.dev)
SOLANA_RPC_URL                    # Default: https://api.devnet.solana.com
GAME_MCP_SERVER_PATH              # Must be: /app/mcp/server.js
UBER_EATS_MCP_SERVER_PATH         # Must be: /app/mcp-uber-eats/server.js
NODE_ENV                          # Set to: production
PORT                              # Set to: 4111
```

## Cloud Run Service Configuration (cloudrun-service.yaml)

Key specifications:

- Service name: `dory-x402-agent`
- CPU: 2 vCPUs (limit), 1 vCPU (request)
- Memory: 4GB (limit), 2GB (request)
- Timeout: 3600 seconds (1 hour)
- Container concurrency: 80
- Autoscaling: 0-10 instances
- CPU always allocated: `run.googleapis.com/cpu-throttling: "false"`
- Service account: `dory-x402-agent-sa`
- Health checks configured with startup and liveness probes

## Deployment Script (deploy.sh)

Include a deployment script that:

- Checks for gcloud and docker CLI tools
- Enables required GCP APIs
- Creates Artifact Registry repository: `dory-x402`
- Builds and pushes Docker image with timestamp versioning
- Creates service account with Secret Manager access
- Deploys using `gcloud run services replace`
- Makes service publicly accessible
- Outputs the service URL

## Complete Step-by-Step Deployment Guide Needed

Please provide a comprehensive guide that includes:

### 1. Initial Setup and Prerequisites

```bash
# Show how to install gcloud SDK and Docker
# Configure GCP project and authentication
# Example with placeholders:
export PROJECT_ID="my-project-id"
export REGION="us-central1"
```

### 2. Create and Configure Secrets in Secret Manager

Show the exact commands for creating each secret:

```bash
# Create each secret with proper formatting
gcloud secrets create openai-api-key --project=$PROJECT_ID
echo -n 'sk-...' | gcloud secrets versions add openai-api-key --data-file=- --project=$PROJECT_ID

# For multi-line private key (AGENT_PRIVATE_KEY)
# Show how to handle Base58 encoded Solana private key
```

### 3. Build and Push Docker Image to Artifact Registry

```bash
# Create repository
gcloud artifacts repositories create dory-x402 \
    --repository-format=docker \
    --location=$REGION \
    --project=$PROJECT_ID

# Configure Docker auth
gcloud auth configure-docker ${REGION}-docker.pkg.dev

# Build with proper tags
docker build -t ${REGION}-docker.pkg.dev/${PROJECT_ID}/dory-x402/agent:latest \
             -t ${REGION}-docker.pkg.dev/${PROJECT_ID}/dory-x402/agent:$(date +%Y%m%d-%H%M%S) .

# Push both tags
docker push ${REGION}-docker.pkg.dev/${PROJECT_ID}/dory-x402/agent:latest
docker push ${REGION}-docker.pkg.dev/${PROJECT_ID}/dory-x402/agent:$(date +%Y%m%d-%H%M%S)
```

### 4. Deploy to Cloud Run Using the YAML Configuration

```bash
# Update the cloudrun-service.yaml with actual values
sed "s|REGION-docker.pkg.dev/PROJECT_ID/dory-x402/agent:latest|${REGION}-docker.pkg.dev/${PROJECT_ID}/dory-x402/agent:latest|g" cloudrun-service.yaml > cloudrun-service-deploy.yaml

# Deploy the service
gcloud run services replace cloudrun-service-deploy.yaml \
    --platform=managed \
    --region=$REGION \
    --project=$PROJECT_ID
```

### 5. Configure IAM and Service Account

```bash
# Create service account
gcloud iam service-accounts create dory-x402-agent-sa \
    --display-name="Dory X402 Agent Service Account" \
    --project=$PROJECT_ID

# Grant Secret Manager access
gcloud projects add-iam-policy-binding $PROJECT_ID \
    --member="serviceAccount:dory-x402-agent-sa@${PROJECT_ID}.iam.gserviceaccount.com" \
    --role="roles/secretmanager.secretAccessor"

# Make service publicly accessible
gcloud run services add-iam-policy-binding dory-x402-agent \
    --region=$REGION \
    --member="allUsers" \
    --role="roles/run.invoker" \
    --project=$PROJECT_ID
```

### 6. Post-Deployment Verification

```bash
# Get service URL
SERVICE_URL=$(gcloud run services describe dory-x402-agent \
    --region=$REGION \
    --format='value(status.url)' \
    --project=$PROJECT_ID)

# Test health endpoint
curl ${SERVICE_URL}/health

# Access Mastra Studio (should show playground, not landing page)
echo "Studio URL: ${SERVICE_URL}/"
echo "Agent Playground: ${SERVICE_URL}/agents/doryAgent"

# View logs
gcloud run services logs tail dory-x402-agent --region=$REGION --project=$PROJECT_ID
```

### 7. Troubleshooting Common Issues

#### Issue: Mastra Studio shows landing page instead of playground

- The application runs `npx mastra dev --dir src` for 30 seconds during container startup
- Then starts from `.mastra/output` directory with `node index.mjs`
- Verify the playground files are being served correctly

#### Issue: Container fails with "PAYWALL_URL is not set"

- Ensure all environment variables are properly configured in `cloudrun-service.yaml`
- Update `PAYWALL_URL` to your actual Cloudflare Worker URL

#### Issue: MCP services not working

- Check logs for MCP server startup: `gcloud run services logs read dory-x402-agent --region=$REGION | grep -i "mcp"`
- Verify paths: `GAME_MCP_SERVER_PATH=/app/mcp/server.js`

#### Issue: Out of memory errors with Chromium

- The service is configured with 4GB RAM limit
- Can increase to 8GB if needed by editing `cloudrun-service.yaml`

#### Issue: Timeout errors

- Already configured for maximum 1-hour timeout
- CPU throttling is disabled for background tasks

### 8. Cost Optimization Tips

- Service scales to zero by default (no cost when idle)
- Estimated cost: $15-25/month for moderate usage
- Monitor with: `gcloud monitoring metrics list --project=$PROJECT_ID`

### 9. Update Deployment (CI/CD)

```bash
# For updates, simply run the deploy.sh script again
./deploy.sh

# Or manually update a specific revision
gcloud run deploy dory-x402-agent \
    --image=${REGION}-docker.pkg.dev/${PROJECT_ID}/dory-x402/agent:latest \
    --region=$REGION \
    --project=$PROJECT_ID
```

### 10. Production Readiness Checklist

- [ ] All secrets created in Secret Manager
- [ ] PAYWALL_URL points to production Cloudflare Worker
- [ ] Solana RPC URL set (devnet for testing, mainnet for production)
- [ ] Custom domain configured (optional)
- [ ] Monitoring alerts set up
- [ ] Cost budget alerts configured
- [ ] Backup strategy for wallet private key

## Notes

Please provide all commands with clear explanations, handling of edge cases, and specific notes about this Mastra agent deployment where the Studio interface must be accessible at the root path.
