import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const tools = vm.runInNewContext(
  fs.readFileSync('scripts/photo-review-request.js', 'utf8') + '\nphotoReviewRequestTools',
);
const deleted = {title:'P-HOUSE',ref:'P-house-013',deleted:'true',order:'11'};

test('old saved order on a deleted card cannot become a restoration request', () => {
  const lines = tools.entry(deleted, {order:'11',restore:false});
  assert.equal(lines.length, 0);
  const normalized = tools.normalize(true, {order:'11',delete:true});
  assert.equal(normalized.order, '');
  assert.equal(normalized.restore, false);
  assert.equal(normalized.delete, false);
});
test('a note on a deleted photograph explicitly preserves the deletion', () => {
  const text = tools.entry(deleted, {order:'11',note:'원본 확인'}).join('\n');
  assert.match(text, /삭제 상태 유지 — 복원 요청 아님/);
  assert.match(text, /메모: 원본 확인/);
  assert.doesNotMatch(text, /변경 순서:/);
});
test('only an explicit restoration retains its requested position', () => {
  const text = tools.entry(deleted, {order:'11',restore:true}).join('\n');
  assert.match(text, /\n복원 요청\n변경 순서: 11/);
  assert.equal(tools.entry(deleted, {order:'11',restore:'true'}).length, 0);
  const cancelled = tools.entry(deleted, {order:'11',restore:false});
  assert.equal(cancelled.length, 0);
});
test('active-photo reorder and deletion requests still export normally', () => {
  const card = {...deleted,deleted:'false'};
  assert.match(tools.entry(card,{order:'2'}).join('\n'), /변경 순서: 2/);
  assert.match(tools.entry(card,{delete:true}).join('\n'), /삭제 요청/);
  assert.doesNotMatch(tools.entry(card,{restore:true}).join('\n'), /복원 요청/);
});
