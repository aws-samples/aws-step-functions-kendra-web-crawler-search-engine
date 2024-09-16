// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: MIT-0
import { Construct } from 'constructs';
import { Duration } from 'aws-cdk-lib';
import { Runtime, Function, Code } from 'aws-cdk-lib/aws-lambda';
import { NodejsFunction } from "aws-cdk-lib/aws-lambda-nodejs";
import ChromeLambdaLayer from './chrome-lambda-layer';

export interface WebCrawlerLambdaProps {
  handler: string;
  region: string;
  chromeLayer: ChromeLambdaLayer;
  environment?: { [key: string]: string };
}

/**
 * Construct for a lambda function with code in the 'lambda' directory.
 */
export default class WebCrawlerLambda extends NodejsFunction {
  constructor(scope: Construct, id: string, props: WebCrawlerLambdaProps) {
    super(scope, id, {
      runtime: Runtime.NODEJS_20_X,
      entry: './src/lambda/index.ts',
      layers: [props.chromeLayer],
      handler: props.handler,
      timeout: Duration.minutes(5),
      memorySize: 1600,
      environment: props.environment,
      bundling: {
        externalModules: [
          '@sparticuz/chromium',
          'puppeteer',
          'puppeteer-core',
        ],
      },
    });
  }
}
