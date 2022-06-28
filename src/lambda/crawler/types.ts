// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: MIT-0
import * as AWS from 'aws-sdk';

/**
 * Base configuration required for crawling
 */
export interface CrawlConfig {
  baseUrl: string;
  pathKeywords?: string[];
}

/**
 * Input required to start a web crawl
 */
export interface CrawlInput extends CrawlConfig {
  crawlName: string;
  startPaths: string[];
}

/**
 * Input required to start a web crawl and track its history
 */
export interface CrawlInputWithId extends CrawlInput {
  crawlId: string;
}

/**
 * Passed between steps in our state machine
 */
export interface CrawlContext extends CrawlInputWithId {
  contextTableName: string;
  stateMachineArn: string;
}

/**
 * Input required to crawl an individual page
 */
export interface CrawlPageInput extends CrawlConfig {
  path: string;
}

/**
 * Destination parameters for storing crawled content
 */
export interface CrawlDestination {
  s3: AWS.S3,
  s3BucketName: string;
  s3KeyPrefix: string;
}

/**
 * Represents the content of a web page
 */
export interface PageContent {
  title: string;
  htmlContent: string;
}
