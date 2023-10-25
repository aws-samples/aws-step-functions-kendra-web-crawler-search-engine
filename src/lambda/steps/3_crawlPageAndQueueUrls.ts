// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: MIT-0
import * as AWS from 'aws-sdk';
import chrome from 'chrome-aws-lambda';
import { extractPageContentAndUrls } from '../crawler/core';
import { CrawlContext } from '../crawler/types';
import { markPathAsVisited, queuePaths } from '../utils/contextTable';
import { Browser } from "puppeteer-core";

const s3 = new AWS.S3();

/**
 * This step is the main part of the webcrawler, responsible for extracting content from a single webpage, and adding
 * any newly discovered urls to visit to the queue.
 */
export const crawlPageAndQueueUrls = async (
  path: string,
  crawlContext: CrawlContext,
  dataSourceBucketName?: string,
) => {
  let browser: Browser | undefined;
  try {
    const { contextTableName, baseUrl, pathKeywords, crawlName } = crawlContext;

    // Mark the path as visited first so that if there are any issues visiting this page we'll move on, rather than
    // infinitely repeating the same page!
    await markPathAsVisited(contextTableName, path);
    console.log('Marked path', path, 'as visited.');

    browser = await chrome.puppeteer.launch({
      args: chrome.args,
      defaultViewport: chrome.defaultViewport,
      executablePath: await chrome.executablePath,
      headless: chrome.headless,
      ignoreHTTPSErrors: true,
    });

    // If we've got a bucket for the kendra data source, provide this as a destination for the crawler, otherwise leave
    // it undefined so we don't write the content to s3
    const destination = dataSourceBucketName ? {
      s3,
      s3BucketName: dataSourceBucketName,
      s3KeyPrefix: crawlName,
    } : undefined;

    // Sync the content and extract the urls to visit
    const urlPaths = await extractPageContentAndUrls(browser, {
      baseUrl,
      path,
      pathKeywords,
    }, destination);
    console.log('Synced content from', path);

    console.log('Queueing ', urlPaths.length, ' new urls to visit', urlPaths);
    await queuePaths(contextTableName, urlPaths);
  } catch (e) {
    // Failure to crawl a url should not fail the entire process, we skip it and move on.
    console.error('Failed to crawl path', path, e);
  } finally {
    browser && await browser.close();
  }

  return {};
};
