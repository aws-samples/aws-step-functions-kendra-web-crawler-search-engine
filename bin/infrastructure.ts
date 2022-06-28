#!/usr/bin/env node

// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: MIT-0
import 'source-map-support/register';
import { App } from 'aws-cdk-lib';
import { KendraStack } from '../src/stacks/kendra-stack';
import { WebCrawlerStack } from '../src/stacks/web-crawler-stack';

const app = new App();

// Optionally create the kendra stack based on the context parameter (ie. -c kendra=true)
const shouldDeployKendra = app.node.tryGetContext('kendra') === 'true';
const kendra = shouldDeployKendra ? new KendraStack(app, 'KendraStack').kendra : undefined;

// Create the webcrawler stack
new WebCrawlerStack(app, 'WebCrawlerStack', { kendra });
