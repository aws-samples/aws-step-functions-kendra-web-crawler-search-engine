// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: MIT-0
import * as AWS from 'aws-sdk';
import { Command } from 'commander';
import { paginatedRequest } from '../src/lambda/utils/pagination';
import { CrawlInput } from '../src/lambda/crawler/types';

const program = new Command();

program
  .option('--profile <profile>', 'The AWS profile used to start the crawl')
  .option('--name [name]', 'A name to identify this crawl')
  .option('--base-url <baseUrl>', 'The base url to crawl, eg. https://docs.aws.amazon.com/')
  .option('--start-paths <paths...>', 'The relative paths in the site to start crawling, eg /lambda')
  .option('--keywords [keywords...]', 'Optional keywords to filter the urls to visit, eg lambda/latest/dg');

const options = program.parse(process.argv).opts();

// Set these to use the region configured in the profile
process.env.AWS_SDK_LOAD_CONFIG = "true";
process.env.AWS_PROFILE = options.profile;

AWS.config.update({
  credentials: new AWS.SharedIniFileCredentials({ profile: options.profile }),
});

const cfn = new AWS.CloudFormation();
const lambda = new AWS.Lambda();

(async () => {
  // List all cloudformation exports
  const cfnExports = await paginatedRequest<AWS.CloudFormation.Types.ListExportsInput>(
    cfn.listExports.bind(cfn), {}, 'Exports', 'NextToken',
  );

  // Find the arn of the lambda function to start a crawl
  const startCrawlFunctionArnExport = cfnExports.find((exp) => exp.Name === 'StartCrawlFunctionArn');

  if (startCrawlFunctionArnExport) {
    const crawlInput: CrawlInput = {
      crawlName: options.name || 'my-crawl',
      baseUrl: options.baseUrl,
      startPaths: options.startPaths,
      pathKeywords: options.keywords,
    };
    console.log('Crawling', crawlInput.baseUrl, 'with name', crawlInput.crawlName);

    const response = await lambda.invoke({
      FunctionName: startCrawlFunctionArnExport.Value,
      InvocationType: 'RequestResponse',
      Payload: JSON.stringify(crawlInput),
    }).promise();

    console.log('startCrawl response: ', response)
    
    if (response.Payload) {
      const { stateMachineExecutionArn } = JSON.parse(response.Payload as string);

      const region = stateMachineExecutionArn.split(':')[3];
      const stateMachineConsoleUrl = `https://${region}.console.aws.amazon.com/states/home?region=${region}#/executions/details/${stateMachineExecutionArn}`;
      console.log('---');
      console.log('Started web crawl execution. Track its progress in the console here:');
      console.log(stateMachineConsoleUrl);

      const kendraIndexId = cfnExports.find((exp) => exp.Name === 'CrawlerKendraIndexId');
      if (kendraIndexId) {
        const kendraConsoleUrl = `https://${region}.console.aws.amazon.com/kendra/home?region=${region}#indexes/${kendraIndexId.Value}/search`;
        console.log('---');
        console.log('When the crawler has finished, you can search the Kendra index here:');
        console.log(kendraConsoleUrl);
      }
    } else {
      console.error("Failed to start the crawl", response);
    }
  } else {
    console.error("Couldn't find export with name StartCrawlFunctionArn. Have you deployed yet?");
  }
})();
