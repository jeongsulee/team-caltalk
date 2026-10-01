const { test, before, beforeEach, after } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { Pool } = require('pg');

// 테스트 DB 가드: 개발 DB를 DROP SCHEMA 하지 않도록 이름이 _test로 끝나야 한다
const dbName = process.env.DATABASE_URL ? new URL(process.env.DATABASE_URL).pathname.slice(1) : '';
if (!dbName.endsWith('_test')) throw new Error(`테스트 DB가 아니다: "${dbName}" (_test로 끝나야 함)`);

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function insertUser(email) {
  const { rows } = await pool.query(
    "INSERT INTO users (email, password_hash, name) VALUES ($1, 'hash', '이름') RETURNING id",
    [email]
  );
  return rows[0].id;
}

async function insertCategory(userId, name) {
  const { rows } = await pool.query(
    'INSERT INTO categories (user_id, name) VALUES ($1, $2) RETURNING id',
    [userId, name]
  );
  return rows[0].id;
}

function insertTodo(userId, categoryId, startOffset, endOffset) {
  return pool.query(
    `INSERT INTO todos (user_id, category_id, title, start_date, end_date)
     VALUES ($1, $2, '할일', CURRENT_DATE + $3::int, CURRENT_DATE + $4::int)`,
    [userId, categoryId, startOffset, endOffset]
  );
}

before(async () => {
  await pool.query('DROP SCHEMA public CASCADE; CREATE SCHEMA public;');
  await pool.query(fs.readFileSync(path.join(__dirname, '../src/db/schema.sql'), 'utf8'));
});

beforeEach(async () => {
  await pool.query('TRUNCATE users, categories, todos RESTART IDENTITY CASCADE');
});

after(() => pool.end());

test('DB-01: 빈 DB에 schema.sql 적용 시 테이블 3개와 명시 인덱스 2개가 존재한다', async () => {
  const tables = await pool.query(
    "SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' AND table_type = 'BASE TABLE' ORDER BY table_name"
  );
  assert.deepEqual(tables.rows.map((r) => r.table_name), ['categories', 'todos', 'users']);

  const indexes = await pool.query(
    "SELECT indexname FROM pg_indexes WHERE schemaname = 'public' AND indexname IN ('idx_todos_user_id', 'idx_todos_category_id') ORDER BY indexname"
  );
  assert.deepEqual(indexes.rows.map((r) => r.indexname), ['idx_todos_category_id', 'idx_todos_user_id']);
});

test('DB-01 BR-04 E-03: start_date > end_date는 todos_date_range_check 위반, 같은 날은 성공', async () => {
  const userId = await insertUser('a@example.com');
  const categoryId = await insertCategory(userId, '기본');

  await assert.rejects(insertTodo(userId, categoryId, 1, 0), {
    code: '23514',
    constraint: 'todos_date_range_check',
  });
  await insertTodo(userId, categoryId, 0, 0);

  const { rows } = await pool.query('SELECT count(*)::int AS n FROM todos');
  assert.equal(rows[0].n, 1);
});

test('DB-01 BR-07: 같은 email의 users 두 번째 INSERT는 UNIQUE 위반', async () => {
  await insertUser('dup@example.com');
  await assert.rejects(insertUser('dup@example.com'), { code: '23505' });
});

test('DB-01 BR-11: 같은 사용자·같은 이름 카테고리는 categories_user_name_unique 위반, 다른 사용자는 허용', async () => {
  const userA = await insertUser('a@example.com');
  const userB = await insertUser('b@example.com');
  await insertCategory(userA, '업무');

  await assert.rejects(insertCategory(userA, '업무'), {
    code: '23505',
    constraint: 'categories_user_name_unique',
  });
  await insertCategory(userB, '업무');
});

test('DB-01 BR-09: 소속 할일이 있는 카테고리 DELETE는 FK 위반으로 실패하고 행이 유지된다', async () => {
  const userId = await insertUser('a@example.com');
  const categoryId = await insertCategory(userId, '업무');
  await insertTodo(userId, categoryId, 0, 1);

  await assert.rejects(pool.query('DELETE FROM categories WHERE id = $1', [categoryId]), { code: '23503' });

  const { rows } = await pool.query('SELECT count(*)::int AS n FROM categories WHERE id = $1', [categoryId]);
  assert.equal(rows[0].n, 1);
});

test('DB-01 원칙 1-4: todos에 status 컬럼이 없고 컬럼 집합이 정확히 일치한다', async () => {
  const { rows } = await pool.query(
    "SELECT column_name FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'todos' ORDER BY column_name"
  );
  const columns = rows.map((r) => r.column_name);
  assert.ok(!columns.includes('status'));
  assert.deepEqual(
    columns,
    ['category_id', 'created_at', 'end_date', 'id', 'is_completed', 'start_date', 'title', 'user_id']
  );
});
