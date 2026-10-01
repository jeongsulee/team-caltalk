# cal-todo 스타일 가이드

> 기준 문서: [와이어프레임](4-wireframes.md), [프로젝트 구조 설계 원칙](5-project-principle.md), [개발 계획 FE-13](8-plan.md). 화면 배치·문구는 와이어프레임이 우선하며, 이 문서는 색·글꼴·간격·컴포넌트 모양만 정한다.
> 참고 화면: 월간 캘린더 웹 화면 캡처 1장(흰 배경, 얇은 구분선, 요일 색 구분, 오늘 강조 원, 일정 칩). 색상 값은 캡처에서 눈으로 추출한 근사값이다. 참고 화면의 로고·브랜드 색(녹색 로고)은 사용하지 않는다.

## 1. 디자인 원칙

| # | 원칙 | 참고 화면에서 가져온 점 |
|---|---|---|
| 1 | 흰 배경 + 얇은 회색 구분선으로 영역을 나눈다. 그림자·그라데이션은 쓰지 않는다. | 상단 바·사이드바·캘린더 행이 모두 1px 선으로만 구분됨 |
| 2 | 색은 의미가 있을 때만 쓴다. 기본 텍스트는 검정·회색이다. | 일요일 빨강, 토요일 파랑, 공휴일만 색 칩 |
| 3 | 강조는 굵기와 크기로 한다. | 월 제목·섹션 제목만 굵은 글씨 |
| 4 | 강조색(보라)은 주요 버튼·활성 탭·링크에만 쓴다. | 하단 "앱 열기" 버튼만 보라 계열 |
| 5 | 장식 없이 정보 밀도를 낮게 유지한다. | 넓은 여백, 칩 안 텍스트만 표시 |

## 2. 색상 토큰

모든 색은 `frontend/src/index.css`의 `:root` CSS 변수로만 정의하고, 컴포넌트에서는 변수 이름으로만 참조한다 (값 하드코딩 금지).

### 2.1 기본

| 토큰 | 값 | 용도 |
|---|---|---|
| `--color-bg` | `#FFFFFF` | 페이지·카드 배경 |
| `--color-bg-subtle` | `#F6F6F6` | 오늘 날짜 열 배경, 입력창 비활성 배경, 행 hover |
| `--color-border` | `#EBEBEB` | 헤더 하단선, 캘린더 행 구분선, 표 행 구분선, 입력창 테두리 |
| `--color-text` | `#1A1A1A` | 본문·제목 |
| `--color-text-secondary` | `#666666` | 보조 설명, 라벨 |
| `--color-text-muted` | `#A0A0A0` | 다른 달 날짜, 비활성 텍스트, placeholder |

### 2.2 강조·의미

| 토큰 | 값 | 용도 |
|---|---|---|
| `--color-primary` | `#5B4FE9` | 주요 버튼 배경, 활성 탭 밑줄, 링크 |
| `--color-primary-soft` | `#EEECFD` | 보조 버튼 배경, 선택된 필터 배경 |
| `--color-sunday` | `#E5483D` | 캘린더 일요일 요일명·날짜 |
| `--color-saturday` | `#4A6CF7` | 캘린더 토요일 요일명·날짜 |
| `--color-danger` | `#E5483D` | 오류 문구, 삭제 버튼 텍스트 |
| `--color-danger-soft` | `#FDE8E8` | 오류 입력창 배경, 기한 초과 칩 배경 |
| `--color-today` | `#111111` | 오늘 날짜 원 배경 (숫자는 `--color-bg`) |

### 2.3 할일 상태 색

상태 값(`upcoming`/`in_progress`/`completed`/`overdue`)은 서버가 내려준 `status`를 그대로 쓰고, 라벨(한국어·영어)은 `i18n.ts` 한 곳에서, 색은 `index.css`의 칩 토큰(`--chip-{status}-fg/bg`)과 `.chip--{status}` 클래스에서만 정한다 (원칙 1-4, §3). 영어 라벨: Upcoming / In progress / Completed / Overdue.

| status | 라벨 | 칩 텍스트 | 칩 배경 | 비고 |
|---|---|---|---|---|
| `upcoming` | 시작 전 | `#666666` | `#F1F1F1` | 참고 화면의 회색 일정 칩(절기) 모양 |
| `in_progress` | 진행중 | `#5B4FE9` | `#EEECFD` | 강조색 계열 |
| `completed` | 완료 | `#A0A0A0` | `#F6F6F6` | 제목에 취소선(`text-decoration: line-through`) |
| `overdue` | 기한 초과 | `#E5483D` | `#FDE8E8` | 참고 화면의 빨간 공휴일 칩 모양 |

### 2.4 다크 모드

- `<html data-theme="dark">`일 때 `:root[data-theme='dark']`에서 §2.1~2.3의 토큰을 같은 이름으로 다시 정의한다. 컴포넌트·CSS 규칙은 색 값을 직접 쓰지 않고 토큰만 참조한다 (주요 버튼의 흰 글자 `#ffffff`만 예외).
- 다크 블록에서 `color-scheme: dark`를 지정해 날짜 선택·select 등 브라우저 기본 컨트롤도 어둡게 한다.
- 라이트(`:root`)의 색 토큰을 다크 블록이 빠짐없이 다시 정의하는지 `theme.test.tsx`가 검사한다.

| 토큰 | 라이트 | 다크 |
|---|---|---|
| `--color-bg` | `#FFFFFF` | `#17171A` |
| `--color-bg-subtle` | `#F6F6F6` | `#222226` |
| `--color-border` | `#EBEBEB` | `#2E2E33` |
| `--color-text` | `#1A1A1A` | `#ECECEC` |
| `--color-text-secondary` | `#666666` | `#A8A8AD` |
| `--color-text-muted` | `#A0A0A0` | `#6F6F75` |
| `--color-primary` | `#5B4FE9` | `#7B72F2` |
| `--color-primary-soft` | `#EEECFD` | `#2B2850` |
| `--color-sunday` | `#E5483D` | `#FF6B61` |
| `--color-saturday` | `#4A6CF7` | `#7D93FF` |
| `--color-danger` | `#E5483D` | `#FF6B61` |
| `--color-danger-soft` | `#FDE8E8` | `#3A1F1F` |
| `--color-today` | `#111111` (숫자 흰색) | `#ECECEC` (숫자 `--color-bg`) |
| `--chip-upcoming-fg/bg` | `#666666` / `#F1F1F1` | `#B4B4B9` / `#2A2A2F` |
| `--chip-in-progress-fg/bg` | `#5B4FE9` / `#EEECFD` | `#A9A2FF` / `#2B2850` |
| `--chip-completed-fg/bg` | `#A0A0A0` / `#F6F6F6` | `#6F6F75` / `#222226` |
| `--chip-overdue-fg/bg` | `#E5483D` / `#FDE8E8` | `#FF8A82` / `#3A1F1F` |

- 초기 테마는 OS 설정(`prefers-color-scheme`)을 따르고, 사용자가 전환하면 localStorage에 유지한다.

## 3. 타이포그래피

- 글꼴: 시스템 글꼴만 쓴다 (웹 폰트 의존성 추가 금지).
  `font-family: -apple-system, BlinkMacSystemFont, "Apple SD Gothic Neo", "Malgun Gothic", "Noto Sans KR", sans-serif;`
- 숫자(날짜)는 `font-variant-numeric: tabular-nums;`로 폭을 맞춘다.

| 토큰 | 크기 / 굵기 / 행간 | 용도 | 참고 화면 |
|---|---|---|---|
| `--font-title` | 26px / 700 / 1.3 | 캘린더 월 제목(`2026. 10.`), 페이지 제목 | 상단 중앙 월 제목 |
| `--font-heading` | 20px / 700 / 1.4 | 섹션 제목(필터 영역, 카테고리 목록 제목) | 사이드바 "내 캘린더" |
| `--font-body` | 16px / 400 / 1.5 | 본문, 입력값, 버튼, 메뉴 | 사이드바 메뉴 항목 |
| `--font-small` | 14px / 400 / 1.4 | 요일명, 날짜 숫자, 칩 텍스트, 보조 설명 | 요일 행, 일정 칩 |
| `--font-caption` | 12px / 400 / 1.4 | 오류 문구, 상태 라벨 보조 | 날짜 아래 작은 숫자 |

## 4. 간격·모양

- 간격은 4px 단위만 쓴다: `--space-1: 4px`, `--space-2: 8px`, `--space-3: 12px`, `--space-4: 16px`, `--space-6: 24px`, `--space-8: 32px`.
- 모서리: 칩 `--radius-sm: 2px`, 입력창·버튼 `--radius-md: 6px`, 카드·보조 버튼 `--radius-lg: 8px`, 오늘 원 `50%`.
- 구분선: `1px solid var(--color-border)`. 테두리 두께 2px 이상은 쓰지 않는다 (활성 탭 밑줄 2px만 예외).
- 그림자(`box-shadow`)는 쓰지 않는다.

## 5. 레이아웃

### 5.1 공통 헤더 (WF-03~07)

- 높이 64px, 배경 `--color-bg`, 하단 `1px solid var(--color-border)`. 참고 화면의 상단 바와 같은 구성.
- 왼쪽: 앱 이름 "cal-todo"(`--font-heading`, `--color-text`). 오른쪽: 메뉴(할일, 카테고리, 내 정보, 로그아웃) `--font-body`, 간격 `--space-6`.
- 현재 메뉴는 `--color-primary` 텍스트. 나머지는 `--color-text`.
- 오른쪽 끝: 테마 전환(`.theme-toggle`) → 언어 선택(`.lang-select`) → 로그아웃 순서, 간격 `--space-4`. 두 컨트롤 모두 높이 32px, `1px solid var(--color-border)`, `--radius-md`, 14px, 배경 `--color-bg`. 테마 전환 버튼에는 바꿀 대상 모드("다크 모드"/"라이트 모드")를 표시하고 `aria-pressed`로 현재 다크 여부를 나타낸다. WF-01·WF-02는 헤더가 없으므로 폼 위 오른쪽에 같은 두 컨트롤을 둔다.
- 참고 화면의 왼쪽 사이드바 배치는 쓰지 않는다. 와이어프레임의 공통 헤더 배치를 따른다.

### 5.2 본문

- 본문 최대 폭 1200px, 가운데 정렬, 좌우 패딩 `--space-6`.
- 폼 화면(WF-01~03, 06, 07)은 최대 폭 480px 1열.

### 5.3 반응형 (FE-13)

- 브레이크포인트는 `768px` 하나만 쓰고 `index.css`의 미디어 쿼리 한 곳에서만 정의한다.
- 768px 미만: 좌우 패딩 `--space-4`, 헤더 메뉴는 줄바꿈 배치(접지 않음, 햄버거 메뉴 없음), WF-04 목록은 카드형 세로 목록, 상태 필터는 드롭다운.
- 캘린더(WF-05)는 768px 미만에서 칩 텍스트를 한 줄 말줄임(`text-overflow: ellipsis`)하고 셀 최소 높이를 72px로 줄인다.

## 6. 컴포넌트

### 6.1 버튼

| 종류 | 배경 | 텍스트 | 테두리 | 용도 |
|---|---|---|---|---|
| 주요 | `--color-primary` | `#FFFFFF` | 없음 | 가입하기, 로그인, 저장, + 할일 등록 |
| 보조 | `--color-primary-soft` | `--color-primary` | 없음 | 취소, 추가(카테고리) — 참고 화면 "앱 열기" 버튼 모양 |
| 텍스트 | 투명 | `--color-text-secondary` | 없음 | 수정, 회원가입/로그인 링크 |
| 위험 | 투명 | `--color-danger` | 없음 | 삭제 (확인창 1회 후 실행) |

- 높이 40px, 좌우 패딩 `--space-4`, `--radius-md`, `--font-body` 굵기 600.
- 비활성(`disabled`): `opacity: 0.4`, 커서 `not-allowed`.
- '기본' 카테고리 행에는 수정·삭제 버튼을 렌더링하지 않는다 (BR-10, 숨김이지 비활성 아님).

### 6.2 입력창·선택

- 높이 40px, 패딩 `0 var(--space-3)`, `1px solid var(--color-border)`, `--radius-md`, `--font-body`.
- 포커스: 테두리 `--color-primary`. 오류: 테두리 `--color-danger`, 입력창 아래 `--font-caption` `--color-danger` 문구 (예: BR-04, E-01).
- 라벨은 입력창 위 `--font-small` `--color-text-secondary`, 간격 `--space-1`.
- 날짜는 `<input type="date">`를 그대로 쓴다 (8-plan §5). 별도 날짜 선택 라이브러리를 쓰지 않는다.

### 6.3 체크박스 (완료 토글, BR-12)

- 18px 정사각형, `--radius-sm`(3px까지 허용). 미완료: `1px solid var(--color-text-muted)` 흰 배경. 완료: `--color-primary` 채움 + 흰 체크.
- 참고 화면 사이드바 체크박스 모양을 따르되 회색 대신 강조색으로 채운다. 네이티브 `<input type="checkbox">`에 `accent-color: var(--color-primary)`를 쓰는 것으로 충분하다.

### 6.4 탭 (목록 / 캘린더, FR-06)

- 텍스트 탭 2개, `--font-body`. 활성: `--color-text` 굵기 700 + 하단 2px `--color-primary` 밑줄. 비활성: `--color-text-muted`.
- 탭 행 하단 `1px solid var(--color-border)`.

### 6.5 상태 칩

- 높이 20px, 좌우 패딩 `--space-1`~`--space-2`, `--radius-sm`, `--font-small`, 색은 §2.3.
- 목록(WF-04)에서는 상태 라벨 칩(`시작 전` 등)으로, 캘린더(WF-05)에서는 할일 제목 칩으로 쓴다.

### 6.6 필터 (FR-07)

- 카테고리·상태는 `<select>` 2개를 가로로 배치(간격 `--space-2`). 상태는 하나만 선택되며 "전체" 옵션을 둔다.
- 필터가 적용된 `<select>`는 배경 `--color-primary-soft`.

### 6.7 목록 행 (WF-04)

- 행 높이 최소 56px, 하단 `1px solid var(--color-border)`, hover 배경 `--color-bg-subtle`.
- 배치: 체크박스 → 제목(`--font-body`) → 카테고리(`--font-small` `--color-text-secondary`) → 기간(`YYYY-MM-DD ~ YYYY-MM-DD`, `--font-small`) → 상태 칩 → 수정·삭제 텍스트 버튼.
- 빈 결과: "조건에 맞는 할일이 없습니다." 가운데 정렬, `--font-body` `--color-text-muted`, 위아래 `--space-8`.

### 6.8 월간 캘린더 (WF-05)

참고 화면의 캘린더 그리드를 가장 직접적으로 적용하는 화면이다.

| 요소 | 스타일 |
|---|---|
| 월 제목 | `YYYY. MM.` 형식, `--font-title`, 가운데. 양옆에 이전/다음 달 버튼(텍스트 버튼 `‹` `›`) |
| 요일 행 | 일~토 7열, `--font-small` 가운데. 일 `--color-sunday`, 토 `--color-saturday`, 나머지 `--color-text` |
| 그리드 | `display: grid; grid-template-columns: repeat(7, 1fr);` 주 단위 행 사이 `1px solid var(--color-border)`. 세로 구분선은 쓰지 않는다 |
| 날짜 숫자 | 셀 상단 가운데, `--font-small`. 일·토 색은 요일 행과 같음. 다른 달 날짜는 `--color-text-muted` |
| 오늘 (KST) | 날짜 숫자를 24px 원(`--color-today` 배경, 흰 숫자)으로 표시하고 그 날짜 열(셀) 배경 `--color-bg-subtle` |
| 셀 높이 | 데스크톱 최소 120px |
| 할일 칩 | 날짜 숫자 아래, 셀 폭 가득(좌우 여백 `--space-1`), 칩 사이 `--space-1`. 상태 색(§2.3). 여러 날에 걸친 할일은 시작~종료 각 날짜 셀에 같은 칩을 반복 표시한다 (8-plan §5) |
| 넘침 | 칩이 셀 높이를 넘으면 셀 안에서 세로 스크롤 없이 잘라내고 `+N`(`--font-caption` `--color-text-secondary`)을 표시한다 |
| 클릭 | 칩·셀 클릭 동작 없음 (`cursor: default`) |

- 오늘 강조는 표시 전용이다. 서버 API에 '오늘'을 내려주는 필드가 없으므로 프론트가 `Intl.DateTimeFormat`(`timeZone: 'Asia/Seoul'`)으로 KST 날짜를 구해 강조 위치에만 쓴다. 상태 판단·색은 반드시 서버 `status`를 따른다 (원칙 1-4, 1-6). 오늘 강조를 빼거나 서버가 오늘 날짜를 내려주도록 바꾸는 것은 결정이 필요하다 (§9).
- 참고 화면의 음력·절기·공휴일 표시는 요구사항에 없으므로 만들지 않는다.

### 6.9 오류·안내 문구

- 폼 단위 오류(로그인 실패 E-02 등)는 폼 상단에 `--color-danger-soft` 배경, `--color-danger` 텍스트, `--radius-md`, 패딩 `--space-3`.
- 입력 단위 오류는 §6.2.
- 문구는 서버 `error.message`를 그대로 표시하고, 분기는 `error.code`로 한다 (원칙 §3).

## 7. CSS 변수 정의 (index.css 시작부)

```css
:root {
  --color-bg: #ffffff;
  --color-bg-subtle: #f6f6f6;
  --color-border: #ebebeb;
  --color-text: #1a1a1a;
  --color-text-secondary: #666666;
  --color-text-muted: #a0a0a0;
  --color-primary: #5b4fe9;
  --color-primary-soft: #eeecfd;
  --color-sunday: #e5483d;
  --color-saturday: #4a6cf7;
  --color-danger: #e5483d;
  --color-danger-soft: #fde8e8;
  --color-today: #111111;

  --chip-upcoming-fg: #666666;
  --chip-upcoming-bg: #f1f1f1;
  --chip-in-progress-fg: #5b4fe9;
  --chip-in-progress-bg: #eeecfd;
  --chip-completed-fg: #a0a0a0;
  --chip-completed-bg: #f6f6f6;
  --chip-overdue-fg: #e5483d;
  --chip-overdue-bg: #fde8e8;

  --space-1: 4px;
  --space-2: 8px;
  --space-3: 12px;
  --space-4: 16px;
  --space-6: 24px;
  --space-8: 32px;

  --radius-sm: 2px;
  --radius-md: 6px;
  --radius-lg: 8px;

  --font-family: -apple-system, BlinkMacSystemFont, "Apple SD Gothic Neo", "Malgun Gothic", "Noto Sans KR", sans-serif;
  color-scheme: light;
}

/* 다크 모드: 같은 토큰을 다시 정의한다 (값은 §2.4 표) */
:root[data-theme='dark'] {
  --color-bg: #17171a;
  /* ... §2.4의 나머지 색·칩 토큰 ... */
  color-scheme: dark;
}

body {
  margin: 0;
  font-family: var(--font-family);
  font-size: 16px;
  line-height: 1.5;
  color: var(--color-text);
  background: var(--color-bg);
}

@media (max-width: 767px) {
  /* FE-13 반응형 규칙은 이 블록 한 곳에만 둔다 */
}
```

- 상태 색(§2.3)은 `.chip--upcoming`, `.chip--in_progress`, `.chip--completed`, `.chip--overdue`처럼 status 값을 그대로 붙인 클래스로 정의한다. 클래스 이름 변환 로직을 따로 만들지 않는다.

## 8. 적용 범위와 하지 않는 것

- 스타일은 `frontend/src/index.css` 한 파일에 둔다 (8-plan FE-13). CSS 프레임워크·CSS-in-JS·UI 컴포넌트 라이브러리·아이콘 라이브러리·웹 폰트는 추가하지 않는다.
- 애니메이션, 접근성 전용 작업(PRD §8 범위 외)은 하지 않는다. 다크 모드는 §2.4의 토큰 재정의 방식으로만 지원한다 (8-plan FE-16).
- 참고 화면에만 있는 요소(사이드바, 구독 캘린더, 음력·절기, 공휴일, 프로필 이미지, 앱 열기 버튼, 브랜드 로고)는 만들지 않는다.

## 9. 미정 항목

| 항목 | 내용 |
|---|---|
| 캘린더 오늘 강조의 '오늘' 산출 | 원칙 1-6은 '오늘'을 서버에서만 산출하도록 한다. 오늘 강조(§6.8)를 위해 프론트에서 KST 날짜를 구할지, 강조를 뺄지, 서버 응답에 오늘 날짜를 추가할지 결정이 필요하다 |

## 10. 문서 변경 이력

| 버전 | 변경일 | 변경자 | 변경내용 |
|---|---|---|---|
| 1.0 | 2026-10-01 | leejs05031119@gmail.com | 최초 작성 (참고 화면 캡처 기반) |
| 1.1 | 2026-10-01 | leejs05031119@gmail.com | 다국어 반영: 상태 라벨 매핑 위치를 `i18n.ts`로 변경(§2.3), 헤더·로그인·가입 화면의 언어 선택 스타일 추가(§5.1) |
| 1.2 | 2026-10-01 | leejs05031119@gmail.com | 다크/라이트 모드 반영: §2.4 다크 모드 토큰 표 추가, 칩 색을 토큰(`--chip-*`)으로 전환, §5.1 테마 전환 버튼 추가, §7 CSS 예시 갱신, §8 범위 제외에서 다크 모드 삭제 |
