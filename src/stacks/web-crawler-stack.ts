// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: MIT-0
import { Construct } from 'constructs';
import { ArnFormat, Stack, StackProps } from 'aws-cdk-lib';
import { CfnDataSource, CfnIndex } from 'aws-cdk-lib/aws-kendra';
import { Bucket } from 'aws-cdk-lib/aws-s3';
import { Effect, PolicyStatement } from 'aws-cdk-lib/aws-iam';
import { AttributeType, Table } from 'aws-cdk-lib/aws-dynamodb';
import WebCrawlerStepLambdas from '../constructs/webcrawler/web-crawler-step-lambdas';
import WebCrawlerStateMachine from '../constructs/webcrawler/web-crawler-state-machine';
import { WEB_CRAWLER_STATE_MACHINE_NAME } from '../constructs/webcrawler/constants';

export interface KendraInfrastructureProps {
  dataSourceBucket: Bucket;
  kendraIndex: CfnIndex;
  kendraDataSource: CfnDataSource;
}

export interface WebCrawlerStackProps extends StackProps {
  kendra?: KendraInfrastructureProps;
}

/**
 * This stack deploys the serverless webcrawler
 */
export class WebCrawlerStack extends Stack {

  constructor(scope: Construct, id: string, props: WebCrawlerStackProps) {
    super(scope, id, props);

    // S3 bucket to store working files and output from step functions
    const workingBucket = new Bucket(this, 'WebCrawlerWorkingBucket');

    // Dynamodb table to store our web crawl history
    const historyTable = new Table(this, 'CrawlerHistoryTable', {
      partitionKey: {
        name: 'crawlId',
        type: AttributeType.STRING,
      },
    });

    // Each time we trigger a crawl, we'll create a temporary "context" dynamodb table to keep track of the discovered
    // urls and whether or not they have been visited
    const contextTableNamePrefix = 'web-crawler-context';

    // Helper method to create a policy to perform the given actions on any dynamodb context table
    const createContextTablePolicy = (actions: string[]) => new PolicyStatement({
      effect: Effect.ALLOW,
      actions: actions.map((action) => `dynamodb:${action}`),
      resources: [this.formatArn({
        service: 'dynamodb',
        resource: 'table',
        resourceName: `${contextTableNamePrefix}*`,
      })],
    });

    // We construct this manually rather than using the output of the WebCrawlerStateMachine to avoid a circular
    // dependency. The 'continueExecution' lambda needs permissions to start the state machine in which it resides.
    const webCrawlerStateMachineArn = this.formatArn({
      service: 'states',
      resource: 'stateMachine',
      resourceName: WEB_CRAWLER_STATE_MACHINE_NAME,
      arnFormat: ArnFormat.COLON_RESOURCE_NAME,
    });

    // Create all the lambdas for our webcrawler
    const { steps } = new WebCrawlerStepLambdas(this, 'WebCrawlerStepLambdas', {
      region: this.region,
      contextTableNamePrefix,
      createContextTablePolicy,
      kendra: props.kendra,
      historyTable,
      workingBucket,
      webCrawlerStateMachineArn,
    });

    // Create the state machine
    const webCrawlerStateMachine = new WebCrawlerStateMachine(this, 'WebCrawlerStateMachine', { steps, workingBucket, webCrawlerStateMachineArn});
  }
}
