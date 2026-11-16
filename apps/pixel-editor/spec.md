# 픽셀 아트 에디터 (Pixel Editor) — 구현 계획

16×16 격자에 도트를 찍어 그림을 그리고, 완성하면 PNG로 저장하는 작은 웹앱.
외부 라이브러리·빌드 도구 없이 순수 HTML/CSS/JS(ES 모듈)로 만든다.

---

## 1. 기능 범위

| 구분 | 기능 | 이번에 넣음 |
|---|---|---|
| 필수 | 펜(선택 색으로 칠하기) | O |
| 필수 | 지우개(투명으로 되돌리기) | O |
| 필수 | 팔레트에서 색 선택 | O |
| 필수 | 전체 지우기 | O |
| 필수 | PNG 저장 | O |
| 추가 | 채우기(같은 색 영역, 4방향) | O |
| 추가 | 실행 취소 / 다시 실행 | O |
| 추가 | 사용자 지정 색 `<input type="color">` | O |
| 추가 | 격자선 표시 토글 | O |
| 추가 | 스포이트 | X — 다음 단계로 미룸 |
| 제외 | 격자 크기 변경, 레이어, 이미지 불러오기, 여러 작품 관리 | X |

- 격자 크기는 16 고정. 로직 함수는 `size` 인자를 받되 화면은 16만 쓴다.
- "전체 지우기"는 확인 대화상자 없이 실행하고, 실행 취소로 되돌릴 수 있게 한다.

---

## 2. 팔레트

기본 16색 + 사용자 지정 색 1칸. **투명은 팔레트에 넣지 않고 지우개 도구로 처리**한다(색과 도구 개념을 섞지 않기 위함).

| 이름 | 값 | 이름 | 값 |
|---|---|---|---|
| 검정 | `#000000` | 청록 | `#14b8a6` |
| 진회색 | `#4b5563` | 하늘 | `#38bdf8` |
| 회색 | `#9ca3af` | 파랑 | `#2563eb` |
| 흰색 | `#ffffff` | 남색 | `#3730a3` |
| 빨강 | `#ef4444` | 보라 | `#9333ea` |
| 주황 | `#f97316` | 분홍 | `#ec4899` |
| 노랑 | `#facc15` | 갈색 | `#92400e` |
| 연두 | `#84cc16` | 초록 | `#16a34a` |

- 기본 선택 색: 검정. 마지막 선택 색은 저장해 다시 열 때 복원.
- **선택 색 표시**: 도구 영역에 큰 색 견본 + 텍스트 "현재 색: 빨강 (#ef4444)". 선택된 팔레트 칸은 두꺼운 테두리(`--accent`)와 `aria-pressed="true"`.
- 사용자 지정 색: 마지막 칸에 `<input type="color">`. 값을 바꾸면 그 색이 선택되고 이름은 "사용자 지정 (#xxxxxx)".
- 팔레트 색은 테마가 아니라 **그림 데이터**이므로 CSS 변수 규칙의 예외로, JS에서 `style.backgroundColor`로 지정한다.
- 흰색 칸은 라이트 모드에서 배경과 구분되도록 테두리(`--border`)를 항상 둔다.

---

## 3. 그리기 방식

**선택: `<canvas>` 한 장** (내부 해상도 16×16, CSS로 확대 + `image-rendering: pixelated`)

- 이유: 칸 256개 DOM보다 단순하고 빠르며, PNG 저장 로직과 그리기 방식이 같다. 좌표→칸 변환은 `getBoundingClientRect()` 비율 계산 한 줄이면 된다.
- **투명 체크무늬**: 캔버스 뒤 요소의 CSS 배경(`conic-gradient` 반복)으로 표시 — 캔버스·PNG에는 들어가지 않는다.
- **격자선**: 캔버스 위에 겹친 `pointer-events: none` 요소의 CSS 배경(`linear-gradient` 반복, 16칸 간격)으로 표시. 토글은 `hidden` 속성. 캔버스를 다시 그릴 필요 없음.

**입력 (Pointer Events, 마우스·터치·펜 공통)**

- `pointerdown`: `setPointerCapture`, 획(stroke) 시작 — 실행 취소용으로 획 시작 전 격자를 기억.
- `pointermove`(누른 상태): 직전 칸 → 현재 칸을 **브레젠햄 직선**으로 이어 칠해 빠르게 움직여도 점이 끊기지 않게 한다.
- **같은 칸 중복 처리**: 현재 칸이 직전 칸과 같으면 무시. 칸 색이 이미 같으면 변경 없음으로 처리.
- `pointerup` / `pointercancel`: 획 종료. 획 동안 실제 바뀐 칸이 있을 때만 기록에 1건 추가.
- 채우기는 `pointerdown` 한 번으로 끝(드래그 무시).
- **스크롤 방지**: 캔버스에 `touch-action: none`, `overscroll-behavior: contain`. 페이지 나머지는 정상 스크롤.
- 다시 그리기는 `requestAnimationFrame`으로 묶어 프레임당 1회.

---

## 4. PNG 저장

- **배경**: 투명 유지(지운 칸은 알파 0).
- **배율**: `<select>`로 1×(16px), 8×(128px), **16×(256px, 기본)**, 32×(512px). 마지막 선택은 저장.
- **선명도**: 저장용 캔버스를 따로 만들어 격자 데이터에서 칸마다 `fillRect(x*s, y*s, s, s)`로 직접 채운다(스무딩 개입 없음). 보조로 `imageSmoothingEnabled = false`도 설정.
- **파일 이름**: `pixel-art-YYYYMMDD-HHMMSS.png` (로컬 시각).
- **다운로드**: `canvas.toBlob(..., 'image/png')` → `URL.createObjectURL` → 임시 `<a download>` 클릭 → `revokeObjectURL`.
- 모든 칸이 비어 있어도 저장은 허용(투명 이미지).

---

## 5. 저장 (`localStorage`)

| 키 | 내용 |
|---|---|
| `pixel-editor:art` | 작업 중인 그림 `{ version: 1, size: 16, pixels: [...] }` JSON — 획 종료·채우기·전체 지우기·실행 취소/다시 실행 후 저장 |
| `pixel-editor:settings` | `{ tool, color, grid, scale }` |

- `pixels`는 길이 256 배열, 각 칸 `'#rrggbb'` 또는 `null`(투명).
- 불러올 때 형식 검사(길이·색 문자열 정규식). 깨졌으면 무시하고 빈 격자로 시작.
- 실행 취소 기록은 저장하지 않는다(새로고침하면 기록은 비어 있음).
- `localStorage` 접근은 `try/catch`로 감싸 사생활 보호 모드에서도 앱은 동작.

---

## 6. 화면 구성

**모바일 (기본, 360px 기준)** — 한 열, 좌우 여백 1rem, 최대 폭 약 28rem 가운데 정렬.

1. **헤더**: "← 블로그"(`../../index.html`), 제목 "픽셀 아트 에디터", 테마 토글
2. **캔버스**: 정사각형(`aspect-ratio: 1`), 폭 100% (360px 화면에서 약 328px → 칸당 약 20px)
3. **도구 줄**: 펜 · 지우개 · 채우기 | 실행 취소 · 다시 실행 (아이콘 버튼 5개, 44px, 한 줄)
4. **현재 색 표시**
5. **팔레트**: `grid-template-columns: repeat(auto-fill, minmax(2.75rem, 1fr))` — 360px에서 6열×3줄
6. **동작 줄**: 격자선 토글 · 전체 지우기 / 배율 선택 + "PNG 저장" 버튼(줄바꿈 허용)
7. 단축키 안내(작은 글씨, 데스크톱에서만 표시)

**데스크톱 (`min-width: 768px`)** — 2열: 왼쪽 캔버스(최대 약 32rem), 오른쪽 패널(도구 → 현재 색 → 팔레트 8열 → 동작). 전체 최대 폭 약 56rem.

---

## 7. 테마

- 블로그·타일 합치기와 같은 키 `theme`(`light`/`dark`). `index.html` `<head>` 맨 앞에 `apps/tile-merge/index.html`과 동일한 인라인 스크립트로 FOUC 방지.
- 토글은 `tile-merge/main.js`의 `applyTheme`/`initTheme`과 같은 방식으로 `main.js`에 작은 테마 코드를 둔다(저장값 없으면 시스템 설정 변경도 따라감, `aria-label`·`title` 갱신).
- 색은 `style.css`의 `:root` / `[data-theme="dark"]` 변수로만 정의. 블로그 기본 변수를 같은 값으로 복사하고 앱용 변수를 추가:

| 변수 | 라이트 | 다크 |
|---|---|---|
| `--checker-a` | `#ffffff` | `#2d333b` |
| `--checker-b` | `#e5e7eb` | `#21262d` |
| `--grid-line` | `rgba(0,0,0,0.15)` | `rgba(255,255,255,0.15)` |
| `--canvas-frame` | `#d0d7de` | `#30363d` |

---

## 8. 접근성

- 도구 버튼: `aria-label`("펜", "지우개", "채우기", "실행 취소", "다시 실행"), 도구 3개는 `aria-pressed`. 실행 취소/다시 실행은 불가 시 `disabled`.
- 팔레트 칸: `<button aria-label="빨강" aria-pressed="false">` — 색 이름 제공, 선택은 테두리+`aria-pressed`(색만으로 구분하지 않음).
- 격자선 토글: `aria-pressed`, 배율 `<select>`는 `<label>` 연결.
- 캔버스: `tabindex="0"`, `role="img"`가 아닌 `aria-label="그림판, 방향키로 칸 이동, Space로 칠하기"`. **키보드 그리기**: 방향키로 커서 칸 이동(캔버스 위 테두리 표시), Space/Enter로 현재 도구 적용.
- 단축키(캔버스·버튼 포커스 상태에서, 입력란·select 포커스 시 제외): `B` 펜, `E` 지우개, `F` 채우기, `G` 격자선, `Ctrl/⌘+Z` 실행 취소, `Ctrl/⌘+Shift+Z`·`Ctrl+Y` 다시 실행.
- 시각적 숨김 `aria-live="polite"` 영역: 도구·색 변경, "전체 지움", "실행 취소", "PNG 저장됨" 알림.
- 터치 대상 최소 44×44px, `:focus-visible` 포커스 링은 `--accent`.

---

## 9. 파일 구조

```
apps/pixel-editor/
├── index.html    # 마크업, <head> 테마 인라인 스크립트, <script type="module" src="main.js">
├── style.css     # 테마 변수 + 레이아웃(모바일 우선) + 체크무늬/격자선
├── editor.js     # 순수 로직 — DOM·canvas·localStorage 없음
├── main.js       # 화면 렌더, 포인터/키보드 입력, PNG 저장, localStorage, 테마, aria-live
├── preview.svg   # 블로그 메인 카드용 (손으로 쓴 작은 SVG 도트 그림, 320×200 비율)
└── spec.md       # 이 문서
```

**`editor.js` 공개 함수 (모두 순수, 새 배열을 돌려줌)**

- `createGrid(size = 16)` → `(string|null)[]` (길이 size²)
- `setPixel(grid, size, x, y, color)` → 새 grid (범위 밖·같은 색이면 원본 그대로 반환)
- `lineCells(x0, y0, x1, y1)` → `[x, y][]` (브레젠햄, 양 끝 포함)
- `floodFill(grid, size, x, y, color)` → 새 grid (4방향, `null` 영역도 채움, 대상 색 = 새 색이면 원본 반환)
- `createHistory(limit = 50)`, `pushHistory(history, grid)`, `undo(history, current)`, `redo(history, current)` → `{ history, grid }` — 새 기록 추가 시 redo 스택 비움, 한도 초과 시 가장 오래된 것 버림
- `serialize(grid, size)` / `deserialize(json)` → 유효하지 않으면 `null`
- `PALETTE` — `{ name, value }[]` 16개

블로그 메인 카드 연결(`index.html` 수정)은 이 계획 범위 밖이며 별도 승인 후 진행한다.

---

## 10. Review 체크리스트

**로직 (`editor.js` 단위 확인)**

| 대상 | 경우 | 기대 결과 |
|---|---|---|
| `floodFill` | 빈 격자 (0,0)에 빨강 | 256칸 모두 빨강 |
| `floodFill` | 검정 세로선(x=8)으로 나뉜 빈 격자, (0,0) | 왼쪽 128칸만 채움, 선과 오른쪽은 그대로 |
| `floodFill` | 대각선으로만 이어진 칸 | 넘어가지 않음(4방향) |
| `floodFill` | 대상 색 = 새 색 | 원본 그대로(기록 추가 안 됨) |
| `floodFill` | 모서리 (15,15) | 범위 밖 접근 오류 없음 |
| `lineCells` | (0,0)→(3,0), (0,0)→(3,3), (3,1)→(0,0), 같은 점 | 끊김 없는 칸 목록, 같은 점은 1칸 |
| `setPixel` | 같은 색 / 범위 밖 | 원본과 같은 참조 |
| 기록 | A→B→C 후 undo 2번 → redo 1번 | A → B 상태 |
| 기록 | undo 후 새 획 | redo 불가 |
| 기록 | 51번 push | 가장 오래된 1건 버려짐, 크기 50 |
| `deserialize` | 길이 다름, 잘못된 색 문자열, 깨진 JSON | `null` |

**PNG 확인 방법**

- 배율별로 저장 후 파일 속성(또는 브라우저로 열기)에서 크기 16 / 128 / 256 / 512px 확인.
- 저장한 PNG를 `<img>`로 불러와 임시 canvas에 그린 뒤 `getImageData`로 몇 칸의 RGBA 확인: 칠한 칸 = 팔레트 값과 정확히 일치, 지운 칸 알파 0, 칸 경계에 중간색(번짐) 없음.

**화면·환경**

- [ ] 360px 너비에서 가로 스크롤 없음, 도구 줄 한 줄·팔레트 6열
- [ ] 마우스·터치 드래그로 끊김 없이 그려짐, 캔버스 위 드래그 중 페이지 스크롤 안 됨
- [ ] 한 획 = 실행 취소 1번
- [ ] 키보드만으로 도구 선택·색 선택·그리기·저장 가능
- [ ] 새로고침 후 그림·도구·색·격자선·배율 유지, 깨진 저장값에서 빈 격자로 복구
- [ ] 블로그와 테마 공유, 로드 시 깜빡임 없음, 라이트/다크 모두 체크무늬·격자선·글자 대비 충분
- [ ] 외부 라이브러리 없음, `node serve.mjs` 후 `http://localhost:8000/apps/pixel-editor/`에서 콘솔 오류 없음
