const { test, after } = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const { Pool } = require('pg');
const bcrypt = require('bcrypt');
const { seed, TEST_PASSWORD } = require('../src/db/seed');

// 테스트 DB 가드: seed는 TRUNCATE를 하므로 이름이 _test로 끝나는 DB에서만 실행한다
const dbName = process.env.DATABASE_URL ? new URL(process.env.DATABASE_URL).pathname.slice(1) : '';
if (!dbName.endsWith('_test')) throw new Error(`테스트 DB가 아니다: "${dbName}" (_test로 끝나야 함)`);

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
after(() => pool.end());

const BACKEND_DIR = path.join(__dirname, '..');
const EMAIL_LABEL = { 'user-a@example.com': 'A', 'user-b@example.com': 'B' };

async function counts() {
  const { rows } = await pool.query(
    `SELECT (SELECT count(*) FROM users)::int AS users,
            (SELECT count(*) FROM categories)::int AS categories,
            (SELECT count(*) FROM todos)::int AS todos`
  );
  return rows[0];
}

async function snapshot() {
  const users = await pool.query('SELECT id, email, name FROM users ORDER BY id');
  const categories = await pool.query('SELECT id, user_id, name FROM categories ORDER BY id');
  const todos = await pool.query(
    `SELECT id, user_id, category_id, title, start_date::text, end_date::text, is_completed
     FROM todos ORDER BY id`
  );
  return { users: users.rows, categories: categories.rows, todos: todos.rows };
}

test('DB-02 S-01: users 2건, categories 4건, todos 7건이고 NEW는 없다', async () => {
  await seed(pool);

  assert.deepEqual(await counts(), { users: 2, categories: 4, todos: 7 });

  const { rows } = await pool.query(
    `SELECT u.email, array_agg(c.name) AS names
     FROM categories c JOIN users u ON u.id = c.user_id
     GROUP BY u.email ORDER BY u.email`
  );
  // DB 콜레이션과 무관하게 JS 정렬로 비교
  assert.deepEqual(rows.map((r) => ({ ...r, names: r.names.sort() })), [
    { email: 'user-a@example.com', names: ['개인', '기본', '업무'].sort() },
    { email: 'user-b@example.com', names: ['기본'] },
  ]);

  const newUser = await pool.query("SELECT 1 FROM users WHERE email = 'new-user@example.com'");
  assert.equal(newUser.rowCount, 0);
});

test('DB-02: TODO-A1~A6, B1의 소유자·카테고리·D 기준 일자·완료 여부가 공통 데이터 표와 일치한다', async () => {
  await seed(pool);

  // s/e = D(KST 오늘) 기준 오프셋. 카테고리는 할일 소유자의 것이어야 한다(JOIN 조건)
  const { rows } = await pool.query(
    `SELECT t.title, u.email, c.name AS category,
            t.start_date - (now() AT TIME ZONE 'Asia/Seoul')::date AS s,
            t.end_date - (now() AT TIME ZONE 'Asia/Seoul')::date AS e,
            t.is_completed
     FROM todos t
     JOIN categories c ON c.id = t.category_id AND c.user_id = t.user_id
     JOIN users u ON u.id = t.user_id
     ORDER BY t.title`
  );
  const A = 'user-a@example.com';
  const B = 'user-b@example.com';
  assert.deepEqual(rows, [
    { title: 'TODO-A1', email: A, category: '업무', s: 3, e: 5, is_completed: false },
    { title: 'TODO-A2', email: A, category: '업무', s: 0, e: 2, is_completed: false },
    { title: 'TODO-A3', email: A, category: '개인', s: -2, e: 0, is_completed: false },
    { title: 'TODO-A4', email: A, category: '업무', s: -5, e: -1, is_completed: false },
    { title: 'TODO-A5', email: A, category: '개인', s: -5, e: -1, is_completed: true },
    { title: 'TODO-A6', email: A, category: '기본', s: 0, e: 0, is_completed: false },
    { title: 'TODO-B1', email: B, category: '기본', s: 0, e: 1, is_completed: false },
  ]);
});

test('DB-02: 두 번 연속 실행해도 반환 매핑과 건수·값이 동일하다', async () => {
  const first = await seed(pool);
  const firstRows = await snapshot();
  const second = await seed(pool);
  const secondRows = await snapshot();

  assert.deepEqual(second, first);
  assert.deepEqual(secondRows, firstRows);
});

test('DB-02: password_hash는 TEST_PASSWORD 평문이 아니고 bcrypt로 검증된다', async () => {
  await seed(pool);

  const { rows } = await pool.query('SELECT password_hash FROM users');
  assert.equal(rows.length, 2);
  for (const { password_hash } of rows) {
    assert.notEqual(password_hash, TEST_PASSWORD);
    assert.equal(await bcrypt.compare(TEST_PASSWORD, password_hash), true);
  }
});

test('DB-02: seed()가 export되고 라벨 13개 → DB id 매핑을 반환한다', async () => {
  assert.equal(typeof seed, 'function');
  const ids = await seed(pool);

  assert.deepEqual(Object.keys(ids).sort(), [
    'CAT-A-개인', 'CAT-A-기본', 'CAT-A-업무', 'CAT-B-기본',
    'TODO-A1', 'TODO-A2', 'TODO-A3', 'TODO-A4', 'TODO-A5', 'TODO-A6', 'TODO-B1',
    'USER-A', 'USER-B',
  ].sort());

  // DB 행에서 같은 라벨 매핑을 만들어 비교 (BIGINT id는 문자열)
  const fromDb = {};
  const users = await pool.query('SELECT id, email FROM users');
  for (const r of users.rows) fromDb[`USER-${EMAIL_LABEL[r.email]}`] = r.id;
  const categories = await pool.query('SELECT c.id, c.name, u.email FROM categories c JOIN users u ON u.id = c.user_id');
  for (const r of categories.rows) fromDb[`CAT-${EMAIL_LABEL[r.email]}-${r.name}`] = r.id;
  const todos = await pool.query('SELECT id, title FROM todos');
  for (const r of todos.rows) fromDb[r.title] = r.id;

  assert.deepEqual(ids, fromDb);
});

test('DB-02: node src/db/seed.js 직접 실행 성공 시 종료 코드 0이고 데이터가 들어간다', async () => {
  await pool.query('TRUNCATE users, categories, todos RESTART IDENTITY CASCADE');

  const result = spawnSync(process.execPath, ['src/db/seed.js'], { cwd: BACKEND_DIR, env: process.env, encoding: 'utf8' });
  assert.equal(result.status, 0, result.stderr);

  assert.deepEqual(await counts(), { users: 2, categories: 4, todos: 7 });
});

test('DB-02: node src/db/seed.js 직접 실행 실패(DB 없음) 시 종료 코드 1', () => {
  const badUrl = new URL(process.env.DATABASE_URL);
  badUrl.pathname = '/cal_todo_nonexistent_test';

  const result = spawnSync(process.execPath, ['src/db/seed.js'], {
    cwd: BACKEND_DIR,
    env: { ...process.env, DATABASE_URL: badUrl.toString() },
    encoding: 'utf8',
  });
  assert.equal(result.status, 1);
});
