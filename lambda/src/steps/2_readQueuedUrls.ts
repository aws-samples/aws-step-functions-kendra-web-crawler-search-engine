// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: MIT-0
import { STATE_MACHINE_URL_THRESHOLD } from '../config/constants';
import { CrawlContext } from '../crawler/types';
import { readBatchOfUrlsToVisit } from '../utils/contextTable';
import { getHistoryEntry, putHistoryEntry } from '../utils/historyTable';

/**
 * Read all non visited urls from the context database so that they can be distributed to the sync lambdas
 */
export const readQueuedUrls = async (crawlContext: CrawlContext) => {
  const historyEntry = await getHistoryEntry(crawlContext.crawlId);

  const { urlCount, batchUrlCount } = historyEntry;

  // Get a batch of urls we haven't visited yet
  const urlsToVisit = await readBatchOfUrlsToVisit(crawlContext.contextTableName);

  console.log('Urls to visit', urlsToVisit);

  const totalUrlCount = urlCount + urlsToVisit.length;
  const totalBatchUrlCount = batchUrlCount + urlsToVisit.length;
  console.log('Total urls:', totalUrlCount);
  console.log('Total urls in current step function execution:', totalBatchUrlCount);

  // Write the total urls back to the history table
  await putHistoryEntry({
    ...historyEntry,
    urlCount: totalUrlCount,
    batchUrlCount: totalBatchUrlCount,
  });

  return {
    totalUrlCountExceedsThreshold: totalBatchUrlCount > STATE_MACHINE_URL_THRESHOLD,
    queueIsNonEmpty: urlsToVisit.length > 0,
    queuedPaths: urlsToVisit.map((path) => ({
      path,
      crawlContext,
    })),
    crawlContext,
  };
};
