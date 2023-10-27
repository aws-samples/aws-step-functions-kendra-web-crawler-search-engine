// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: MIT-0

/**
 * Get value of an environment variable as a number
 * 
 * @param key
 * @return value of the environment variable as a number
 */
export const getEnvVariableAsInteger = (key: string): number => {
    const value = parseInt(getEnvVariableRequired(key));
    if (Number.isNaN(value)) throw Error(`Expected a number for '${key}'`);
    return value;
}
/**
 * Get value of a required environment variable
 * 
 * @param key 
 * @return value of the environment variable
 * @throws error if the environment variable is not set
 */
export const getEnvVariableRequired = (key: string): string => {
    const value = process.env[key];
    if(!value) throw Error(`Missing environment variable "${key}"`);
    return value;
}
