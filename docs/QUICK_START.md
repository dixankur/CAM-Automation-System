# 🚀 Quick Start Guide - CAM Automation System

## Test the System Locally (No AWS Required!)

### Step 1: Install Node.js
If you don't have Node.js installed:
1. Download from [nodejs.org](https://nodejs.org/) (version 18 or higher)
2. Install and restart your terminal

### Step 2: Start the Local Server
```powershell
cd CAM-Automation-System\scripts
.\start-local.ps1
```

### Step 3: Open Your Browser
Navigate to: **http://localhost:3000**

## 🎯 What You Can Test

### 1. Document Upload & Processing
- **Upload PDF/Word documents** (any file will work for demo)
- **Watch real-time processing** with progress bars
- **View extracted data** (mocked CAM fields)
- **See validation results** and confidence scores

### 2. AI Chat Assistant
- **Ask questions** like "How do I upload a document?"
- **Get help** with CAM processing
- **Test sentiment analysis** (try saying "I'm frustrated")
- **Receive contextual responses**

### 3. Maker-Checker Workflow
- **Start approval workflows** for uploaded documents
- **Simulate checker approval/rejection**
- **Track workflow status** and decisions
- **View audit trails** for all actions

### 4. Legal Form Matching
- **Automatic form selection** based on loan amount
- **See matched legal templates** for different scenarios
- **View required approvals** for each form type

### 5. Audit & Compliance
- **View audit logs** for all system actions
- **Track user activities** and timestamps
- **Monitor compliance events**

## 📋 Test Scenarios

### Scenario A: Small Business Loan
1. Upload any PDF file
2. System will simulate: Loan Amount = $500,000
3. Watch it match to "Small Business Loan Agreement"
4. Start workflow and approve

### Scenario B: Large Commercial Loan  
1. Upload another document
2. System will simulate: Loan Amount = $15,000,000
3. See it match multiple forms including compliance forms
4. Test the maker-checker process

### Scenario C: Chat Interaction
1. Type: "I need help uploading a document"
2. Try: "I'm having problems with processing"
3. Ask: "What's the status of my loan?"

## 🔧 API Testing (Advanced)

You can also test the APIs directly:

```bash
# Health check
curl http://localhost:3000/health

# Upload document (replace with actual file)
curl -X POST -F "document=@sample.pdf" http://localhost:3000/upload

# Check status (replace with actual document ID)
curl http://localhost:3000/status/your-document-id

# Chat interaction
curl -X POST -H "Content-Type: application/json" \
  -d '{"message":"Hello, I need help"}' \
  http://localhost:3000/chat
```

## 🎨 What You'll See

### Real-Time Features:
- ✅ **Progress bars** showing document processing
- ✅ **Status indicators** (processing, completed, error)
- ✅ **Live chat responses** with sentiment analysis
- ✅ **Workflow state changes** in real-time
- ✅ **Audit log updates** as actions occur

### Mock AI Responses:
- 📄 **Document extraction** with realistic CAM fields
- 🤖 **Intelligent chat** responses based on context
- ⚖️ **Legal form matching** with business rules
- 🔍 **Validation results** with confidence scores

## 🚫 No AWS Setup Required

This local environment mocks all AWS services:
- **S3** → Local file storage
- **Textract** → Mock document extraction  
- **Bedrock** → Simulated AI responses
- **DynamoDB** → In-memory data storage
- **Step Functions** → Local workflow engine
- **Comprehend** → Mock sentiment analysis

## 🔄 When Ready for AWS

Once you have AWS credentials:
1. Set up AWS account and configure credentials
2. Run the deployment script: `.\deploy.ps1`
3. Replace mock services with real AWS integrations

## 🆘 Troubleshooting

### Port Already in Use
```powershell
# Kill process on port 3000
netstat -ano | findstr :3000
taskkill /PID <process-id> /F
```

### Node.js Issues
```powershell
# Check Node version
node --version  # Should be 18+

# Clear npm cache
npm cache clean --force
```

### File Upload Issues
- Ensure uploads directory exists
- Check file permissions
- Try smaller files (< 10MB)

## 🎉 Success Indicators

You'll know it's working when you see:
- ✅ Server starts on http://localhost:3000
- ✅ Web interface loads with upload area
- ✅ Documents upload and show processing status
- ✅ Chat responds to your messages
- ✅ Workflows can be started and completed
- ✅ Audit logs show all activities

**Ready to test? Run the start script and open your browser!** 🚀
