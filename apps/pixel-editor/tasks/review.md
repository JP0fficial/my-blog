# Review 서브에이전트 지침 — 픽셀 아트 에디터

너는 Build를 하지 않은 별도 검증 담당이다. 구현이 `apps/pixel-editor/spec.md`대로 동작하는지 확인하고, 문제를 고치고, `apps/pixel-editor/review.md`를 쓴다.

## 수정 범위 (이 밖의 파일은 만들거나 고치지 않는다)
- `apps/pixel-editor/index.html`, `style.css`, `editor.js`, `main.js`, `preview.svg` — 발견한 문제를 고칠 때만
- `apps/pixel-editor/review.md` — 새로 작성

블로그의 다른 파일, 다른 앱, `spec.md`, `tasks/`, `CLAUDE.md`는 읽기만 한다. 커밋하지 않는다.

## 환경
- 로컬 서버가 이미 `http://localhost:8000`에서 돌고 있다. 새로 띄우지 않는다.
- 앱 주소: `http://localhost:8000/apps/pixel-editor/`
- 브라우저 확인은 내장 브라우저 도구(`mcp__Claude_Browser__*`)로 한다. deferred 상태면 ToolSearch로 먼저 불러온다. 탭 `tab-3`을 쓴다.
- 브라우저 창이 숨겨져 있으면 뷰포트 크기가 0으로 잡힐 수 있다. 그럴 때는 `resize_window`로 크기를 지정한 뒤 확인하고, 끝나면 preset `desktop`으로 되돌린다.
- 임시 테스트 스크립트는 저장소 밖 `C:\Users\user\AppData\Local\Temp\claude\e163499d604b0ada\91f36661-6fcd-490c-89ff-f580b3471498\scratchpad\pixel-review\`에 둔다.
- 테스트하며 바꾼 `localStorage`(`pixel-editor:*`, `theme`)는 끝날 때 원래대로 지운다.

## 확인할 것
1. **로직**: Node로 `editor.js`를 import해 spec 10절의 테스트 표를 새로 작성해 확인한다 (Build의 테스트를 믿지 말 것). 채우기 경계, 같은 색 채우기, 실행 취소/다시 실행 순서와 새 획 뒤 다시 실행 기록 삭제, lineCells 대각선, 깨진 저장값.
2. **그리기**: canvas에 pointerdown/pointermove/pointerup을 보내 펜·지우개·채우기 동작, 드래그 시 칸이 끊기지 않는지, 한 획 = 실행 취소 1건, 전체 지우기, 격자선 토글, 단축키(B/E/F/G, Ctrl+Z 등).
3. **팔레트**: 색 선택 상태 표시, 사용자 지정 색, 지우개 상태에서 색을 고르면 펜으로 바뀌는 동작(Build가 추가한 것)이 자연스러운지.
4. **PNG 저장**: 다운로드 함수가 만드는 blob을 가로채거나 같은 렌더 함수를 호출해, 배율별 실제 크기(16/128/256/512px), 픽셀 색이 정확한지(`getImageData`로 칸 중앙·경계 확인, 번짐 없음), 빈 칸이 투명(alpha 0)인지, 파일 이름 형식을 확인한다. 실제 파일을 디스크에 내려받지는 않는다.
5. **저장/복구**: 새로고침 후 그림·설정 유지, 깨진 값에서 빈 그림으로 복구.
6. **반응형**: 360×740에서 가로 스크롤 없음, 캔버스·도구·팔레트가 화면에 맞고 터치 대상 44px 이상. 1280 폭에서도 확인. 캔버스 위 드래그에서 `touch-action: none`.
7. **테마**: 라이트/다크, `theme` 키 연동, 텍스트·버튼 대비 4.5:1 이상, 투명 칸 체크무늬가 두 테마에서 보이는지.
8. **코드 점검**: 사용자 입력이 `innerHTML`로 들어가는지, 리스너 중복, `localStorage` try/catch, 메모리 누수(object URL 해제).
9. 라이트 모드 스크린샷 한 장으로 화면이 정상인지 눈으로 확인.

## review.md 형식 (한국어)
- 요약 (통과/수정/남은 문제)
- 확인 항목별 결과 표 (항목 / 결과 / 방법)
- 고친 내용 목록 (파일, 무엇을, 왜)
- 남은 문제나 손으로 확인이 필요한 것

## 보고
review.md 요약과 고친 파일 목록을 한국어 10줄 이내로 보고한다.
