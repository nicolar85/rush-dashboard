#!/usr/bin/env node

process.env.NODE_ENV = 'production';

const fs = require('fs');
const path = require('path');
const webpack = require('webpack');
const configFactory = require('../webpack.config');
const { copyRecursiveSync } = require('./utils/copyPublicAssets');

const mode = 'production';
const config = configFactory({}, { mode });
const compiler = webpack(config);

const appDist = path.resolve(__dirname, '..', 'dist');
const appPublic = path.resolve(__dirname, '..', 'public');

if (fs.existsSync(appDist)) {
  fs.rmSync(appDist, { recursive: true, force: true });
}

copyRecursiveSync(appPublic, appDist);

console.log('🏗️  Building application with custom Webpack toolchain...');

compiler.run((err, stats) => {
  if (err) {
    console.error('❌ Build failed due to an unexpected error.');
    console.error(err);
    process.exit(1);
  }

  if (stats.hasErrors()) {
    console.error('❌ Build completed with errors.');
    console.error(stats.toString({ colors: true }));
    process.exit(1);
  }

  console.log(stats.toString({ colors: true, modules: false }));
  console.log('✅ Build completed. Output available in dist/.');
  compiler.close(closeErr => {
    if (closeErr) {
      console.error(closeErr);
      process.exit(1);
    }
  });
});
