// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: MIT-0
import { Browser } from 'puppeteer-core';
import { extractPageContentAndUrls } from './core';
import { CrawlDestination, CrawlInput } from './types';

/**
 * A simple "local" web crawler which runs in a loop. This can be used to test any changes to the web crawler without
 * deploying and running the state machine.
 * @param browser puppeteer browser instance
 * @param input details of the website to crawl
 * @param destination (optional) details of where to write page content
 */
export const crawl = async (
  browser: Browser,
  input: CrawlInput,
  destination?: CrawlDestination,
) => {
  const pathQueue = [...input.startPaths];
  const seenPaths = new Set(pathQueue);

  while (pathQueue.length > 0) {
    const path = pathQueue.pop()!;
    seenPaths.add(path);
    console.log('Visiting', path);

    const newPaths = await extractPageContentAndUrls(browser, {
      ...input,
      path,
    }, destination);

    pathQueue.push(...newPaths.filter((newPath) => !seenPaths.has(newPath)));
  }

  return { visitedUrls: [...seenPaths] };
};
