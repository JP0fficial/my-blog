# Build 서브에이전트 지침 — 타일 합치기

## 할 일
`apps/tile-merge/spec.md`(승인된 계획)를 그대로 구현한다. 먼저 spec.md 전체를 읽는다.

## 수정 범위 (이 밖의 파일은 절대 만들거나 고치지 않는다)
- `apps/tile-merge/index.html`
- `apps/tile-merge/style.css`
- `apps/tile-merge/game.js`
- `apps/tile-merge/main.js`
- `apps/tile-merge/preview.svg` — 블로그 카드용 정적 미리보기(spec 9절). 4×4 판에 타일 몇 개, spec의 라이트 배색 사용, 가로:세로 약 16:10 또는 1:1, 용량 작게

블로그의 `index.html`, `css/`, `js/`, `posts/`, `CLAUDE.md`, `spec.md`, `tasks/`는 읽기만 한다.

## 구현 조건
- 외부 라이브러리·CDN·빌드 도구 없음. ES 모듈, `const`/`let`, 화살표 함수, 2칸 들여쓰기, 세미콜론, 작은따옴표.
- `game.js`는 DOM·`localStorage`에 접근하지 않는 순수 모듈. spec 8절의 공개 함수 이름·반환 형태를 지킨다.
- 앱 이름은 "타일 합치기". 화면·코드·주석 어디에도 "2048" 같은 기존 게임 이름이나 목표 숫자를 내세우지 않는다. 베이지/주황 배색 금지.
- 모바일 우선, 360px에서 가로 스크롤 없음, 터치 대상 44×44px 이상.
- 색은 `style.css`의 CSS 변수로만.

## 스스로 확인 (끝내기 전에)
1. Node로 `game.js` 규칙을 확인한다: spec 10절 표의 7개 `slideLine` 케이스와 오른쪽 방향 1건, `canMove` 2건. 테스트 스크립트는 저장소에 남기지 말고 임시 폴더 `C:\Users\user\AppData\Local\Temp\claude\e163499d604b0ada\91f36661-6fcd-490c-89ff-f580b3471498\scratchpad`에 둔다.
   (예: scratchpad에 `test.mjs`를 만들고 `import` 경로로 `file:///C:/Users/user/OneDrive/바탕%20화면/my-blog/apps/tile-merge/game.js` 사용)
2. `node --check`로 main.js 문법 확인.

## 보고
만든 파일 목록, 규칙 확인 결과(통과/실패 건수), spec과 달라진 점이 있으면 그 이유를 한국어 10줄 이내로 보고한다. 브라우저 검증은 Review 단계가 하므로 하지 않아도 된다.
