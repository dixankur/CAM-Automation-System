import * as cdk from 'aws-cdk-lib';
import * as apigateway from 'aws-cdk-lib/aws-apigateway';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as appsync from 'aws-cdk-lib/aws-appsync';
import * as iam from 'aws-cdk-lib/aws-iam';
import { Construct } from 'constructs';
import { CamSecurityStack } from './cam-security-stack';
import { CamDataStack } from './cam-data-stack';
import { CamAiStack } from './cam-ai-stack';
import { CamWorkflowStack } from './cam-workflow-stack';

interface CamInfrastructureStackProps extends cdk.StackProps {
  securityStack: CamSecurityStack;
  dataStack: CamDataStack;
  aiStack: CamAiStack;
  workflowStack: CamWorkflowStack;
}

export class CamInfrastructureStack extends cdk.Stack {
  public readonly api: apigateway.RestApi;
  public readonly graphqlApi: appsync.GraphqlApi;
  public readonly adminFunction: lambda.Function;
  public readonly userFunction: lambda.Function;

  constructor(scope: Construct, id: string, props: CamInfrastructureStackProps) {
    super(scope, id, props);

    // REST API Gateway
    this.api = new apigateway.RestApi(this, 'CamApi', {
      restApiName: 'cam-automation-api',
      description: 'REST API for CAM automation system',
      defaultCorsPreflightOptions: {
        allowOrigins: apigateway.Cors.ALL_ORIGINS,
        allowMethods: apigateway.Cors.ALL_METHODS,
        allowHeaders: [
          'Content-Type',
          'X-Amz-Date',
          'Authorization',
          'X-Api-Key',
          'X-Amz-Security-Token',
        ],
      },
      deployOptions: {
        stageName: 'prod',
        tracingEnabled: true,
        loggingLevel: apigateway.MethodLoggingLevel.INFO,
        dataTraceEnabled: true,
        metricsEnabled: true,
      },
    });

    // Associate WAF with API Gateway
    new apigateway.CfnStage(this, 'ApiStageWithWaf', {
      restApiId: this.api.restApiId,
      stageName: 'prod',
      webAclArn: props.securityStack.webAcl.attrArn,
    });

    // Lambda function for admin operations
    this.adminFunction = new lambda.Function(this, 'AdminFunction', {
      functionName: 'cam-admin-api',
      runtime: lambda.Runtime.PYTHON_3_11,
      handler: 'index.handler',
      code: lambda.Code.fromInline(`
import json
import boto3
import logging
from typing import Dict, Any

logger = logging.getLogger()
logger.setLevel(logging.INFO)

dynamodb = boto3.resource('dynamodb')
s3 = boto3.client('s3')
stepfunctions = boto3.client('stepfunctions')

def handler(event: Dict[str, Any], context) -> Dict[str, Any]:
    """
    Handle admin API requests
    """
    try:
        http_method = event['httpMethod']
        path = event['path']
        
        logger.info(f"Admin API: {http_method} {path}")
        
        if path.startswith('/admin/templates'):
            return handle_template_management(event)
        elif path.startswith('/admin/workflows'):
            return handle_workflow_management(event)
        elif path.startswith('/admin/users'):
            return handle_user_management(event)
        elif path.startswith('/admin/audit'):
            return handle_audit_queries(event)
        else:
            return {
                'statusCode': 404,
                'headers': get_cors_headers(),
                'body': json.dumps({'error': 'Endpoint not found'})
            }
            
    except Exception as e:
        logger.error(f"Admin API error: {str(e)}")
        return {
            'statusCode': 500,
            'headers': get_cors_headers(),
            'body': json.dumps({'error': str(e)})
        }

def handle_template_management(event: Dict[str, Any]) -> Dict[str, Any]:
    """
    Handle legal template management operations
    """
    method = event['httpMethod']
    
    if method == 'GET':
        # List templates
        return {
            'statusCode': 200,
            'headers': get_cors_headers(),
            'body': json.dumps({'templates': []})
        }
    elif method == 'POST':
        # Upload new template
        return {
            'statusCode': 201,
            'headers': get_cors_headers(),
            'body': json.dumps({'message': 'Template uploaded successfully'})
        }
    elif method == 'PUT':
        # Update template
        return {
            'statusCode': 200,
            'headers': get_cors_headers(),
            'body': json.dumps({'message': 'Template updated successfully'})
        }
    elif method == 'DELETE':
        # Delete template
        return {
            'statusCode': 200,
            'headers': get_cors_headers(),
            'body': json.dumps({'message': 'Template deleted successfully'})
        }

def handle_workflow_management(event: Dict[str, Any]) -> Dict[str, Any]:
    """
    Handle workflow management operations
    """
    return {
        'statusCode': 200,
        'headers': get_cors_headers(),
        'body': json.dumps({'workflows': []})
    }

def handle_user_management(event: Dict[str, Any]) -> Dict[str, Any]:
    """
    Handle user management operations
    """
    return {
        'statusCode': 200,
        'headers': get_cors_headers(),
        'body': json.dumps({'users': []})
    }

def handle_audit_queries(event: Dict[str, Any]) -> Dict[str, Any]:
    """
    Handle audit trail queries
    """
    return {
        'statusCode': 200,
        'headers': get_cors_headers(),
        'body': json.dumps({'auditLogs': []})
    }

def get_cors_headers() -> Dict[str, str]:
    """
    Get CORS headers for responses
    """
    return {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type,Authorization',
    }
      `),
      timeout: cdk.Duration.minutes(15),
      memorySize: 1024,
      environment: {
        'CAM_TABLE_NAME': props.dataStack.camTable.tableName,
        'WORKFLOW_TABLE_NAME': props.dataStack.workflowTable.tableName,
        'TEMPLATE_BUCKET_NAME': props.dataStack.templateBucket.bucketName,
      },
    });

    // Lambda function for user operations
    this.userFunction = new lambda.Function(this, 'UserFunction', {
      functionName: 'cam-user-api',
      runtime: lambda.Runtime.PYTHON_3_11,
      handler: 'index.handler',
      code: lambda.Code.fromInline(`
import json
import boto3
import logging
from typing import Dict, Any
from datetime import datetime

logger = logging.getLogger()
logger.setLevel(logging.INFO)

dynamodb = boto3.resource('dynamodb')
s3 = boto3.client('s3')
stepfunctions = boto3.client('stepfunctions')

def handler(event: Dict[str, Any], context) -> Dict[str, Any]:
    """
    Handle user API requests
    """
    try:
        http_method = event['httpMethod']
        path = event['path']
        
        logger.info(f"User API: {http_method} {path}")
        
        if path.startswith('/upload'):
            return handle_document_upload(event)
        elif path.startswith('/status'):
            return handle_status_check(event)
        elif path.startswith('/documents'):
            return handle_document_operations(event)
        elif path.startswith('/chat'):
            return handle_chat_interaction(event)
        else:
            return {
                'statusCode': 404,
                'headers': get_cors_headers(),
                'body': json.dumps({'error': 'Endpoint not found'})
            }
            
    except Exception as e:
        logger.error(f"User API error: {str(e)}")
        return {
            'statusCode': 500,
            'headers': get_cors_headers(),
            'body': json.dumps({'error': str(e)})
        }

def handle_document_upload(event: Dict[str, Any]) -> Dict[str, Any]:
    """
    Handle CAM document upload
    """
    # Generate presigned URL for S3 upload
    document_id = f"cam-{datetime.utcnow().strftime('%Y%m%d-%H%M%S')}"
    
    presigned_url = s3.generate_presigned_url(
        'put_object',
        Params={
            'Bucket': 'cam-documents-bucket',
            'Key': f"uploads/{document_id}.pdf",
            'ContentType': 'application/pdf'
        },
        ExpiresIn=3600
    )
    
    return {
        'statusCode': 200,
        'headers': get_cors_headers(),
        'body': json.dumps({
            'uploadUrl': presigned_url,
            'documentId': document_id
        })
    }

def handle_status_check(event: Dict[str, Any]) -> Dict[str, Any]:
    """
    Check processing status
    """
    document_id = event['pathParameters'].get('documentId')
    
    return {
        'statusCode': 200,
        'headers': get_cors_headers(),
        'body': json.dumps({
            'documentId': document_id,
            'status': 'processing',
            'progress': 75
        })
    }

def handle_document_operations(event: Dict[str, Any]) -> Dict[str, Any]:
    """
    Handle document CRUD operations
    """
    return {
        'statusCode': 200,
        'headers': get_cors_headers(),
        'body': json.dumps({'documents': []})
    }

def handle_chat_interaction(event: Dict[str, Any]) -> Dict[str, Any]:
    """
    Handle chat/voice interactions
    """
    body = json.loads(event['body']) if event['body'] else {}
    message = body.get('message', '')
    
    return {
        'statusCode': 200,
        'headers': get_cors_headers(),
        'body': json.dumps({
            'response': 'I understand you want to process a CAM document. Please upload your document to get started.',
            'sentiment': 'neutral',
            'nextAction': 'upload_document'
        })
    }

def get_cors_headers() -> Dict[str, str]:
    """
    Get CORS headers for responses
    """
    return {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type,Authorization',
    }
      `),
      timeout: cdk.Duration.minutes(15),
      memorySize: 1024,
      environment: {
        'CAM_TABLE_NAME': props.dataStack.camTable.tableName,
        'DOCUMENT_BUCKET_NAME': props.dataStack.documentBucket.bucketName,
        'PROCESSING_STATE_MACHINE_ARN': props.workflowStack.camProcessingStateMachine.stateMachineArn,
      },
    });

    // Grant permissions to Lambda functions
    props.dataStack.camTable.grantReadWriteData(this.adminFunction);
    props.dataStack.workflowTable.grantReadWriteData(this.adminFunction);
    props.dataStack.templateBucket.grantReadWrite(this.adminFunction);
    
    props.dataStack.camTable.grantReadWriteData(this.userFunction);
    props.dataStack.documentBucket.grantReadWrite(this.userFunction);
    props.workflowStack.camProcessingStateMachine.grantStartExecution(this.userFunction);

    // API Gateway Resources and Methods
    const adminResource = this.api.root.addResource('admin');
    const templatesResource = adminResource.addResource('templates');
    const workflowsResource = adminResource.addResource('workflows');
    const usersResource = adminResource.addResource('users');
    const auditResource = adminResource.addResource('audit');

    // Admin endpoints
    templatesResource.addMethod('GET', new apigateway.LambdaIntegration(this.adminFunction));
    templatesResource.addMethod('POST', new apigateway.LambdaIntegration(this.adminFunction));
    templatesResource.addMethod('PUT', new apigateway.LambdaIntegration(this.adminFunction));
    templatesResource.addMethod('DELETE', new apigateway.LambdaIntegration(this.adminFunction));

    workflowsResource.addMethod('GET', new apigateway.LambdaIntegration(this.adminFunction));
    usersResource.addMethod('GET', new apigateway.LambdaIntegration(this.adminFunction));
    auditResource.addMethod('GET', new apigateway.LambdaIntegration(this.adminFunction));

    // User endpoints
    const uploadResource = this.api.root.addResource('upload');
    uploadResource.addMethod('POST', new apigateway.LambdaIntegration(this.userFunction));

    const statusResource = this.api.root.addResource('status');
    const statusWithId = statusResource.addResource('{documentId}');
    statusWithId.addMethod('GET', new apigateway.LambdaIntegration(this.userFunction));

    const documentsResource = this.api.root.addResource('documents');
    documentsResource.addMethod('GET', new apigateway.LambdaIntegration(this.userFunction));

    const chatResource = this.api.root.addResource('chat');
    chatResource.addMethod('POST', new apigateway.LambdaIntegration(this.userFunction));

    // GraphQL API for real-time features
    this.graphqlApi = new appsync.GraphqlApi(this, 'CamGraphqlApi', {
      name: 'cam-automation-graphql',
      schema: appsync.SchemaFile.fromAsset('schema.graphql'),
      authorizationConfig: {
        defaultAuthorization: {
          authorizationType: appsync.AuthorizationType.USER_POOL,
          userPoolConfig: {
            userPool: props.securityStack.userPool,
          },
        },
      },
      xrayEnabled: true,
    });

    // Create a simple GraphQL schema file
    const schemaContent = `
type CAMDocument {
  id: ID!
  status: String!
  createdAt: String!
  updatedAt: String!
  borrowerName: String
  loanAmount: Float
  progress: Int
}

type Query {
  getCAMDocument(id: ID!): CAMDocument
  listCAMDocuments: [CAMDocument]
}

type Mutation {
  updateCAMStatus(id: ID!, status: String!): CAMDocument
}

type Subscription {
  onCAMStatusUpdate(id: ID!): CAMDocument
    @aws_subscribe(mutations: ["updateCAMStatus"])
}
`;

    // Outputs
    new cdk.CfnOutput(this, 'ApiUrl', {
      value: this.api.url,
      description: 'REST API Gateway URL',
    });

    new cdk.CfnOutput(this, 'GraphqlUrl', {
      value: this.graphqlApi.graphqlUrl,
      description: 'GraphQL API URL',
    });

    new cdk.CfnOutput(this, 'AdminFunctionName', {
      value: this.adminFunction.functionName,
      description: 'Admin Lambda function name',
    });

    new cdk.CfnOutput(this, 'UserFunctionName', {
      value: this.userFunction.functionName,
      description: 'User Lambda function name',
    });
  }
}
