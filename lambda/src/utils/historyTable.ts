// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: MIT-0
import * as AWS from 'aws-sdk';

const { HISTORY_TABLE_NAME } = process.env;
const ddb = new AWS.DynamoDB.DocumentClient();

/**
 * Read an entry from the history table
 * @param crawlId id of the crawl
 */
export const getHistoryEntry = async (crawlId: string) => (await ddb.get({
  TableName: HISTORY_TABLE_NAME!,
  Key: {
    crawlId,
  },
  ConsistentRead: true,
}).promise()).Item!;

/**
 * Adds a new entry to the history table
 * @param historyEntry the entry to add
 */
export const putHistoryEntry = async (historyEntry: object) => {
  await ddb.put({
    TableName: HISTORY_TABLE_NAME!,
    Item: historyEntry,
  }).promise();
};

/**
 * Update the given fields in the history table
 * @param crawlId the id for this crawl
 * @param updateFields the fields to add/update
 */
export const updateHistoryEntry = async (crawlId: string, updateFields: object) => {
  const historyEntry = await getHistoryEntry(crawlId);

  await putHistoryEntry({
    ...historyEntry,
    ...updateFields,
  });
};
