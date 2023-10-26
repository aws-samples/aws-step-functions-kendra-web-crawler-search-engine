/**
 * Get value of an environment variable as a number
 * 
 * @param key
 * @return value of the environment variable as a number
 */
export const getEnvVariableAsInteger = (key: string): number => {
    const value = parseInt(process.env[key] || '');
    if (Number.isNaN(value)) throw Error(`Expected integer value for '${key}'`);
    return value;
}
