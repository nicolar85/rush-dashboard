const fs = require('fs');
const path = require('path');

const ignoreList = new Set(['index.html']);

const copyRecursiveSync = (src, dest) => {
  if (!fs.existsSync(src)) {
    return;
  }

  const stats = fs.statSync(src);

  if (stats.isDirectory()) {
    if (!fs.existsSync(dest)) {
      fs.mkdirSync(dest, { recursive: true });
    }

    for (const entry of fs.readdirSync(src)) {
      if (ignoreList.has(entry)) {
        continue;
      }
      const srcPath = path.join(src, entry);
      const destPath = path.join(dest, entry);
      copyRecursiveSync(srcPath, destPath);
    }
  } else {
    fs.copyFileSync(src, dest);
  }
};

module.exports = { copyRecursiveSync };
