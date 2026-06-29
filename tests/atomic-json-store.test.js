const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const test = require('node:test');

const { loadJsonFile, saveJsonFileAtomic } = require('../src/main/atomic-json-store');

test('saveJsonFileAtomic writes UTF-8 JSON and loadJsonFile reads it back', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'serial-json-'));
  const file = path.join(dir, 'settings.json');

  saveJsonFileAtomic(file, { name: '网关主控', count: 2 });

  assert.deepEqual(loadJsonFile(file, {}), { name: '网关主控', count: 2 });
  assert.equal(fs.existsSync(`${file}.tmp`), false);
});

test('saveJsonFileAtomic keeps a backup when overwriting an existing file', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'serial-json-'));
  const file = path.join(dir, 'settings.json');

  saveJsonFileAtomic(file, { version: 1 });
  saveJsonFileAtomic(file, { version: 2 });

  assert.deepEqual(loadJsonFile(file, {}), { version: 2 });
  assert.deepEqual(loadJsonFile(`${file}.bak`, {}), { version: 1 });
});

test('loadJsonFile falls back to backup when main file is corrupt', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'serial-json-'));
  const file = path.join(dir, 'settings.json');

  fs.writeFileSync(file, '{broken json', 'utf8');
  fs.writeFileSync(`${file}.bak`, JSON.stringify({ recovered: true }), 'utf8');

  assert.deepEqual(loadJsonFile(file, { recovered: false }), { recovered: true });
});
