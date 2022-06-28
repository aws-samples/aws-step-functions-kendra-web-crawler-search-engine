// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: MIT-0
import { Construct } from 'constructs';
import { Choice, Succeed, Map, StateMachine, Condition, TaskInput } from "aws-cdk-lib/aws-stepfunctions";
import { LambdaInvoke } from "aws-cdk-lib/aws-stepfunctions-tasks";
import { WebCrawlerSteps } from './web-crawler-step-lambdas';
import { WEB_CRAWLER_STATE_MACHINE_NAME } from './constants';

const { booleanEquals } = Condition;

export interface WebCrawlerStateMachineProps {
  steps: WebCrawlerSteps;
}

/**
 * Construct to create our web crawler state machine
 */
export default class WebCrawlerStateMachine extends Construct {
  constructor(scope: Construct, id: string, props: WebCrawlerStateMachineProps) {
    super(scope, id);

    // Create tasks for each of the web crawler steps
    const crawlPageAndQueueUrls = new LambdaInvoke(this, 'CrawlPageAndQueueUrls', {
      lambdaFunction: props.steps.crawlPageAndQueueUrls,
    });
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
            .otherwise(new Map(this, 'ForEachQueuedUrl', { itemsPath: '$.Payload.queuedPaths' })
              .iterator(crawlPageAndQueueUrls).addCatch(readQueuedUrls)
              .next(readQueuedUrls))
          )
          // No urls in the queue, so we can complete the crawl
          .otherwise(completeCrawl.next(new Succeed(this, 'Done'))));

    const webCrawlerStateMachine = new StateMachine(this, `${id}-StateMachine`, {
      stateMachineName: WEB_CRAWLER_STATE_MACHINE_NAME,
      definition,
    });

    // Grant the startCrawling lambda permissions to start an execution of this state machine
    webCrawlerStateMachine.grantStartExecution(props.steps.startCrawl);
    props.steps.startCrawl.addEnvironment('WEB_CRAWLER_STATE_MACHINE_ARN', webCrawlerStateMachine.stateMachineArn);
  }
}
