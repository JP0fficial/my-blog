---
title: localStorage로 브라우저에 값 기억하기
date: 2026-11-11
tags: TIL, JavaScript, localStorage
description: 다크 모드 선택을 기억하게 해 준 localStorage의 기본 사용법과 주의할 점을 정리했습니다.
---

이 블로그에서 다크 모드 버튼을 누른 뒤 새로고침을 해도 테마가 그대로 유지됩니다.
서버도 데이터베이스도 없는데 어떻게 기억하는 걸까요? 비밀은 브라우저에 들어 있는 작은 저장소, **localStorage**였습니다.

## localStorage란?

localStorage는 브라우저가 웹사이트마다 따로 마련해 주는 **키-값 저장소**입니다.

- 값은 **문자열**로 저장됩니다.
- 탭이나 브라우저를 닫았다 다시 열어도 **사라지지 않습니다**. 사용자가 직접 지우거나 코드에서 지울 때까지 남아 있습니다.
- 저장소는 **출처(origin)** 별로 나뉩니다. 출처는 프로토콜, 도메인, 포트의 조합이라서 `http://localhost:8000`에 저장한 값은 다른 사이트에서 읽을 수 없습니다.
- 저장할 수 있는 양은 브라우저마다 다르지만 보통 수 MB 정도로, 설정값처럼 작은 데이터를 담기에 알맞습니다.

## 기본 사용법

메서드 네 개만 알면 대부분 해결됩니다.

| 메서드 | 하는 일 |
| :--- | :--- |
| `localStorage.setItem(키, 값)` | 값 저장 (같은 키가 있으면 덮어씀) |
| `localStorage.getItem(키)` | 값 읽기 (없으면 `null`) |
| `localStorage.removeItem(키)` | 키 하나 삭제 |
| `localStorage.clear()` | 이 사이트의 값 전부 삭제 |

이 블로그의 다크 모드도 이렇게 동작합니다.

```javascript
const STORAGE_KEY = 'theme';

// 버튼을 누르면 선택한 테마를 저장
localStorage.setItem(STORAGE_KEY, 'dark');

// 다음 방문 때 저장된 값을 읽기
const saved = localStorage.getItem(STORAGE_KEY); // 'dark' 또는 null
```

`getItem`이 `null`을 돌려주면 "사용자가 아직 고른 적이 없다"는 뜻이므로, 그때는 시스템 설정(`prefers-color-scheme`)을 따르도록 만들었습니다.

## 주의할 점 1: 문자열만 저장된다

숫자나 객체를 넣어도 문자열로 바뀝니다. 객체를 그대로 넣으면 `"[object Object]"`라는 쓸모없는 문자열이 저장됩니다.
그래서 객체나 배열은 `JSON.stringify`로 문자열로 바꿔 저장하고, 꺼낼 때 `JSON.parse`로 되돌립니다.

```javascript
const settings = { theme: 'dark', fontSize: 17 };

localStorage.setItem('settings', JSON.stringify(settings));

const loaded = JSON.parse(localStorage.getItem('settings'));
console.log(loaded.fontSize); // 17 (숫자로 돌아옴)
```

숫자 하나만 저장했다면 꺼낸 값은 `'17'` 같은 문자열이므로, 계산에 쓰기 전에 `Number()`로 바꿔야 합니다.

## 주의할 점 2: 실패할 수도 있다

브라우저 설정이나 사생활 보호 모드 등에 따라 localStorage에 접근할 때 오류가 날 수 있고, 저장 공간이 가득 차면 `setItem`이 오류를 던집니다.
테마 저장 같은 부가 기능 때문에 페이지 전체가 멈추면 안 되니, `try...catch`로 감싸 두는 것이 안전합니다.

```javascript
const save = (theme) => {
  try {
    localStorage.setItem('theme', theme);
  } catch {
    // 저장할 수 없으면 조용히 넘어간다
  }
};
```

## 주의할 점 3: 비밀 정보는 넣지 않는다

localStorage의 값은 같은 페이지에서 실행되는 JavaScript라면 누구나 읽을 수 있습니다.
비밀번호나 인증 토큰 같은 민감한 정보는 저장하지 않고, 테마나 글꼴 크기처럼 **노출되어도 괜찮은 설정값**에만 쓰는 것이 좋습니다.

## 비슷한 친구: sessionStorage

사용법이 똑같은 `sessionStorage`도 있습니다. 차이는 **얼마나 오래 남느냐**입니다.

| 구분 | localStorage | sessionStorage |
| :--- | :--- | :--- |
| 유지 기간 | 직접 지울 때까지 | 탭을 닫으면 사라짐 |
| 탭 사이 공유 | 같은 출처면 공유 | 탭마다 따로 |
| 어울리는 용도 | 테마 같은 장기 설정 | 작성 중인 임시 입력값 |

---

## 핵심 정리

1. localStorage는 사이트(출처)마다 따로 있는, **창을 닫아도 남는** 키-값 저장소입니다.
2. `setItem`, `getItem`, `removeItem`, `clear` 네 개면 충분하고, 없는 키는 `null`이 돌아옵니다.
3. 값은 **문자열**로만 저장되니 객체는 `JSON.stringify` / `JSON.parse`를 씁니다.
4. 접근이 실패할 수 있으니 `try...catch`로 감싸고, 민감한 정보는 넣지 않습니다.

다음에는 다크 모드의 또 다른 재료인 `prefers-color-scheme`와 `matchMedia`를 정리해 보려고 합니다.
