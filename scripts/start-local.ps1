# Quick Start Script for CAM Automation Local Testing
# Run this script to start the local development environment

Write-Host "🚀 Starting CAM Automation Local Testing Environment" -ForegroundColor Green
Write-Host "=================================================" -ForegroundColor Green

# Check if Node.js is installed
try {
    $nodeVersion = node --version
    Write-Host "✅ Node.js version: $nodeVersion" -ForegroundColor Green
} catch {
    Write-Host "❌ Node.js is not installed. Please install Node.js 18+ first." -ForegroundColor Red
    Write-Host "Download from: https://nodejs.org/" -ForegroundColor Yellow
    exit 1
}

# Navigate to services directory
$servicesPath = Join-Path $PSScriptRoot "..\services"
Set-Location $servicesPath

# Check if package.json exists
if (-not (Test-Path "package.json")) {
    Write-Host "❌ package.json not found in services directory" -ForegroundColor Red
    exit 1
}

# Install dependencies
Write-Host "📦 Installing dependencies..." -ForegroundColor Blue
npm install

if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Failed to install dependencies" -ForegroundColor Red
    exit 1
}

Write-Host "✅ Dependencies installed successfully" -ForegroundColor Green

# Create uploads directory
$uploadsDir = "uploads"
if (-not (Test-Path $uploadsDir)) {
    New-Item -ItemType Directory -Path $uploadsDir -Force | Out-Null
    Write-Host "📁 Created uploads directory" -ForegroundColor Blue
}

# Create public directory if it doesn't exist
$publicDir = "public"
if (-not (Test-Path $publicDir)) {
    New-Item -ItemType Directory -Path $publicDir -Force | Out-Null
    Write-Host "📁 Created public directory" -ForegroundColor Blue
}

# Start the local server
Write-Host "🌐 Starting CAM Automation Local Server..." -ForegroundColor Blue
Write-Host "Server will be available at: http://localhost:3000" -ForegroundColor Yellow
Write-Host "Web interface will be available at: http://localhost:3000" -ForegroundColor Yellow
Write-Host "" -ForegroundColor White
Write-Host "Press Ctrl+C to stop the server" -ForegroundColor Yellow
Write-Host "=================================================" -ForegroundColor Green

# Start the server
node local-api-server.js
