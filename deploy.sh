#!/bin/bash

# Deployment script for Dory X402 Agent to Google Cloud Run
# This script handles the complete deployment pipeline

set -e  # Exit on error

# Color output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuration variables
PROJECT_ID=""
REGION="us-central1"
SERVICE_NAME="dory-x402-agent"
REPOSITORY_NAME="dory-x402"
IMAGE_NAME="agent"

# Function to print colored messages
print_info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

print_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Function to check if a command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Check prerequisites
print_info "Checking prerequisites..."

if ! command_exists gcloud; then
    print_error "gcloud CLI is not installed. Please install it from https://cloud.google.com/sdk/docs/install"
    exit 1
fi

if ! command_exists docker; then
    print_error "Docker is not installed. Please install it from https://docs.docker.com/get-docker/"
    exit 1
fi

# Get GCP project ID
if [ -z "$PROJECT_ID" ]; then
    PROJECT_ID=$(gcloud config get-value project 2>/dev/null)
    if [ -z "$PROJECT_ID" ]; then
        print_error "No GCP project set. Please run: gcloud config set project YOUR_PROJECT_ID"
        exit 1
    fi
fi

print_info "Using GCP Project: $PROJECT_ID"
print_info "Region: $REGION"

# Confirm deployment
read -p "$(echo -e ${YELLOW}Continue with deployment? [y/N]:${NC} )" -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    print_warn "Deployment cancelled"
    exit 0
fi

# Enable required GCP APIs
print_info "Enabling required GCP APIs..."
gcloud services enable \
    run.googleapis.com \
    containerregistry.googleapis.com \
    artifactregistry.googleapis.com \
    secretmanager.googleapis.com \
    cloudbuild.googleapis.com \
    --project=$PROJECT_ID

# Create Artifact Registry repository if it doesn't exist
print_info "Setting up Artifact Registry..."
if ! gcloud artifacts repositories describe $REPOSITORY_NAME --location=$REGION --project=$PROJECT_ID >/dev/null 2>&1; then
    print_info "Creating Artifact Registry repository..."
    gcloud artifacts repositories create $REPOSITORY_NAME \
        --repository-format=docker \
        --location=$REGION \
        --description="Docker repository for Dory X402 Agent" \
        --project=$PROJECT_ID
else
    print_info "Artifact Registry repository already exists"
fi

# Configure Docker to authenticate with Artifact Registry
print_info "Configuring Docker authentication..."
gcloud auth configure-docker ${REGION}-docker.pkg.dev --quiet

# Build and push Docker image
IMAGE_TAG="${REGION}-docker.pkg.dev/${PROJECT_ID}/${REPOSITORY_NAME}/${IMAGE_NAME}:latest"
IMAGE_TAG_VERSIONED="${REGION}-docker.pkg.dev/${PROJECT_ID}/${REPOSITORY_NAME}/${IMAGE_NAME}:$(date +%Y%m%d-%H%M%S)"

print_info "Building Docker image..."
docker build -t $IMAGE_TAG -t $IMAGE_TAG_VERSIONED .

print_info "Pushing Docker image to Artifact Registry..."
docker push $IMAGE_TAG
docker push $IMAGE_TAG_VERSIONED

print_info "Image pushed successfully:"
print_info "  Latest: $IMAGE_TAG"
print_info "  Versioned: $IMAGE_TAG_VERSIONED"

# Check if secrets exist
print_info "Checking secrets in Secret Manager..."

check_secret() {
    local secret_name=$1
    if ! gcloud secrets describe $secret_name --project=$PROJECT_ID >/dev/null 2>&1; then
        print_warn "Secret '$secret_name' does not exist. Please create it with:"
        echo "  gcloud secrets create $secret_name --project=$PROJECT_ID"
        echo "  echo -n 'YOUR_SECRET_VALUE' | gcloud secrets versions add $secret_name --data-file=- --project=$PROJECT_ID"
        return 1
    else
        print_info "Secret '$secret_name' exists"
        return 0
    fi
}

SECRETS_OK=true
check_secret "openai-api-key" || SECRETS_OK=false
check_secret "agent-private-key" || SECRETS_OK=false
check_secret "browser-use-api-key" || SECRETS_OK=false
check_secret "google-generative-ai-api-key" || SECRETS_OK=false


if [ "$SECRETS_OK" = false ]; then
    print_warn "Some secrets are missing. Please create them before deploying."
    read -p "$(echo -e ${YELLOW}Continue anyway? [y/N]:${NC} )" -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        print_warn "Deployment cancelled"
        exit 0
    fi
fi

# Create service account if it doesn't exist
SERVICE_ACCOUNT="${SERVICE_NAME}-sa@${PROJECT_ID}.iam.gserviceaccount.com"
print_info "Setting up service account..."

if ! gcloud iam service-accounts describe $SERVICE_ACCOUNT --project=$PROJECT_ID >/dev/null 2>&1; then
    print_info "Creating service account..."
    gcloud iam service-accounts create ${SERVICE_NAME}-sa \
        --display-name="Dory X402 Agent Service Account" \
        --project=$PROJECT_ID
else
    print_info "Service account already exists"
fi

# Grant Secret Manager access to service account
print_info "Granting Secret Manager access to service account..."
gcloud projects add-iam-policy-binding $PROJECT_ID \
    --member="serviceAccount:$SERVICE_ACCOUNT" \
    --role="roles/secretmanager.secretAccessor" \
    --condition=None

# Update the cloudrun-service.yaml with actual values
print_info "Updating Cloud Run service configuration..."
sed "s|REGION-docker.pkg.dev/PROJECT_ID/dory-x402/agent:latest|${IMAGE_TAG}|g" cloudrun-service.yaml | \
sed "s|serviceAccountName: dory-x402-agent-sa|serviceAccountName: ${SERVICE_ACCOUNT}|g" > cloudrun-service-deploy.yaml

# Deploy to Cloud Run
print_info "Deploying to Cloud Run..."
gcloud run services replace cloudrun-service-deploy.yaml \
    --platform=managed \
    --region=$REGION \
    --project=$PROJECT_ID

# Make the service publicly accessible (optional - comment out if you want private)
print_info "Setting IAM policy to allow unauthenticated access..."
gcloud run services add-iam-policy-binding $SERVICE_NAME \
    --region=$REGION \
    --member="allUsers" \
    --role="roles/run.invoker" \
    --project=$PROJECT_ID

# Get the service URL
SERVICE_URL=$(gcloud run services describe $SERVICE_NAME \
    --platform=managed \
    --region=$REGION \
    --format='value(status.url)' \
    --project=$PROJECT_ID)

# Clean up temporary file
rm -f cloudrun-service-deploy.yaml

print_info "============================================"
print_info "Deployment completed successfully!"
print_info "============================================"
print_info "Service URL: $SERVICE_URL"
print_info "Playground: ${SERVICE_URL}/agents/doryAgent"
print_info ""
print_info "To view logs:"
echo "  gcloud run services logs read $SERVICE_NAME --region=$REGION --project=$PROJECT_ID"
print_info ""
print_info "To update environment variables:"
echo "  Edit cloudrun-service.yaml and run this script again"
print_info "============================================"
