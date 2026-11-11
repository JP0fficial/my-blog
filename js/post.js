import { parseFrontMatter, markdownToHtml } from './markdown.js';
import { formatDate, renderTags, showStatus } from './utils.js';

const SITE_NAME = 'My Blog';
const SLUG_RE = /^[a-z0-9-]+$/;

const article = document.querySelector('.post');

const showNotFound = () => {
  article.hidden = true;
  document.title = `글을 찾을 수 없습니다 - ${SITE_NAME}`;
  showStatus('글을 찾을 수 없습니다.');
};

const renderPost = (slug, text) => {
  const { meta, body } = parseFrontMatter(text);
  const title = meta.title || slug;

  document.title = `${title} - ${SITE_NAME}`;
  document.querySelector('meta[name="description"]')?.setAttribute('content', meta.description ?? '');

  article.querySelector('.post-title').textContent = title;

  const time = article.querySelector('.post-date');
  if (meta.date) {
    time.dateTime = meta.date;
    time.textContent = formatDate(meta.date);
  } else {
    time.remove();
  }

  renderTags(article.querySelector('.tag-list'), meta.tags);

  // markdownToHtml은 원문을 이스케이프한 뒤 변환하므로 안전하다
  article.querySelector('.post-content').innerHTML = markdownToHtml(body);

  // 주소에 #앵커가 있으면 렌더링 후 해당 위치로 이동
  if (location.hash) {
    document.getElementById(decodeURIComponent(location.hash.slice(1)))?.scrollIntoView();
  }
};

const loadPost = async () => {
  const slug = new URLSearchParams(location.search).get('slug') ?? '';
  if (!SLUG_RE.test(slug)) {
    showNotFound();
    return;
  }

  try {
    const res = await fetch(`posts/${slug}.md`, { cache: 'no-cache' });
    if (res.status === 404) {
      showNotFound();
      return;
    }
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    renderPost(slug, await res.text());
  } catch (error) {
    console.error('글을 불러오지 못했습니다:', error);
    article.hidden = true;
    showStatus('글을 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.');
  }
};

loadPost();
