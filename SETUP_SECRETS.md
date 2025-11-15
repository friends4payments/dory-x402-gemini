# Secret Manager Setup Guide

This guide explains how to set up secrets in Google Cloud Secret Manager for the Dory X402 Agent deployment.

## Prerequisites

- Google Cloud SDK (`gcloud`) installed and configured
- Appropriate permissions to create secrets in your GCP project
- All required API keys and credentials ready

## Required Secrets

The application requires three secrets to be configured in Google Cloud Secret Manager:

### 1. OpenAI API Key (`openai-api-key`)

This is used by the Mastra agent to interact with GPT-4.

**How to get it:**

- Sign up at https://platform.openai.com/
- Navigate to API Keys section
- Create a new API key
- Format: `sk-...` (starts with 'sk-')

**Create the secret:**

```bash
# Set your project ID
PROJECT_ID="your-gcp-project-id"

# Create the secret
gcloud secrets create openai-api-key --project=$PROJECT_ID

# Add the secret value
echo -n 'sk-your-openai-api-key-here' | gcloud secrets versions add openai-api-key --data-file=- --project=$PROJECT_ID
```

### 2. Solana Agent Private Key (`agent-private-key`)

This is the Solana wallet private key used by the agent to make payments via the X402 protocol.

**How to get it:**

- Use an existing Solana wallet OR create a new one
- Export the private key in Base58 format
- For Solana CLI: `solana-keygen new` generates a keypair
- For development, you can use Solana devnet

**Create the secret:**

```bash
# Create the secret
gcloud secrets create agent-private-key --project=$PROJECT_ID

# Add the secret value (Base58 encoded private key)
echo -n 'your-base58-encoded-private-key-here' | gcloud secrets versions add agent-private-key --data-file=- --project=$PROJECT_ID
```

**Security Note:**

- For production, fund this wallet with minimal SOL (only what's needed for transactions)
- Use Solana mainnet for production, devnet for testing
- Store backup of private key securely offline

### 3. Browser-Use API Key (`browser-use-api-key`)

This is the API key for the Browser-Use SDK used by both MCP services.

**How to get it:**

- Sign up at Browser-Use cloud service
- Obtain your API key from the dashboard
- This key is shared between browser-use and uber-eats MCP servers

**Create the secret:**

```bash
# Create the secret
gcloud secrets create browser-use-api-key --project=$PROJECT_ID

# Add the secret value
echo -n 'your-browser-use-api-key-here' | gcloud secrets versions add browser-use-api-key --data-file=- --project=$PROJECT_ID
```

## Grant Secret Access to Cloud Run Service

The deployment script automatically grants the service account access to secrets, but you can do it manually if needed:

```bash
# Set variables
PROJECT_ID="your-gcp-project-id"
SERVICE_ACCOUNT="dory-x402-agent-sa@${PROJECT_ID}.iam.gserviceaccount.com"

# Grant Secret Manager Secret Accessor role
gcloud projects add-iam-policy-binding $PROJECT_ID \
    --member="serviceAccount:$SERVICE_ACCOUNT" \
    --role="roles/secretmanager.secretAccessor"
```

## Verify Secrets

To verify that secrets were created correctly:

```bash
# List all secrets
gcloud secrets list --project=$PROJECT_ID

# View secret metadata (not the actual value)
gcloud secrets describe openai-api-key --project=$PROJECT_ID
gcloud secrets describe agent-private-key --project=$PROJECT_ID
gcloud secrets describe browser-use-api-key --project=$PROJECT_ID

# Access a secret value (be careful with this)
gcloud secrets versions access latest --secret="openai-api-key" --project=$PROJECT_ID
```

## Update Secret Values

If you need to update a secret value later:

```bash
# Add a new version of the secret
echo -n 'new-secret-value' | gcloud secrets versions add SECRET_NAME --data-file=- --project=$PROJECT_ID

# The Cloud Run service automatically uses the latest version
# You may need to deploy a new revision to pick up changes
```

## Secret Rotation

For production deployments, implement secret rotation:

1. Create a new version of the secret
2. Test with a new Cloud Run revision
3. If successful, the new revision automatically uses the new version
4. Disable or delete old secret versions after confirming everything works

```bash
# Disable an old version
gcloud secrets versions disable VERSION_NUMBER --secret=SECRET_NAME --project=$PROJECT_ID

# Delete an old version (irreversible)
gcloud secrets versions destroy VERSION_NUMBER --secret=SECRET_NAME --project=$PROJECT_ID
```

## Environment Variables (Non-Secret)

These are configured directly in `cloudrun-service.yaml` and don't need Secret Manager:

- `PAYWALL_URL`: Your Cloudflare Worker URL (e.g., `https://your-paywall.workers.dev`)
- `SOLANA_RPC_URL`: Solana RPC endpoint (default: `https://api.devnet.solana.com`)
- `UBER_EATS_MCP_SERVER_PATH`: Internal path `/app/mcp-uber-eats/server.js`
- `NODE_ENV`: Set to `production`
- `PORT`: Set to `4111`

## Troubleshooting

### Permission Denied Errors

If you get permission errors accessing secrets:

```bash
# Verify service account has the correct role
gcloud projects get-iam-policy $PROJECT_ID \
    --flatten="bindings[].members" \
    --filter="bindings.members:serviceAccount:dory-x402-agent-sa@${PROJECT_ID}.iam.gserviceaccount.com"
```

### Secret Not Found

If the Cloud Run service can't find a secret:

1. Verify the secret exists: `gcloud secrets list --project=$PROJECT_ID`
2. Check the secret name matches exactly in `cloudrun-service.yaml`
3. Ensure the secret has at least one version: `gcloud secrets versions list SECRET_NAME --project=$PROJECT_ID`

### Invalid Secret Values

If the application fails with authentication errors:

1. Verify the secret value is correct (no extra spaces, newlines, or quotes)
2. Use `echo -n` when creating secrets to avoid trailing newlines
3. Test the API key/private key locally before adding to Secret Manager

## Security Best Practices

1. **Least Privilege**: Only grant secret access to the specific service account that needs it
2. **Audit Logs**: Enable Cloud Audit Logs to track secret access
3. **Rotation**: Rotate secrets regularly (especially API keys)
4. **Monitoring**: Set up alerts for unusual secret access patterns
5. **Backup**: Keep encrypted backups of critical secrets (especially private keys)
6. **Testing**: Use separate secrets for development, staging, and production environments

## Cost Considerations

Secret Manager pricing (as of 2024):

- $0.06 per 10,000 access operations
- $0.40 per active secret version per month
- First 3 secret versions are free per secret

For this deployment (3 secrets with 1 active version each):

- Estimated cost: ~$1.20/month + access operations
- Minimal cost for most use cases
