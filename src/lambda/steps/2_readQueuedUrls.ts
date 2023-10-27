// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: MIT-0
import { CrawlContext } from '../crawler/types';
import { readBatchOfUrlsToVisit } from '../utils/contextTable';
import { getHistoryEntry, putHistoryEntry } from '../utils/historyTable';
import { getEnvVariableAsInteger, getEnvVariableRequired } from '../utils/env';
import { saveQueuedPathsToS3 } from '../utils/queuedPaths';

const WORKING_BUCKET = getEnvVariableRequired("WORKING_BUCKET");
const STATE_MACHINE_URL_THRESHOLD = getEnvVariableAsInteger("STATE_MACHINE_URL_THRESHOLD");

/**
 * Read all non visited urls from the context database so that they can be distributed to the sync lambdas
 */
export const readQueuedUrls = async (crawlContext: CrawlContext) => {
  const historyEntry = await getHistoryEntry(crawlContext.crawlId);

  const { urlCount, batchUrlCount } = historyEntry;

  // Get a batch of urls we haven't visited yet
  const urlsToVisit = await readBatchOfUrlsToVisit(crawlContext.contextTableName);

  console.log('urlsToVisit.length: ', urlsToVisit.length);
  console.log('Urls to visit', urlsToVisit);

  const totalUrlCount = urlCount + urlsToVisit.length;
  const totalBatchUrlCount = batchUrlCount + urlsToVisit.length;
  console.log('Total urls:', totalUrlCount);
  console.log('Total batchUrls:', totalBatchUrlCount);
  console.log('Total batchUrls exceeding threshold:', totalBatchUrlCount > STATE_MACHINE_URL_THRESHOLD);

  // Write the total urls back to the history table
  await putHistoryEntry({
    ...historyEntry,
    urlCount: totalUrlCount,
    batchUrlCount: totalBatchUrlCount,
  });

  // Save queuedPaths to S3 and return the S3 location as part of the payload to avoid hitting the 
  // max request size limit of 256KB.
  const queuedPathsS3Key = await saveQueuedPathsToS3(crawlContext, urlsToVisit);

  return {
    totalUrlCountExceedsThreshold: totalBatchUrlCount > STATE_MACHINE_URL_THRESHOLD,
    queueIsNonEmpty: urlsToVisit.length > 0,
    crawlContext,
    queuedPaths: {
      s3: {
        bucket: WORKING_BUCKET,
        key: queuedPathsS3Key
      }
    }
  };
};
