// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: MIT-0
import { Browser, Page } from 'puppeteer-core';
import { URL } from 'url';
import * as path from 'path';
import { CrawlDestination, CrawlPageInput, PageContent } from './types';

/**
 * Extract content from a page. This provides a basic content extraction mechanism. You can make this more advanced and
 * add logic to further process a page here.
 * @param page puppeteer browser page
 */
const extractContent = async (page: Page): Promise<PageContent> => {
  const [ title, htmlContent ] = await Promise.all([
    page.evaluate(() => document.title),
    page.evaluate(() => document.body.innerHTML),
  ]);
  return { title, htmlContent };
};

/**
 * Writes the given page content to S3, along with metadata for Kendra
 */
const writePageToS3ForKendra = async (url: string, content: PageContent, destination: CrawlDestination) => {
  if (!content.title || !content.htmlContent) {
    console.log('Page has no content, skipping');
    return;
  }

  // We write the document to S3 under the given key prefix
  const documentKey = path.join(destination.s3KeyPrefix, `${encodeURIComponent(url)}.html`);

  // Metadata format is documented here: https://docs.aws.amazon.com/kendra/latest/dg/s3-metadata.html
  // Note that the kendra index must be updated in CDK if adding new custom attributes here.
  const metadata = {
    Title: content.title,
    Attributes: {
      _source_uri: url,
    },
  };

  const s3Put = (Key: string, Body: string) => destination.s3.putObject({ Bucket: destination.s3BucketName, Key, Body }).promise();

  // Write the html content and metadata json to S3
  await Promise.all([
    s3Put(documentKey, content.htmlContent),
    s3Put(`${documentKey}.metadata.json`, JSON.stringify(metadata)),
  ]);

  console.log("Written page content to s3");
};


/**
 * Return whether the given url is within the website of the base url, ie it's a relative link, or it's an absolute
 * link that starts with the base url.
 */
const isUrlWithinBaseWebsite = (url: string, baseUrl: string): boolean => !url.startsWith('http') || url.startsWith(baseUrl);

/**
 * Return whether any of the keywords are included in the url. Keywords are optional, we include the url by default
 * if they aren't supplied.
 */
const isUrlMatchingSomeKeyword = (url: string, keywords?: string[]): boolean => (
  !keywords || keywords.length === 0 || keywords.some((keyword) => url.toLowerCase().includes(keyword))
);

/**
 * Return all the urls from a page that we may enqueue for further crawling
 * @return a list of absolute urls
 */
const getLinksToFollow = async (page: Page, baseUrl: string, keywords?: string[]): Promise<string[]> => {
  // Find all the anchor tags and get the url from each
  const urls = await page.$$eval('a', (elements => elements.map(e => e.getAttribute('href'))));

  // Get the base url for any relative urls
  const currentPageUrlParts = (await page.evaluate(() => document.location.href)).split('/');
  const relativeUrlBase = currentPageUrlParts.slice(0, currentPageUrlParts.length).join('/');

  // Filter to only urls within our target website, and urls that match the provided keywords
  return urls.filter((url: string | null) => url && isUrlWithinBaseWebsite(url, baseUrl)).map((url) => {
    if (url!.startsWith(baseUrl)) {
      return url!;
    }
    const u = new URL(url!, relativeUrlBase);
    return `${u.origin}${u.pathname}`;
  }).filter((url) => isUrlMatchingSomeKeyword(url, keywords));
};

/**
 * Uses the given browser to load the given page, writes its content to the destination, and returns any discovered urls
 * discovered from the page.
 *
 * @param browser the puppeteer browser
 * @param input the page to visit
 * @param destination (optional) the location to write content to
 * @return a list of paths (relative to the base url) that were found on the page
 */
export const extractPageContentAndUrls = async (
  browser: Browser,
  input: CrawlPageInput,
  destination?: CrawlDestination,
): Promise<string[]> => {
  const url = new URL(input.path, input.baseUrl).href;
  try {
    // Visit the url and wait until network settles, a reasonable indication that js libraries etc have all loaded and
    // client-side rendering or ajax calls have completed
    const page = await browser.newPage();
    await page.goto(url, {
      waitUntil: 'networkidle0',
    });

    // Extract the content from the page
    const content = await extractContent(page);
    console.log("Extracted content from page:", content);

    // Write the content to s3 if a destination was provided (ie the kendra stack was deployed too)
    if (destination) {
      await writePageToS3ForKendra(url, content, destination);
    }

    // Find fully qualified urls with the given base url
    const discoveredUrls = new Set(await getLinksToFollow(page, input.baseUrl, input.pathKeywords));
    console.log("Discovered urls:", discoveredUrls);

    // We return relative paths
    const discoveredPaths = [...discoveredUrls].flatMap((u) => {
      try {
        return [new URL(u).pathname];
      } catch (e) {
        console.warn('Url', u, 'was not valid and will be skipped', e);
        return [];
      }
    });
    console.log("Discovered relative paths:", discoveredPaths);

    return discoveredPaths;
  } catch (e) {
    console.warn('Could not visit url', url, e);
    return [];
  }
};
