// 다크 모드 토글. 초기 테마는 각 HTML <head>의 인라인 스크립트가 적용한다.

const STORAGE_KEY = 'theme';
const root = document.documentElement;
const toggle = document.querySelector('.theme-toggle');
const media = window.matchMedia('(prefers-color-scheme: dark)');

const getSaved = () => {
  try {
    return localStorage.getItem(STORAGE_KEY);
  } catch {
    return null;
  }
};

const save = (theme) => {
  try {
    localStorage.setItem(STORAGE_KEY, theme);
  } catch {
    // 저장 불가(사생활 보호 모드 등) 시 무시
  }
};

const applyTheme = (theme) => {
  root.dataset.theme = theme;
  if (toggle) {
    const label = theme === 'dark' ? '라이트 모드로 전환' : '다크 모드로 전환';
    toggle.setAttribute('aria-label', label);
    toggle.title = label;
  }
};

applyTheme(root.dataset.theme === 'dark' ? 'dark' : 'light');

toggle?.addEventListener('click', () => {
  const next = root.dataset.theme === 'dark' ? 'light' : 'dark';
  applyTheme(next);
  save(next);
});

// 사용자가 직접 고른 적이 없으면 시스템 설정 변경을 따라간다
media.addEventListener('change', (event) => {
  if (!getSaved()) applyTheme(event.matches ? 'dark' : 'light');
});
