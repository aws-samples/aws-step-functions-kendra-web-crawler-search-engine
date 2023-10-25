// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: MIT-0
import { Construct } from 'constructs';
import { Choice, Succeed, Map, StateMachine, Condition, TaskInput, CustomState, LogLevel } from "aws-cdk-lib/aws-stepfunctions";
import { LambdaInvoke } from "aws-cdk-lib/aws-stepfunctions-tasks";
import { WebCrawlerSteps } from './web-crawler-step-lambdas';
import { WEB_CRAWLER_STATE_MACHINE_NAME } from './constants';
import {Bucket} from "aws-cdk-lib/aws-s3";
import { PolicyStatement, Effect } from 'aws-cdk-lib/aws-iam';
import {LogGroup} from 'aws-cdk-lib/aws-logs';

const { booleanEquals } = Condition;

export interface WebCrawlerStateMachineProps {
  steps: WebCrawlerSteps;
  workingBucket: Bucket;
  webCrawlerStateMachineArn: string;
}

/**
 * Construct to create our web crawler state machine
 */
export default class WebCrawlerStateMachine extends Construct {
  constructor(scope: Construct, id: string, props: WebCrawlerStateMachineProps) {
    super(scope, id);

    // Create tasks for each of the web crawler steps
    // const crawlPageAndQueueUrls = new LambdaInvoke(this, 'CrawlPageAndQueueUrls', {
    //  lambdaFunction: props.steps.crawlPageAndQueueUrls,
    //});

    const readQueuedUrls = new LambdaInvoke(this, 'ReadQueuedUrls', {
      lambdaFunction: props.steps.readQueuedUrls,
      payload: TaskInput.fromJsonPathAt('$$.Execution.Input'),
    });
    const completeCrawl = new LambdaInvoke(this, 'CompleteCrawl', {
      lambdaFunction: props.steps.completeCrawl,
    });
    const continueExecution = new LambdaInvoke(this, 'ContinueExecution', {
      lambdaFunction: props.steps.continueExecution,
    });

    // As of Oct 2023, CDK does not support Distributed Map state yet
    // See: https://github.com/aws/aws-cdk/issues/23216
    // Using CustomState as a workaround
    //const dummyMap = new Map(this, "DummyMap");
    //dummyMap.iterator(crawlPageAndQueueUrls).next(readQueuedUrls)
    const createDistMapForEachQueuedUrl = () => {
      return new CustomState(this, "ForEachQueuedUrl", {
        stateJson: {
          "Type": "Map",
          "MaxConcurrency": 1000,
          "Catch": [
            {
              "ErrorEquals": [
                "States.ALL"
              ],
              "Next": "ReadQueuedUrls"
            }
          ],
          "ItemProcessor": {
            "StartAt": "CrawlPageAndQueueUrls",
            "States": {
              "CrawlPageAndQueueUrls": {
                "End": true,
                "Retry": [
                  {
                    "ErrorEquals": [
                      "Lambda.ServiceException",
                      "Lambda.AWSLambdaException",
                      "Lambda.SdkClientException"
                    ],
                    "IntervalSeconds": 2,
                    "MaxAttempts": 6,
                    "BackoffRate": 2
                  }
                ],
                "Type": "Task",
                "Resource": "arn:aws:states:::lambda:invoke",
                "Parameters": {
                  "FunctionName": `${props.steps.crawlPageAndQueueUrls.functionArn}`,
                  "Payload.$": "$"
                }
              }
            },
            "ProcessorConfig": {
              "Mode": "DISTRIBUTED",
              "ExecutionType": "EXPRESS"
            }
          },
          "ResultWriter": {
            "Resource": "arn:aws:states:::s3:putObject",
            "Parameters": {
              "Bucket": `${props.workingBucket.bucketName}`,
              "Prefix": "sfn-distmap-outputs/"
            }
          },
          "ItemReader": {
            "Resource": "arn:aws:states:::s3:getObject",
            "ReaderConfig": {
              "InputType": "JSON"
            },
            "Parameters": {
              "Bucket.$": "$.Payload.queuedPaths.s3.bucket",
              "Key.$": "$.Payload.queuedPaths.s3.key"
            }
          }
        }
      });
    }

    // Create the step function state machine for our webcrawler.
    const definition =
      // Read URLs from the queue
      readQueuedUrls.addCatch(readQueuedUrls).next(
        // Check if we have urls still to visit
        new Choice(this, 'QueueContainsUrls?').when(booleanEquals('$.Payload.queueIsNonEmpty', true),
          // Check if we have visited more urls than our threshold for a single state machine execution
          new Choice(this, 'VisitedUrlsExceedsThreshold?').when(booleanEquals('$.Payload.totalUrlCountExceedsThreshold', true),
            // Continue crawling in another state machine execution
            continueExecution.next(new Succeed(this, 'ContinuingInAnotherExecution')))
            // Crawl every page we read from the queue in parallel
            //.otherwise(new Map(this, 'ForEachQueuedUrl', { itemsPath: '$.Payload.queuedPaths' })
            //  .iterator(crawlPageAndQueueUrls).addCatch(readQueuedUrls)
            //  .next(readQueuedUrls))
            // Change from Inline Map to Distributed Map
            .otherwise(createDistMapForEachQueuedUrl().next(readQueuedUrls))
          )
          // No urls in the queue, so we can complete the crawl
          .otherwise(completeCrawl.next(new Succeed(this, 'Done'))));

    const logGroup = new LogGroup(this, 'ExecutionLogs');
    const webCrawlerStateMachine = new StateMachine(this, `${id}-StateMachine`, {
      stateMachineName: WEB_CRAWLER_STATE_MACHINE_NAME,
      definition,
      logs: {
        level: LogLevel.ERROR,
        destination: logGroup
      }
    });

    // Grant the startCrawling lambda permissions to start an execution of this state machine
    webCrawlerStateMachine.grantStartExecution(props.steps.startCrawl);
    // Grant the webcrawler state machine permissions to read and write to the working bucket
    props.workingBucket.grantReadWrite(webCrawlerStateMachine.role);
    
    // manually add permission to execute own state machine, required by Distributed Map state
    // for child executions. 
    webCrawlerStateMachine.addToRolePolicy(new PolicyStatement({
      effect: Effect.ALLOW,
      actions: ["states:*"],
      resources: [props.webCrawlerStateMachineArn],
    }));

    // manually add permission to invoke function "crawlPageAndQueueUrls" as CustomState is used
    webCrawlerStateMachine.addToRolePolicy(new PolicyStatement({
      effect: Effect.ALLOW,
      actions: ["lambda:InvokeFunction"],
      resources: [props.steps.crawlPageAndQueueUrls.functionArn],
    }));
    props.steps.startCrawl.addEnvironment('WEB_CRAWLER_STATE_MACHINE_ARN', webCrawlerStateMachine.stateMachineArn);
  }
}
