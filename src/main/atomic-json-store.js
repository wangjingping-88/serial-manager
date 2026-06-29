const fs = require('fs');
const path = require('path');

function ensureParentDir(filePath) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
}

function loadJsonFile(filePath, fallbackValue) {
  const backupPath = `${filePath}.bak`;

  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
  } catch {
    try {
      return JSON.parse(fs.readFileSync(backupPath, 'utf8'));
    } catch {
      return fallbackValue;
    }
  }
}

function saveJsonFileAtomic(filePath, value) {
  ensureParentDir(filePath);

  const tempPath = `${filePath}.tmp`;
  const backupPath = `${filePath}.bak`;
  const content = `${JSON.stringify(value, null, 2)}\n`;

  fs.writeFileSync(tempPath, content, 'utf8');

  if (fs.existsSync(filePath)) {
    fs.copyFileSync(filePath, backupPath);
  }

  fs.renameSync(tempPath, filePath);
}

module.exports = {
  loadJsonFile,
  saveJsonFileAtomic
};
