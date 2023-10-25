// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: MIT-0
import * as AWS from 'aws-sdk';
import * as _ from 'lodash';
import { CrawlInputWithId } from '../crawler/types';
import { CONTEXT_TABLE_READ_CAPACITY, CONTEXT_TABLE_WRITE_CAPACITY, PARALLEL_URLS_TO_SYNC } from '../config/constants';
import { dynamodbPaginatedRequest } from './pagination';

const ddb = new AWS.DynamoDB();
const ddbDoc = new AWS.DynamoDB.DocumentClient();

enum VisitStatus {
  VISITED = 'TRUE',
  NOT_VISITED = 'FALSE',
}

/**
 * Creates the context table for the crawl. The context table holds our url "queue", in which all of the urls we've
 * observed are stored, with whether or not they have been visited. Returns once the table has finished creating.
 * @return the name of the context table
 */
export const createContextTable = async (target: CrawlInputWithId, contextTableNamePrefix: string): Promise<string> => {
  const TableName = `${contextTableNamePrefix}-${target.crawlName}-${target.crawlId}`;

  console.log('Creating context table', TableName);
  await ddb.createTable({
    TableName,
    AttributeDefinitions: [
      {
        AttributeName: 'visited',
        AttributeType: 'S',
      },
      {
        AttributeName: 'path',
        AttributeType: 'S',
      },
    ],
    // We use a multipart key with 'visited' as the hash key so we can efficiently query for urls we have not visited
    KeySchema: [
      {
        AttributeName: 'visited',
        KeyType: 'HASH',
      },
      {
        AttributeName: 'path',
        KeyType: 'RANGE',
      },
    ],
    BillingMode: 'PAY_PER_REQUEST'
    /*,
    ProvisionedThroughput: {
      ReadCapacityUnits: CONTEXT_TABLE_READ_CAPACITY,
      WriteCapacityUnits: CONTEXT_TABLE_WRITE_CAPACITY,
    },*/
  }).promise();

  console.log('Waiting for table', TableName, 'to finish creation');
  await ddb.waitFor('tableExists', {TableName}).promise();

  return TableName;
};

/**
 * Deletes the context table
 */
export const deleteContextTable = async (contextTableName: string) => {
  await ddb.deleteTable({
    TableName: contextTableName,
  }).promise();
};

/**
 * Add a path to the url queue. Skips paths that have already been visited
 */
export const queuePath = async (contextTableName: string, path: string) => {
  try {
    // Check if the url has already been visited
    const item = (await ddbDoc.get({
      TableName: contextTableName,
      Key: {
        visited: VisitStatus.VISITED,
        path,
      },
    }).promise()).Item;

    // If the url hasn't already been visited, add it to the queue
    if (!item) {
      await ddbDoc.put({
        TableName: contextTableName,
        Item: {
          path,
          visited: VisitStatus.NOT_VISITED,
        },
      }).promise();
    }
  } catch (e) {
    console.warn('Unable to queue', path, e);
  }
};

/**
 * Add a list of paths to the url queue. Skips paths that have already been visited.
 */
export const queuePaths = async (contextTableName: string, paths: string[]) => {
  // Split our newly discovered urls into groups to reduce the likelihood of throttling errors
  for (const pathGroup of _.chunk(paths, 20)) {
    // Write the new urls to our dynamodb context table.
    await Promise.all(pathGroup.map(async (newPath) => queuePath(contextTableName, newPath)));
  }
};

/**
 * Read a batch of urls to visit from the context table
 */
export const readBatchOfUrlsToVisit = async (contextTableName: string): Promise<string[]> => {
  // Get all paths that have not been visited, up to our limit of PARALLEL_URLS_TO_SYNC
  const toVisitEntries = await dynamodbPaginatedRequest(ddbDoc.query.bind(ddbDoc), {
    TableName: contextTableName,
    ConsistentRead: true,
    KeyConditionExpression: '#visited = :visited',
    ExpressionAttributeValues: {
      ':visited': VisitStatus.NOT_VISITED,
    },
    ExpressionAttributeNames: {
      '#visited': 'visited',
    },
    Limit: 50,
  }, async () => {}, PARALLEL_URLS_TO_SYNC);

  return toVisitEntries.map((entry) => entry.path);
};


/**
 * Marks a path as visited in the context table by adding a visited=TRUE entry and deleting the visited=FALSE entry
 */
export const markPathAsVisited = async (contextTableName: string, path: string) => {
  // Write an entry saying the url has been visited
  await ddbDoc.put({
    TableName: contextTableName,
    Item: {
      visited: VisitStatus.VISITED,
      path,
      visitedAt: new Date().toISOString(),
    },
  }).promise();

  // Delete the entry that says it's not visited
  await ddbDoc.delete({
    TableName: contextTableName,
    Key: {
      visited: VisitStatus.NOT_VISITED,
      path,
    },
  }).promise();
};
