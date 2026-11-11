// 목록/상세 페이지가 함께 쓰는 도우미

// '2026-11-10' → '2026년 11월 10일' (시간대 영향을 받지 않도록 직접 분해)
export const formatDate = (iso) => {
  const match = /^(\d{4})-(\d{1,2})-(\d{1,2})/.exec(iso ?? '');
  if (!match) return iso ?? '';
  const [, y, m, d] = match;
  return `${Number(y)}년 ${Number(m)}월 ${Number(d)}일`;
};

export const renderTags = (listEl, tags = []) => {
  listEl.replaceChildren(...tags.map((tag) => {
    const li = document.createElement('li');
    li.className = 'tag';
    li.textContent = tag;
    return li;
  }));
};

export const showStatus = (message) => {
  const el = document.querySelector('.status-message');
  if (!el) return;
  el.textContent = message;
  el.hidden = false;
};
