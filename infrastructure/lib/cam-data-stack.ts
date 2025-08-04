import * as cdk from 'aws-cdk-lib';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import * as opensearch from 'aws-cdk-lib/aws-opensearchserverless';
import * as qldb from 'aws-cdk-lib/aws-qldb';
import * as kms from 'aws-cdk-lib/aws-kms';
import { Construct } from 'constructs';

interface CamDataStackProps extends cdk.StackProps {
  kmsKey: kms.Key;
}

export class CamDataStack extends cdk.Stack {
  public readonly documentBucket: s3.Bucket;
  public readonly templateBucket: s3.Bucket;
  public readonly archiveBucket: s3.Bucket;
  public readonly camTable: dynamodb.Table;
  public readonly workflowTable: dynamodb.Table;
  public readonly auditTable: dynamodb.Table;
  public readonly legalFormsTable: dynamodb.Table;
  public readonly searchCollection: opensearch.CfnCollection;
  public readonly auditLedger: qldb.CfnLedger;

  constructor(scope: Construct, id: string, props: CamDataStackProps) {
    super(scope, id, props);

    // S3 Buckets for document storage
    this.documentBucket = new s3.Bucket(this, 'CamDocumentBucket', {
      bucketName: `cam-documents-${this.account}-${this.region}`,
      encryption: s3.BucketEncryption.KMS,
      encryptionKey: props.kmsKey,
      versioned: true,
      lifecycleRules: [{
        id: 'document-lifecycle',
        enabled: true,
        transitions: [{
          storageClass: s3.StorageClass.STANDARD_INFREQUENT_ACCESS,
          transitionAfter: cdk.Duration.days(30),
        }, {
          storageClass: s3.StorageClass.GLACIER,
          transitionAfter: cdk.Duration.days(90),
        }, {
          storageClass: s3.StorageClass.DEEP_ARCHIVE,
          transitionAfter: cdk.Duration.days(365),
        }],
      }],
      publicReadAccess: false,
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
      enforceSSL: true,
      eventBridgeEnabled: true,
    });

    this.templateBucket = new s3.Bucket(this, 'CamTemplateBucket', {
      bucketName: `cam-templates-${this.account}-${this.region}`,
      encryption: s3.BucketEncryption.KMS,
      encryptionKey: props.kmsKey,
      versioned: true,
      publicReadAccess: false,
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
      enforceSSL: true,
    });

    this.archiveBucket = new s3.Bucket(this, 'CamArchiveBucket', {
      bucketName: `cam-archive-${this.account}-${this.region}`,
      encryption: s3.BucketEncryption.KMS,
      encryptionKey: props.kmsKey,
      versioned: true,
      publicReadAccess: false,
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
      enforceSSL: true,
      lifecycleRules: [{
        id: 'archive-lifecycle',
        enabled: true,
        transitions: [{
          storageClass: s3.StorageClass.GLACIER,
          transitionAfter: cdk.Duration.days(1),
        }],
      }],
    });

    // DynamoDB Tables
    this.camTable = new dynamodb.Table(this, 'CamTable', {
      tableName: 'cam-records',
      partitionKey: { name: 'camId', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'version', type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      encryption: dynamodb.TableEncryption.CUSTOMER_MANAGED,
      encryptionKey: props.kmsKey,
      pointInTimeRecovery: true,
      deletionProtection: true,
      stream: dynamodb.StreamViewType.NEW_AND_OLD_IMAGES,
      globalSecondaryIndexes: [{
        indexName: 'status-index',
        partitionKey: { name: 'status', type: dynamodb.AttributeType.STRING },
        sortKey: { name: 'createdAt', type: dynamodb.AttributeType.STRING },
      }, {
        indexName: 'client-index',
        partitionKey: { name: 'clientId', type: dynamodb.AttributeType.STRING },
        sortKey: { name: 'createdAt', type: dynamodb.AttributeType.STRING },
      }],
    });

    this.workflowTable = new dynamodb.Table(this, 'WorkflowTable', {
      tableName: 'cam-workflows',
      partitionKey: { name: 'workflowId', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'stepId', type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      encryption: dynamodb.TableEncryption.CUSTOMER_MANAGED,
      encryptionKey: props.kmsKey,
      pointInTimeRecovery: true,
      stream: dynamodb.StreamViewType.NEW_AND_OLD_IMAGES,
      globalSecondaryIndexes: [{
        indexName: 'status-index',
        partitionKey: { name: 'status', type: dynamodb.AttributeType.STRING },
        sortKey: { name: 'updatedAt', type: dynamodb.AttributeType.STRING },
      }],
    });

    this.auditTable = new dynamodb.Table(this, 'AuditTable', {
      tableName: 'cam-audit-logs',
      partitionKey: { name: 'entityId', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'timestamp', type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      encryption: dynamodb.TableEncryption.CUSTOMER_MANAGED,
      encryptionKey: props.kmsKey,
      pointInTimeRecovery: true,
      timeToLiveAttribute: 'ttl',
      globalSecondaryIndexes: [{
        indexName: 'action-index',
        partitionKey: { name: 'action', type: dynamodb.AttributeType.STRING },
        sortKey: { name: 'timestamp', type: dynamodb.AttributeType.STRING },
      }, {
        indexName: 'user-index',
        partitionKey: { name: 'userId', type: dynamodb.AttributeType.STRING },
        sortKey: { name: 'timestamp', type: dynamodb.AttributeType.STRING },
      }],
    });

    this.legalFormsTable = new dynamodb.Table(this, 'LegalFormsTable', {
      tableName: 'legal-forms-metadata',
      partitionKey: { name: 'formId', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'version', type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      encryption: dynamodb.TableEncryption.CUSTOMER_MANAGED,
      encryptionKey: props.kmsKey,
      pointInTimeRecovery: true,
      globalSecondaryIndexes: [{
        indexName: 'jurisdiction-index',
        partitionKey: { name: 'jurisdiction', type: dynamodb.AttributeType.STRING },
        sortKey: { name: 'formType', type: dynamodb.AttributeType.STRING },
      }, {
        indexName: 'category-index',
        partitionKey: { name: 'category', type: dynamodb.AttributeType.STRING },
        sortKey: { name: 'priority', type: dynamodb.AttributeType.NUMBER },
      }],
    });

    // OpenSearch Serverless Collection for semantic search
    this.searchCollection = new opensearch.CfnCollection(this, 'CamSearchCollection', {
      name: 'cam-search',
      description: 'OpenSearch collection for CAM document search',
      type: 'SEARCH',
    });

    // QLDB Ledger for immutable audit trails
    this.auditLedger = new qldb.CfnLedger(this, 'CamAuditLedger', {
      name: 'cam-audit-ledger',
      permissionsMode: 'STANDARD',
      deletionProtection: true,
      kmsKey: props.kmsKey.keyArn,
    });

    // Output important values
    new cdk.CfnOutput(this, 'DocumentBucketName', {
      value: this.documentBucket.bucketName,
      description: 'S3 bucket for CAM documents',
    });

    new cdk.CfnOutput(this, 'TemplateBucketName', {
      value: this.templateBucket.bucketName,
      description: 'S3 bucket for legal form templates',
    });

    new cdk.CfnOutput(this, 'CamTableName', {
      value: this.camTable.tableName,
      description: 'DynamoDB table for CAM records',
    });

    new cdk.CfnOutput(this, 'SearchCollectionEndpoint', {
      value: this.searchCollection.attrCollectionEndpoint,
      description: 'OpenSearch collection endpoint',
    });

    new cdk.CfnOutput(this, 'AuditLedgerName', {
      value: this.auditLedger.name!,
      description: 'QLDB ledger for audit trails',
    });
  }
}
