// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: MIT-0
import { Construct } from 'constructs';
import { CfnIndex } from 'aws-cdk-lib/aws-kendra';
import KendraIndexIamRole from './kendra-index-iam-role';

/**
 * See pricing for the different Kendra Editions here: https://aws.amazon.com/kendra/pricing/
 * We use developer edition in this sample.
 */
enum KendraEdition {
  DEVELOPER_EDITION = 'DEVELOPER_EDITION',
  ENTERPRISE_EDITION = 'ENTERPRISE_EDITION',
}

/**
 * Construct to encapsulate creation of a kendra index
 */
export default class KendraIndex extends Construct {
  public readonly index: CfnIndex;

  constructor(scope: Construct, id: string) {
    super(scope, id);

    const kendraIndexRole = new KendraIndexIamRole(this, `${id}-Role`);
    const indexId = `${id}-Index`;

    this.index = new CfnIndex(this, indexId, {
      edition: KendraEdition.DEVELOPER_EDITION,
      name: indexId,
      roleArn: kendraIndexRole.roleArn,
    });
  }
}
