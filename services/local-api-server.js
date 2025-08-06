const express = require('express');
const cors = require('cors');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');
const { UserOnboarding, ONBOARDING_STATES } = require('./onboarding');

const app = express();
const PORT = 3000;

// In-memory store for user sessions and onboarding
const userSessions = new Map();

// Get or create user session
function getUserSession(sessionId) {
    if (!sessionId || !userSessions.has(sessionId)) {
        const newSessionId = uuidv4();
        userSessions.set(newSessionId, {
            id: newSessionId,
            onboarding: new UserOnboarding(newSessionId),
            preferences: {},
            lastActivity: new Date().toISOString()
        });
        return userSessions.get(newSessionId);
    }
    
    const session = userSessions.get(sessionId);
    session.lastActivity = new Date().toISOString();
    return session;
}

// Clean up old sessions (in a real app, use a proper session store with TTL)
setInterval(() => {
    const now = new Date();
    const oneHour = 60 * 60 * 1000; // 1 hour
    
    for (const [sessionId, session] of userSessions.entries()) {
        const lastActive = new Date(session.lastActivity);
        if (now - lastActive > oneHour) {
            userSessions.delete(sessionId);
        }
    }
}, 30 * 60 * 1000); // Check every 30 minutes

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

// Enhanced sentiment analysis function
function analyzeSentiment(text) {
  const lowerText = text.toLowerCase();
  let score = 0;
  const words = lowerText.split(/\s+/);
  
  // Sentiment word lists (expanded for better accuracy)
  const positiveWords = [
    'great', 'excellent', 'perfect', 'good', 'awesome', 'fantastic', 'wonderful',
    'amazing', 'superb', 'outstanding', 'pleased', 'happy', 'satisfied', 'thanks',
    'thank you', 'appreciate', 'helpful', 'smooth', 'easy', 'quick', 'fast'
  ];
  
  const negativeWords = [
    'bad', 'poor', 'terrible', 'awful', 'horrible', 'frustrated', 'angry',
    'upset', 'annoyed', 'disappointed', 'problem', 'issue', 'error', 'fail',
    'broken', 'slow', 'difficult', 'confusing', 'stuck', 'hate', 'worst'
  ];
  
  const intensifiers = ['very', 'really', 'extremely', 'incredibly', 'absolutely', 'completely'];
  const negators = ['not', 'never', 'no', 'n\'t', 'hardly', 'barely'];
  
  let negation = false;
  let lastWord = '';
  
  // Analyze each word
  words.forEach(word => {
    const cleanWord = word.replace(/[^a-z']/g, '');
    
    if (negators.includes(cleanWord)) {
      negation = true;
    } else if (positiveWords.includes(cleanWord)) {
      const modifier = intensifiers.includes(lastWord) ? 2 : 1;
      score += negation ? -1 * modifier : 1 * modifier;
      negation = false;
    } else if (negativeWords.includes(cleanWord)) {
      const modifier = intensifiers.includes(lastWord) ? 2 : 1;
      score += negation ? 1 * modifier : -1 * modifier;
      negation = false;
    } else if (cleanWord === 'but' || cleanWord === 'however') {
      // Reset negation after contrastive conjunctions
      negation = false;
    }
    
    lastWord = cleanWord;
  });
  
  // Determine sentiment based on score
  if (score > 1) return { sentiment: 'positive', score };
  if (score < -1) return { sentiment: 'negative', score };
  return { sentiment: 'neutral', score };
}

// Enhanced chat response generation
function generateResponse(message, sentiment, sentimentScore) {
  const lowerMessage = message.toLowerCase();
  
  // Greeting patterns
  if (/^(hi|hello|hey|greetings)/i.test(lowerMessage)) {
    const greetings = [
      "Hello! I'm your CAM assistant. How can I help you today?",
      "Hi there! I'm here to assist with your CAM automation needs.",
      "Greetings! How can I assist you with CAM documents today?"
    ];
    return greetings[Math.floor(Math.random() * greetings.length)];
  }
  
  // Document upload
  if (/(upload|add|new).*(document|file|pdf|word|doc)/i.test(lowerMessage)) {
    return "You can upload a CAM document by dragging and dropping it into the upload area or clicking the 'Choose Files' button above.";
  }
  
  // Status check
  if (/(status|progress|where).*(document|file|upload|my)/i.test(lowerMessage)) {
    return "I can check the status of your documents. Please select a document from the list above, or let me know the document ID.";
  }
  
  // Help request
  if (/(help|support|assistance|how to)/i.test(lowerMessage)) {
    return "I can help you with:\n1. Uploading and processing CAM documents\n2. Checking document status\n3. Starting approval workflows\n4. Answering questions about CAM processes\n\nWhat would you like to do?";
  }
  
  // Error/issue reporting
  if (/(error|issue|problem|not working|broken)/i.test(lowerMessage)) {
    if (sentiment === 'negative') {
      return `I'm really sorry to hear you're having trouble. Let me help resolve this issue for you. Could you please provide more details about what's not working?`;
    }
    return "I'd be happy to help with that issue. Could you please provide more details about what you're experiencing?";
  }
  
  // Thank you responses
  if (/(thank|thanks|appreciate)/i.test(lowerMessage)) {
    const thanksResponses = [
      "You're welcome! Is there anything else I can help you with?",
      "Happy to help! Let me know if you need anything else.",
      "You're very welcome! Don't hesitate to ask if you have more questions."
    ];
    return thanksResponses[Math.floor(Math.random() * thanksResponses.length)];
  }
  
  // Default response based on sentiment
  if (sentiment === 'positive') {
    const positiveResponses = [
      "That's great to hear! How can I assist you further?",
      "I'm glad things are going well! What would you like to do next?",
      "That's wonderful! Is there anything specific you'd like help with?"
    ];
    return positiveResponses[Math.floor(Math.random() * positiveResponses.length)];
  }
  
  if (sentiment === 'negative') {
    const negativeResponses = [
      "I'm really sorry to hear you're having a difficult time. Let me help resolve this for you.",
      "I understand this is frustrating. Let's work together to fix this issue.",
      "I apologize for the inconvenience. Let me help you with that."
    ];
    return negativeResponses[Math.floor(Math.random() * negativeResponses.length)];
  }
  
  // Default neutral response
  const neutralResponses = [
    "I understand. How can I assist you with your CAM documents today?",
    "Got it. What would you like to do next?",
    "I'm here to help. What do you need assistance with?"
  ];
  return neutralResponses[Math.floor(Math.random() * neutralResponses.length)];
}

// Chat/Voice interaction with onboarding flow
app.post('/chat', (req, res) => {
  try {
    let { message, sessionId } = req.body;
    
    if (!message || typeof message !== 'string' || message.trim() === '') {
      return res.status(400).json({ error: 'Message is required' });
    }
    
    console.log(`💬 Chat message: ${message}`);
    
    // Get or create user session
    const userSession = getUserSession(sessionId);
    sessionId = userSession.id; // Ensure we have a valid session ID
    
    // Analyze sentiment of the message
    const { sentiment, score } = analyzeSentiment(message);
    console.log(`📊 Detected sentiment: ${sentiment} (score: ${score})`);
    
    // Update user's sentiment in the onboarding flow
    userSession.onboarding.updateSentiment(sentiment);
    
    // Check if we're in an onboarding flow
    let response;
    if (!userSession.onboarding.isComplete() || /(help|onboarding|guide|tutorial)/i.test(message.toLowerCase())) {
      // Get next onboarding message
      response = userSession.onboarding.getNextMessage(message);
    } else {
      // Use regular chat flow
      response = generateResponse(message, sentiment, score);
    }
    
    // Log the interaction for context (in a real app, store this in a database)
    const chatLog = {
      timestamp: new Date().toISOString(),
      sessionId,
      userMessage: message,
      botResponse: response,
      sentiment,
      sentimentScore: score,
      onboardingState: userSession.onboarding.state
    };
    
    console.log('💭 Chat interaction:', JSON.stringify(chatLog, null, 2));
    
    // Return the response with sentiment information
    res.json({
      response,
      sentiment,
      sentimentScore: score,
      sessionId,
      timestamp: chatLog.timestamp,
      onboardingState: userSession.onboarding.state,
      isOnboardingComplete: userSession.onboarding.isComplete()
    });
    
  } catch (error) {
    console.error('Error in chat endpoint:', error);
    res.status(500).json({
      error: 'An error occurred while processing your message',
      message: error.message
    });
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
