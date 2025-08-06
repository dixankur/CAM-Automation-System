// Onboarding flow states
const ONBOARDING_STATES = {
    NOT_STARTED: 'not_started',
    GREETING: 'greeting',
    EXPLAIN_FEATURES: 'explain_features',
    ASK_ABOUT_NEEDS: 'ask_about_needs',
    SUGGEST_ACTION: 'suggest_action',
    COMPLETE: 'complete'
};

// User context to track onboarding progress
class UserOnboarding {
    constructor(userId) {
        this.userId = userId;
        this.state = ONBOARDING_STATES.NOT_STARTED;
        this.userNeeds = [];
        this.sentiment = 'neutral';
        this.previousResponses = [];
    }

    // Update user's sentiment based on their messages
    updateSentiment(sentiment) {
        this.sentiment = sentiment;
        // Store sentiment history for more nuanced responses
        this.previousResponses.push({
            timestamp: new Date().toISOString(),
            sentiment: sentiment
        });
    }

    // Get the next onboarding message based on current state
    getNextMessage(userInput = '') {
        const lowerInput = userInput.toLowerCase();
        let response = '';
        let nextState = this.state;
        const isPositive = this.sentiment === 'positive';

        switch (this.state) {
            case ONBOARDING_STATES.NOT_STARTED:
                response = "👋 Welcome to the CAM Automation System! I'm here to help you manage your commercial asset management documents. " +
                          "Would you like me to show you around and explain what I can do?";
                nextState = ONBOARDING_STATES.GREETING;
                break;

            case ONBOARDING_STATES.GREETING:
                if (/(yes|sure|ok|yeah|yep|please|go ahead)/i.test(lowerInput)) {
                    response = "Great! Let me give you a quick overview of what I can help you with.\n\n" +
                              "I can assist you with:\n" +
                              "1. 📄 Uploading and processing CAM documents\n" +
                              "2. 🔍 Extracting key information from your documents\n" +
                              "3. ✅ Managing approval workflows\n" +
                              "4. 📊 Tracking document status and history\n\n" +
                              "What would you like to do first?";
                    nextState = ONBOARDING_STATES.EXPLAIN_FEATURES;
                } else {
                    response = "No problem! You can ask me for help anytime by typing 'help' or clicking the help button. " +
                              "What would you like to do?";
                    nextState = ONBOARDING_STATES.ASK_ABOUT_NEEDS;
                }
                break;

            case ONBOARDING_STATES.EXPLAIN_FEATURES:
                // Extract user needs based on their response
                if (/(upload|add|new)/i.test(lowerInput)) {
                    this.userNeeds.push('upload_document');
                    response = "I can help you upload a document. You can drag and drop a file or click the upload button. " +
                              "Would you like me to guide you through the upload process?";
                } else if (/(status|progress|where)/i.test(lowerInput)) {
                    this.userNeeds.push('check_status');
                    response = "I can help you check the status of your documents. " +
                              "Would you like to see a list of your recent documents?";
                } else if (/(workflow|approval|process)/i.test(lowerInput)) {
                    this.userNeeds.push('workflow_help');
                    response = "I can guide you through the approval workflow process. " +
                              "Would you like me to explain how the maker-checker workflow works?";
                } else {
                    response = "I can help with various tasks. Just let me know what you'd like to do!\n\n" +
                              "You can say things like:\n" +
                              "• 'Upload a new document'\n" +
                              "• 'Check document status'\n" +
                              "• 'Start an approval workflow'\n" +
                              "• 'Show me recent activity'\n\n" +
                              "What would you like to do?";
                }
                nextState = ONBOARDING_STATES.SUGGEST_ACTION;
                break;

            case ONBOARDING_STATES.ASK_ABOUT_NEEDS:
                // Handle user's stated needs
                if (lowerInput.trim()) {
                    response = this.getResponseForUserNeed(lowerInput);
                    nextState = ONBOARDING_STATES.SUGGEST_ACTION;
                } else {
                    response = "I'm here to help! You can ask me about uploading documents, checking status, or managing workflows. " +
                              "What would you like to do?";
                }
                break;

            case ONBOARDING_STATES.SUGGEST_ACTION:
                // Based on sentiment, provide appropriate guidance
                if (isPositive) {
                    response = "Great! Is there anything else I can help you with?";
                } else if (this.sentiment === 'negative') {
                    response = "I'm sorry to hear that. Let me know how I can improve your experience. " +
                              "Would you like to try a different approach or talk to a human representative?";
                } else {
                    response = "How else can I assist you today?";
                }
                nextState = ONBOARDING_STATES.COMPLETE;
                break;

            case ONBOARDING_STATES.COMPLETE:
                // Check if user needs more help
                if (/(yes|help|need|assist)/i.test(lowerInput)) {
                    response = "I'm here to help! What would you like to do next?\n" +
                              "You can try:\n" +
                              "• 'Upload a document'\n" +
                              "• 'Check document status'\n" +
                              "• 'Start a workflow'\n" +
                              "• 'Show me the help menu'";
                } else {
                    response = "Feel free to ask if you need any help. Have a great day!";
                }
                break;
        }

        // Update state for next interaction
        this.state = nextState;
        return response;
    }

    // Generate response based on detected user needs
    getResponseForUserNeed(userInput) {
        const lowerInput = userInput.toLowerCase();
        
        if (/(upload|add|new)/i.test(lowerInput)) {
            return "To upload a document, you can drag and drop it into the upload area or click the 'Choose Files' button. " +
                   "I'll automatically process it and extract the important information for you.";
        } 
        
        if (/(status|progress|where)/i.test(lowerInput)) {
            return "You can check the status of your documents in the 'Document Status' section. " +
                   "I'll show you the processing stage of each document and notify you of any actions needed.";
        }
        
        if (/(workflow|approval|process)/i.test(lowerInput)) {
            return "The approval workflow helps ensure documents are properly reviewed. Here's how it works:\n" +
                   "1. A 'maker' uploads and submits a document\n" +
                   "2. A 'checker' reviews and approves/rejects it\n" +
                   "3. Both parties receive notifications of the status\n\n" +
                   "Would you like to start a new workflow?";
        }
        
        // Default response for unrecognized needs
        return "I can help you with various tasks. You can ask me about:\n" +
               "• Uploading documents\n" +
               "• Checking document status\n" +
               "• Managing approval workflows\n" +
               "• Getting help with specific features\n\n" +
               "What would you like to do?";
    }

    // Check if onboarding is complete
    isComplete() {
        return this.state === ONBOARDING_STATES.COMPLETE;
    }
}

// Export the onboarding class and states
module.exports = {
    UserOnboarding,
    ONBOARDING_STATES
};
