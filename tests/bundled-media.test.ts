import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, mkdir, writeFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, dirname } from "node:path";
import { createHash, randomUUID } from "node:crypto";
import { getBundledMedia } from "../src/lib/bundled-media";

const hash = (data: Buffer) => createHash("sha256").update(data).digest("hex");
async function fixture(run: (directory: string) => Promise<void>) {
  const directory = await mkdtemp(join(tmpdir(), "wovn-bundled-"));
  const previous = process.env.MEDIA_BUNDLE_DIRECTORY;
  process.env.MEDIA_BUNDLE_DIRECTORY = directory;
  try {
    await run(directory);
  } finally {
    if (previous === undefined) delete process.env.MEDIA_BUNDLE_DIRECTORY;
    else process.env.MEDIA_BUNDLE_DIRECTORY = previous;
    await rm(directory, { recursive: true, force: true });
  }
}
async function saveFile(directory: string, key: string, bytes: Buffer) {
  await mkdir(dirname(join(directory, key)), { recursive: true });
  await writeFile(join(directory, key), bytes);
}
async function manifest(directory: string, entries: Record<string, unknown>) {
  await writeFile(
    join(directory, "manifest.json"),
    JSON.stringify({ format: 1, entries }),
  );
}

test("bundled derivatives preserve exact bytes and never expose original or pack paths", async () => {
  await fixture(async (directory) => {
    const key = `${randomUUID()}/2400.webp`,
      bytes = Buffer.from("immutable web photograph");
    await saveFile(directory, key, bytes);
    await manifest(directory, {
      [key]: { key, bytes: bytes.length, sha256: hash(bytes) },
    });
    assert.deepEqual(await getBundledMedia(key), bytes);
    assert.equal(await getBundledMedia(`${randomUUID()}/2400.webp`), null);
    for (const invalid of [
      key.replace("2400.webp", "original"),
      `packs/${hash(bytes)}.bin`,
      "../manifest.json",
      "__proto__",
      key.replace("/", "/../"),
    ])
      assert.equal(await getBundledMedia(invalid), null);
  });
  await fixture(async () => {
    assert.equal(await getBundledMedia(`${randomUUID()}/960.webp`), null);
  });
});

test("bundled ranges expose only their own photo and fail closed on damage or bad bounds", async () => {
  await fixture(async (directory) => {
    const first = Buffer.from("first private photograph"),
      second = Buffer.from("second private photograph");
    const bytes = Buffer.concat([first, second]),
      physical = `packs/${hash(bytes)}.bin`;
    const a = `${randomUUID()}/960.webp`,
      b = `${randomUUID()}/960.webp`;
    const corrupt = `${randomUUID()}/960.webp`,
      outside = `${randomUUID()}/960.webp`,
      traversal = `${randomUUID()}/960.webp`,
      wholePack = `${randomUUID()}/960.webp`;
    const entry = {
      key: physical,
      offset: 0,
      bytes: first.length,
      sha256: hash(first),
    };
    await saveFile(directory, physical, bytes);
    await manifest(directory, {
      [a]: entry,
      [b]: {
        key: physical,
        offset: first.length,
        bytes: second.length,
        sha256: hash(second),
      },
      [corrupt]: { ...entry, sha256: "0".repeat(64) },
      [outside]: { ...entry, offset: bytes.length },
      [traversal]: { ...entry, key: "packs/../../private" },
      [wholePack]: { key: physical, bytes: bytes.length, sha256: hash(bytes) },
    });
    assert.deepEqual(await getBundledMedia(a), first);
    assert.deepEqual(await getBundledMedia(b), second);
    await assert.rejects(getBundledMedia(corrupt), /checksum/);
    await assert.rejects(getBundledMedia(outside), /bounds/);
    await assert.rejects(getBundledMedia(traversal), /Invalid/);
    await assert.rejects(getBundledMedia(wholePack), /Invalid/);
  });
});

test("known bundled loose files cannot silently fall back when missing or corrupt", async () => {
  await fixture(async (directory) => {
    const key = `${randomUUID()}/960.webp`,
      missing = `${randomUUID()}/960.webp`;
    const bytes = Buffer.from("altered derivative");
    await saveFile(directory, key, bytes);
    await manifest(directory, {
      [key]: { key, bytes: bytes.length, sha256: "0".repeat(64) },
      [missing]: { key: missing, bytes: bytes.length, sha256: hash(bytes) },
    });
    await assert.rejects(getBundledMedia(key), /checksum/);
    await assert.rejects(getBundledMedia(missing), { code: "ENOENT" });
  });
});
