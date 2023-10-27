// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: MIT-0
import { CrawlContext } from '../crawler/types';
import S3 from 'aws-sdk/clients/s3';
import { getEnvVariableRequired } from './env';

const s3 = new S3();
const WORKING_BUCKET = getEnvVariableRequired("WORKING_BUCKET");
const FOLDER_TEMP_QUEUED_PATHS = 'temp-queued-paths';

/**
 * Save queued paths to S3
 */
export const saveQueuedPathsToS3 = async (crawlContext: CrawlContext, urlsToVisit: string[]): Promise<string> => {
  const queuedPaths = urlsToVisit.map((path) => ({
    path,
    crawlContext
  }))
  // Save queuedPaths to S3
  const key = `${FOLDER_TEMP_QUEUED_PATHS}/${crawlContext.crawlId}.queuedPaths.json`;
  await s3.putObject({ Bucket: WORKING_BUCKET, Key: key, Body: JSON.stringify(queuedPaths) }).promise();
  console.log('queuedPaths saved to S3', key);
  return key;
};

/**
 * Delete the temporary queued path file stored in S3
 */
export const deleteQueuedPathsFromS3 = async (crawlContext: CrawlContext): Promise<void> => {
  const key = `${FOLDER_TEMP_QUEUED_PATHS}/${crawlContext.crawlId}.queuedPaths.json`;
  await s3.deleteObject({ Bucket: WORKING_BUCKET, Key: key }).promise();
  console.log('queuedPaths file deleted from S3', key);
  return;
}  
