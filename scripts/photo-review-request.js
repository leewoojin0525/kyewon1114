// Shared by the downloadable catalogue and its regression tests.
// A saved position never implies permission to restore a deleted photograph.
const photoReviewRequestTools = {
  normalize(deleted, value = {}) {
    const restore = deleted && value.restore === true;
    return {
      order: !deleted || restore ? String(value.order || '').trim() : '',
      delete: !deleted && value.delete === true,
      restore,
      note: String(value.note || '').trim(),
    };
  },
  entry(card, value) {
    const deleted = card.deleted === 'true';
    const request = this.normalize(deleted, value);
    if (!request.order && !request.delete && !request.restore && !request.note) return [];
    const lines = [card.title + ' / ' + card.ref + ' (' +
      (deleted ? '삭제됨 · 삭제 전 순서 ' : '현재 순서 ') + card.order + ')'];
    if (request.restore) lines.push('복원 요청');
    else if (request.delete) lines.push('삭제 요청');
    else if (deleted) lines.push('삭제 상태 유지 — 복원 요청 아님');
    if (request.order) lines.push('변경 순서: ' + request.order);
    if (request.note) lines.push('메모: ' + request.note);
    return [...lines, ''];
  },
};
