// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: MIT-0
import { v4 as uuid } from 'uuid';
import { CrawlInput } from './crawler/types';
import { startCrawl } from './steps/1_startCrawl';
import { readQueuedUrls } from './steps/2_readQueuedUrls';
import { crawlPageAndQueueUrls } from './steps/3_crawlPageAndQueueUrls';
import { continueExecution } from './steps/4_continueExecution';
import { completeCrawl, KendraDataSourceDetails } from './steps/5_completeCrawl';

const {
  HISTORY_TABLE_NAME,
  CONTEXT_TABLE_NAME_PREFIX,
  DATA_SOURCE_BUCKET_NAME,
  KENDRA_INDEX_ID,
  KENDRA_DATA_SOURCE_ID,
  WEB_CRAWLER_STATE_MACHINE_ARN,
} = process.env;

/**
 * Responsible for starting a crawl
 */
export const startCrawlHandler = async (event: any, context: any) => {
  console.log(event, context);

  if (!HISTORY_TABLE_NAME || !WEB_CRAWLER_STATE_MACHINE_ARN || !CONTEXT_TABLE_NAME_PREFIX) {
    throw new Error("Environment not configured correctly. HISTORY_TABLE_NAME, WEB_CRAWLER_STATE_MACHINE_ARN and CONTEXT_TABLE_NAME_PREFIX must be specified");
  }

  const input: CrawlInput = event;

  return await startCrawl({
    ...input,
    crawlId: uuid(),
  }, CONTEXT_TABLE_NAME_PREFIX, WEB_CRAWLER_STATE_MACHINE_ARN);
};

/**
 * Read all non visited urls from context table so that they can be passed to the crawl lambdas
 */
export const readQueuedUrlsHandler = async (event: any, context: any) => {
  console.log(event, context);

  if (!HISTORY_TABLE_NAME) {
    throw new Error("Environment not configured correctly. HISTORY_TABLE_NAME must be specified");
  }

  const { crawlContext } = event.Payload;

  return await readQueuedUrls(crawlContext);
};

/**
 * Given a single webpage, extract its content and optionally write to the s3 bucket, extract urls and write any new urls to
 * context database
 */
export const crawlPageAndQueueUrlsHandler = async (event: any, context: any) => {
  console.log(event, context);

  const { path, crawlContext } = event;

  return await crawlPageAndQueueUrls(path, crawlContext, DATA_SOURCE_BUCKET_NAME);
};

/**
 * Responsible for continuing execution via another state machine execution if we're getting too close to the maximum
 * number of steps in our state machine execution.
 */
export const continueExecutionHandler = async (event: any, context: any) => {
  console.log(event, context);

  // Clear the context database
  if (!HISTORY_TABLE_NAME) {
    throw new Error("Environment not configured correctly. HISTORY_TABLE_NAME must be specified");
  }

  const { crawlContext } = event.Payload;

  return await continueExecution(crawlContext);
};

/**
 * When complete, clear the context database and optionally sync the kendra data source!
 */
export const completeCrawlHandler = async (event: any, context: any) => {
  console.log(event, context);

  if (!HISTORY_TABLE_NAME) {
    throw new Error("Environment not configured correctly. HISTORY_TABLE_NAME must be specified");
  }

  // Kendra data source is deployed optionally
  const kendraDataSourceDetails: KendraDataSourceDetails | undefined = (KENDRA_INDEX_ID && KENDRA_DATA_SOURCE_ID) ? {
    indexId: KENDRA_INDEX_ID,
    dataSourceId: KENDRA_DATA_SOURCE_ID,
  } : undefined;

  const { crawlContext } = event.Payload;

  return await completeCrawl(crawlContext, kendraDataSourceDetails);
};
