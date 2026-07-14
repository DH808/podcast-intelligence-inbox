'use strict';

const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

function sha256(value) { return crypto.createHash('sha256').update(value).digest('hex'); }
function sha256File(file) {
  const hash = crypto.createHash('sha256');
  const descriptor = fs.openSync(file, 'r');
  const buffer = Buffer.allocUnsafe(1024 * 1024);
  try {
    let bytes;
    do {
      bytes = fs.readSync(descriptor, buffer, 0, buffer.length, null);
      if (bytes) hash.update(buffer.subarray(0, bytes));
    } while (bytes);
  } finally { fs.closeSync(descriptor); }
  return hash.digest('hex');
}
function bufferFor(value) {
  if (Buffer.isBuffer(value)) return value;
  if (typeof value === 'string') return Buffer.from(value);
  return Buffer.from(`${JSON.stringify(value, null, 2)}\n`);
}

function assertWithin(root, target) {
  const resolvedRoot = path.resolve(root);
  const resolvedTarget = path.resolve(target);
  if (!(resolvedTarget === resolvedRoot || resolvedTarget.startsWith(`${resolvedRoot}${path.sep}`))) {
    throw new Error(`artifact path escapes archive root: ${resolvedTarget}`);
  }
  return resolvedTarget;
}

function writeAdditive(file, value, options = {}) {
  const resolved = path.resolve(file);
  if (options.root) assertWithin(options.root, resolved);
  const content = bufferFor(value);
  fs.mkdirSync(path.dirname(resolved), { recursive: true });
  try {
    fs.writeFileSync(resolved, content, { flag: 'wx', mode: options.mode || 0o600 });
    return { path: resolved, created: true, bytes: content.length, sha256: sha256(content) };
  } catch (error) {
    if (error.code !== 'EEXIST') throw error;
    const existing = fs.readFileSync(resolved);
    if (existing.equals(content)) return { path: resolved, created: false, bytes: existing.length, sha256: sha256(existing) };
    throw new Error(`refusing to overwrite existing production artifact: ${resolved}`);
  }
}

function copyAdditive(source, destination, options = {}) {
  const stat = fs.statSync(source);
  if (!stat.isFile()) throw new Error(`source artifact is not a file: ${source}`);
  return writeAdditive(destination, fs.readFileSync(source), options);
}

module.exports = { assertWithin, copyAdditive, sha256, sha256File, writeAdditive };
