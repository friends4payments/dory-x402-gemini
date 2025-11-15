# Dory X402 Agent - Google Cloud Run Deployment Guide

This guide walks you through deploying the Dory X402 AI Gaming Companion to Google Cloud Run using a unified container architecture with the paywall staying on Cloudflare Workers.

## Architecture Overview

```
┌─────────────────────────────────────────────────────┐
│         Google Cloud Run Container                  │
├─────────────────────────────────────────────────────┤
│                                                     │
│  ┌──────────────────────────────────────────────┐  │
│  │    Agent Service (Port 4111)                 │  │
│  │  ├─ Mastra Framework (AI Orchestration)      │  │
│  │  ├─ MCP Client (spawns child processes)      │  │
│  │  ├─ Payment Tool (x402-fetch)                │  │
│  │  └─ HTTP Server with Playground              │  │
│  └──────────────────────────────────────────────┘  │
│           │                                         │
│           ├─ spawns ──> MCP Browser-Use (stdio)    │
│           └─ spawns ──> MCP Uber-Eats (stdio)      │
│                                                     │
└─────────────────────────────────────────────────────┘
              │                    │
              ▼                    ▼
    ┌──────────────────┐   ┌──────────────────┐
    │ Cloudflare       │   │ External APIs    │
    │ Workers          │   │ - OpenAI GPT-4   │
    │ (Paywall)        │   │ - Solana Devnet  │
    │ - X402 Protocol  │   │ - Browser-Use    │
    │ - KV Storage     │   └──────────────────┘
    └──────────────────┘
```

## Prerequisites

### Required Tools

1. **Google Cloud SDK (gcloud)**

   ```bash
   # macOS
   brew install google-cloud-sdk

   # Or download from: https://cloud.google.com/sdk/docs/install
   ```

2. **Docker**

   ```bash
   # macOS
   brew install --cask docker

   # Or download from: https://docs.docker.com/get-docker/
   ```

3. **GCP Account with Billing Enabled**
   - Create a project at https://console.cloud.google.com/
   - Enable billing for the project

### Required API Keys & Credentials

Before deployment, obtain these credentials:

1. **OpenAI API Key** - From https://platform.openai.com/
2. **Solana Wallet Private Key** - Base58 encoded (for X402 payments)
3. **Browser-Use API Key** - From Browser-Use cloud service
4. **Cloudflare Workers Deployed** - Your paywall should already be deployed

## Step-by-Step Deployment

### Step 1: Configure Google Cloud

```bash
# Login to Google Cloud
gcloud auth login

# Set your project ID (replace with your actual project)
export PROJECT_ID="your-gcp-project-id"
gcloud config set project $PROJECT_ID

# Set your preferred region
export REGION="us-central1"
gcloud config set run/region $REGION

# Verify configuration
gcloud config list
```

### Step 2: Set Up Secrets

Follow the [SETUP_SECRETS.md](./SETUP_SECRETS.md) guide to configure all required secrets in Google Cloud Secret Manager.

**Quick setup:**

```bash
# Create OpenAI API key secret
gcloud secrets create openai-api-key --project=$PROJECT_ID
echo -n 'sk-your-openai-api-key' | gcloud secrets versions add openai-api-key --data-file=- --project=$PROJECT_ID

# Create Solana private key secret
gcloud secrets create agent-private-key --project=$PROJECT_ID
echo -n 'your-base58-private-key' | gcloud secrets versions add agent-private-key --data-file=- --project=$PROJECT_ID

# Create Browser-Use API key secret
gcloud secrets create browser-use-api-key --project=$PROJECT_ID
echo -n 'your-browser-use-key' | gcloud secrets versions add browser-use-api-key --data-file=- --project=$PROJECT_ID
```

### Step 3: Configure Paywall URL

Edit `cloudrun-service.yaml` and update the `PAYWALL_URL` environment variable:

```yaml
- name: PAYWALL_URL
  value: "https://your-paywall.workers.dev" # Replace with your actual Cloudflare Worker URL
```

### Step 4: Deploy Using Automated Script

The easiest way to deploy is using the provided deployment script:

```bash
# Make sure you're in the repository root
cd /Users/jregaladoo/Documents/GitHub/secret-dory-x402

# Run the deployment script
./deploy.sh
```

The script will:

1. ✅ Check prerequisites (gcloud, docker)
2. ✅ Enable required GCP APIs
3. ✅ Create Artifact Registry repository
4. ✅ Build and push Docker image
5. ✅ Create service account with proper permissions
6. ✅ Deploy to Cloud Run
7. ✅ Configure IAM policies
8. ✅ Display the service URL

### Step 5: Manual Deployment (Alternative)

If you prefer manual control:

```bash
# Enable required APIs
gcloud services enable \
    run.googleapis.com \
    artifactregistry.googleapis.com \
    secretmanager.googleapis.com \
    cloudbuild.googleapis.com \
    --project=$PROJECT_ID

# Create Artifact Registry repository
gcloud artifacts repositories create dory-x402 \
    --repository-format=docker \
    --location=$REGION \
    --project=$PROJECT_ID

# Configure Docker authentication
gcloud auth configure-docker ${REGION}-docker.pkg.dev

# Build Docker image
docker build -t ${REGION}-docker.pkg.dev/${PROJECT_ID}/dory-x402/agent:latest .

# Push to Artifact Registry
docker push ${REGION}-docker.pkg.dev/${PROJECT_ID}/dory-x402/agent:latest

# Create service account
gcloud iam service-accounts create dory-x402-agent-sa \
    --display-name="Dory X402 Agent Service Account" \
    --project=$PROJECT_ID

# Grant Secret Manager access
gcloud projects add-iam-policy-binding $PROJECT_ID \
    --member="serviceAccount:dory-x402-agent-sa@${PROJECT_ID}.iam.gserviceaccount.com" \
    --role="roles/secretmanager.secretAccessor"

# Update cloudrun-service.yaml with your image and deploy
# (Edit the file to replace PROJECT_ID and REGION placeholders)
gcloud run services replace cloudrun-service.yaml \
    --platform=managed \
    --region=$REGION \
    --project=$PROJECT_ID

# Allow public access (optional)
gcloud run services add-iam-policy-binding dory-x402-agent \
    --region=$REGION \
    --member="allUsers" \
    --role="roles/run.invoker" \
    --project=$PROJECT_ID
```

## Post-Deployment

### Verify Deployment

```bash
# Get the service URL
gcloud run services describe dory-x402-agent \
    --region=$REGION \
    --format='value(status.url)' \
    --project=$PROJECT_ID

# Test the service
SERVICE_URL=$(gcloud run services describe dory-x402-agent --region=$REGION --format='value(status.url)' --project=$PROJECT_ID)
curl ${SERVICE_URL}/health

# Access the Mastra playground
open ${SERVICE_URL}/agents/doryAgent
```

### View Logs

```bash
# Stream logs in real-time
gcloud run services logs tail dory-x402-agent --region=$REGION --project=$PROJECT_ID

# View recent logs
gcloud run services logs read dory-x402-agent --region=$REGION --limit=50 --project=$PROJECT_ID
```

### Monitor Performance

Access Cloud Run metrics in the GCP Console:

- Navigate to Cloud Run → dory-x402-agent → Metrics
- Monitor: Request count, latency, memory usage, CPU utilization

```bash
# Open in browser
gcloud run services describe dory-x402-agent \
    --region=$REGION \
    --format='value(metadata.name)' \
    --project=$PROJECT_ID | xargs -I {} open "https://console.cloud.google.com/run/detail/${REGION}/{}/metrics?project=${PROJECT_ID}"
```

## Configuration Updates

### Update Environment Variables

1. Edit `cloudrun-service.yaml`
2. Modify the environment variables under `spec.template.spec.containers[0].env`
3. Redeploy:
   ```bash
   ./deploy.sh
   ```

### Update Secrets

```bash
# Add new version of a secret
echo -n 'new-secret-value' | gcloud secrets versions add SECRET_NAME --data-file=- --project=$PROJECT_ID

# Deploy new revision to pick up changes
gcloud run services update dory-x402-agent --region=$REGION --project=$PROJECT_ID
```

### Scale Configuration

Edit `cloudrun-service.yaml`:

```yaml
metadata:
  annotations:
    autoscaling.knative.dev/minScale: "1" # Minimum instances (0 for scale to zero)
    autoscaling.knative.dev/maxScale: "20" # Maximum instances
```

### Resource Allocation

Edit `cloudrun-service.yaml`:

```yaml
resources:
  limits:
    cpu: "4" # Increase CPU
    memory: 8Gi # Increase memory
```

Then redeploy with `./deploy.sh`.

## Cost Estimation

Based on typical usage patterns:

### Cloud Run Costs (us-central1)

**Compute Resources:**

- vCPU: $0.00002400 per vCPU-second
- Memory: $0.00000250 per GiB-second
- Requests: $0.40 per million requests

**Example calculation (2 vCPU, 4GB RAM):**

- 100 hours/month active time
- ~10,000 requests/month
- Estimated cost: **$15-25/month**

**With scale-to-zero:**

- Pay only when container is running
- Cost can be <$5/month for low traffic

### Other GCP Services

- **Secret Manager**: ~$1.20/month (3 secrets)
- **Artifact Registry**: ~$0.10/GB/month (storage for images)
- **Network Egress**: First 1 GB free, then ~$0.12/GB

### External Services

- **OpenAI GPT-4**: $0.03 per 1K input tokens, $0.06 per 1K output tokens
- **Browser-Use**: Varies by plan
- **Solana Transactions**: Minimal (devnet is free, mainnet ~$0.00025 per transaction)

**Total Estimated Monthly Cost: $20-50** (excluding external API usage)

## Troubleshooting

### Container Fails to Start

Check logs:

```bash
gcloud run services logs read dory-x402-agent --region=$REGION --limit=100 --project=$PROJECT_ID
```

Common issues:

- Missing secrets → Verify all secrets exist
- Invalid credentials → Check secret values
- Out of memory → Increase memory allocation
- Timeout → Increase timeout in `cloudrun-service.yaml`

### MCP Services Not Working

Check if stdio communication is working:

```bash
# View container logs for MCP server startup
gcloud run services logs read dory-x402-agent --region=$REGION --project=$PROJECT_ID | grep -i "mcp"
```

Ensure paths are correct:

- `UBER_EATS_MCP_SERVER_PATH=/app/mcp-uber-eats/server.js`

### Payment Issues

Verify:

1. Paywall URL is correct and accessible
2. Solana private key is valid (Base58 format)
3. Wallet has sufficient SOL for transactions
4. Network is set correctly (devnet vs mainnet)

```bash
# Test paywall connectivity from Cloud Run
gcloud run services logs read dory-x402-agent --region=$REGION --project=$PROJECT_ID | grep -i "paywall"
```

### Browser Automation Timeouts

Long-running browser tasks may timeout. Increase timeout:

Edit `cloudrun-service.yaml`:

```yaml
spec:
  template:
    spec:
      timeoutSeconds: 3600 # Already set to max (1 hour)
```

Also ensure CPU is always allocated:

```yaml
annotations:
  run.googleapis.com/cpu-throttling: "false" # Already configured
```

### Permission Denied Errors

Check service account permissions:

```bash
gcloud projects get-iam-policy $PROJECT_ID \
    --flatten="bindings[].members" \
    --filter="bindings.members:serviceAccount:dory-x402-agent-sa@${PROJECT_ID}.iam.gserviceaccount.com"
```

Should have `roles/secretmanager.secretAccessor`.

## Security Considerations

### Network Security

- Cloud Run services are HTTPS by default (TLS 1.2+)
- Consider using Cloud Armor for DDoS protection
- Use VPC Connector for private resource access (if needed)

### Authentication

Current setup allows public access. To require authentication:

```bash
# Remove public access
gcloud run services remove-iam-policy-binding dory-x402-agent \
    --region=$REGION \
    --member="allUsers" \
    --role="roles/run.invoker" \
    --project=$PROJECT_ID

# Require authentication
# Users must include Authorization header: Bearer $(gcloud auth print-identity-token)
```

### Secret Management

- Secrets are stored in Secret Manager (encrypted at rest)
- Service account has minimal permissions (only secret accessor)
- Rotate secrets regularly
- Enable audit logging for secret access

### Solana Wallet Security

- Use dedicated wallet with minimal funds
- Consider multi-sig for production
- Monitor wallet balance and transactions
- Use Solana mainnet for production (devnet for testing)

## Production Checklist

Before going to production:

- [ ] Configure custom domain with Cloud Run
- [ ] Set up Cloud Monitoring alerts
- [ ] Enable Cloud Logging with retention policy
- [ ] Configure autoscaling based on traffic patterns
- [ ] Set up CI/CD pipeline (Cloud Build or GitHub Actions)
- [ ] Implement health checks and readiness probes
- [ ] Test disaster recovery procedures
- [ ] Document incident response plan
- [ ] Set up cost alerts and budgets
- [ ] Review and harden IAM permissions
- [ ] Switch to Solana mainnet
- [ ] Implement rate limiting
- [ ] Set up backup strategy for critical data
- [ ] Perform security audit
- [ ] Load test the service

## Additional Resources

- [Google Cloud Run Documentation](https://cloud.google.com/run/docs)
- [Secret Manager Best Practices](https://cloud.google.com/secret-manager/docs/best-practices)
- [Mastra Framework Docs](https://mastra.ai/docs)
- [X402 Protocol](https://github.com/payai-network/x402)
- [Cloudflare Workers Docs](https://developers.cloudflare.com/workers/)

## Support

For issues related to:

- **Dory X402**: Open an issue in the repository
- **Google Cloud Run**: Check [GCP Support](https://cloud.google.com/support)
- **Mastra Framework**: Visit [Mastra Discord](https://mastra.ai/discord)
- **X402 Protocol**: Visit [PayAI Network](https://payai.network)

## Next Steps

After successful deployment:

1. **Test the agent**: Visit `{SERVICE_URL}/agents/doryAgent`
2. **Monitor logs**: Set up log-based alerts
3. **Optimize costs**: Adjust autoscaling and resources based on usage
4. **Set up CI/CD**: Automate deployments with Cloud Build
5. **Custom domain**: Configure your own domain name
6. **Production secrets**: Rotate and update secrets for production use

---

**Congratulations!** Your Dory X402 Agent is now running on Google Cloud Run! 🎉
