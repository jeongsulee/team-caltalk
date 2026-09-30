-- cal-todo 데이터베이스 DDL (PostgreSQL 17)
-- 기준 문서: docs/7-erd.md, docs/8-plan.md §5 (2026-09-30 결정 확정)

-- users (사용자) : FR-01, FR-02
CREATE TABLE users (
    id            BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    email         VARCHAR(255) NOT NULL UNIQUE,                    -- 로그인 ID, 유일 (BR-07). 공백 제거·소문자 정규화는 서비스에서 수행, DB는 단순 UNIQUE
    password_hash VARCHAR(255) NOT NULL,                           -- 단방향 해시만 저장 (평문 금지)
    name          VARCHAR(100) NOT NULL,                           -- 표시 이름
    created_at    TIMESTAMPTZ  NOT NULL DEFAULT now()
);

-- categories (카테고리) : FR-08
-- '기본' 카테고리는 가입 트랜잭션(서비스)이 사용자별 행으로 만들고 이름 '기본'으로 식별한다(BR-10). DDL에서는 시드하지 않는다.
-- '기본'의 수정·삭제 거부(BR-10)와 빈 이름 400·중복 409 응답(BR-11)은 서비스가 처리한다.
CREATE TABLE categories (
    id         BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    user_id    BIGINT       NOT NULL REFERENCES users (id),        -- 사용자별 카테고리
    name       VARCHAR(100) NOT NULL,
    created_at TIMESTAMPTZ  NOT NULL DEFAULT now(),
    CONSTRAINT categories_user_name_unique UNIQUE (user_id, name)  -- BR-11 (사용자별 이름 유일)
);

-- todos (할일) : FR-03 ~ FR-07
-- 상태(시작 전/진행중/완료/기한 초과)는 저장하지 않고 서버가 계산한다 (BR-08).
CREATE TABLE todos (
    id           BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    user_id      BIGINT       NOT NULL REFERENCES users (id),      -- 소유자 (BR-02)
    category_id  BIGINT       NOT NULL REFERENCES categories (id) ON DELETE RESTRICT, -- BR-09는 서비스 트랜잭션으로 처리
    title        VARCHAR(200) NOT NULL,
    start_date   DATE         NOT NULL,
    end_date     DATE         NOT NULL,
    is_completed BOOLEAN      NOT NULL DEFAULT false,
    created_at   TIMESTAMPTZ  NOT NULL DEFAULT now(),
    CONSTRAINT todos_date_range_check CHECK (start_date <= end_date) -- BR-04 (같은 날 허용)
);

-- 인덱스 (users.email, categories(user_id, name)은 UNIQUE가 인덱스를 자동 생성.
-- categories.user_id 단독 조회는 (user_id, name) 인덱스가 커버하므로 별도 인덱스를 두지 않는다)
CREATE INDEX idx_todos_user_id       ON todos (user_id);       -- BR-02, 내 할일 조회·필터
CREATE INDEX idx_todos_category_id   ON todos (category_id);   -- 카테고리 필터, BR-09 UPDATE 조건
