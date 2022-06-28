// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: MIT-0
import * as AWS from 'aws-sdk';
import { updateHistoryEntry } from '../utils/historyTable';
import { CrawlContext } from '../crawler/types';

const sfn = new AWS.StepFunctions();

/**
 * Continue execution of the crawler in another step function execution
 */
export const continueExecution = async (crawlContext: CrawlContext) => {
  console.log('Continuing execution for', crawlContext);

  console.log('Resetting batch count for next state machine execution');
  await updateHistoryEntry(crawlContext.crawlId, {
    batchUrlCount: 0,
  });

  console.log('Starting a state machine execution to continue the crawl');
  await sfn.startExecution({
    name: `${crawlContext.crawlName}-continued-${new Date().toISOString().replace(/[:\.]/g, '-')}`,
    stateMachineArn: crawlContext.stateMachineArn,
    input: JSON.stringify({
      Payload: { crawlContext },
    }),
  }).promise();
};
