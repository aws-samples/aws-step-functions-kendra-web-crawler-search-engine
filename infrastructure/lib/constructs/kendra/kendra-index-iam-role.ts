// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: MIT-0
import { Construct } from '@aws-cdk/core';
import { Role, PolicyStatement, ServicePrincipal, Effect } from '@aws-cdk/aws-iam';

/**
 * Role for the kendra index. See: https://docs.aws.amazon.com/kendra/latest/dg/iam-roles.html
 */
export default class KendraIndexIamRole extends Role {
  constructor(scope: Construct, id: string) {
    super(scope, id, {
      assumedBy: new ServicePrincipal('kendra.amazonaws.com'),
    });

    this.addToPolicy(
      new PolicyStatement({
        effect: Effect.ALLOW,
        actions: ['cloudwatch:PutMetricData'],
        resources: ['*'],
        conditions: {
          StringEquals: {
            'cloudwatch:namespace': 'AWS/Kendra',
          },
        },
      })
    );

    const logGroupArn = this.stack.formatArn({
      service: 'logs',
      resource: 'log-group',
      sep: ':',
      resourceName: '/aws/kendra/*',
    });

    this.addToPolicy(
      new PolicyStatement({
        effect: Effect.ALLOW,
        actions: [
          'logs:DescribeLogGroups',
          'logs:CreateLogGroup',
        ],
        resources: [logGroupArn],
      })
    );

    const logStreamsArn = this.stack.formatArn({
      service: 'logs',
      resource: 'log-group',
      sep: ':',
      resourceName: '/aws/kendra/*:log-stream:*',
    });

    this.addToPolicy(
      new PolicyStatement({
        effect: Effect.ALLOW,
        actions: [
          'logs:DescribeLogStreams',
          'logs:CreateLogStream',
          'logs:PutLogEvents',
        ],
        resources: [logStreamsArn],
      })
    );
  }
}
