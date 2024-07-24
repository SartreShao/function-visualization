const fs = require("fs");
const path = require("path");

const IGNORE_PATTERN = /node_modules|dist|\.git|vite.config.js/;

function shouldIgnore(filePath) {
  return IGNORE_PATTERN.test(filePath);
}

function getJsFiles(dir) {
  let jsFiles = [];
  const files = fs.readdirSync(dir);

  files.forEach(file => {
    const fullPath = path.join(dir, file);
    const stat = fs.statSync(fullPath);

    if (stat.isDirectory()) {
      if (!shouldIgnore(fullPath)) {
        jsFiles = jsFiles.concat(getJsFiles(fullPath));
      }
    } else if (
      stat.isFile() &&
      path.extname(fullPath) === ".js" &&
      !shouldIgnore(fullPath)
    ) {
      jsFiles.push(fullPath);
    }
  });

  return jsFiles;
}

module.exports = {
  getJsFiles
};
