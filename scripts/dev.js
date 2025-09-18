#!/usr/bin/env node

process.env.NODE_ENV = 'development';

const webpack = require('webpack');
const WebpackDevServer = require('webpack-dev-server');
const configFactory = require('../webpack.config');

const mode = 'development';
const config = configFactory({}, { mode });
const compiler = webpack(config);
const server = new WebpackDevServer(config.devServer, compiler);

const startServer = async () => {
  try {
    await server.start();
    console.log(`🚀 Dev server ready on http://localhost:${config.devServer.port}`);
  } catch (error) {
    console.error('❌ Failed to start dev server');
    console.error(error);
    process.exit(1);
  }
};

startServer();
