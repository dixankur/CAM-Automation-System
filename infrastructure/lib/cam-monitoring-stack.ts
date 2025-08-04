import * as cdk from 'aws-cdk-lib';
import * as cloudwatch from 'aws-cdk-lib/aws-cloudwatch';
import * as logs from 'aws-cdk-lib/aws-logs';
import * as cloudtrail from 'aws-cdk-lib/aws-cloudtrail';
import * as xray from 'aws-cdk-lib/aws-xray';
import * as sns from 'aws-cdk-lib/aws-sns';
import * as cloudwatchActions from 'aws-cdk-lib/aws-cloudwatch-actions';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as kms from 'aws-cdk-lib/aws-kms';
import { Construct } from 'constructs';
import { CamInfrastructureStack } from './cam-infrastructure-stack';

interface CamMonitoringStackProps extends cdk.StackProps {
  infrastructureStack: CamInfrastructureStack;
}

export class CamMonitoringStack extends cdk.Stack {
  public readonly dashboard: cloudwatch.Dashboard;
  public readonly alertTopic: sns.Topic;
  public readonly cloudTrail: cloudtrail.Trail;
  public readonly logGroup: logs.LogGroup;

  constructor(scope: Construct, id: string, props: CamMonitoringStackProps) {
    super(scope, id, props);

    // CloudTrail for audit logging
    const cloudTrailBucket = new s3.Bucket(this, 'CloudTrailBucket', {
      bucketName: `cam-cloudtrail-${this.account}-${this.region}`,
      encryption: s3.BucketEncryption.S3_MANAGED,
      publicReadAccess: false,
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
      enforceSSL: true,
      lifecycleRules: [{
        id: 'cloudtrail-lifecycle',
        enabled: true,
        transitions: [{
          storageClass: s3.StorageClass.STANDARD_INFREQUENT_ACCESS,
          transitionAfter: cdk.Duration.days(30),
        }, {
          storageClass: s3.StorageClass.GLACIER,
          transitionAfter: cdk.Duration.days(90),
        }],
      }],
    });

    this.cloudTrail = new cloudtrail.Trail(this, 'CamCloudTrail', {
      trailName: 'cam-audit-trail',
      bucket: cloudTrailBucket,
      includeGlobalServiceEvents: true,
      isMultiRegionTrail: true,
      enableFileValidation: true,
      eventRuleConfiguration: {
        includeManagementEvents: true,
        readWriteType: cloudtrail.ReadWriteType.ALL,
        includeDataEvents: [{
          resources: ['arn:aws:s3:::cam-documents-*/*'],
          includeManagementEvents: false,
          readWriteType: cloudtrail.ReadWriteType.ALL,
        }],
      },
    });

    // CloudWatch Log Group for application logs
    this.logGroup = new logs.LogGroup(this, 'CamLogGroup', {
      logGroupName: '/aws/cam-automation',
      retention: logs.RetentionDays.ONE_YEAR,
      removalPolicy: cdk.RemovalPolicy.RETAIN,
    });

    // SNS Topic for alerts
    this.alertTopic = new sns.Topic(this, 'CamAlertTopic', {
      topicName: 'cam-alerts',
      displayName: 'CAM Automation Alerts',
    });

    // X-Ray tracing configuration
    new xray.CfnSamplingRule(this, 'CamXRaySamplingRule', {
      samplingRule: {
        ruleName: 'CAMSamplingRule',
        priority: 9000,
        fixedRate: 0.1,
        reservoirSize: 1,
        serviceName: 'cam-automation',
        serviceType: '*',
        host: '*',
        httpMethod: '*',
        urlPath: '*',
        version: 1,
      },
    });

    // CloudWatch Metrics and Alarms
    const errorMetric = new cloudwatch.Metric({
      namespace: 'CAM/Automation',
      metricName: 'ProcessingErrors',
      statistic: 'Sum',
      period: cdk.Duration.minutes(5),
    });

    const errorAlarm = new cloudwatch.Alarm(this, 'ProcessingErrorAlarm', {
      alarmName: 'CAM-Processing-Errors',
      alarmDescription: 'Alert when CAM processing errors exceed threshold',
      metric: errorMetric,
      threshold: 5,
      evaluationPeriods: 2,
      comparisonOperator: cloudwatch.ComparisonOperator.GREATER_THAN_THRESHOLD,
    });

    errorAlarm.addAlarmAction(new cloudwatchActions.SnsAction(this.alertTopic));

    const latencyMetric = new cloudwatch.Metric({
      namespace: 'CAM/Automation',
      metricName: 'ProcessingLatency',
      statistic: 'Average',
      period: cdk.Duration.minutes(5),
    });

    const latencyAlarm = new cloudwatch.Alarm(this, 'ProcessingLatencyAlarm', {
      alarmName: 'CAM-Processing-Latency',
      alarmDescription: 'Alert when processing latency is high',
      metric: latencyMetric,
      threshold: 300000, // 5 minutes in milliseconds
      evaluationPeriods: 3,
      comparisonOperator: cloudwatch.ComparisonOperator.GREATER_THAN_THRESHOLD,
    });

    latencyAlarm.addAlarmAction(new cloudwatchActions.SnsAction(this.alertTopic));

    // Security Metrics
    const unauthorizedAccessMetric = new cloudwatch.Metric({
      namespace: 'CAM/Security',
      metricName: 'UnauthorizedAccess',
      statistic: 'Sum',
      period: cdk.Duration.minutes(1),
    });

    const securityAlarm = new cloudwatch.Alarm(this, 'SecurityAlarm', {
      alarmName: 'CAM-Unauthorized-Access',
      alarmDescription: 'Alert on unauthorized access attempts',
      metric: unauthorizedAccessMetric,
      threshold: 1,
      evaluationPeriods: 1,
      comparisonOperator: cloudwatch.ComparisonOperator.GREATER_THAN_OR_EQUAL_TO_THRESHOLD,
    });

    securityAlarm.addAlarmAction(new cloudwatchActions.SnsAction(this.alertTopic));

    // Compliance Metrics
    const complianceViolationMetric = new cloudwatch.Metric({
      namespace: 'CAM/Compliance',
      metricName: 'ComplianceViolations',
      statistic: 'Sum',
      period: cdk.Duration.minutes(5),
    });

    const complianceAlarm = new cloudwatch.Alarm(this, 'ComplianceAlarm', {
      alarmName: 'CAM-Compliance-Violations',
      alarmDescription: 'Alert on compliance violations',
      metric: complianceViolationMetric,
      threshold: 1,
      evaluationPeriods: 1,
      comparisonOperator: cloudwatch.ComparisonOperator.GREATER_THAN_OR_EQUAL_TO_THRESHOLD,
    });

    complianceAlarm.addAlarmAction(new cloudwatchActions.SnsAction(this.alertTopic));

    // CloudWatch Dashboard
    this.dashboard = new cloudwatch.Dashboard(this, 'CamDashboard', {
      dashboardName: 'CAM-Automation-Dashboard',
      widgets: [
        [
          new cloudwatch.GraphWidget({
            title: 'Processing Volume',
            left: [
              new cloudwatch.Metric({
                namespace: 'CAM/Automation',
                metricName: 'DocumentsProcessed',
                statistic: 'Sum',
              }),
            ],
            width: 12,
            height: 6,
          }),
          new cloudwatch.GraphWidget({
            title: 'Processing Latency',
            left: [latencyMetric],
            width: 12,
            height: 6,
          }),
        ],
        [
          new cloudwatch.GraphWidget({
            title: 'Error Rates',
            left: [errorMetric],
            width: 12,
            height: 6,
          }),
          new cloudwatch.SingleValueWidget({
            title: 'Success Rate',
            metrics: [
              new cloudwatch.Metric({
                namespace: 'CAM/Automation',
                metricName: 'SuccessRate',
                statistic: 'Average',
              }),
            ],
            width: 12,
            height: 6,
          }),
        ],
        [
          new cloudwatch.GraphWidget({
            title: 'Security Events',
            left: [unauthorizedAccessMetric],
            width: 12,
            height: 6,
          }),
          new cloudwatch.GraphWidget({
            title: 'Compliance Status',
            left: [complianceViolationMetric],
            width: 12,
            height: 6,
          }),
        ],
        [
          new cloudwatch.LogQueryWidget({
            title: 'Recent Errors',
            logGroups: [this.logGroup],
            queryLines: [
              'fields @timestamp, @message',
              'filter @message like /ERROR/',
              'sort @timestamp desc',
              'limit 100',
            ],
            width: 24,
            height: 6,
          }),
        ],
        [
          new cloudwatch.LogQueryWidget({
            title: 'Audit Trail',
            logGroups: [this.logGroup],
            queryLines: [
              'fields @timestamp, userId, action, resource',
              'filter action like /AUDIT/',
              'sort @timestamp desc',
              'limit 50',
            ],
            width: 24,
            height: 6,
          }),
        ],
      ],
    });

    // Custom Metrics for Business KPIs
    const businessMetrics = [
      'DocumentsProcessedPerHour',
      'AverageProcessingTime',
      'MakerCheckerApprovalRate',
      'ComplianceScore',
      'UserSatisfactionScore',
      'SystemAvailability',
    ];

    businessMetrics.forEach((metricName, index) => {
      new cloudwatch.Metric({
        namespace: 'CAM/Business',
        metricName,
        statistic: 'Average',
      });
    });

    // Outputs
    new cdk.CfnOutput(this, 'DashboardUrl', {
      value: `https://${this.region}.console.aws.amazon.com/cloudwatch/home?region=${this.region}#dashboards:name=${this.dashboard.dashboardName}`,
      description: 'CloudWatch Dashboard URL',
    });

    new cdk.CfnOutput(this, 'LogGroupName', {
      value: this.logGroup.logGroupName,
      description: 'CloudWatch Log Group name',
    });

    new cdk.CfnOutput(this, 'AlertTopicArn', {
      value: this.alertTopic.topicArn,
      description: 'SNS topic for alerts',
    });

    new cdk.CfnOutput(this, 'CloudTrailArn', {
      value: this.cloudTrail.trailArn,
      description: 'CloudTrail ARN for audit logging',
    });
  }
}
