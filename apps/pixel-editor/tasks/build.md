# Build 서브에이전트 지침 — 픽셀 아트 에디터

## 할 일
`apps/pixel-editor/spec.md`(사용자 승인 완료)를 그대로 구현한다. 먼저 spec.md 전체를 읽는다.

## 수정 범위 (이 밖의 파일은 절대 만들거나 고치지 않는다)
- `apps/pixel-editor/index.html`
- `apps/pixel-editor/style.css`
- `apps/pixel-editor/editor.js`
- `apps/pixel-editor/main.js`
- `apps/pixel-editor/preview.svg` — 블로그 카드용 정적 미리보기. 16:10(예: 320×200), 작은 도트 그림 하나 + 팔레트 일부, 용량 작게

블로그의 `index.html`, `css/`, `js/`, `posts/`, `CLAUDE.md`, 다른 앱(`apps/tile-merge/`), `spec.md`, `tasks/`는 읽기만 한다. 테마 처리는 `apps/tile-merge/index.html`·`main.js`를 참고하되 import하지 말고 이 앱 안에 따로 둔다.

## 구현 조건
- 외부 라이브러리·CDN·빌드 도구 없음. ES 모듈, `const`/`let`, 화살표 함수, 2칸 들여쓰기, 세미콜론, 작은따옴표.
- `editor.js`는 DOM·`localStorage`·canvas에 접근하지 않는 순수 모듈. spec 9절의 공개 함수 이름·반환 형태를 지킨다.
- 사용자 입력(색 값, 저장된 JSON)을 `innerHTML`에 넣지 않는다. 저장값은 형식 검증 후 사용하고, 깨졌으면 빈 그림으로 시작.
- 모바일 우선, 360px에서 가로 스크롤 없음, 터치 대상 44×44px 이상. 색은 `style.css`의 CSS 변수로만(팔레트 색 데이터 자체는 JS 상수 가능).

## 스스로 확인 (끝내기 전에)
1. Node로 `editor.js` 로직을 확인한다: spec 10절의 floodFill·기록(실행 취소/다시 실행)·lineCells 테스트 표 전부. 테스트 스크립트는 저장소에 남기지 말고 `C:\Users\user\AppData\Local\Temp\claude\e163499d604b0ada\91f36661-6fcd-490c-89ff-f580b3471498\scratchpad\pixel-build\`에 둔다.
   (import 경로 예: `file:///C:/Users/user/OneDrive/바탕%20화면/my-blog/apps/pixel-editor/editor.js`)
2. `node --check`로 main.js 문법 확인.

## 보고
만든 파일 목록, 로직 확인 결과(통과/실패 건수), spec과 달라진 점이 있으면 그 이유를 한국어 10줄 이내로 보고한다. 브라우저 검증은 Review 단계가 하므로 하지 않아도 된다. 커밋하지 않는다.
