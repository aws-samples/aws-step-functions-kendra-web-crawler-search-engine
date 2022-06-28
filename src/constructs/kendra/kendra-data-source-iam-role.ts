// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: MIT-0
import { Construct } from 'constructs';
import { Role, PolicyStatement, Effect, ServicePrincipal } from 'aws-cdk-lib/aws-iam';

export interface KendraDataSourceIamRoleProps {
  kendraIndexArns: string[];
}

/**
 * Role for a kendra data source, see: https://docs.aws.amazon.com/kendra/latest/dg/iam-roles.html
 */
export default class KendraDataSourceIamRole extends Role {
  constructor(scope: Construct, id: string, props: KendraDataSourceIamRoleProps) {
    super(scope, id, {
      assumedBy: new ServicePrincipal('kendra.amazonaws.com'),
    });

    this.addToPolicy(
      new PolicyStatement({
        effect: Effect.ALLOW,
        actions: [
          'kendra:BatchPutDocument',
          'kendra:BatchDeleteDocument',
        ],
        resources: props.kendraIndexArns,
      })
    );
  }
}
