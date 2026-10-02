// BE-02 pg 풀·오류 핸들러, BE-03 테스트 러너·fixtures
const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const express = require('express');
const { pool, resetAndSeed, startServer } = require('./fixtures');
const { AppError, errorHandler } = require('../src/middlewares/errorHandler');
const { getTodayKst } = require('../src/services/todoStatus');

let server;
before(async () => { server = await startServer(); });
after(async () => { await server.close(); await pool.end(); });

async function counts() {
  const { rows } = await pool.query(
    `SELECT (SELECT count(*) FROM users)::int AS users,
            (SELECT count(*) FROM categories)::int AS categories,
            (SELECT count(*) FROM todos)::int AS todos`
  );
  return rows[0];
}

test('BE-02 pool.js를 여러 경로로 import해도 Pool 인스턴스는 1개다', () => {
  const a = require('../src/db/pool').pool;
  const b = require(path.join(__dirname, '..', 'src', 'db', 'pool.js')).pool;
  assert.strictEqual(a, b);
  assert.strictEqual(a, pool);
});

test('BE-02 SELECT start_date FROM todos 결과가 YYYY-MM-DD 문자열이다', async () => {
  const ids = await resetAndSeed();
  const { rows } = await pool.query('SELECT start_date FROM todos');
  assert.equal(rows.length, 7);
  for (const { start_date } of rows) {
    assert.equal(typeof start_date, 'string');
    assert.match(start_date, /^\d{4}-\d{2}-\d{2}$/);
  }
  const a6 = await pool.query('SELECT start_date FROM todos WHERE id = $1', [ids['TODO-A6']]);
  assert.equal(a6.rows[0].start_date, getTodayKst());
});

test('BE-02 AppError와 예상치 못한 예외를 errorHandler가 { error: { code, message } }로 변환한다', async (t) => {
  t.mock.method(console, 'error', () => {});
  const app = express();
  app.get('/x', () => { throw new AppError(400, 'X', 'msg'); });
  app.get('/boom', () => { throw new Error('SELECT password_hash FROM users secret'); });
  app.use(errorHandler);
  const s = app.listen(0, '127.0.0.1');
  await new Promise((resolve) => s.once('listening', resolve));
  const base = `http://127.0.0.1:${s.address().port}`;
  try {
    const x = await fetch(`${base}/x`);
    assert.equal(x.status, 400);
    assert.deepEqual(await x.json(), { error: { code: 'X', message: 'msg' } });

    const boom = await fetch(`${base}/boom`);
    assert.equal(boom.status, 500);
    const text = await boom.text();
    assert.deepEqual(JSON.parse(text), { error: { code: 'INTERNAL_ERROR', message: '서버 오류가 발생했습니다.' } });
    for (const leak of ['SELECT', 'password_hash', 'secret', 'stack', 'at ']) {
      assert.ok(!text.includes(leak), `응답에 ${leak} 포함`);
    }
  } finally {
    s.closeAllConnections();
    await new Promise((resolve) => s.close(resolve));
  }
});

test('BE-02 잘못된 JSON 본문은 400 VALIDATION_ERROR', async () => {
  const res = await fetch(`${server.baseUrl}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: '{bad',
  });
  assert.equal(res.status, 400);
  assert.equal((await res.json()).error.code, 'VALIDATION_ERROR');
});

test('BE-03 resetAndSeed()를 두 번 호출해도 users 2, categories 4, todos 7', async () => {
  await resetAndSeed();
  await resetAndSeed();
  assert.deepEqual(await counts(), { users: 2, categories: 4, todos: 7 });
});

test('BE-03 반환 맵으로 USER·CAT·TODO 13개 라벨의 id를 조회할 수 있다', async () => {
  const ids = await resetAndSeed();
  const expected = {
    users: ['USER-A', 'USER-B'],
    categories: ['CAT-A-기본', 'CAT-A-업무', 'CAT-A-개인', 'CAT-B-기본'],
    todos: ['TODO-A1', 'TODO-A2', 'TODO-A3', 'TODO-A4', 'TODO-A5', 'TODO-A6', 'TODO-B1'],
  };
  assert.equal(Object.keys(ids).length, 13);
  for (const [table, labels] of Object.entries(expected)) {
    for (const label of labels) {
      const { rowCount } = await pool.query(`SELECT 1 FROM ${table} WHERE id = $1`, [ids[label]]);
      assert.equal(rowCount, 1, label);
    }
  }
  const titles = await pool.query('SELECT id, title FROM todos');
  for (const { id, title } of titles.rows) assert.equal(ids[title], id);
});

test('Health: /api/health는 DB 연결이 정상이면 인증 없이 200 { status: ok, db: ok }다', async () => {
  const res = await fetch(`${server.baseUrl}/api/health`);
  assert.equal(res.status, 200);
  assert.deepEqual(await res.json(), { status: 'ok', db: 'ok' });
});

test('Health: DB 쿼리가 실패하면 503 { status: error, db: error }이고 오류 원문을 노출하지 않는다', async () => {
  const original = pool.query;
  pool.query = () => Promise.reject(new Error('connect ECONNREFUSED secret-host'));
  try {
    const res = await fetch(`${server.baseUrl}/api/health`);
    assert.equal(res.status, 503);
    const text = await res.text();
    assert.deepEqual(JSON.parse(text), { status: 'error', db: 'error' });
    assert.doesNotMatch(text, /secret-host/);
  } finally {
    pool.query = original;
  }
});

test('BE-03 fixtures.js가 날짜를 하드코딩하지 않는다', () => {
  const src = fs.readFileSync(path.join(__dirname, 'fixtures.js'), 'utf8');
  assert.doesNotMatch(src, /\d{4}-\d{2}-\d{2}/);
});

test('Swagger UI: /api-docs는 HTML, /api-docs/swagger.yaml은 OpenAPI 명세를 인증 없이 반환한다', async () => {
  const ui = await fetch(`${server.baseUrl}/api-docs`);
  assert.equal(ui.status, 200);
  assert.match(ui.headers.get('content-type'), /text\/html/);
  assert.match(await ui.text(), /SwaggerUIBundle/);

  const spec = await fetch(`${server.baseUrl}/api-docs/swagger.yaml`);
  assert.equal(spec.status, 200);
  assert.match(await spec.text(), /^openapi: 3\./);
});

test('Swagger UI: NODE_ENV=production이면 /api-docs가 등록되지 않는다(404)', async () => {
  const srcDir = path.join(__dirname, '..', 'src');
  const reload = () => {
    for (const k of Object.keys(require.cache)) if (k.startsWith(srcDir) && !k.includes(`${path.sep}db${path.sep}`)) delete require.cache[k];
  };
  const prev = process.env.NODE_ENV;
  process.env.NODE_ENV = 'production';
  reload();
  const s = require('../src/app').listen(0, '127.0.0.1');
  await new Promise((resolve) => s.once('listening', resolve));
  try {
    const res = await fetch(`http://127.0.0.1:${s.address().port}/api-docs`);
    assert.equal(res.status, 404);
  } finally {
    s.closeAllConnections();
    await new Promise((resolve) => s.close(resolve));
    if (prev === undefined) delete process.env.NODE_ENV; else process.env.NODE_ENV = prev;
    reload();
  }
});
