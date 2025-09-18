#!/usr/bin/env node

process.env.NODE_ENV = 'production';

const http = require('http');
const path = require('path');
const finalhandler = require('finalhandler');
const serveStatic = require('serve-static');
const fs = require('fs');

const distDir = path.resolve(__dirname, '..', 'dist');
const port = Number(process.env.PORT) || 4173;

if (!fs.existsSync(distDir)) {
  console.error('❌ dist/ directory not found. Run `npm run build` first.');
  process.exit(1);
}

const serve = serveStatic(distDir, {
  fallthrough: true,
  index: false,
});

const server = http.createServer((req, res) => {
  const done = finalhandler(req, res);
  serve(req, res, err => {
    if (err) {
      return done(err);
    }

    if (req.method !== 'GET') {
      return done();
    }

    const indexPath = path.join(distDir, 'index.html');
    fs.readFile(indexPath, (readErr, data) => {
      if (readErr) {
        return done(readErr);
      }
      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      res.end(data);
    });
  });
});

server.listen(port, () => {
  console.log(`🔍 Preview server running at http://localhost:${port}`);
});
