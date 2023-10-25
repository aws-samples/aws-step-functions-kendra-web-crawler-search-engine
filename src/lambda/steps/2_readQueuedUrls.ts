// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: MIT-0
import { STATE_MACHINE_URL_THRESHOLD } from '../config/constants';
import { CrawlContext } from '../crawler/types';
import { readBatchOfUrlsToVisit } from '../utils/contextTable';
import { getHistoryEntry, putHistoryEntry } from '../utils/historyTable';

import S3 from 'aws-sdk/clients/s3';
const s3 = new S3();
const { WORKING_BUCKET } = process.env;

/**
 * Read all non visited urls from the context database so that they can be distributed to the sync lambdas
 */
export const readQueuedUrls = async (crawlContext: CrawlContext) => {
  if (!WORKING_BUCKET) throw Error('Missing environment variable "WORKING_BUCKET"');

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

  let queuedPaths = urlsToVisit.map((path) => ({
    path,
    crawlContext
  }))

  // Save queuedPaths to S3
  const folder = 'temp-queued-paths';
  const key = `${folder}/${crawlContext.crawlId}.queuedPaths.json`;
  let result = await s3.putObject({ Bucket: WORKING_BUCKET, Key: key, Body: JSON.stringify(queuedPaths) }).promise();
  console.log('queuedPaths saved to S3.', result);
  
  // The payload include the S3 location for the queuedPaths to avoid hitting max request size limit of 256KB.
  return {
    totalUrlCountExceedsThreshold: totalBatchUrlCount > STATE_MACHINE_URL_THRESHOLD,
    queueIsNonEmpty: urlsToVisit.length > 0,
    crawlContext,
    queuedPaths: {
      s3: {
        bucket: WORKING_BUCKET,
        key
      }
    }
  };
};
