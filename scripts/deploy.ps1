# CAM Automation System Deployment Script
# This script deploys the entire CAM automation infrastructure

param(
    [Parameter(Mandatory=$false)]
    [string]$Environment = "dev",
    
    [Parameter(Mandatory=$false)]
    [string]$Region = "us-east-1",
    
    [Parameter(Mandatory=$false)]
    [switch]$SkipBootstrap = $false
)

Write-Host "=== CAM Automation System Deployment ===" -ForegroundColor Green
Write-Host "Environment: $Environment" -ForegroundColor Yellow
Write-Host "Region: $Region" -ForegroundColor Yellow

# Set environment variables
$env:ENVIRONMENT = $Environment
$env:CDK_DEFAULT_REGION = $Region

# Check prerequisites
Write-Host "Checking prerequisites..." -ForegroundColor Blue

# Check if AWS CLI is installed
try {
    aws --version | Out-Null
    Write-Host "✓ AWS CLI is installed" -ForegroundColor Green
} catch {
    Write-Host "✗ AWS CLI is not installed. Please install AWS CLI first." -ForegroundColor Red
    exit 1
}

# Check if Node.js is installed
try {
    node --version | Out-Null
    Write-Host "✓ Node.js is installed" -ForegroundColor Green
} catch {
    Write-Host "✗ Node.js is not installed. Please install Node.js 18+ first." -ForegroundColor Red
    exit 1
}

# Check if CDK is installed
try {
    cdk --version | Out-Null
    Write-Host "✓ AWS CDK is installed" -ForegroundColor Green
} catch {
    Write-Host "Installing AWS CDK..." -ForegroundColor Yellow
    npm install -g aws-cdk
}

# Check AWS credentials
try {
    aws sts get-caller-identity | Out-Null
    Write-Host "✓ AWS credentials are configured" -ForegroundColor Green
} catch {
    Write-Host "✗ AWS credentials are not configured. Please run 'aws configure' first." -ForegroundColor Red
    exit 1
}

# Navigate to infrastructure directory
Set-Location -Path "$PSScriptRoot\..\infrastructure"

# Install dependencies
Write-Host "Installing dependencies..." -ForegroundColor Blue
npm install

# Bootstrap CDK (if not skipped)
if (-not $SkipBootstrap) {
    Write-Host "Bootstrapping CDK..." -ForegroundColor Blue
    cdk bootstrap
}

# Build the project
Write-Host "Building the project..." -ForegroundColor Blue
npm run build

# Deploy stacks in order
$stacks = @(
    "CamSecurityStack",
    "CamDataStack", 
    "CamAiStack",
    "CamWorkflowStack",
    "CamInfrastructureStack",
    "CamMonitoringStack"
)

foreach ($stack in $stacks) {
    Write-Host "Deploying $stack..." -ForegroundColor Blue
    cdk deploy $stack --require-approval never
    
    if ($LASTEXITCODE -ne 0) {
        Write-Host "✗ Failed to deploy $stack" -ForegroundColor Red
        exit 1
    }
    
    Write-Host "✓ Successfully deployed $stack" -ForegroundColor Green
}

Write-Host "=== Deployment Complete ===" -ForegroundColor Green
Write-Host "All stacks have been deployed successfully!" -ForegroundColor Green

# Display important outputs
Write-Host "`n=== Important Information ===" -ForegroundColor Yellow
Write-Host "Please save the following information:" -ForegroundColor Yellow
Write-Host "- Check the AWS CloudFormation console for stack outputs" -ForegroundColor White
Write-Host "- Configure your frontend applications with the API endpoints" -ForegroundColor White
Write-Host "- Set up SNS subscriptions for alerts" -ForegroundColor White
Write-Host "- Configure Cognito user pool with initial admin users" -ForegroundColor White

Write-Host "`n=== Next Steps ===" -ForegroundColor Yellow
Write-Host "1. Configure initial admin users in Cognito" -ForegroundColor White
Write-Host "2. Upload legal form templates to S3" -ForegroundColor White
Write-Host "3. Set up monitoring alerts and notifications" -ForegroundColor White
Write-Host "4. Test the system with sample CAM documents" -ForegroundColor White
Write-Host "5. Configure compliance and audit settings" -ForegroundColor White
