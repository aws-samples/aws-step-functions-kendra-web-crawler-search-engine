// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: MIT-0
/**
 * The number of urls to visit within a single state machine execution.
 *
 * There's a limit of 25000 step function history events, so for large sites we must split the work across multiple
 * executions. When the number of visited urls for an execution is greater than this, we launch a new step function
 * execution to continue crawling the website.
 */
export const STATE_MACHINE_URL_THRESHOLD = 2000;

/**
 * The number of urls to sync in parallel. If increasing this number, consider increasing the read/write capacity for the
 * context table since each parallel sync lambda will read and then possibly write the urls it discovers.
 *
 * Note that this number must be less than the STATE_MACHINE_URL_THRESHOLD
 */
export const PARALLEL_URLS_TO_SYNC = 200;

/**
 * Provisioned write capacity for each context table.
 *
 * The write capacity should be adjusted with the PARALLEL_URLS_TO_SYNC to avoid throttling errors. Context tables are
 * ephemeral, existing only for the duration of a given web crawl execution.
 */
export const CONTEXT_TABLE_WRITE_CAPACITY = 100;

/**
 * Provisioned read capacity for each context table.
 *
 * The read capacity should be adjusted with the PARALLEL_URLS_TO_SYNC to avoid throttling errors. Context tables are
 * ephemeral, existing only for the duration of a given web crawl execution.
 */
export const CONTEXT_TABLE_READ_CAPACITY = 100;
