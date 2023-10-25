// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: MIT-0

/**
 * The number of urls to visit within a single state machine execution.
 *
 * There's a limit of 25000 step function history events, so for large sites we must split the work across multiple
 * executions. When the number of visited urls for an execution is greater than this, we launch a new step function
 * execution to continue crawling the website.
 */
const ENV_URL_THRESHOLD = parseInt(process.env.STATE_MACHINE_URL_THRESHOLD || '')
export const STATE_MACHINE_URL_THRESHOLD = Number.isInteger(ENV_URL_THRESHOLD) ? ENV_URL_THRESHOLD: 10000;

/**
 * The number of urls to sync in parallel.
 *
 * Distributed Map state can support a maximum concurrency of up to 10,000 child executions in parallel.
 * However, there is a default concurrency limit of 1000 Lambda executions across all functions in a region, 
 * we set the concurrency limit for child executions to 1000 by default and the batch size "PARALLEL_URLS_TO_SYNC"
 * is set to 1000 by default. You can speed up the web crawling further by requesting a quota increase for
 * the Lambda concurrency limit and update the concurrency limit for the Distributed Map state's child executions
 * accordingly. 
 * 
 * Each batch run requires 5 events to be created (MapStateEntered, MapStateStarted, MapRunStarted, MapRunSucceeded/Failed, 
 * MapStateExited). Given the hard limit of 25,000 history events for a state machine execution and the child execution events 
 * for Distributed Map state are not counted as part of the parent event history, the STATE_MACHINE_URL_THRESHOLD can go much 
 * higher compared to the Inline Map state.
 * For example, with PARALLEL_URLS_TO_SYNC = 1000, the STATE_MACHINE_URL_THRESHOLD can be set to ~(25000/5 * 1000 - 5000 * 20).
 */
const ENV_URLS_TO_SYNC = parseInt(process.env.PARALLEL_URLS_TO_SYNC || '')
export const PARALLEL_URLS_TO_SYNC = Number.isInteger(ENV_URLS_TO_SYNC) ? ENV_URLS_TO_SYNC: 1000;

/**
 * Provisioned write capacity for each context table.
 *
 * The write capacity should be adjusted with the PARALLEL_URLS_TO_SYNC to avoid throttling errors. Context tables are
 * ephemeral, existing only for the duration of a given web crawl execution.
 * @deprecated use on-demand capacity to let DynamoDB handle the scaling instead of provisioned capacity
 */
export const CONTEXT_TABLE_WRITE_CAPACITY = 100;

/**
 * Provisioned read capacity for each context table.
 *
 * The read capacity should be adjusted with the PARALLEL_URLS_TO_SYNC to avoid throttling errors. Context tables are
 * ephemeral, existing only for the duration of a given web crawl execution.
 * @deprecated use on-demand capacity to let DynamoDB handle the scaling instead of provisioned capacity
 */
export const CONTEXT_TABLE_READ_CAPACITY = 100;
