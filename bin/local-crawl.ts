// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: MIT-0
import puppeteer from 'puppeteer';
import { Command } from 'commander';
import { Browser } from 'puppeteer-core';
import { crawl } from '../src/lambda/crawler/local';

const program = new Command();

program
  .option('--base-url <baseUrl>', 'The base url to crawl, eg. https://docs.aws.amazon.com/')
  .option('--start-paths <paths...>', 'The relative paths in the site to start crawling, eg /lambda')
  .option('--keywords [keywords...]', 'Optional keywords to filter the urls to visit, eg lambda');

const options = program.parse(process.argv).opts();

(async () => {
  const browser = await puppeteer.launch() as unknown as Browser;

  const result = await crawl(browser, {
    crawlName: 'local-crawl',
    baseUrl: options.baseUrl,
    startPaths: options.startPaths,
    pathKeywords: options.keywords,
  });

  await browser.close();

  console.log(result);
})();
