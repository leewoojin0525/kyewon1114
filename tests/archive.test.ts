import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, mkdir, writeFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createHash } from "node:crypto";
import { readArchivedOriginal } from "../scripts/read-archived-original";

test("offline originals require exact bytes and safe archive paths", async () => {
  const root = await mkdtemp(join(tmpdir(), "wovn-archive-"));
  try {
    const bytes = Buffer.from("private original bytes");
    await mkdir(join(root, "20261118", "media", "abcd"), { recursive: true });
    await writeFile(join(root, "20261118", "media", "abcd", "original"), bytes);
    const record = {
      archive_id: "20261118",
      original_key: "abcd/original",
      bytes: bytes.length,
      sha256: createHash("sha256").update(bytes).digest("hex"),
    };
    assert.deepEqual(await readArchivedOriginal(root, record), bytes);
    await assert.rejects(
      readArchivedOriginal(root, { ...record, bytes: 1 }),
      /checksum/,
    );
    await assert.rejects(
      readArchivedOriginal(root, { ...record, sha256: "0".repeat(64) }),
      /checksum/,
    );
    await assert.rejects(
      readArchivedOriginal(root, { ...record, archive_id: "../escape" }),
      /location/,
    );
    await assert.rejects(
      readArchivedOriginal(root, { ...record, original_key: "../secret" }),
      /location/,
    );
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
