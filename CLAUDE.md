# CLAUDE.md

이 파일은 Claude Code가 이 저장소에서 작업할 때 따라야 할 지침입니다.

## 프로젝트 개요

마크다운(`.md`) 파일로 작성한 글을 읽어 블로그 웹사이트로 보여주는 정적 사이트입니다.
브라우저가 마크다운 파일을 직접 불러와(fetch) HTML로 변환해 렌더링합니다.

### 핵심 원칙

- **프레임워크·라이브러리 없음**: 순수 HTML, CSS, JavaScript(ES 모듈)만 사용합니다.
  React, Vue, jQuery, Tailwind, Bootstrap, marked.js 등 외부 의존성을 추가하지 마세요.
  빌드 도구(npm, webpack, Vite 등)도 사용하지 않습니다.
- **깔끔하고 읽기 좋은 디자인**: 본문 가독성이 최우선입니다. 장식보다 여백과 타이포그래피로 정돈합니다.
- **다크 모드 지원**: 시스템 설정을 기본으로 따르고, 사용자가 직접 전환할 수 있어야 합니다.
- **모바일 우선 반응형**: 작은 화면에서 먼저 잘 보이도록 만들고, 큰 화면으로 확장합니다.

## 디렉터리 구조

```
my-blog/
├── index.html          # 글 목록 페이지
├── post.html           # 글 상세 페이지 (post.html?slug=파일명)
├── css/
│   └── style.css       # 전체 스타일 (CSS 변수로 라이트/다크 테마 정의)
├── js/
│   ├── markdown.js     # 마크다운 → HTML 변환기 (직접 구현)
│   ├── theme.js        # 다크 모드 토글 및 저장
│   ├── list.js         # 목록 페이지 로직
│   ├── post.js         # 상세 페이지 로직
│   └── utils.js        # 날짜 형식, 태그 렌더 등 공용 도우미
├── posts/
│   ├── index.json      # 글 목록 메타데이터
│   ├── markdown-guide.md  # 지원 문법 전체 시연 (변환기 회귀 확인용)
│   └── *.md            # 블로그 글
├── images/             # 글에 넣는 이미지
├── serve.mjs           # 로컬 확인용 정적 서버 (Node, 의존성 없음)
└── CLAUDE.md
```

## 로컬 실행

브라우저는 `file://`에서 `fetch()`를 막으므로 반드시 로컬 서버로 열어야 합니다.

```bash
node serve.mjs
```

그다음 `http://localhost:8000` 접속. (`python -m http.server 8000`이나 VS Code Live Server도 가능)
`serve.mjs`는 개발용 도구일 뿐이며 사이트 자체는 어떤 정적 호스팅에도 그대로 올릴 수 있어야 합니다.

변환기(`js/markdown.js`)를 고친 뒤에는 `post.html?slug=markdown-guide`가 올바르게 보이는지 확인합니다.

## 글 작성 규칙

### 마크다운 파일

`posts/` 폴더에 `영문-소문자-하이픈.md` 형식으로 저장합니다. 파일 맨 위에 front matter를 둡니다.

```markdown
---
title: 첫 번째 글
date: 2026-11-10
tags: 일상, 개발
description: 목록에 표시될 짧은 요약
---

본문 시작
```

- 제목은 front matter의 `title`로 표시되므로 본문에 `#` 제목을 또 쓰지 않습니다. 본문 소제목은 `##`부터 씁니다.
- 이미지는 `images/` 폴더에 두고 사이트 루트 기준 경로로 씁니다: `![설명](images/파일.png)`
- 다른 글로 가는 링크: `[글 제목](post.html?slug=파일명)`

### 글 목록 (`posts/index.json`)

정적 사이트는 폴더 내용을 읽을 수 없으므로, 새 글을 추가하면 이 파일에도 반드시 등록합니다.
목록은 `date` 기준 최신순으로 정렬해 표시합니다.

```json
[
  { "slug": "first-post", "title": "첫 번째 글", "date": "2026-11-10", "tags": ["일상"], "description": "짧은 요약" }
]
```

## 마크다운 변환기 (`js/markdown.js`)

외부 라이브러리 없이 직접 구현합니다. 지원 범위:

- front matter 파싱 (`---` 블록 → 객체)
- 제목 `#` ~ `######`
- 문단, 줄바꿈
- **굵게**, *기울임*, ~~취소선~~, `인라인 코드`
- 링크 `[텍스트](url)`, 이미지 `![alt](src)`
- 순서 있는/없는 목록 (중첩 1단계 이상)
- 인용문 `>`
- 코드 블록 ```` ```언어 ```` (언어명을 `class="language-xxx"`로 부여)
- 수평선 `---`
- 표 (GFM 스타일)

### 보안

- 마크다운의 원문 텍스트는 **HTML 이스케이프 후** 변환합니다 (`<`, `>`, `&`, `"`, `'`).
- 링크/이미지 URL에서 `javascript:` 등 위험한 스킴은 막습니다.
- 변환 결과 외의 사용자 입력을 `innerHTML`에 넣지 마세요.

## 디자인 가이드

### 테마 (CSS 변수)

모든 색상은 `:root`의 CSS 변수로만 정의하고, 컴포넌트에서 색상 값을 직접 쓰지 않습니다.

```css
:root {
  --bg: #ffffff;
  --text: #1f2328;
  --text-muted: #656d76;
  --accent: #2563eb;
  --border: #e5e7eb;
  --code-bg: #f6f8fa;
}
[data-theme="dark"] {
  --bg: #0d1117;
  --text: #e6edf3;
  --text-muted: #8b949e;
  --accent: #60a5fa;
  --border: #30363d;
  --code-bg: #161b22;
}
```

### 다크 모드 동작

1. `localStorage`에 저장된 값(`light` / `dark`)이 있으면 그것을 사용합니다.
2. 없으면 `prefers-color-scheme`를 따릅니다.
3. 헤더의 토글 버튼으로 전환하며, 선택은 `localStorage`에 저장합니다.
4. 페이지 로드 시 깜빡임(FOUC)을 막기 위해 테마 적용 스크립트는 `<head>` 안에서 가장 먼저 실행합니다.
5. 토글 버튼에는 `aria-label`을 붙입니다.

### 타이포그래피와 레이아웃

- 본문 폰트: 시스템 폰트 스택 (`-apple-system, BlinkMacSystemFont, "Pretendard", "Apple SD Gothic Neo", "Noto Sans KR", sans-serif`)
- 코드 폰트: `ui-monospace, "SF Mono", Consolas, monospace`
- 본문 크기 `1.0625rem`(17px) 내외, 줄 간격 `1.75`
- 본문 최대 폭 `68ch` 내외, 가운데 정렬
- 한글 줄바꿈: `word-break: keep-all; overflow-wrap: break-word;`
- 단위는 `rem`/`em` 위주로 사용합니다.

### 반응형

- 모바일 우선: 기본 스타일은 작은 화면 기준, `@media (min-width: 768px)` 등으로 확장합니다.
- 모든 페이지에 `<meta name="viewport" content="width=device-width, initial-scale=1">`
- 좌우 여백은 모바일에서 최소 `1rem`
- 코드 블록과 표는 가로 스크롤(`overflow-x: auto`)로 처리해 레이아웃이 깨지지 않게 합니다.
- 이미지는 `max-width: 100%; height: auto;`
- 터치 대상(버튼, 링크)은 최소 44×44px

## 코드 스타일

- JavaScript: ES 모듈(`<script type="module">`), `const`/`let`, 화살표 함수, `async/await`
- 들여쓰기 2칸, 세미콜론 사용, 문자열은 작은따옴표
- 함수는 작고 한 가지 일만 하도록 작성
- 시맨틱 HTML 사용: `<header>`, `<main>`, `<article>`, `<nav>`, `<footer>`, `<time>`
- 클래스명은 소문자-하이픈 (`post-list`, `post-meta`)
- 주석은 한국어로 작성해도 됩니다.

## 오류 처리

- 글 파일을 찾지 못하면 "글을 찾을 수 없습니다" 안내와 목록으로 돌아가는 링크를 보여줍니다.
- `fetch` 실패는 `console.error`로 남기고 화면에 사용자 친화적 메시지를 표시합니다.

## 작업 시 체크리스트

- [ ] 라이트/다크 모드 모두에서 색 대비가 충분한가
- [ ] 360px 너비 모바일 화면에서 가로 스크롤 없이 보이는가
- [ ] 외부 라이브러리를 추가하지 않았는가
- [ ] 새 글을 추가했다면 `posts/index.json`에 등록했는가
