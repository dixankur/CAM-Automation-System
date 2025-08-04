const express = require('express');
const cors = require('cors');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');

const app = express();
const PORT = 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = './uploads';
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueName = `${Date.now()}-${uuidv4()}-${file.originalname}`;
    cb(null, uniqueName);
  }
});

const upload = multer({ 
  storage: storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only PDF and Word documents are allowed.'));
    }
  }
});

// In-memory storage for demo (replace with database in production)
let camDocuments = new Map();
let workflows = new Map();
let auditLogs = [];

// Mock CAM document processing
function mockProcessCAMDocument(file) {
  // Simulate document processing
  return {
    documentId: uuidv4(),
    fileName: file.originalname,
    fileSize: file.size,
    uploadedAt: new Date().toISOString(),
    status: 'processing',
    extractedData: {
      borrower_name: 'Sample Borrower Corp',
      loan_amount: 5000000,
      loan_term: 60,
      interest_rate: 4.25,
      loan_type: 'Commercial Real Estate',
      jurisdiction: 'New York',
      collateral: 'Commercial Property - 123 Business Ave'
    },
    confidence: 0.92,
    validationResults: {
      isValid: true,
      errors: [],
      warnings: ['High-value loan requires additional approvals']
    }
  };
}

// Mock legal form matching
function mockLegalFormMatching(camData) {
  const loanAmount = camData.extractedData.loan_amount;
  
  let matchedForms = [];
  
  if (loanAmount > 10000000) {
    matchedForms = [
      {
        formId: 'FORM_A_LARGE',
        formName: 'Large Commercial Loan Agreement',
        templatePath: 'templates/large-commercial-loan.docx',
        jurisdiction: 'New York',
        priority: 1,
        requiredApprovals: ['Senior Credit Officer', 'Legal Counsel', 'Risk Manager']
      },
      {
        formId: 'FORM_B_COMPLIANCE',
        formName: 'High-Value Compliance Form',
        templatePath: 'templates/high-value-compliance.docx',
        jurisdiction: 'Federal',
        priority: 2,
        requiredApprovals: ['Compliance Officer']
      }
    ];
  } else if (loanAmount > 1000000) {
    matchedForms = [
      {
        formId: 'FORM_STANDARD_COMMERCIAL',
        formName: 'Standard Commercial Loan Agreement',
        templatePath: 'templates/standard-commercial.docx',
        jurisdiction: 'New York',
        priority: 1,
        requiredApprovals: ['Credit Officer', 'Legal Review']
      }
    ];
  } else {
    matchedForms = [
      {
        formId: 'FORM_SMALL_BUSINESS',
        formName: 'Small Business Loan Agreement',
        templatePath: 'templates/small-business.docx',
        jurisdiction: 'New York',
        priority: 1,
        requiredApprovals: ['Loan Officer']
      }
    ];
  }
  
  return matchedForms;
}

// API Routes

// Health check
app.get('/health', (req, res) => {
  res.json({ 
    status: 'healthy', 
    timestamp: new Date().toISOString(),
    service: 'CAM Automation Local Server'
  });
});

// Upload CAM document
app.post('/upload', upload.single('document'), (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    console.log(`📄 Processing uploaded file: ${req.file.originalname}`);
    
    // Mock document processing
    const processedDoc = mockProcessCAMDocument(req.file);
    camDocuments.set(processedDoc.documentId, processedDoc);
    
    // Log audit trail
    auditLogs.push({
      timestamp: new Date().toISOString(),
      action: 'DOCUMENT_UPLOAD',
      documentId: processedDoc.documentId,
      userId: 'demo-user',
      details: `Uploaded ${req.file.originalname}`
    });

    res.json({
      success: true,
      documentId: processedDoc.documentId,
      message: 'Document uploaded and processing started',
      data: processedDoc
    });

  } catch (error) {
    console.error('Upload error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get document status
app.get('/status/:documentId', (req, res) => {
  const { documentId } = req.params;
  const document = camDocuments.get(documentId);
  
  if (!document) {
    return res.status(404).json({ error: 'Document not found' });
  }

  // Simulate processing progress
  const now = new Date();
  const uploadTime = new Date(document.uploadedAt);
  const elapsedMinutes = (now - uploadTime) / (1000 * 60);
  
  let status = 'processing';
  let progress = Math.min(Math.floor(elapsedMinutes * 20), 100);
  
  if (progress >= 100) {
    status = 'completed';
    progress = 100;
    
    // Add matched forms if completed
    if (!document.matchedForms) {
      document.matchedForms = mockLegalFormMatching(document);
      document.status = 'completed';
    }
  }

  res.json({
    documentId,
    status,
    progress,
    ...document
  });
});

// List all documents
app.get('/documents', (req, res) => {
  const documents = Array.from(camDocuments.values());
  res.json({
    documents: documents.map(doc => ({
      documentId: doc.documentId,
      fileName: doc.fileName,
      status: doc.status,
      uploadedAt: doc.uploadedAt,
      borrower_name: doc.extractedData?.borrower_name,
      loan_amount: doc.extractedData?.loan_amount
    }))
  });
});

// Start workflow (maker-checker)
app.post('/workflow/start', (req, res) => {
  const { documentId, checkerEmail } = req.body;
  
  if (!documentId) {
    return res.status(400).json({ error: 'Document ID is required' });
  }

  const document = camDocuments.get(documentId);
  if (!document) {
    return res.status(404).json({ error: 'Document not found' });
  }

  const workflowId = uuidv4();
  const workflow = {
    workflowId,
    documentId,
    checkerEmail: checkerEmail || 'checker@bank.com',
    status: 'pending_review',
    createdAt: new Date().toISOString(),
    steps: [
      {
        stepId: 'maker_submission',
        status: 'completed',
        completedAt: new Date().toISOString()
      },
      {
        stepId: 'checker_review',
        status: 'pending',
        assignedTo: checkerEmail || 'checker@bank.com'
      }
    ]
  };

  workflows.set(workflowId, workflow);

  // Log audit trail
  auditLogs.push({
    timestamp: new Date().toISOString(),
    action: 'WORKFLOW_START',
    workflowId,
    documentId,
    userId: 'demo-user',
    details: 'Started maker-checker workflow'
  });

  res.json({
    success: true,
    workflowId,
    message: 'Workflow started successfully',
    workflow
  });
});

// Approve/Reject workflow
app.post('/workflow/:workflowId/decision', (req, res) => {
  const { workflowId } = req.params;
  const { decision, comments } = req.body; // decision: 'approve' or 'reject'
  
  const workflow = workflows.get(workflowId);
  if (!workflow) {
    return res.status(404).json({ error: 'Workflow not found' });
  }

  workflow.status = decision === 'approve' ? 'approved' : 'rejected';
  workflow.decision = decision;
  workflow.comments = comments;
  workflow.decidedAt = new Date().toISOString();

  // Update checker review step
  const checkerStep = workflow.steps.find(step => step.stepId === 'checker_review');
  if (checkerStep) {
    checkerStep.status = 'completed';
    checkerStep.decision = decision;
    checkerStep.comments = comments;
    checkerStep.completedAt = new Date().toISOString();
  }

  // Log audit trail
  auditLogs.push({
    timestamp: new Date().toISOString(),
    action: 'WORKFLOW_DECISION',
    workflowId,
    userId: 'checker-user',
    details: `Workflow ${decision}d: ${comments || 'No comments'}`
  });

  res.json({
    success: true,
    message: `Workflow ${decision}d successfully`,
    workflow
  });
});

// Chat/Voice interaction
app.post('/chat', (req, res) => {
  const { message, sessionId } = req.body;
  
  console.log(`💬 Chat message: ${message}`);
  
  // Simple rule-based responses for demo
  let response = "I understand you're working with CAM documents. How can I help you today?";
  let nextAction = 'general_help';
  let sentiment = 'neutral';
  
  const lowerMessage = message.toLowerCase();
  
  if (lowerMessage.includes('upload') || lowerMessage.includes('document')) {
    response = "I can help you upload a CAM document. Please use the upload endpoint or drag and drop your PDF file.";
    nextAction = 'upload_document';
  } else if (lowerMessage.includes('status') || lowerMessage.includes('progress')) {
    response = "I can check the processing status of your documents. Please provide the document ID.";
    nextAction = 'check_status';
  } else if (lowerMessage.includes('help') || lowerMessage.includes('how')) {
    response = "I can assist with: 1) Uploading CAM documents, 2) Checking processing status, 3) Starting approval workflows, 4) Generating legal forms. What would you like to do?";
    nextAction = 'show_options';
  } else if (lowerMessage.includes('error') || lowerMessage.includes('problem') || lowerMessage.includes('issue')) {
    response = "I understand you're experiencing an issue. Let me help you troubleshoot. Can you describe what happened?";
    nextAction = 'troubleshoot';
    sentiment = 'negative';
  }
  
  // Detect sentiment (simple keyword-based)
  if (lowerMessage.includes('frustrated') || lowerMessage.includes('angry') || lowerMessage.includes('terrible')) {
    sentiment = 'negative';
    response = "I understand your frustration. Let me personally assist you to resolve this quickly. " + response;
  } else if (lowerMessage.includes('great') || lowerMessage.includes('excellent') || lowerMessage.includes('perfect')) {
    sentiment = 'positive';
  }

  res.json({
    response,
    sentiment,
    nextAction,
    sessionId: sessionId || uuidv4(),
    timestamp: new Date().toISOString()
  });
});

// Get audit logs
app.get('/audit', (req, res) => {
  const { limit = 50, action, userId } = req.query;
  
  let filteredLogs = auditLogs;
  
  if (action) {
    filteredLogs = filteredLogs.filter(log => log.action === action);
  }
  
  if (userId) {
    filteredLogs = filteredLogs.filter(log => log.userId === userId);
  }
  
  // Sort by timestamp (newest first) and limit
  filteredLogs = filteredLogs
    .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
    .slice(0, parseInt(limit));

  res.json({
    auditLogs: filteredLogs,
    total: auditLogs.length
  });
});

// Error handling middleware
app.use((error, req, res, next) => {
  console.error('Server error:', error);
  res.status(500).json({ 
    error: 'Internal server error',
    message: error.message 
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 CAM Automation Local Server running on http://localhost:${PORT}`);
  console.log(`📋 Available endpoints:`);
  console.log(`   GET  /health - Health check`);
  console.log(`   POST /upload - Upload CAM document`);
  console.log(`   GET  /status/:documentId - Check processing status`);
  console.log(`   GET  /documents - List all documents`);
  console.log(`   POST /workflow/start - Start maker-checker workflow`);
  console.log(`   POST /workflow/:id/decision - Approve/reject workflow`);
  console.log(`   POST /chat - Chat interaction`);
  console.log(`   GET  /audit - Get audit logs`);
  console.log(`\n💡 Test with: curl http://localhost:${PORT}/health`);
});

module.exports = app;
