# Review 서브에이전트 지침 — 타일 합치기

너는 Build를 하지 않은 별도 검증 담당이다. 구현이 `apps/tile-merge/spec.md`대로 동작하는지 확인하고, 문제를 고치고, `apps/tile-merge/review.md`를 쓴다.

## 수정 범위 (이 밖의 파일은 만들거나 고치지 않는다)
- `apps/tile-merge/index.html`, `style.css`, `game.js`, `main.js`, `preview.svg` — 발견한 문제를 고칠 때만
- `apps/tile-merge/review.md` — 새로 작성

블로그의 다른 파일, `spec.md`, `tasks/`, `CLAUDE.md`는 읽기만 한다. 커밋하지 않는다.

## 환경
- 로컬 서버가 이미 `http://localhost:8000`에서 돌고 있다. 서버를 새로 띄우지 않는다.
- 앱 주소: `http://localhost:8000/apps/tile-merge/`
- 브라우저 확인은 내장 브라우저 도구(`mcp__Claude_Browser__*`: navigate, read_page, javascript_tool, computer, resize_window, read_console_messages)로 한다. 도구가 deferred 상태면 ToolSearch로 먼저 불러온다.
- 브라우저 크기를 바꿨다면 끝날 때 `resize_window` preset `desktop`으로 되돌린다.
- 임시 테스트 스크립트는 저장소 밖 `C:\Users\user\AppData\Local\Temp\claude\e163499d604b0ada\91f36661-6fcd-490c-89ff-f580b3471498\scratchpad`에 둔다.

## 확인할 것
1. **규칙**: Node로 `game.js`를 import해 spec 10절의 표 7건과 방향 4가지, `canMove`, 변화 없는 이동에서 새 타일이 생기지 않는 것을 직접 다시 확인한다 (Build의 테스트를 믿지 말고 새로 작성).
2. **브라우저 동작**: 콘솔 오류 없음. 키보드 이벤트를 보내 4방향 이동, 점수 증가, 새 게임 버튼 동작. `localStorage`에 상태를 넣고 새로고침하면 이어지는지, 깨진 값을 넣으면 새 게임으로 복구되는지. 게임 오버 상태를 만들어(`tile-merge:state`에 꽉 찬 체커 판 저장 후 새로고침) 오버레이와 "다시 하기"가 동작하는지.
3. **스와이프**: 게임판에 pointer 이벤트(pointerdown/pointerup)를 보내 방향 판정이 되는지. `touch-action: none` 적용 여부.
4. **반응형**: 360×740에서 `document.documentElement.scrollWidth <= innerWidth`, 게임판이 화면에 맞는지. 데스크톱 폭에서도 확인.
5. **테마**: 라이트/다크 각각 확인. `theme` 키 연동. 모든 타일 글자/배경 대비를 계산해 4.5:1 이상인지 확인하고, 미달이면 `style.css`의 해당 값만 조정한다. (Build 보고: 16 타일 `#3b82f6`/흰 글자가 약 3.7:1로 미달)
6. **코드 점검**: `innerHTML`에 사용자 입력이 들어가는지, 이벤트 리스너 중복 등록, 애니메이션 연타 시 꼬임, `prefers-reduced-motion` 처리, 다른 곳에서 방향키 페이지 스크롤을 막지 않는지, `localStorage` try/catch.
7. **독창성**: "2048" 등 기존 게임 이름·목표 숫자 표기, 베이지/주황 배색 없음.
8. 라이트 모드 스크린샷 한 장으로 화면이 정상인지 눈으로 확인.

## review.md 형식 (한국어)
- 요약 (통과/수정/남은 문제)
- 확인 항목별 결과 표 (항목 / 결과 / 방법)
- 고친 내용 목록 (파일, 무엇을, 왜)
- 남은 문제나 손으로 확인이 필요한 것 (예: 실제 휴대폰 터치, 스크린리더)

## 보고
review.md 요약과 고친 파일 목록을 한국어 10줄 이내로 보고한다.
