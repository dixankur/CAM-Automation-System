import * as cdk from 'aws-cdk-lib';
import * as lex from 'aws-cdk-lib/aws-lex';
import * as bedrock from 'aws-cdk-lib/aws-bedrock';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as kms from 'aws-cdk-lib/aws-kms';
import { Construct } from 'constructs';

interface CamAiStackProps extends cdk.StackProps {
  kmsKey: kms.Key;
}

export class CamAiStack extends cdk.Stack {
  public readonly lexBot: lex.CfnBot;
  public readonly bedrockKnowledgeBase: bedrock.CfnKnowledgeBase;
  public readonly documentProcessorFunction: lambda.Function;
  public readonly sentimentAnalysisFunction: lambda.Function;
  public readonly validationFunction: lambda.Function;

  constructor(scope: Construct, id: string, props: CamAiStackProps) {
    super(scope, id, props);

    // IAM Role for Bedrock access
    const bedrockRole = new iam.Role(this, 'BedrockServiceRole', {
      assumedBy: new iam.ServicePrincipal('bedrock.amazonaws.com'),
      managedPolicies: [
        iam.ManagedPolicy.fromAwsManagedPolicyName('AmazonBedrockFullAccess'),
      ],
      inlinePolicies: {
        KMSAccess: new iam.PolicyDocument({
          statements: [
            new iam.PolicyStatement({
              effect: iam.Effect.ALLOW,
              actions: [
                'kms:Decrypt',
                'kms:GenerateDataKey',
                'kms:CreateGrant',
              ],
              resources: [props.kmsKey.keyArn],
            }),
          ],
        }),
      },
    });

    // Bedrock Knowledge Base for legal document understanding
    this.bedrockKnowledgeBase = new bedrock.CfnKnowledgeBase(this, 'CamKnowledgeBase', {
      name: 'cam-legal-knowledge-base',
      description: 'Knowledge base for CAM legal document processing',
      roleArn: bedrockRole.roleArn,
      knowledgeBaseConfiguration: {
        type: 'VECTOR',
        vectorKnowledgeBaseConfiguration: {
          embeddingModelArn: `arn:aws:bedrock:${this.region}::foundation-model/amazon.titan-embed-text-v1`,
        },
      },
      storageConfiguration: {
        type: 'OPENSEARCH_SERVERLESS',
        opensearchServerlessConfiguration: {
          collectionArn: `arn:aws:aoss:${this.region}:${this.account}:collection/cam-search`,
          vectorIndexName: 'legal-documents-index',
          fieldMapping: {
            vectorField: 'vector',
            textField: 'text',
            metadataField: 'metadata',
          },
        },
      },
    });

    // Lambda function for document processing
    this.documentProcessorFunction = new lambda.Function(this, 'DocumentProcessorFunction', {
      functionName: 'cam-document-processor',
      runtime: lambda.Runtime.PYTHON_3_11,
      handler: 'index.handler',
      code: lambda.Code.fromInline(`
import json
import boto3
import logging
from typing import Dict, Any

logger = logging.getLogger()
logger.setLevel(logging.INFO)

textract = boto3.client('textract')
comprehend = boto3.client('comprehend')
bedrock_runtime = boto3.client('bedrock-runtime')

def handler(event: Dict[str, Any], context) -> Dict[str, Any]:
    """
    Process uploaded CAM documents using Textract and Bedrock
    """
    try:
        bucket = event['Records'][0]['s3']['bucket']['name']
        key = event['Records'][0]['s3']['object']['key']
        
        logger.info(f"Processing document: s3://{bucket}/{key}")
        
        # Extract text using Textract
        textract_response = textract.start_document_text_detection(
            DocumentLocation={
                'S3Object': {
                    'Bucket': bucket,
                    'Name': key
                }
            }
        )
        
        job_id = textract_response['JobId']
        
        # Store job ID for async processing
        return {
            'statusCode': 200,
            'body': json.dumps({
                'message': 'Document processing started',
                'jobId': job_id,
                'bucket': bucket,
                'key': key
            })
        }
        
    except Exception as e:
        logger.error(f"Error processing document: {str(e)}")
        return {
            'statusCode': 500,
            'body': json.dumps({
                'error': str(e)
            })
        }
      `),
      timeout: cdk.Duration.minutes(15),
      memorySize: 1024,
      environment: {
        'KMS_KEY_ID': props.kmsKey.keyId,
      },
    });

    // Lambda function for sentiment analysis
    this.sentimentAnalysisFunction = new lambda.Function(this, 'SentimentAnalysisFunction', {
      functionName: 'cam-sentiment-analysis',
      runtime: lambda.Runtime.PYTHON_3_11,
      handler: 'index.handler',
      code: lambda.Code.fromInline(`
import json
import boto3
import logging
from typing import Dict, Any

logger = logging.getLogger()
logger.setLevel(logging.INFO)

comprehend = boto3.client('comprehend')

def handler(event: Dict[str, Any], context) -> Dict[str, Any]:
    """
    Analyze user sentiment and adjust interaction flow
    """
    try:
        text = event.get('text', '')
        
        if not text:
            return {
                'statusCode': 400,
                'body': json.dumps({'error': 'No text provided'})
            }
        
        # Detect sentiment
        sentiment_response = comprehend.detect_sentiment(
            Text=text,
            LanguageCode='en'
        )
        
        sentiment = sentiment_response['Sentiment']
        confidence = sentiment_response['SentimentScore']
        
        # Determine interaction strategy based on sentiment
        interaction_strategy = get_interaction_strategy(sentiment, confidence)
        
        return {
            'statusCode': 200,
            'body': json.dumps({
                'sentiment': sentiment,
                'confidence': confidence,
                'strategy': interaction_strategy
            })
        }
        
    except Exception as e:
        logger.error(f"Error analyzing sentiment: {str(e)}")
        return {
            'statusCode': 500,
            'body': json.dumps({'error': str(e)})
        }

def get_interaction_strategy(sentiment: str, confidence: Dict[str, float]) -> Dict[str, Any]:
    """
    Determine interaction strategy based on sentiment analysis
    """
    if sentiment == 'NEGATIVE' and confidence['Negative'] > 0.7:
        return {
            'pace': 'slow',
            'explanation_level': 'detailed',
            'escalation': 'human_available',
            'tone': 'empathetic'
        }
    elif sentiment == 'POSITIVE':
        return {
            'pace': 'normal',
            'explanation_level': 'standard',
            'escalation': 'none',
            'tone': 'professional'
        }
    else:
        return {
            'pace': 'normal',
            'explanation_level': 'detailed',
            'escalation': 'help_available',
            'tone': 'supportive'
        }
      `),
      timeout: cdk.Duration.minutes(5),
      memorySize: 512,
    });

    // Lambda function for CAM validation
    this.validationFunction = new lambda.Function(this, 'CamValidationFunction', {
      functionName: 'cam-validation',
      runtime: lambda.Runtime.PYTHON_3_11,
      handler: 'index.handler',
      code: lambda.Code.fromInline(`
import json
import boto3
import logging
from typing import Dict, Any, List

logger = logging.getLogger()
logger.setLevel(logging.INFO)

bedrock_runtime = boto3.client('bedrock-runtime')
comprehend = boto3.client('comprehend')

def handler(event: Dict[str, Any], context) -> Dict[str, Any]:
    """
    Validate CAM document completeness and business rules
    """
    try:
        cam_data = event.get('camData', {})
        
        # Perform rule-based validation
        rule_validation = validate_business_rules(cam_data)
        
        # Perform AI-based validation using Bedrock
        ai_validation = validate_with_bedrock(cam_data)
        
        # Combine results
        validation_result = {
            'isValid': rule_validation['isValid'] and ai_validation['isValid'],
            'ruleValidation': rule_validation,
            'aiValidation': ai_validation,
            'overallScore': calculate_overall_score(rule_validation, ai_validation)
        }
        
        return {
            'statusCode': 200,
            'body': json.dumps(validation_result)
        }
        
    except Exception as e:
        logger.error(f"Error validating CAM: {str(e)}")
        return {
            'statusCode': 500,
            'body': json.dumps({'error': str(e)})
        }

def validate_business_rules(cam_data: Dict[str, Any]) -> Dict[str, Any]:
    """
    Validate CAM against business rules
    """
    errors = []
    warnings = []
    
    # Required fields validation
    required_fields = ['borrower_name', 'loan_amount', 'loan_term', 'interest_rate']
    for field in required_fields:
        if not cam_data.get(field):
            errors.append(f"Missing required field: {field}")
    
    # Business logic validation
    loan_amount = cam_data.get('loan_amount', 0)
    if loan_amount > 10000000:  # $10M threshold
        warnings.append("High-value loan requires additional approvals")
    
    return {
        'isValid': len(errors) == 0,
        'errors': errors,
        'warnings': warnings
    }

def validate_with_bedrock(cam_data: Dict[str, Any]) -> Dict[str, Any]:
    """
    Use Bedrock for AI-based validation
    """
    prompt = f"""
    Analyze the following CAM data for completeness and potential issues:
    {json.dumps(cam_data, indent=2)}
    
    Please provide:
    1. Overall assessment (valid/invalid)
    2. Missing information
    3. Potential red flags
    4. Confidence score (0-1)
    """
    
    try:
        response = bedrock_runtime.invoke_model(
            modelId='anthropic.claude-3-sonnet-20240229-v1:0',
            body=json.dumps({
                'anthropic_version': 'bedrock-2023-05-31',
                'max_tokens': 1000,
                'messages': [{'role': 'user', 'content': prompt}]
            })
        )
        
        result = json.loads(response['body'].read())
        content = result['content'][0]['text']
        
        return {
            'isValid': 'valid' in content.lower(),
            'analysis': content,
            'confidence': 0.8  # Placeholder - would extract from response
        }
        
    except Exception as e:
        logger.error(f"Bedrock validation error: {str(e)}")
        return {
            'isValid': True,  # Fail open for availability
            'analysis': 'AI validation unavailable',
            'confidence': 0.0
        }

def calculate_overall_score(rule_validation: Dict, ai_validation: Dict) -> float:
    """
    Calculate overall validation score
    """
    rule_score = 1.0 if rule_validation['isValid'] else 0.0
    ai_score = ai_validation.get('confidence', 0.0)
    
    return (rule_score + ai_score) / 2
      `),
      timeout: cdk.Duration.minutes(10),
      memorySize: 1024,
    });

    // Grant necessary permissions
    this.documentProcessorFunction.addToRolePolicy(
      new iam.PolicyStatement({
        effect: iam.Effect.ALLOW,
        actions: [
          'textract:StartDocumentTextDetection',
          'textract:GetDocumentTextDetection',
          'comprehend:DetectEntities',
          'comprehend:DetectSentiment',
          's3:GetObject',
        ],
        resources: ['*'],
      })
    );

    this.sentimentAnalysisFunction.addToRolePolicy(
      new iam.PolicyStatement({
        effect: iam.Effect.ALLOW,
        actions: [
          'comprehend:DetectSentiment',
          'comprehend:DetectLanguage',
        ],
        resources: ['*'],
      })
    );

    this.validationFunction.addToRolePolicy(
      new iam.PolicyStatement({
        effect: iam.Effect.ALLOW,
        actions: [
          'bedrock:InvokeModel',
          'comprehend:DetectEntities',
        ],
        resources: ['*'],
      })
    );

    // Lex Bot for conversational interface
    const lexBotRole = new iam.Role(this, 'LexBotRole', {
      assumedBy: new iam.ServicePrincipal('lexv2.amazonaws.com'),
      managedPolicies: [
        iam.ManagedPolicy.fromAwsManagedPolicyName('AmazonLexBotPolicy'),
      ],
    });

    this.lexBot = new lex.CfnBot(this, 'CamLexBot', {
      name: 'cam-automation-bot',
      description: 'Conversational interface for CAM automation',
      roleArn: lexBotRole.roleArn,
      dataPrivacy: {
        childDirected: false,
      },
      idleSessionTtlInSeconds: 900,
      botLocales: [{
        localeId: 'en_US',
        description: 'English (US) locale for CAM bot',
        nluConfidenceThreshold: 0.40,
        voiceSettings: {
          voiceId: 'Joanna',
          engine: 'neural',
        },
        intents: [{
          intentName: 'UploadCAM',
          description: 'Intent to upload CAM document',
          sampleUtterances: [{
            utterance: 'I want to upload a CAM document',
          }, {
            utterance: 'Upload CAM',
          }, {
            utterance: 'Process new credit agreement',
          }],
        }, {
          intentName: 'CheckStatus',
          description: 'Intent to check processing status',
          sampleUtterances: [{
            utterance: 'What is the status of my CAM',
          }, {
            utterance: 'Check processing status',
          }],
        }, {
          intentName: 'GetHelp',
          description: 'Intent to get help',
          sampleUtterances: [{
            utterance: 'I need help',
          }, {
            utterance: 'Help me',
          }],
        }],
      }],
    });

    // Outputs
    new cdk.CfnOutput(this, 'DocumentProcessorFunctionName', {
      value: this.documentProcessorFunction.functionName,
      description: 'Document processor Lambda function name',
    });

    new cdk.CfnOutput(this, 'LexBotId', {
      value: this.lexBot.attrId,
      description: 'Lex bot ID for conversational interface',
    });

    new cdk.CfnOutput(this, 'KnowledgeBaseId', {
      value: this.bedrockKnowledgeBase.attrKnowledgeBaseId,
      description: 'Bedrock knowledge base ID',
    });
  }
}
