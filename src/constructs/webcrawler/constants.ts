// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: MIT-0

/**
 * The name of the web crawler state machine
 */
export const WEB_CRAWLER_STATE_MACHINE_NAME = 'webcrawler-state-machine';

/**
 * The default number of urls to visit within a single state machine execution.
 *
 * There's a limit of 25000 step function history events, so for large sites we must split the work across multiple
 * executions. When the number of visited urls for an execution is greater than this, we launch a new step function
 * execution to continue crawling the website.
 */
export const DEFAULT_STATE_MACHINE_URL_THRESHOLD = 10000;

/**
 * The default concurrency limit for the Distributed Map state's child executions
 * 
 * Distributed Map state can support up to 10,000 concurrent executions but we need to consider the default Lambda 
 * concurrency limit of 1000 per AWS region. To increase the concurrency limit for child executions, you can request
 * a quota increase for the Lambda concurrency limit and then update the concurrency limit for the child executions of
 * the Distributed Map state accordingly. You may also need to use provisioned concurrency for the Lambda function "CrawlPageAndQ"
 * to deal with the initial burst of concurrency.
 * 
 * For a new deployment of the solution to work within the default Lambda concurrency limit, we set the default concurrency
 * limit for the Distributed Map state to 1000.
 */
export const DEFAULT_DISTRIBUTED_MAP_CONCURRENCY_LIMIT = 1000;

/**
 * The default number of urls to sync in parallel.
 * 
 * Note that this "DEFAULT_PARALLEL_URLS_TO_SYNC" must be the same or bigger than the DEFAULT_DISTRIBUTED_MAP_CONCURRENCY_LIMIT.
 */
export const DEFAULT_PARALLEL_URLS_TO_SYNC = 1000;
