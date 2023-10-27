// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: MIT-0
import * as AWS from 'aws-sdk';
import { updateHistoryEntry } from '../utils/historyTable';
import { CrawlContext } from '../crawler/types';
import { deleteContextTable } from '../utils/contextTable';
import { deleteQueuedPathsFromS3 } from '../utils/queuedPaths';

const kendra = new AWS.Kendra();

export interface KendraDataSourceDetails {
  indexId: string;
  dataSourceId: string;
}

/**
 * This step is run at the end of our step function state machine, once all discovered urls have been visited.
 * Clear the context database and sync the kendra data source.
 */
export const completeCrawl = async (
  crawlContext: CrawlContext,
  kendraDataSourceDetails?: KendraDataSourceDetails,
) => {
  // Delete the temporary queuedPaths file from the S3 working bucket
  console.log('Deleting queuedPaths file from S3');
  await deleteQueuedPathsFromS3(crawlContext);

  // Delete the context table as we have visited all urls in the queue
  console.log('Deleting context table', crawlContext.contextTableName);
  await deleteContextTable(crawlContext.contextTableName);

  // Update the end timestamp
  console.log('Writing end timestamp to history table');
  await updateHistoryEntry(crawlContext.crawlId, {
    endTimestamp: new Date().toISOString(),
  });

  // If we're using kendra, trigger a sync for the kendra data source
  if (kendraDataSourceDetails) {
    console.log('Starting kendra sync job');
    await kendra.startDataSourceSyncJob({
      IndexId: kendraDataSourceDetails.indexId,
      Id: kendraDataSourceDetails.dataSourceId,
    }).promise();
  }

  console.log('Crawl complete!');

  return {};
};
