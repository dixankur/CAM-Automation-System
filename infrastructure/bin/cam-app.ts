#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';
import { CamInfrastructureStack } from '../lib/cam-infrastructure-stack';
import { CamSecurityStack } from '../lib/cam-security-stack';
import { CamDataStack } from '../lib/cam-data-stack';
import { CamAiStack } from '../lib/cam-ai-stack';
import { CamWorkflowStack } from '../lib/cam-workflow-stack';
import { CamMonitoringStack } from '../lib/cam-monitoring-stack';

const app = new cdk.App();

// Environment configuration
const env = {
  account: process.env.CDK_DEFAULT_ACCOUNT,
  region: process.env.CDK_DEFAULT_REGION || 'us-east-1',
};

// Security and foundational stack (must be deployed first)
const securityStack = new CamSecurityStack(app, 'CamSecurityStack', {
  env,
  description: 'Security, IAM, and encryption resources for CAM system',
});

// Data layer stack
const dataStack = new CamDataStack(app, 'CamDataStack', {
  env,
  description: 'Data storage and management resources',
  kmsKey: securityStack.kmsKey,
});

// AI and ML services stack
const aiStack = new CamAiStack(app, 'CamAiStack', {
  env,
  description: 'AI/ML services for document processing and analysis',
  kmsKey: securityStack.kmsKey,
});

// Workflow and orchestration stack
const workflowStack = new CamWorkflowStack(app, 'CamWorkflowStack', {
  env,
  description: 'Step Functions and workflow orchestration',
  documentBucket: dataStack.documentBucket,
  templateBucket: dataStack.templateBucket,
  auditTable: dataStack.auditTable,
  kmsKey: securityStack.kmsKey,
});

// Main infrastructure stack
const infrastructureStack = new CamInfrastructureStack(app, 'CamInfrastructureStack', {
  env,
  description: 'Main CAM automation infrastructure',
  securityStack,
  dataStack,
  aiStack,
  workflowStack,
});

// Monitoring and observability stack
const monitoringStack = new CamMonitoringStack(app, 'CamMonitoringStack', {
  env,
  description: 'Monitoring, logging, and observability',
  infrastructureStack,
});

// Add dependencies
dataStack.addDependency(securityStack);
aiStack.addDependency(securityStack);
workflowStack.addDependency(dataStack);
workflowStack.addDependency(aiStack);
infrastructureStack.addDependency(workflowStack);
monitoringStack.addDependency(infrastructureStack);

// Tags for compliance and cost tracking
const tags = {
  Project: 'CAM-Automation',
  Environment: process.env.ENVIRONMENT || 'dev',
  Owner: 'Banking-Technology-Team',
  Compliance: 'High-Net-Worth-Banking',
  CostCenter: 'IT-Banking-Operations',
};

Object.entries(tags).forEach(([key, value]) => {
  cdk.Tags.of(app).add(key, value);
});
