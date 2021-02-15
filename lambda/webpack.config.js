// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: MIT-0
const path = require('path');
const ROOT_PATH = path.resolve(__dirname, '.');
const OUTPUT_DIR = `${path.resolve(__dirname, '.')}/dist`;
const TsconfigPathsPlugin = require('tsconfig-paths-webpack-plugin');
const ForkTsCheckerWebpackPlugin = require('fork-ts-checker-webpack-plugin');

module.exports = {
  target: 'node',
  entry: {
    main: [path.join(ROOT_PATH, './src/index.ts')],
  },
  devtool: 'source-map',
  output: {
    filename: 'index.js',
    path: OUTPUT_DIR,
    libraryTarget: 'commonjs2',
  },
  externals: {
    'chrome-aws-lambda': 'chrome-aws-lambda',
    'puppeteer': 'puppeteer',
    'puppeteer-core': 'puppeteer-core',
  },
  resolve: {
    extensions: ['.mjs', '.js', '.jsx', '.ts', '.tsx'],
    plugins: [new TsconfigPathsPlugin({})],
  },
  plugins: [
    new ForkTsCheckerWebpackPlugin({
      tsconfig: path.resolve(__dirname, './tsconfig.json'),
      checkSyntacticErrors: true,
      silent: false,
    }),
  ],
  module: {
    rules: [
      {
        test: /\.(js|jsx)$/,
        exclude: /node_modules/,
        use: {
          loader: 'babel-loader',
        },
      },
      {
        test: /\.tsx?$/,
        exclude: /node_modules/,
        use: {
          loader: 'ts-loader',
        },
      },
      {
        test: /\.js$/,
        use: ['source-map-loader'],
        enforce: 'pre',
        exclude: /node_modules/,
      },
    ],
  },
  performance: {
    hints: false,
  },
};
