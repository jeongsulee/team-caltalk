# cal-todo 프로젝트 구조 설계 원칙

> 기준 문서: [도메인 정의서](1-domain-definition.md), [PRD](2-PRD.md), [사용자 시나리오](3-user-scenario.md), [와이어프레임](4-wireframes.md). FR/BR/S/E/WF ID는 기준 문서와 동일하다. 미정 항목은 [8-plan](8-plan.md) §5에서 확정했으며 §7에 정리한다.

## 1. 최상위 원칙 (모든 스택 공통)

| # | 원칙 | 왜 |
|---|---|---|
| 1-1 | 단순함 우선: 요청된 FR-01~08만 구현한다. 미정 항목을 위한 추측성 기능·추상화·패턴(DDD, CQRS, 이벤트 버스, 모노레포 도구)은 만들지 않는다. | 1인 개발·2일 일정(PRD §7). |
| 1-2 | 요구사항 추적: 코드·테스트의 주석/이름에 FR/BR/E ID를 남긴다. (예: `// BR-04`, 테스트명 `E-03 ...`) | 문서 ID와 코드가 1:1로 이어져야 변경 영향 파악이 빠르다. |
| 1-3 | 단일 진실 원천: 비즈니스 규칙은 백엔드 서비스 계층 한 곳에서만 판단한다. 프론트는 UX용 사전 검증만 하고 최종 판단은 서버 응답을 따른다. | 규칙이 두 곳에 있으면 어긋난다. |
| 1-4 | 할일 상태는 저장하지 않고 서버가 계산해 응답의 `status` 필드로 내려준다. 판단 함수는 백엔드에 1개만 둔다. 프론트는 재계산하지 않는다. | 도메인 §3 "상태는 저장하지 않는다" + BR-08(KST) 중복 구현 방지. |
| 1-5 | 상태 필터(FR-07)는 SQL WHERE 조건으로 구현하되, 조건은 1-4의 판단 순서(완료 → 기한 초과 → 시작 전 → 진행중)와 동일해야 한다. 이를 테스트로 고정한다(§4). | 두 구현이 갈라질 수 있는 유일한 지점. |
| 1-6 | '오늘'은 KST 날짜(BR-08)이며 서버에서만 산출한다. 클라이언트 시계·타임존에 의존하지 않는다. | 클라이언트마다 날짜가 다르면 상태가 달라진다. |
| 1-7 | 날짜(시작·종료일자)는 시각 없는 `YYYY-MM-DD` 문자열/DATE 타입으로만 다룬다. | 타임존 변환 버그 방지. |
| 1-8 | 미정 항목은 임의로 결정해 구현하지 않는다. 필요하면 코드에 `// 미정: <항목>` 주석만 남기고 §7을 갱신한다. | 문서와 구현의 불일치 방지. |
| 1-9 | 수치(토큰 만료, 풀 크기 등)를 코드에 하드코딩하지 않고 환경변수로 받는다(§5). 확정 값은 `.env.example`에 예시로 둔다. | 지어낸 값이 사실처럼 굳는 것을 막는다. |

## 2. 의존성/레이어 원칙

### 2.1 백엔드 (Node.js + JavaScript + Express + pg)

```
routes  →  services  →  repositories  →  db(pg Pool)
(HTTP·입력검증)  (BR 판단)     (SQL)
```

| 레이어 | 책임 | 하지 않는 일 |
|---|---|---|
| routes | 요청 파싱, 입력 형식 검증, 인증 미들웨어 적용, 응답 변환 | SQL 작성, BR 판단 |
| services | BR 판단(BR-02, 03, 04, 05 서버측, 07, 09, 10, 11, 12), 상태 계산, 트랜잭션 경계 | `req`/`res` 접근, SQL 직접 작성 |
| repositories | 파라미터화된 SQL 실행, 행 → 객체 변환 | BR 판단, HTTP 개념 |

- 의존은 위→아래 단방향만 허용한다.
- 금지: 하위 → 상위 import, routes → repositories 직접 호출, services 간 순환 import, repositories 간 상호 호출.
- 금지: Prisma 등 ORM 사용(PRD §6). SQL은 `pg`의 파라미터 바인딩(`$1`)만 사용하고 문자열 연결로 SQL을 만들지 않는다. (SQL 인젝션 방지)
- 금지: TypeScript 도입(PRD §6은 백엔드 JavaScript).
- 인증 미들웨어는 Access Token을 검증해 `req.user.id`를 설정한다. 서비스는 `userId`를 인자로 받으며 토큰을 직접 다루지 않는다.
- 카테고리 삭제(BR-09)는 "할일을 '기본'으로 이동 + 카테고리 삭제"를 한 트랜잭션으로 처리한다. 이 외 트랜잭션은 필요할 때만 쓴다.

### 2.2 프론트엔드 (React 19 + TypeScript + Zustand + TanStack Query)

```
pages  →  components  →  hooks(TanStack Query)  →  api  →  (fetch)
   └──→  stores(Zustand)
```

| 레이어 | 책임 |
|---|---|
| pages | WF 화면 1개 = 페이지 1개. 라우팅 단위, 훅·컴포넌트 조립 |
| components | 표시 전용 UI. 서버 호출 금지, props로만 데이터 수신 |
| hooks | TanStack Query `useQuery`/`useMutation` 래핑. 서버 상태의 유일한 창구 |
| api | 백엔드 REST 호출 함수와 요청/응답 타입. 토큰 첨부·재발급 처리 |
| stores | Zustand. 서버와 무관한 UI 상태만 (필터 선택값, 활성 탭, 현재 월, 언어, 테마 등) |

- 상태 구분(PRD §6): 서버 데이터는 TanStack Query만, UI 상태는 Zustand만 사용한다. 서버 데이터를 Zustand에 복사하지 않는다. (이유: 캐시 이중화 방지)
- 금지: components에서 `api` 직접 import, `api`에서 store/컴포넌트 import, 페이지 간 import.
- 필터 값은 Zustand에 두고 쿼리 키에 포함해 서버에 전달한다. 필터링은 서버(FR-07)가 수행하며 클라이언트에서 다시 거르지 않는다.
- 인증: Refresh Token까지 만료되면 로그인 화면으로 이동(BR-01, E-02)하는 처리를 `api` 계층 한 곳에서 한다.

### 2.3 프론트 ↔ 백엔드
- 통신은 REST(JSON)만 사용한다. 프론트가 백엔드 코드를 import하지 않는다(반대도 동일). 타입 공유 패키지는 만들지 않고 프론트 `api/types.ts`에 응답 타입을 직접 정의한다. (이유: 모노레포 도구 불필요)

## 3. 코드/네이밍 원칙

| 대상 | 규칙 | 예 |
|---|---|---|
| 프론트 컴포넌트 파일 | PascalCase.tsx | `TodoItem.tsx` |
| 프론트 그 외 파일 | camelCase.ts | `useTodos.ts`, `todoApi.ts`, `uiStore.ts` |
| 백엔드 파일 | camelCase.js, 레이어 접미사 | `todoService.js`, `todoRepository.js`, `todoRoutes.js` |
| 변수·함수 | camelCase, 동사 시작(함수) | `getTodoStatus`, `createTodo` |
| 상수 | UPPER_SNAKE_CASE | `DEFAULT_CATEGORY_NAME` |
| React 훅 | `use` 접두사 | `useCategories` |
| Zustand store | `use<이름>Store` | `useUiStore` |
| 타입/인터페이스 | PascalCase, `I` 접두사 금지 | `Todo`, `TodoStatus` |
| API 경로 | `/api` + 복수 명사, 소문자 kebab-case, 동사 금지 | `/api/todos`, `/api/todos/:id`, `/api/categories` |
| 인증 API 경로 | `/api/auth/*` | `/api/auth/signup`, `/api/auth/login`, `/api/auth/refresh` |
| 내 정보 API 경로 | `/api/users/me` | (FR-02, 본인만 대상) |
| HTTP 메서드 | 등록 POST, 조회 GET, 수정 PATCH, 삭제 DELETE | (PUT 미사용, 부분 수정) |
| 필터 쿼리 | `GET /api/todos?categoryId=&status=` (status는 1개) | FR-07 |
| 캘린더 조회 | 전용 API·월 파라미터 없이 필터 없는 `GET /api/todos` 사용 | FR-06 |
| 완료 처리 | `PATCH /api/todos/:id`의 `isCompleted` (토글, 되돌림 가능) | BR-12 |
| JSON 필드 | camelCase | `startDate`, `endDate`, `isCompleted`, `categoryId` |
| 날짜 값 | `YYYY-MM-DD` | `2026-10-07` |
| 상태 값 | 영문 소문자 코드: `upcoming`(시작 전), `in_progress`(진행중), `completed`(완료), `overdue`(기한 초과) | 화면 표시 라벨(한국어·영어)은 `i18n.ts` 한 곳에서 매핑 |
| DB 테이블 | snake_case 복수형 | `users`, `categories`, `todos` |
| DB 컬럼 | snake_case | `user_id`, `category_id`, `start_date`, `end_date`, `is_completed`, `created_at` |
| DB PK/FK | PK는 `id`, FK는 `<단수 테이블>_id` | `todos.user_id → users.id` |
| DB 제약·인덱스 | 제약은 DB에서도 건다: 이메일 UNIQUE(BR-07), 카테고리 `UNIQUE (user_id, name)`(BR-11), `CHECK (start_date <= end_date)`(BR-04), `todos.user_id`·`todos.category_id` 인덱스 | 이유: 서버 검증이 뚫려도 데이터가 깨지지 않게 |
| 상태 컬럼 | 만들지 않는다 | 원칙 1-4 |

- 이유(공통): 한 프로젝트 안에서 규칙이 하나면 검색·리뷰 비용이 줄어든다. DB snake_case ↔ JSON camelCase 변환은 repositories에서만 수행한다.
- 도메인 용어(§6 용어 정의)를 그대로 코드 이름으로 쓴다: todo, category, startDate, endDate. 새 동의어를 만들지 않는다.
- '기본' 카테고리는 가입 트랜잭션에서 사용자별 행으로 만들고 이름 '기본'으로 식별한다(BR-10). 코드에서는 `DEFAULT_CATEGORY_NAME` 상수 한 곳만 참조한다.
- 오류 응답 형식은 `{ "error": { "code": "...", "message": "..." } }` 하나로 통일한다. (확정, §7)
- `error.code` 값은 아래로 확정한다. 프론트는 `code`로 분기하고 `message`는 화면 표시용이다.

  | code | HTTP | 사용처 |
  |---|---|---|
  | `VALIDATION_ERROR` | 400 | 필수값 누락, 형식 오류, 종료일자 < 시작일자(BR-04), 카테고리 이름 빈 값·100자 초과(BR-11) |
  | `DEFAULT_CATEGORY_PROTECTED` | 400 | '기본' 카테고리 수정·삭제 시도(BR-10) |
  | `UNAUTHORIZED` | 401 | 토큰 없음·위조·만료, 유효하지 않은 Refresh Token(BR-01) |
  | `INVALID_CREDENTIALS` | 401 | 로그인 실패(이메일·비밀번호 구분 없음) |
  | `NOT_FOUND` | 404 | 존재하지 않거나 타인 소유인 리소스(BR-02) |
  | `EMAIL_DUPLICATED` | 409 | 가입 시 이메일 중복(BR-07) |
  | `CATEGORY_NAME_DUPLICATED` | 409 | 같은 사용자 안의 카테고리 이름 중복(BR-11) |

## 4. 테스트/품질 원칙

| # | 원칙 | 왜 |
|---|---|---|
| 4-1 | 시나리오 E-xx/S-xx 1개 = 테스트 케이스 1개 이상. 테스트명에 시나리오 ID를 넣는다. (`E-05 타인 할일 수정 요청은 거부되고 변경 없음`) | 문서 ↔ 테스트 추적. |
| 4-2 | 공통 테스트 데이터(3-user-scenario.md §3: USER-A/B/NEW, 카테고리, TODO-A1~A6, TODO-B1)를 시드 픽스처 한 파일로 만들어 백엔드 테스트가 공유한다. 날짜는 D(KST 오늘) 기준 상대값(D+3, D-1 등)으로 생성한다. | 문서의 기대 상태를 그대로 검증. 날짜 하드코딩 시 테스트가 시간이 지나면 깨진다. |
| 4-3 | 상태 판단 함수 단위 테스트: TODO-A1~A6의 기대 상태(시작 전/진행중/진행중/기한 초과/완료/진행중)와 도메인 §3 경계 예시 4건, E-06 표 5건을 그대로 케이스로 옮긴다. '오늘'은 함수 인자로 주입해 시간 고정. | 경계(시작일=오늘, 종료일=오늘, 종료일=어제) 회귀 방지. |
| 4-4 | 상태 필터 통합 테스트: TODO-A1~A6에 대해 각 상태 필터의 기대 결과 집합이 판단 함수 결과와 일치함을 검증한다. E-07(기한 초과 = A4만, A5 제외), E-08(카테고리+상태 AND, 상태 재선택 시 대체)을 포함한다. | 원칙 1-5. |
| 4-5 | BR 위반 시 동작 테스트(도메인 §4 "위반 시" 열): BR-01 접근 거부·로그인 이동(E-02), BR-02 요청 거부+DB 변경 없음(E-05: USER-A가 TODO-B1 조회·수정·삭제), BR-04 저장 불가(E-03, 같은 날은 성공), BR-07 가입 불가(E-01, 대소문자만 다른 이메일 포함), BR-10 '기본' 수정·삭제 400 거부(E-10), BR-11 빈 이름 400·중복 409. 거부 테스트는 응답뿐 아니라 DB 상태 불변까지 확인한다. | "위반 시" 열이 곧 기대 결과. |
| 4-6 | 기본값 테스트: BR-03(E-04, 카테고리 미지정 → '기본'), BR-09(E-09, '업무' 삭제 후 TODO-A1·A2·A4가 '기본'으로 이동하고 삭제되지 않음). BR-05(시작일 기본값 D+7, 종료일=시작일)는 프론트 폼 초기값 테스트로 검증한다. | 문서에 명시된 기본 동작. |
| 4-7 | 미정 항목은 테스트로 기대 결과를 고정하지 않는다. 테스트 파일에 `// 미정` 주석 또는 `todo` 케이스로만 남긴다. 결정으로 바뀐 항목(E-10 등)은 테스트 대상이다. | 미정을 테스트가 결정해 버리는 것을 방지. |
| 4-8 | 테스트 범위: 백엔드는 상태 판단·서비스 규칙·API 통합(실제 PostgreSQL 테스트 DB), 프론트는 폼 검증(BR-04 오류 표시)·필터 상태 전환 위주. 나머지 화면 렌더링 테스트는 만들지 않는다. | 2일 일정에서 위험이 큰 곳에 집중. |
| 4-9 | 테스트 러너는 백엔드 `node --test`, 프론트 Vitest + Testing Library. 백엔드는 `npm run test:coverage`에서 `src/` 라인 커버리지 90% 미만이면 실패한다. 프론트는 커버리지 수치 목표가 없다. | 확정(§7). |
| 4-10 | 접근성 검증은 하지 않는다(PRD §8). | 범위 제외. |

## 5. 설정/보안/운영 원칙

### 5.1 환경변수
- 설정값은 환경변수로만 주입하고 코드·저장소에 비밀값을 넣지 않는다. `.env`는 `.gitignore`에 포함하고, 키 목록만 `.env.example`에 둔다. (이유: 비밀 유출 방지)
- 백엔드 필수 키: `DATABASE_URL`, `JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET`, `JWT_ACCESS_EXPIRES_IN`(`15m`), `JWT_REFRESH_EXPIRES_IN`(`7d`), `DB_POOL_MAX`(`20`), `PORT`, `CORS_ORIGIN`. 괄호 값은 `.env.example` 예시다.
- 프론트 키: `VITE_API_BASE_URL` (빌드 도구 Vite). 프론트에는 비밀값을 두지 않는다.
- 백엔드 선택 키: `NODE_ENV`. `production`이면 API 문서(`/api-docs`, §5.6)를 등록하지 않는다. 필수 키가 아니므로 `.env.example`에는 두지 않는다.
- 시작 시 필수 키가 없으면 서버를 기동하지 않는다.
- 백엔드 테스트는 `.env.test`를 쓰며, `DATABASE_URL`의 DB 이름이 `_test`로 끝나지 않으면 테스트 픽스처가 실행을 거부한다(시드가 TRUNCATE하므로).

### 5.2 인증 (JWT: Access Token + Refresh Token)
- 로그인 성공 시 두 토큰을 발급하고, API 요청마다 Access Token을 검증한다. 만료 시 Refresh Token으로 재발급하며, Refresh Token도 무효면 로그인 화면으로 이동한다(PRD §6, BR-01, E-02).
- Access/Refresh는 서로 다른 시크릿으로 서명한다. (이유: 한쪽 유출 시 다른 쪽 보호)
- Access Token 15분, Refresh Token 7일. 두 토큰 모두 `localStorage`에 저장하고 접근은 `client.ts` 한 곳에서만 한다(XSS 노출 위험은 수용). 서버는 Refresh Token을 저장·폐기하지 않는 무상태이며, 로그아웃은 클라이언트 토큰 삭제다.
- 보호 라우트는 모두 인증 미들웨어를 거친다. 공개 API는 `/api/auth/signup`, `/api/auth/login`, `/api/auth/refresh`뿐이다. (API 문서 `/api-docs`는 개발 환경에서만 인증 없이 제공한다, §5.6)

### 5.3 비밀번호
- 평문 저장·로깅 금지. 단방향 해시(솔트 포함, bcrypt)로만 저장한다. 비용 인자는 라이브러리 기본값.
- 비밀번호 정책(길이·복잡도)은 범위 제외이므로 구현하지 않는다(도메인 §5).
- 로그인 실패 시 이메일·비밀번호를 구분하지 않고 "이메일 또는 비밀번호가 올바르지 않습니다."로 안내한다(E-02).
- 응답·로그에 비밀번호 해시를 포함하지 않는다.

### 5.4 소유자 검증 (BR-02)
- 할일 조회·수정·삭제 SQL은 항상 `WHERE id = $1 AND user_id = $2` 형태로 소유자 조건을 포함한다. 조회 후 검사하는 방식이 아니라 쿼리에서 강제한다. (이유: 검사 누락 방지, 존재 여부 노출 최소화)
- `user_id`는 토큰에서 얻은 `req.user.id`만 사용하고 요청 본문/쿼리의 값은 신뢰하지 않는다.
- 카테고리도 사용자별(확정)이므로 같은 원칙을 적용한다. 할일 등록·수정 시 지정한 `categoryId`가 본인 소유인지 검증한다.
- 타인 리소스 접근 거부는 404로 응답하며 데이터 변경은 없다.
- 내 정보 수정(FR-02)은 `/api/users/me`로 토큰의 사용자만 대상으로 한다.

### 5.5 DB 연결 (동시접속 1000명, PRD §5)
- `pg.Pool`을 프로세스당 1개만 생성해 공유한다. 요청마다 Client를 새로 만들지 않는다. 트랜잭션이 필요할 때만 `pool.connect()`로 Client를 얻고 반드시 `release()` 한다(finally).
- `DB_POOL_MAX=20`, 타임아웃은 pg 기본값, 서버 인스턴스 1개. 동시접속 1000명은 동시 DB 연결 1000개가 아니므로 풀 크기와 별개로 본다.
- 동시접속 1000명은 비즈니스 목표로만 유지하고 이번 범위에서 부하 테스트는 하지 않는다. 응답시간 등 그 외 성능 기준도 이번 범위 외(PRD §5).

### 5.6 기타 운영
- 입력 검증은 routes에서 형식(필수값, 날짜 형식)을, services에서 규칙(BR-04)을 수행한다. 프론트 검증은 UX용이다.
- 오류 로그에 비밀번호·토큰 원문을 남기지 않는다. 로깅 도구·모니터링·배포 환경은 이번 범위 외.
- CORS는 `CORS_ORIGIN`에 지정한 출처만 허용한다.
- DB 마이그레이션 도구는 쓰지 않는다. 스키마는 `backend/src/db/schema.sql` 한 파일로 관리한다(ORM 금지, 마이그레이션 도구 불필요한 규모).
- API 명세는 `backend/swagger.yaml`(OpenAPI 3.0) 한 파일로 관리하고, `/api-docs`에서 Swagger UI로, `/api-docs/swagger.yaml`에서 원본으로 제공한다. Swagger UI는 CDN(`swagger-ui-dist@5`)에서 로드해 npm 의존성을 추가하지 않는다. `NODE_ENV=production`이면 등록하지 않는다(404). 명세의 서버 주소 기본 포트는 `3000`이다.

## 6. 디렉토리 구조

도메인(FR-01~08)과 화면(WF-01~07) 대응은 각 항목 오른쪽 주석으로 표기한다. 구조는 저장소 루트 아래 `frontend/`, `backend/` 두 폴더로 나눈다. (기존 `team-caltalk/`는 수정하지 않고 유지한다, §7)

### 6.1 프론트엔드

```
frontend/
├─ src/
│  ├─ main.tsx                    # 앱 진입점 (QueryClientProvider, 라우터)
│  ├─ App.tsx                     # 라우트 정의, 보호 라우트(BR-01)
│  ├─ pages/                      # 화면 1개 = 파일 1개
│  │  ├─ SignupPage.tsx           # WF-01 회원가입 (FR-01)
│  │  ├─ LoginPage.tsx            # WF-02 로그인 (FR-01)
│  │  ├─ ProfilePage.tsx          # WF-03 내 정보 수정 (FR-02)
│  │  ├─ TodoListPage.tsx         # WF-04 목록 탭·필터·삭제 (FR-05~07), WF-05와 탭 전환
│  │  ├─ TodoCalendarView.tsx     # WF-05 캘린더 탭 (FR-06)
│  │  ├─ TodoFormPage.tsx         # WF-06 할일 등록·수정 (FR-03, FR-04)
│  │  └─ CategoryPage.tsx         # WF-07 카테고리 관리 (FR-08)
│  ├─ components/                 # props만 받는 표시 전용 UI
│  │  ├─ LanguageSelect.tsx       # 언어 선택(한국어/English)
│  │  ├─ ThemeToggle.tsx          # 다크/라이트 모드 전환 버튼
│  │  ├─ Header.tsx               # 공통 헤더(WF-03~07 이동, 로그아웃)
│  │  ├─ TodoItem.tsx             # 할일 행/카드, 상태 라벨
│  │  ├─ TodoFilters.tsx          # 카테고리·상태 필터 (FR-07)
│  │  └─ DatePicker.tsx           # 캘린더 날짜 선택 (BR-06)
│  ├─ hooks/                      # TanStack Query 훅 (서버 상태)
│  │  ├─ useAuth.ts               # 로그인·가입·내 정보 (FR-01, FR-02)
│  │  ├─ useTodos.ts              # 할일 조회·등록·수정·삭제 (FR-03~07)
│  │  └─ useCategories.ts         # 카테고리 CRUD (FR-08)
│  ├─ stores/                     # Zustand (UI 상태만)
│  │  └─ uiStore.ts               # 활성 탭, 필터 선택값, 캘린더 현재 월, 언어, 테마(언어·테마만 localStorage 유지)
│  ├─ api/                        # REST 호출·토큰 처리·응답 타입
│  │  ├─ client.ts                # fetch 래퍼, 토큰 첨부·재발급, 만료 시 로그인 이동
│  │  ├─ types.ts                 # Todo, Category, User, TodoStatus 타입
│  │  ├─ authApi.ts               # /api/auth/*, /api/users/me
│  │  ├─ todoApi.ts               # /api/todos
│  │  └─ categoryApi.ts           # /api/categories
│  ├─ i18n.ts                     # 다국어 사전(ko, en)·useT(): 화면 문구, 상태 라벨, error.code → 문구
│  └─ constants.ts                # '기본' 카테고리 이름 상수
├─ .env.example                   # 프론트 환경변수 키 목록
├─ package.json
└─ tsconfig.json
```

- 테스트 파일은 대상 파일 옆 `*.test.tsx`(`*.test.ts`)에 두고 러너는 Vitest + Testing Library다. (`pages/TodoFormPage.test.tsx`, `stores/uiStore.test.ts`, `i18n.test.ts`, `theme.test.tsx`)
- 다국어: 컴포넌트는 `useT()`로 현재 언어 사전을 받는다. props만 받는 컴포넌트(`TodoItem`, `TodoFilters`)는 사전을 props로 받는다. 서버 오류는 한국어에서 서버 `message`를 그대로, 영어에서 `error.code`로 번역한다(모르는 code는 원문). 사용자 데이터는 번역하지 않되, '기본' 카테고리는 영어에서 표시만 'Default'로 바꾼다(식별은 이름 '기본' 그대로, BR-10).
- 테마: `App.tsx`가 `uiStore.theme`을 `<html data-theme>`에 반영하고, `index.css`의 `:root[data-theme='dark']`가 같은 색 토큰을 다시 정의한다. 컴포넌트와 CSS 규칙은 색 값 대신 토큰만 참조한다(스타일 가이드 §2.4).
- 캘린더 탭은 WF-04와 같은 화면의 탭이므로 `TodoListPage`가 탭을 전환하며 `TodoCalendarView`를 렌더링한다.

### 6.2 백엔드

```
backend/
├─ src/
│  ├─ server.js                   # 진입점: 환경변수 검증, 서버 기동
│  ├─ app.js                      # Express 앱 조립: 미들웨어, 라우트 등록, 오류 핸들러
│  ├─ config.js                   # 환경변수 읽기·검증 (유일한 process.env 접근 지점)
│  ├─ db/
│  │  ├─ pool.js                  # pg.Pool 싱글턴 (DB_POOL_MAX)
│  │  ├─ schema.sql               # 테이블·제약·인덱스 (users, categories, todos)
│  │  └─ seed.js                  # 공통 테스트 데이터 시드 (3-user-scenario.md §3)
│  ├─ middlewares/
│  │  ├─ auth.js                  # Access Token 검증 → req.user.id (BR-01)
│  │  └─ errorHandler.js          # 표준 오류 응답 변환
│  ├─ routes/                     # HTTP 입출력·입력 형식 검증
│  │  ├─ authRoutes.js            # /api/auth/* (FR-01)
│  │  ├─ userRoutes.js            # /api/users/me (FR-02)
│  │  ├─ todoRoutes.js            # /api/todos (FR-03~07)
│  │  ├─ categoryRoutes.js        # /api/categories (FR-08)
│  │  └─ docsRoutes.js            # /api-docs Swagger UI (개발 환경만, §5.6)
│  ├─ services/                   # 비즈니스 규칙(BR) 판단
│  │  ├─ authService.js           # 가입(BR-07, '기본' 카테고리 생성 BR-10)·로그인·토큰 발급/재발급
│  │  ├─ userService.js           # 내 정보 수정
│  │  ├─ todoService.js           # BR-02, BR-03, BR-04, BR-05 서버측, BR-12
│  │  ├─ todoStatus.js            # 상태 판단 함수 + KST 오늘 산출 (BR-08)
│  │  └─ categoryService.js       # 카테고리 규칙(BR-10, BR-11), 삭제 시 할일 이동(BR-09)
│  └─ repositories/               # 파라미터화된 SQL만
│     ├─ userRepository.js
│     ├─ todoRepository.js        # 소유자 조건 포함 쿼리(BR-02), 상태 필터 WHERE(FR-07)
│     └─ categoryRepository.js
├─ tests/
│  ├─ fixtures.js                 # 공통 테스트 데이터(USER-A/B/NEW, TODO-A1~A6, B1), D 기준 상대 날짜
│  ├─ todoStatus.test.js          # E-06 상태 경계 단위 테스트
│  ├─ todos.test.js               # S-04~08, E-03~08 통합
│  ├─ categories.test.js          # S-09, E-09~10 통합
│  ├─ auth.test.js                # S-01~03, E-01~02 통합
│  ├─ config.test.js              # BE-01 환경변수 검증·CORS·.env.example
│  ├─ infra.test.js               # BE-02 풀·오류 핸들러, BE-03 픽스처, Swagger UI
│  ├─ schema.test.js              # DB-01 제약·인덱스
│  └─ seed.test.js                # DB-02 시드 데이터
├─ swagger.yaml                   # REST API 명세 (OpenAPI 3.0)
├─ .env.example                   # 백엔드 환경변수 키 목록
├─ .env.test                      # 테스트 DB용 환경변수 (DB 이름 *_test)
└─ package.json                   # scripts: dev, test, test:coverage, seed
```

- 한 도메인은 routes/services/repositories에 같은 접두사 파일 1개씩 대응한다. (인증·내 정보·할일·카테고리)
- 화면 ↔ API 대응: WF-01·02 → authRoutes, WF-03 → userRoutes, WF-04·05·06 → todoRoutes(+ categoryRoutes로 필터·선택 목록), WF-07 → categoryRoutes.

## 7. 결정 사항

8-plan §5에서 확정한 항목이다. 남은 미정 항목은 없다.

| 항목 | 결정 |
|---|---|
| 토큰 만료 시간, 토큰 저장 위치 | Access 15분, Refresh 7일. 둘 다 `localStorage`(접근은 `client.ts` 한 곳) |
| Refresh Token 서버 저장·폐기 방식, 로그아웃 동작 | 서버 무상태. 로그아웃은 클라이언트 토큰 삭제 |
| pg 풀 크기·타임아웃·서버 인스턴스 수 | `DB_POOL_MAX=20`, 타임아웃 pg 기본값, 인스턴스 1개 |
| 동시접속 1000명 검증 방법, 그 외 성능 기준 | 비즈니스 목표로만 유지, 부하 테스트 없음. 성능 기준은 이번 범위 외 |
| '기본' 카테고리 식별 방식과 생성 시점, 수정·삭제 가능 여부 | 사용자별 행, 이름 '기본', 가입 트랜잭션에서 생성. 수정·삭제 불가(BR-10, 400 `DEFAULT_CATEGORY_PROTECTED`, UI는 버튼 숨김) |
| 카테고리 이름 검증 | 빈 값 400, 사용자별 중복 409, 최대 100자(BR-11) |
| 타인 리소스 접근 거부 시 HTTP 상태 코드 | 404 |
| 캘린더 탭 조회 API, 여러 날에 걸친 할일 표시 방식 | 전용 API 없이 필터 없는 `GET /api/todos`. 시작~종료 각 날짜 셀에 제목 표시, 필터 없음. 날짜 클릭 시 해당 일 할일을 팝업(`<dialog>`)으로 표시 |
| 완료 처리 방식, 되돌림 가능 여부 | `PATCH /api/todos/:id`의 `isCompleted`, 목록 체크박스 토글, 되돌림 가능(BR-12) |
| 오류 응답 형식, 상태 코드 영문 값, error.code 값 | `{ error: { code, message } }`, `upcoming`/`in_progress`/`completed`/`overdue`, error.code 7종(§3) |
| 환경변수 이름, API 경로 이름 | §5.1, §3의 이름으로 확정 |
| 테스트 러너, 커버리지 목표 | 백엔드 `node --test`(라인 커버리지 90% 기준, `npm run test:coverage`), 프론트 Vitest + Testing Library(목표 없음) |
| API 문서 | `backend/swagger.yaml`을 `/api-docs` Swagger UI로 제공, CDN 로드, `NODE_ENV=production`이면 미등록 |
| 프론트 빌드 도구, 라우터 라이브러리, 비밀번호 해시 라이브러리 | Vite, react-router, bcrypt(기본 비용 인자) |
| 마이그레이션 방식 | `backend/src/db/schema.sql` 단일 파일 |
| 저장소 내 `frontend/`·`backend/`와 기존 `team-caltalk/` 폴더의 관계 | 루트에 새로 만들고 `team-caltalk/`는 수정하지 않음 |
| 삭제 확인 절차, 빈 결과 표시, 내 정보 수정 항목 범위 | 삭제 전 `window.confirm` 1회, "조건에 맞는 할일이 없습니다.", 이름만 수정 |
| 이메일 대소문자 | 서비스에서 공백 제거·소문자 정규화(BR-07) |
| 다국어 | 한국어(기본)·영어, 라이브러리 없이 `i18n.ts` 사전 + `uiStore.lang`(localStorage 유지, 초기값 브라우저 언어). 서버 오류는 `error.code`로 번역, 백엔드 변경 없음 (8-plan FE-15) |
| 다크/라이트 모드 | 라이브러리 없이 CSS 토큰 재정의(`:root[data-theme='dark']`) + `uiStore.theme`(localStorage 유지, 초기값 OS 설정 `prefers-color-scheme`). 백엔드 변경 없음 (8-plan FE-16) |

## 8. 문서 변경 이력

| 버전 | 변경일 | 변경자 | 변경내용 |
|---|---|---|---|
| 1.0 | 2026-09-30 | leejs05031119@gmail.com | 최초 작성 |
| 1.1 | 2026-09-30 | leejs05031119@gmail.com | 문서 정합성 점검: 네이밍 예시를 §6 디렉토리 구조(TodoItem, uiStore)와 일치, schema.sql 경로를 `backend/src/db/`로 통일 |
| 1.2 | 2026-09-30 | leejs05031119@gmail.com | 8-plan §5 미정 항목 결정 반영 |
| 1.3 | 2026-09-30 | leejs05031119@gmail.com | 문서 정합성 점검: 1-1의 "남은 미정 항목(§7)" 참조 제거(§7은 결정 사항), services BR 목록에 BR-03 추가, §3 인덱스에 `todos.category_id` 추가(schema.sql 인덱스 2개와 일치), §6.2 테스트 파일 주석을 8-plan Task와 일치(auth S-03, categories E-10, todos E-06) |
| 1.4 | 2026-09-30 | leejs05031119@gmail.com | error.code 값 7종 확정(§3 표) |
| 1.5 | 2026-10-01 | leejs05031119@gmail.com | 백엔드 구현 반영: Swagger UI(`/api-docs`, 개발 환경만)와 선택 키 `NODE_ENV`(§5.1·5.2·5.6), 백엔드 커버리지 90% 기준(4-9), §6.2에 `docsRoutes.js`·테스트 파일 4개·`swagger.yaml`·`.env.test` 추가, §7 갱신 |
| 1.6 | 2026-10-01 | leejs05031119@gmail.com | 다국어 반영: 상태 라벨 매핑 위치를 `i18n.ts`로 변경(§3), stores에 언어 추가(§2.2), §6.1에 `i18n.ts`·`LanguageSelect.tsx`·테스트 파일 추가, §7 결정 추가 |
| 1.7 | 2026-10-01 | leejs05031119@gmail.com | 다크/라이트 모드 반영: stores에 테마 추가(§2.2), §6.1에 `ThemeToggle.tsx`·`theme.test.tsx`와 테마 적용 방식 추가, §7 결정 추가 |
