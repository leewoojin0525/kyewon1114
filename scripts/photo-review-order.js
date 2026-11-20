// Private review-only ordering. Publication is never changed here.
const orderKey = key + '-visual-order';
const grid = document.querySelector('#grid');
const orderMessage = document.querySelector('#order-message');
let savedOrder = {};
try { savedOrder = JSON.parse(localStorage.getItem(orderKey) || '{}') || {}; } catch {}
function projectCards(slug) {
  return [...grid.querySelectorAll('article')].filter(c => c.dataset.project === slug && c.dataset.deleted !== 'true');
}
function updateOrder(slug, persist = true) {
  const group = projectCards(slug);
  group.forEach((c, index) => {
    c.querySelector('.edit-position').textContent = `편집 순서 ${index + 1} / ${group.length}`;
    c.querySelector('[data-move="first"]').disabled = index === 0;
    c.querySelector('[data-move="prev"]').disabled = index === 0;
    c.querySelector('[data-move="next"]').disabled = index === group.length - 1;
    if (persist) c.querySelector('input[type=number]').value = String(index + 1);
  });
  if (persist) {
    savedOrder[slug] = group.map(c => c.dataset.ref);
    try { localStorage.setItem(orderKey, JSON.stringify(savedOrder)); } catch {}
    snapshot();
    orderMessage.textContent = '순서를 저장했습니다. 완료 후 요청서 다운로드를 눌러 보내주세요. 홈페이지에는 아직 반영되지 않습니다.';
  }
}
function prepareMove(slug) {
  document.querySelector('#project').value = slug;
  document.querySelector('#search').value = '';
  document.querySelector('#resolution').value = '';
  document.querySelector('#usage').value = '';
  filter();
}
let dragging = null;
for (const c of cards) {
  if (c.dataset.deleted === 'true') continue;
  const bar = document.createElement('div');
  bar.className = 'order-controls';
  bar.innerHTML = '<strong class="edit-position"></strong><div><button type="button" data-move="first">맨 앞으로</button><button type="button" data-move="prev">← 앞으로</button><button type="button" data-move="next">뒤로 →</button></div><small>사진을 끌어 다른 사진 위에 놓아도 됩니다.</small>';
  c.querySelector('.meta').prepend(bar);
  bar.addEventListener('click', event => {
    const button = event.target.closest('[data-move]');
    if (!button) return;
    const slug = c.dataset.project;
    prepareMove(slug);
    const group = projectCards(slug), index = group.indexOf(c);
    if (button.dataset.move === 'first') grid.insertBefore(c, group[0]);
    if (button.dataset.move === 'prev' && index > 0) grid.insertBefore(c, group[index - 1]);
    if (button.dataset.move === 'next' && index < group.length - 1) grid.insertBefore(group[index + 1], c);
    updateOrder(slug);
    c.scrollIntoView({block:'nearest', behavior:'auto'});
  });
  const picture = c.querySelector('img');
  picture.draggable = true;
  picture.addEventListener('dragstart', event => {
    dragging = c;
    event.dataTransfer.effectAllowed = 'move';
    event.dataTransfer.setData('text/plain', c.dataset.ref);
    c.classList.add('dragging');
  });
  picture.addEventListener('dragend', () => {
    dragging = null;
    document.querySelectorAll('.dragging,.drop-target').forEach(el => el.classList.remove('dragging','drop-target'));
  });
  c.addEventListener('dragover', event => {
    if (dragging && dragging !== c && dragging.dataset.project === c.dataset.project) {
      event.preventDefault(); event.dataTransfer.dropEffect = 'move'; c.classList.add('drop-target');
    }
  });
  c.addEventListener('dragleave', () => c.classList.remove('drop-target'));
  c.addEventListener('drop', event => {
    event.preventDefault(); c.classList.remove('drop-target');
    if (!dragging || dragging === c || dragging.dataset.project !== c.dataset.project) return;
    const group = projectCards(c.dataset.project);
    if (group.indexOf(dragging) < group.indexOf(c)) grid.insertBefore(dragging, c.nextSibling);
    else grid.insertBefore(dragging, c);
    prepareMove(c.dataset.project); updateOrder(c.dataset.project);
  });
}
for (const slug of new Set(cards.map(c => c.dataset.project))) {
  const group = projectCards(slug), refs = savedOrder[slug];
  if (Array.isArray(refs)) {
    const map = new Map(group.map(c => [c.dataset.ref, c]));
    const sorted = [...new Set(refs)].map(ref => map.get(ref)).filter(Boolean);
    sorted.push(...group.filter(c => !sorted.includes(c)));
    const anchor = document.createComment('project order');
    if (group.length) {
      grid.insertBefore(anchor, group[0]);
      sorted.forEach(c => grid.insertBefore(c, anchor)); anchor.remove();
    }
  }
  updateOrder(slug, false);
}
