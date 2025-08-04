# CAM Automation System - Testing Guide

## Overview
This guide provides multiple ways to test the CAM automation system, including local development without AWS credentials and full AWS deployment testing.

## Testing Options

### 1. 🏠 Local Development (No AWS Credentials Required)
Test the core logic and workflows using local mocks and simulators.

### 2. 🧪 Unit & Integration Testing
Comprehensive test suites for all components.

### 3. ☁️ AWS Deployment Testing
Full end-to-end testing with real AWS services.

---

## 🏠 Local Development Setup

### Prerequisites
- Node.js 18+ installed
- Python 3.11+ installed
- Docker Desktop (optional, for advanced local testing)

### Quick Start - Local Testing

1. **Install Dependencies**
   ```powershell
   cd CAM-Automation-System
   npm install
   ```

2. **Run Local Mock Services**
   ```powershell
   npm run start:local
   ```

3. **Test Individual Components**
   ```powershell
   npm run test:unit
   npm run test:integration
   ```

---

## 🧪 Testing Components

### A. Document Processing Tests
Test CAM document parsing and validation without AWS Textract.

### B. AI Logic Tests  
Test business rules and validation logic without AWS Bedrock.

### C. Workflow Tests
Test Step Functions logic using local state machine simulator.

### D. API Tests
Test REST and GraphQL APIs using local mock servers.

### E. Security Tests
Test authentication and authorization flows locally.

---

## 📋 Test Scenarios

### Scenario 1: CAM Document Upload
- Upload sample CAM PDF
- Validate document structure
- Extract key fields
- Generate legal forms

### Scenario 2: Maker-Checker Workflow
- Submit document for review
- Simulate checker approval/rejection
- Track audit trail

### Scenario 3: Multi-Language Support
- Test with documents in different languages
- Validate translation capabilities

### Scenario 4: Error Handling
- Test with invalid documents
- Test network failures
- Test timeout scenarios

---

## 🔧 Local Mock Services

We'll create local versions of AWS services for testing:
- **LocalStack** for AWS service mocking
- **Mock Bedrock** for AI responses
- **Mock S3** for document storage
- **Mock DynamoDB** for data persistence
- **Mock Step Functions** for workflow testing

---

## ☁️ AWS Setup (When Ready)

### Step 1: Create AWS Account
1. Go to [aws.amazon.com](https://aws.amazon.com)
2. Create free tier account
3. Verify email and phone

### Step 2: Install AWS CLI
```powershell
# Download and install AWS CLI v2
# https://aws.amazon.com/cli/
```

### Step 3: Configure Credentials
```powershell
aws configure
# Enter Access Key ID
# Enter Secret Access Key  
# Enter Default region (us-east-1)
# Enter Default output format (json)
```

### Step 4: Deploy to AWS
```powershell
cd scripts
.\deploy.ps1 -Environment dev
```

---

## 🎯 Testing Checklist

### Local Testing ✅
- [ ] Document upload simulation
- [ ] Text extraction mock
- [ ] Business rule validation
- [ ] Form generation
- [ ] Workflow state transitions
- [ ] API endpoint responses
- [ ] Error handling
- [ ] Security validations

### AWS Testing (When Ready) ✅
- [ ] Real document processing
- [ ] AI model responses
- [ ] Database operations
- [ ] File storage
- [ ] Notifications
- [ ] Monitoring dashboards
- [ ] Audit logging
- [ ] Multi-region deployment

---

## 📊 Sample Test Data

We'll provide sample CAM documents and expected outputs for testing:
- Sample PDF documents
- Expected JSON extractions
- Legal form templates
- Test user accounts
- Mock approval workflows

---

## 🚨 Troubleshooting

### Common Issues
1. **Node.js version conflicts** - Use Node 18+
2. **Python dependencies** - Install required packages
3. **Port conflicts** - Check if ports 3000, 8000 are free
4. **File permissions** - Run as administrator if needed

### Getting Help
- Check logs in `/logs` directory
- Review error messages in console
- Consult AWS documentation for service-specific issues
- Use AWS support for deployment problems

---

## 📈 Performance Testing

### Load Testing
- Simulate multiple concurrent users
- Test document processing throughput
- Monitor memory and CPU usage
- Validate auto-scaling behavior

### Security Testing
- Test authentication flows
- Validate encryption
- Check access controls
- Audit trail verification

---

## 🎉 Next Steps

1. **Start with Local Testing** - No AWS needed
2. **Set up AWS Account** - When ready for cloud testing
3. **Deploy Infrastructure** - Use provided scripts
4. **Run End-to-End Tests** - Full system validation
5. **Monitor and Optimize** - Use CloudWatch dashboards
