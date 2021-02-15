// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: MIT-0
import { Construct, Duration } from '@aws-cdk/core';
import { Runtime, Function, Code } from '@aws-cdk/aws-lambda';
import ChromeLambdaLayer from './chrome-lambda-layer';

export interface WebCrawlerLambdaProps {
  handler: string;
  region: string;
  chromeLayer: ChromeLambdaLayer;
  environment?: { [key: string]: string };
}

/**
 * Construct for a lambda function with code in the top-level 'lambda' directory.
 */
export default class WebCrawlerLambda extends Function {
  constructor(scope: Construct, id: string, props: WebCrawlerLambdaProps) {
    super(scope, id, {
      runtime: Runtime.NODEJS_12_X,
      code: Code.fromAsset('../lambda/dist'),
      layers: [props.chromeLayer],
      handler: `index.${props.handler}`,
      timeout: Duration.minutes(5),
      memorySize: 1600,
      environment: props.environment,
    });
  }
}
