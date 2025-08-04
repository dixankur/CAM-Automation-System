import * as cdk from 'aws-cdk-lib';
import * as stepfunctions from 'aws-cdk-lib/aws-stepfunctions';
import * as sfnTasks from 'aws-cdk-lib/aws-stepfunctions-tasks';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as sns from 'aws-cdk-lib/aws-sns';
import * as sqs from 'aws-cdk-lib/aws-sqs';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as kms from 'aws-cdk-lib/aws-kms';
import { Construct } from 'constructs';

interface CamWorkflowStackProps extends cdk.StackProps {
  documentBucket: s3.Bucket;
  templateBucket: s3.Bucket;
  auditTable: dynamodb.Table;
  kmsKey: kms.Key;
}

export class CamWorkflowStack extends cdk.Stack {
  public readonly camProcessingStateMachine: stepfunctions.StateMachine;
  public readonly makerCheckerStateMachine: stepfunctions.StateMachine;
  public readonly notificationTopic: sns.Topic;
  public readonly dlq: sqs.Queue;

  constructor(scope: Construct, id: string, props: CamWorkflowStackProps) {
    super(scope, id, props);

    // Dead Letter Queue for failed messages
    this.dlq = new sqs.Queue(this, 'CamDlq', {
      queueName: 'cam-dead-letter-queue',
      encryption: sqs.QueueEncryption.KMS,
      encryptionMasterKey: props.kmsKey,
      retentionPeriod: cdk.Duration.days(14),
    });

    // SNS Topic for notifications
    this.notificationTopic = new sns.Topic(this, 'CamNotificationTopic', {
      topicName: 'cam-notifications',
      displayName: 'CAM Automation Notifications',
      kmsMasterKey: props.kmsKey,
    });

    // Lambda Functions for workflow steps
    const documentValidationFunction = new lambda.Function(this, 'DocumentValidationFunction', {
      functionName: 'cam-document-validation',
      runtime: lambda.Runtime.PYTHON_3_11,
      handler: 'index.handler',
      code: lambda.Code.fromInline(`
import json
import boto3
import logging
from typing import Dict, Any

logger = logging.getLogger()
logger.setLevel(logging.INFO)

def handler(event: Dict[str, Any], context) -> Dict[str, Any]:
    """
    Validate uploaded CAM document structure and content
    """
    try:
        document_key = event['documentKey']
        bucket_name = event['bucketName']
        
        logger.info(f"Validating document: s3://{bucket_name}/{document_key}")
        
        # Simulate document validation logic
        validation_result = {
            'isValid': True,
            'documentType': 'CAM',
            'confidence': 0.95,
            'extractedFields': {
                'borrower_name': 'Sample Borrower',
                'loan_amount': 5000000,
                'loan_term': 60,
                'interest_rate': 4.5
            },
            'validationErrors': [],
            'validationWarnings': []
        }
        
        return {
            'statusCode': 200,
            'validation': validation_result,
            'documentKey': document_key,
            'bucketName': bucket_name
        }
        
    except Exception as e:
        logger.error(f"Document validation error: {str(e)}")
        return {
            'statusCode': 500,
            'error': str(e)
        }
      `),
      timeout: cdk.Duration.minutes(10),
      memorySize: 1024,
    });

    const legalFormMatchingFunction = new lambda.Function(this, 'LegalFormMatchingFunction', {
      functionName: 'cam-legal-form-matching',
      runtime: lambda.Runtime.PYTHON_3_11,
      handler: 'index.handler',
      code: lambda.Code.fromInline(`
import json
import boto3
import logging
from typing import Dict, Any, List

logger = logging.getLogger()
logger.setLevel(logging.INFO)

dynamodb = boto3.resource('dynamodb')
legal_forms_table = dynamodb.Table('legal-forms-metadata')

def handler(event: Dict[str, Any], context) -> Dict[str, Any]:
    """
    Match appropriate legal forms based on CAM attributes
    """
    try:
        cam_data = event['validation']['extractedFields']
        loan_amount = cam_data.get('loan_amount', 0)
        
        logger.info(f"Matching legal forms for loan amount: ${loan_amount}")
        
        # Query legal forms based on loan amount and other criteria
        matched_forms = match_legal_forms(cam_data)
        
        return {
            'statusCode': 200,
            'matchedForms': matched_forms,
            'camData': cam_data
        }
        
    except Exception as e:
        logger.error(f"Legal form matching error: {str(e)}")
        return {
            'statusCode': 500,
            'error': str(e)
        }

def match_legal_forms(cam_data: Dict[str, Any]) -> List[Dict[str, Any]]:
    """
    Match legal forms based on CAM attributes
    """
    loan_amount = cam_data.get('loan_amount', 0)
    
    # Business logic for form matching
    matched_forms = []
    
    if loan_amount > 10000000:  # $10M+
        matched_forms.extend([
            {
                'formId': 'FORM_A_LARGE',
                'formName': 'Large Loan Agreement Form',
                'templatePath': 'templates/large-loan-agreement.docx',
                'priority': 1
            },
            {
                'formId': 'FORM_B_COMPLIANCE',
                'formName': 'High-Value Compliance Form',
                'templatePath': 'templates/compliance-form.docx',
                'priority': 2
            }
        ])
    else:
        matched_forms.append({
            'formId': 'FORM_STANDARD',
            'formName': 'Standard Loan Agreement',
            'templatePath': 'templates/standard-loan.docx',
            'priority': 1
        })
    
    return matched_forms
      `),
      timeout: cdk.Duration.minutes(5),
      memorySize: 512,
    });

    const formPopulationFunction = new lambda.Function(this, 'FormPopulationFunction', {
      functionName: 'cam-form-population',
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

s3 = boto3.client('s3')

def handler(event: Dict[str, Any], context) -> Dict[str, Any]:
    """
    Populate legal forms with CAM data
    """
    try:
        cam_data = event['camData']
        matched_forms = event['matchedForms']
        
        populated_forms = []
        
        for form in matched_forms:
            # Simulate form population
            populated_form = populate_form_template(form, cam_data)
            populated_forms.append(populated_form)
        
        return {
            'statusCode': 200,
            'populatedForms': populated_forms,
            'camData': cam_data
        }
        
    except Exception as e:
        logger.error(f"Form population error: {str(e)}")
        return {
            'statusCode': 500,
            'error': str(e)
        }

def populate_form_template(form: Dict[str, Any], cam_data: Dict[str, Any]) -> Dict[str, Any]:
    """
    Populate form template with CAM data
    """
    # Simulate form population logic
    populated_form = {
        'formId': form['formId'],
        'formName': form['formName'],
        'populatedAt': datetime.utcnow().isoformat(),
        'outputPath': f"populated-forms/{form['formId']}-{datetime.utcnow().strftime('%Y%m%d-%H%M%S')}.docx",
        'populatedFields': {
            'borrower_name': cam_data.get('borrower_name'),
            'loan_amount': cam_data.get('loan_amount'),
            'loan_term': cam_data.get('loan_term'),
            'interest_rate': cam_data.get('interest_rate'),
            'generation_date': datetime.utcnow().strftime('%Y-%m-%d')
        }
    }
    
    return populated_form
      `),
      timeout: cdk.Duration.minutes(10),
      memorySize: 1024,
    });

    const notificationFunction = new lambda.Function(this, 'NotificationFunction', {
      functionName: 'cam-notification',
      runtime: lambda.Runtime.PYTHON_3_11,
      handler: 'index.handler',
      code: lambda.Code.fromInline(`
import json
import boto3
import logging
from typing import Dict, Any

logger = logging.getLogger()
logger.setLevel(logging.INFO)

sns = boto3.client('sns')
ses = boto3.client('ses')

def handler(event: Dict[str, Any], context) -> Dict[str, Any]:
    """
    Send notifications for workflow events
    """
    try:
        notification_type = event.get('notificationType', 'general')
        recipient = event.get('recipient')
        message = event.get('message')
        
        logger.info(f"Sending {notification_type} notification to {recipient}")
        
        if notification_type == 'maker_checker':
            send_maker_checker_notification(recipient, message, event)
        elif notification_type == 'completion':
            send_completion_notification(recipient, message, event)
        else:
            send_general_notification(recipient, message)
        
        return {
            'statusCode': 200,
            'message': 'Notification sent successfully'
        }
        
    except Exception as e:
        logger.error(f"Notification error: {str(e)}")
        return {
            'statusCode': 500,
            'error': str(e)
        }

def send_maker_checker_notification(recipient: str, message: str, event: Dict[str, Any]):
    """
    Send maker-checker workflow notification
    """
    # Implementation for maker-checker notifications
    pass

def send_completion_notification(recipient: str, message: str, event: Dict[str, Any]):
    """
    Send workflow completion notification
    """
    # Implementation for completion notifications
    pass

def send_general_notification(recipient: str, message: str):
    """
    Send general notification
    """
    # Implementation for general notifications
    pass
      `),
      timeout: cdk.Duration.minutes(5),
      memorySize: 512,
    });

    // Grant necessary permissions to Lambda functions
    props.documentBucket.grantRead(documentValidationFunction);
    props.templateBucket.grantReadWrite(formPopulationFunction);
    props.auditTable.grantWriteData(documentValidationFunction);
    props.auditTable.grantWriteData(legalFormMatchingFunction);
    props.auditTable.grantWriteData(formPopulationFunction);

    // CAM Processing State Machine
    const documentValidationTask = new sfnTasks.LambdaInvoke(this, 'DocumentValidationTask', {
      lambdaFunction: documentValidationFunction,
      outputPath: '$.Payload',
    });

    const legalFormMatchingTask = new sfnTasks.LambdaInvoke(this, 'LegalFormMatchingTask', {
      lambdaFunction: legalFormMatchingFunction,
      outputPath: '$.Payload',
    });

    const formPopulationTask = new sfnTasks.LambdaInvoke(this, 'FormPopulationTask', {
      lambdaFunction: formPopulationFunction,
      outputPath: '$.Payload',
    });

    const notificationTask = new sfnTasks.LambdaInvoke(this, 'NotificationTask', {
      lambdaFunction: notificationFunction,
    });

    // Define workflow steps
    const validationChoice = new stepfunctions.Choice(this, 'ValidationChoice')
      .when(
        stepfunctions.Condition.numberEquals('$.statusCode', 200),
        legalFormMatchingTask
      )
      .otherwise(
        new stepfunctions.Fail(this, 'ValidationFailed', {
          cause: 'Document validation failed',
        })
      );

    const formMatchingChoice = new stepfunctions.Choice(this, 'FormMatchingChoice')
      .when(
        stepfunctions.Condition.numberEquals('$.statusCode', 200),
        formPopulationTask
      )
      .otherwise(
        new stepfunctions.Fail(this, 'FormMatchingFailed', {
          cause: 'Legal form matching failed',
        })
      );

    const populationChoice = new stepfunctions.Choice(this, 'PopulationChoice')
      .when(
        stepfunctions.Condition.numberEquals('$.statusCode', 200),
        notificationTask
      )
      .otherwise(
        new stepfunctions.Fail(this, 'PopulationFailed', {
          cause: 'Form population failed',
        })
      );

    // Build the state machine definition
    const definition = documentValidationTask
      .next(validationChoice
        .next(legalFormMatchingTask)
        .next(formMatchingChoice
          .next(formPopulationTask)
          .next(populationChoice
            .next(new stepfunctions.Succeed(this, 'ProcessingComplete'))
          )
        )
      );

    this.camProcessingStateMachine = new stepfunctions.StateMachine(this, 'CamProcessingStateMachine', {
      stateMachineName: 'cam-processing-workflow',
      definition,
      timeout: cdk.Duration.hours(2),
      tracingEnabled: true,
    });

    // Maker-Checker State Machine
    const makerSubmissionTask = new stepfunctions.Pass(this, 'MakerSubmissionTask', {
      comment: 'Record maker submission',
    });

    const checkerNotificationTask = new sfnTasks.LambdaInvoke(this, 'CheckerNotificationTask', {
      lambdaFunction: notificationFunction,
      payload: stepfunctions.TaskInput.fromObject({
        notificationType: 'maker_checker',
        recipient: stepfunctions.JsonPath.stringAt('$.checkerEmail'),
        message: 'New CAM document requires your review',
      }),
    });

    const waitForApproval = new stepfunctions.Wait(this, 'WaitForApproval', {
      time: stepfunctions.WaitTime.duration(cdk.Duration.hours(24)),
    });

    const approvalChoice = new stepfunctions.Choice(this, 'ApprovalChoice')
      .when(
        stepfunctions.Condition.stringEquals('$.approvalStatus', 'APPROVED'),
        new stepfunctions.Succeed(this, 'Approved')
      )
      .when(
        stepfunctions.Condition.stringEquals('$.approvalStatus', 'REJECTED'),
        new stepfunctions.Fail(this, 'Rejected', {
          cause: 'Document rejected by checker',
        })
      )
      .otherwise(
        new stepfunctions.Fail(this, 'Timeout', {
          cause: 'Approval timeout',
        })
      );

    const makerCheckerDefinition = makerSubmissionTask
      .next(checkerNotificationTask)
      .next(waitForApproval)
      .next(approvalChoice);

    this.makerCheckerStateMachine = new stepfunctions.StateMachine(this, 'MakerCheckerStateMachine', {
      stateMachineName: 'cam-maker-checker-workflow',
      definition: makerCheckerDefinition,
      timeout: cdk.Duration.days(7),
      tracingEnabled: true,
    });

    // Outputs
    new cdk.CfnOutput(this, 'CamProcessingStateMachineArn', {
      value: this.camProcessingStateMachine.stateMachineArn,
      description: 'CAM processing state machine ARN',
    });

    new cdk.CfnOutput(this, 'MakerCheckerStateMachineArn', {
      value: this.makerCheckerStateMachine.stateMachineArn,
      description: 'Maker-checker workflow state machine ARN',
    });

    new cdk.CfnOutput(this, 'NotificationTopicArn', {
      value: this.notificationTopic.topicArn,
      description: 'SNS topic for notifications',
    });
  }
}
