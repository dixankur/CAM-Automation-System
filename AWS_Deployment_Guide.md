# 🚀 Complete Guide: Deploying CAM Automation System to AWS

## 📋 Prerequisites (What You Need Before Starting)

### 1. Create an AWS Account
- Go to [aws.amazon.com](https://aws.amazon.com)
- Click "Create an AWS Account"
- Follow the registration process (you'll need a credit card)
- **Important**: AWS has a free tier, but this application may incur costs

### 2. Install Required Software on Your Computer

#### A. Install Node.js (Required for running the application)
1. Go to [nodejs.org](https://nodejs.org)
2. Download the **LTS version** (Long Term Support)
3. Run the installer and follow the setup wizard
4. **Verify installation**: Open Command Prompt/Terminal and type:
   ```
   node --version
   npm --version
   ```
   You should see version numbers displayed

#### B. Install Git (Required for downloading code)
1. Go to [git-scm.com](https://git-scm.com)
2. Download Git for your operating system
3. Install with default settings
4. **Verify installation**: Open Command Prompt/Terminal and type:
   ```
   git --version
   ```

#### C. Install AWS CLI (Required for AWS communication)
1. Go to [AWS CLI Installation Guide](https://docs.aws.amazon.com/cli/latest/userguide/getting-started-install.html)
2. Download the installer for your operating system
3. Run the installer
4. **Verify installation**: Open Command Prompt/Terminal and type:
   ```
   aws --version
   ```

#### D. Install AWS CDK (Required for infrastructure deployment)
1. Open Command Prompt/Terminal
2. Type the following command and press Enter:
   ```
   npm install -g aws-cdk
   ```
3. **Verify installation**:
   ```
   cdk --version
   ```

## 🔐 Step 1: Configure AWS Credentials

### 1.1 Create AWS Access Keys
1. Log into your AWS Console at [console.aws.amazon.com](https://console.aws.amazon.com)
2. Click on your username in the top-right corner
3. Select "Security credentials"
4. Scroll down to "Access keys"
5. Click "Create access key"
6. Choose "Command Line Interface (CLI)"
7. Check the confirmation box and click "Next"
8. Add a description tag (optional) and click "Create access key"
9. **IMPORTANT**: Copy both the "Access key ID" and "Secret access key" - save them securely!

### 1.2 Configure AWS CLI
1. Open Command Prompt/Terminal
2. Type the following command:
   ```
   aws configure
   ```
3. When prompted, enter:
   - **AWS Access Key ID**: [paste your access key ID]
   - **AWS Secret Access Key**: [paste your secret access key]
   - **Default region name**: `us-east-1` (or your preferred region)
   - **Default output format**: `json`

## 📥 Step 2: Download the Project Code

### 2.1 Clone the Repository
1. Open Command Prompt/Terminal
2. Navigate to where you want to store the project (e.g., Desktop):
   ```
   cd Desktop
   ```
3. Clone the repository:
   ```
   git clone https://github.com/dixankur/CAM-Automation-System.git
   ```
4. Navigate into the project folder:
   ```
   cd CAM-Automation-System
   ```

## 🔧 Step 3: Install Project Dependencies

### 3.1 Install Main Dependencies
1. In the project root folder, run:
   ```
   npm install
   ```
   **Wait for this to complete** - it may take several minutes

### 3.2 Install Service Dependencies
1. Navigate to the services folder:
   ```
   cd services
   ```
2. Install service dependencies:
   ```
   npm install
   ```
3. Go back to the project root:
   ```
   cd ..
   ```

### 3.3 Install Infrastructure Dependencies
1. Navigate to the infrastructure folder:
   ```
   cd infrastructure
   ```
2. Install infrastructure dependencies:
   ```
   npm install
   ```
3. Go back to the project root:
   ```
   cd ..
   ```

## 🏗️ Step 4: Bootstrap AWS CDK (One-time setup)

### 4.1 Bootstrap CDK in Your AWS Account
1. From the project root, run:
   ```
   cdk bootstrap
   ```
2. **Wait for completion** - this sets up necessary AWS resources for CDK
3. You should see a success message when done

## 🚀 Step 5: Deploy Infrastructure to AWS

### 5.1 Build the Infrastructure
1. From the project root, run:
   ```
   npm run build:infrastructure
   ```
2. Wait for the build to complete

### 5.2 Deploy Infrastructure
1. Run the deployment command:
   ```
   npm run deploy:infrastructure
   ```
2. **Important**: You may be prompted to approve security changes - type `y` and press Enter
3. **This will take 10-20 minutes** - AWS is creating all the necessary resources
4. **Do not close the terminal** during this process

### 5.3 Verify Infrastructure Deployment
1. Log into your AWS Console
2. Check the following services to confirm resources were created:
   - **CloudFormation**: You should see stacks created
   - **Lambda**: You should see functions created
   - **DynamoDB**: You should see tables created
   - **S3**: You should see buckets created

## 📱 Step 6: Deploy Application Services

### 6.1 Build Services
1. From the project root, run:
   ```
   npm run build:services
   ```

### 6.2 Deploy Services
1. Run the deployment command:
   ```
   npm run deploy:services
   ```
2. Wait for completion (5-10 minutes)

## 🌐 Step 7: Access Your Application

### 7.1 Find Your Application URL
1. In AWS Console, go to **API Gateway**
2. Find your CAM Automation API
3. Click on it and look for the "Invoke URL"
4. Copy this URL - this is your application's web address

### 7.2 Test Your Application
1. Open a web browser
2. Go to your application URL
3. You should see the CAM Automation System interface

## 🔍 Step 8: Monitor and Manage Your Application

### 8.1 Check Application Logs
1. In AWS Console, go to **CloudWatch**
2. Click "Log groups"
3. Look for log groups related to your application
4. Click on them to view application logs

### 8.2 Monitor Costs
1. In AWS Console, go to **Billing & Cost Management**
2. Check your current usage and costs
3. Set up billing alerts if desired

## 🛠️ Step 9: Making Updates to Your Application

### 9.1 When You Make Code Changes
1. Navigate to your project folder on your computer
2. Make your code changes
3. Commit changes to Git:
   ```
   git add .
   git commit -m "Your change description"
   git push origin main
   ```
4. Redeploy:
   ```
   npm run deploy
   ```

## 🆘 Troubleshooting Common Issues

### Issue 1: "Access Denied" Errors
- **Solution**: Check your AWS credentials are correctly configured
- Run `aws configure list` to verify

### Issue 2: CDK Bootstrap Fails
- **Solution**: Ensure you have proper AWS permissions
- Your AWS user needs Administrator access or specific CDK permissions

### Issue 3: Deployment Takes Too Long
- **Solution**: This is normal for first deployment
- Infrastructure creation can take 15-30 minutes

### Issue 4: Application Not Loading
- **Solution**: Check CloudWatch logs for errors
- Verify all services deployed successfully

## 💰 Cost Management

### Expected AWS Costs
- **Development/Testing**: $10-50/month
- **Production**: $100-500/month (depending on usage)
- **Free Tier**: Some services may be free for first 12 months

### Cost Optimization Tips
1. Use AWS Free Tier when possible
2. Set up billing alerts
3. Stop/delete resources when not needed
4. Monitor usage regularly

## 🔒 Security Best Practices

1. **Never share your AWS access keys**
2. **Use strong passwords for AWS account**
3. **Enable MFA (Multi-Factor Authentication) on your AWS account**
4. **Regularly rotate access keys**
5. **Monitor AWS CloudTrail for unusual activity**

## 📞 Getting Help

### If You Get Stuck:
1. **Check AWS Documentation**: [docs.aws.amazon.com](https://docs.aws.amazon.com)
2. **AWS Support**: Available through AWS Console
3. **Community Forums**: AWS Developer Forums
4. **Stack Overflow**: Search for specific error messages

---

## ✅ Quick Checklist

Before starting, make sure you have:
- [ ] AWS Account created
- [ ] Node.js installed
- [ ] Git installed
- [ ] AWS CLI installed
- [ ] AWS CDK installed
- [ ] AWS credentials configured

During deployment:
- [ ] Code cloned from GitHub
- [ ] Dependencies installed
- [ ] CDK bootstrapped
- [ ] Infrastructure deployed
- [ ] Services deployed
- [ ] Application URL obtained
- [ ] Application tested

**Congratulations!** 🎉 Your CAM Automation System should now be running on AWS!

---

## 📋 Command Reference Sheet

### Essential Commands (Copy & Paste Ready)

**Initial Setup:**
```bash
# Install CDK globally
npm install -g aws-cdk

# Configure AWS
aws configure

# Clone repository
git clone https://github.com/dixankur/CAM-Automation-System.git
cd CAM-Automation-System
```

**Installation:**
```bash
# Install main dependencies
npm install

# Install service dependencies
cd services
npm install
cd ..

# Install infrastructure dependencies
cd infrastructure
npm install
cd ..
```

**Deployment:**
```bash
# Bootstrap CDK (one-time only)
cdk bootstrap

# Build and deploy infrastructure
npm run build:infrastructure
npm run deploy:infrastructure

# Build and deploy services
npm run build:services
npm run deploy:services
```

**Verification Commands:**
```bash
# Check versions
node --version
npm --version
git --version
aws --version
cdk --version

# Check AWS configuration
aws configure list
```

---

*This guide was created for the CAM Automation System deployment. For technical support, refer to the project documentation or contact the development team.*
