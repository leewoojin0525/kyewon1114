import fs from 'node:fs/promises';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { createWriteStream } from 'node:fs';
import { Readable } from 'node:stream';
import { pipeline } from 'node:stream/promises';
import sharp from 'sharp';

// Local preparation only. Drive originals and the live website are never mutated.
const root = path.resolve('assets/website-photo-prep-20261118');
const inventory = JSON.parse(await fs.readFile(path.join(root, 'inventory.json'), 'utf8'));
const byId = new Map(inventory.files.map(file => [file.id, file]));
sharp.concurrency(2);
sharp.cache({ memory: 64, files: 8, items: 30 });
const emit = value => process.stdout.write(JSON.stringify(value) + '\n');
async function exists(file) { try { return await fs.stat(file); } catch { return null; } }

async function prepare(reference) {
  const item = byId.get(reference.id);
  if (!item) throw new Error('Unknown inventory ID');
  const input = path.join(root, 'originals', item.id + path.extname(item.title).toLowerCase());
  const output = path.join(root, 'web', item.folderName, item.outputName);
  const receipt = path.join(root, 'receipts', item.id + '.json');
  const previous = await exists(receipt);
  if (previous && await exists(output)) return { id: item.id, name: item.outputName, status: 'ready' };
  await Promise.all([fs.mkdir(path.dirname(input), { recursive: true }), fs.mkdir(path.dirname(output), { recursive: true }), fs.mkdir(path.dirname(receipt), { recursive: true })]);
  if ((await exists(input))?.size !== item.sourceBytes) {
    const uri = new URL(reference.url);
    if (uri.protocol !== 'https:' || !uri.hostname.endsWith('.oaiusercontent.com')) throw new Error('Unrecognized connector download host');
    let saved = false;
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        const response = await fetch(uri, { signal: AbortSignal.timeout(180000) });
        if (!response.ok || !response.body) throw new Error('Download status ' + response.status);
        await pipeline(Readable.fromWeb(response.body), createWriteStream(input + '.download'));
        if ((await fs.stat(input + '.download')).size !== item.sourceBytes) throw new Error('Byte count mismatch');
        await fs.rename(input + '.download', input); saved = true; break;
      } catch (error) {
        await fs.rm(input + '.download', { force: true });
        if (attempt === 2) throw new Error(error.message.replace(/https?:\/\/\S+/g, '[redacted]'));
      }
    }
    if (!saved) throw new Error('Download incomplete');
  }
  const before = await sharp(input, { failOn: 'error' }).metadata();
  await sharp(input, { failOn: 'error' }).rotate().resize({ width: 2400, height: 2400, fit: 'inside', withoutEnlargement: true }).toColourspace('srgb').webp({ quality: 84, effort: 5 }).toFile(output + '.webp');
  const after = await sharp(output + '.webp').metadata();
  if (after.format !== 'webp' || !after.width || !after.height || Math.max(after.width, after.height) > 2400) throw new Error('Invalid output dimensions');
  await sharp(output + '.webp').raw().toBuffer();
  await fs.rename(output + '.webp', output);
  const outputBytes = (await fs.stat(output)).size;
  const record = { id: item.id, originalName: item.title, sourceFolder: item.relativeFolder, projectId: item.projectId, outputName: item.outputName, outputPath: output, sourceBytes: item.sourceBytes, outputBytes, sourceWidth: before.width, sourceHeight: before.height, width: after.width, height: after.height, sourceColourspace: before.space, sourceProfile: Boolean(before.icc), sha256: createHash('sha256').update(await fs.readFile(output)).digest('hex') };
  await fs.writeFile(receipt, JSON.stringify(record, null, 2));
  return { id: item.id, name: item.outputName, bytes: outputBytes, width: after.width, height: after.height, status: 'ready' };
}

let sequence = Promise.resolve();
async function processBatch(batch) {
  const queue = [...batch.items];
  let complete = 0, failures = 0;
  await Promise.all(Array.from({ length: Math.min(4, queue.length) }, async () => {
    while (queue.length) {
      const item = queue.shift();
      try { emit(await prepare(item)); complete++; }
      catch (error) { failures++; emit({ id: item.id, status: 'error', error: error.message.replace(/https?:\/\/\S+/g, '[redacted]') }); }
    }
  }));
  emit({ batch: batch.batch, complete, failures });
}
// Signed download URLs are accepted through non-echoed stdin and never logged.
if (process.stdin.isTTY) process.stdin.setRawMode(true);
process.stdin.setEncoding('utf8');
let buffer = '';
process.stdin.on('data', chunk => {
  if (chunk.includes('\u0003')) process.exit(0);
  buffer += chunk;
  let index;
  while ((index = buffer.indexOf('\n')) !== -1) {
    const line = buffer.slice(0, index); buffer = buffer.slice(index + 1);
    if (!line.trim()) continue;
    try { const batch = JSON.parse(line); sequence = sequence.then(() => processBatch(batch)).catch(error => emit({ status: 'batch-error', error: error.message })); }
    catch { emit({ status: 'input-error' }); }
  }
});
emit({ status: 'ready', files: inventory.files.length, maxDimension: 2400, quality: 84 });
