// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: MIT-0
import { Construct } from '@aws-cdk/core';
import { CfnIndex, CfnDataSource } from '@aws-cdk/aws-kendra';
import { Bucket } from '@aws-cdk/aws-s3';
import KendraDataSourceIamRole from './kendra-data-source-iam-role';

export interface KendraDataSourceProps {
  index: CfnIndex;
  bucket: Bucket;
}

/**
 * Construct to encapsulate creation of a kendra s3 data source
 */
export default class KendraS3DataSource extends Construct {
  public readonly dataSource: CfnDataSource;

  constructor(scope: Construct, id: string, props: KendraDataSourceProps) {
    super(scope, id);

    // Create a role for the kendra index
    const kendraDataSourceRole = new KendraDataSourceIamRole(this, `${id}-Role`, {
      kendraIndexArns: [props.index.attrArn],
    });

    // Grant read-access to the bucket
    props.bucket.grantRead(kendraDataSourceRole);

    // Create the s3 data source
    this.dataSource = new CfnDataSource(this, 'KendraDataSource', {
      indexId: props.index.attrId,
      name: 'crawled-content-data-source',
      type: 'S3',
      roleArn: kendraDataSourceRole.roleArn,
      dataSourceConfiguration: {
        s3Configuration: {
          bucketName: props.bucket.bucketName,
        },
      },
    });
  }
}
