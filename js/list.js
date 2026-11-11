import { formatDate, renderTags, showStatus } from './utils.js';

const listEl = document.querySelector('.post-list');

const createItem = (post) => {
  const li = document.createElement('li');
  li.className = 'post-item';

  const link = document.createElement('a');
  link.className = 'post-link';
  link.href = `post.html?slug=${encodeURIComponent(post.slug)}`;

  const title = document.createElement('h2');
  title.className = 'post-item-title';
  title.textContent = post.title;
  link.append(title);

  if (post.description) {
    const desc = document.createElement('p');
    desc.className = 'post-item-desc';
    desc.textContent = post.description;
    link.append(desc);
  }

  const meta = document.createElement('div');
  meta.className = 'post-meta';
  const time = document.createElement('time');
  time.dateTime = post.date;
  time.textContent = formatDate(post.date);
  const tags = document.createElement('ul');
  tags.className = 'tag-list';
  renderTags(tags, post.tags);
  meta.append(time, tags);
  link.append(meta);

  li.append(link);
  return li;
};

const loadPosts = async () => {
  try {
    const res = await fetch('posts/index.json', { cache: 'no-cache' });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const posts = await res.json();

    if (!Array.isArray(posts) || posts.length === 0) {
      showStatus('아직 작성된 글이 없습니다.');
      return;
    }

    const sorted = [...posts].sort((a, b) => String(b.date).localeCompare(String(a.date)));
    listEl.replaceChildren(...sorted.map(createItem));
  } catch (error) {
    console.error('글 목록을 불러오지 못했습니다:', error);
    showStatus('글 목록을 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.');
  }
};

loadPosts();
