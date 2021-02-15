// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: MIT-0
import * as AWS from 'aws-sdk';
import { CrawlContext, CrawlInputWithId } from '../crawler/types';
import { createContextTable, queuePaths } from '../utils/contextTable';
import { putHistoryEntry } from '../utils/historyTable';

const sfn = new AWS.StepFunctions();

/**
 * This is the first step in the webcrawler state machine. It's responsible for triggering state machine executions to
 * crawl data for every data source in the data source registry.
 */
export const startCrawl = async (target: CrawlInputWithId, contextTableNamePrefix: string, stateMachineArn: string) => {
  // Create the context table
  const contextTableName = await createContextTable(target, contextTableNamePrefix);

  const startTimestamp = new Date().toISOString();
  const sanitisedTimestamp = startTimestamp.replace(/[:\.]/g, '-');

  const crawlContext: CrawlContext = {
    ...target,
    contextTableName,
    stateMachineArn,
  };

  console.log('Writing initial entry to history table');
  await putHistoryEntry({
    ...target,
    startTimestamp,
    stateMachineArn,
    contextTableName,
    urlCount: 0,
    batchUrlCount: 0,
  });

  console.log('Writing initial urls to context table');
  await queuePaths(contextTableName, target.startPaths);

  console.log('Starting step function execution');
  const response = await sfn.startExecution({
    name: `${target.crawlName}-${sanitisedTimestamp}`,
    stateMachineArn,
    input: JSON.stringify({
      Payload: { crawlContext },
    }),
  }).promise();

  console.log('Successfully started execution', response);

  return { stateMachineExecutionArn: response.executionArn };
};
