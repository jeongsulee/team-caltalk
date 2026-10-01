const { test, before, beforeEach, after } = require('node:test');
const assert = require('node:assert/strict');
const { pool, resetAndSeed, startServer, api, tokenFor } = require('./fixtures');

let server, ids, tokenA, tokenB;
before(async () => { server = await startServer(); });
beforeEach(async () => { ids = await resetAndSeed(); tokenA = tokenFor(ids['USER-A']); tokenB = tokenFor(ids['USER-B']); });
after(async () => { await server.close(); await pool.end(); });

const n = (label) => Number(ids[label]);
const call = (method, path, opts) => api(server.baseUrl, method, path, opts);

// 거부 테스트용 DB 스냅샷 (id는 pg 문자열 그대로)
async function snapshot() {
  const categories = await pool.query('SELECT id, user_id, name FROM categories ORDER BY id');
  const todos = await pool.query(
    `SELECT id, user_id, category_id, title, start_date::text AS start_date, end_date::text AS end_date, is_completed
     FROM todos ORDER BY id`
  );
  return { categories: categories.rows, todos: todos.rows };
}

// ---------- BE-09 ----------

test('BE-09 S-09 카테고리 목록: USER-A는 기본·업무·개인 3건만(id 오름차순), USER-B의 기본은 없다', async () => {
  const res = await call('GET', '/api/categories', { token: tokenA });
  assert.equal(res.status, 200);
  assert.deepEqual(res.body, [
    { id: n('CAT-A-기본'), name: '기본' },
    { id: n('CAT-A-업무'), name: '업무' },
    { id: n('CAT-A-개인'), name: '개인' },
  ]);
});

test('BE-09 S-09 카테고리 생성: 201, USER-A 소유로 저장되고 목록에 나타난다', async () => {
  const res = await call('POST', '/api/categories', { token: tokenA, body: { name: '  공부  ' } });
  assert.equal(res.status, 201);
  assert.equal(res.body.name, '공부');
  assert.equal(typeof res.body.id, 'number');

  const { rows } = await pool.query('SELECT user_id, name FROM categories WHERE id = $1', [res.body.id]);
  assert.deepEqual(rows, [{ user_id: ids['USER-A'], name: '공부' }]);

  const list = await call('GET', '/api/categories', { token: tokenA });
  assert.deepEqual(list.body.at(-1), { id: res.body.id, name: '공부' });
});

test('BE-09 S-09 카테고리 수정: 개인 이름 수정 → 200, 재조회 시 반영, 같은 이름으로 수정도 200', async () => {
  const res = await call('PATCH', `/api/categories/${ids['CAT-A-개인']}`, { token: tokenA, body: { name: '취미' } });
  assert.equal(res.status, 200);
  assert.deepEqual(res.body, { id: n('CAT-A-개인'), name: '취미' });

  const list = await call('GET', '/api/categories', { token: tokenA });
  assert.deepEqual(list.body.find((c) => c.id === n('CAT-A-개인')), { id: n('CAT-A-개인'), name: '취미' });

  const same = await call('PATCH', `/api/categories/${ids['CAT-A-개인']}`, { token: tokenA, body: { name: '취미' } });
  assert.equal(same.status, 200);
});

test('BE-09 BR-02 타인 카테고리(USER-B 기본) 수정 요청은 404이고 DB 불변', async () => {
  const before = await snapshot();
  const res = await call('PATCH', `/api/categories/${ids['CAT-B-기본']}`, { token: tokenA, body: { name: '탈취' } });
  assert.equal(res.status, 404);
  assert.equal(res.body.error.code, 'NOT_FOUND');
  assert.deepEqual(await snapshot(), before);
});

test('BE-09 없는 id·형식이 아닌 id 수정 요청은 404이고 DB 불변', async () => {
  const before = await snapshot();
  for (const id of ['999999', 'abc', '0']) {
    const res = await call('PATCH', `/api/categories/${id}`, { token: tokenA, body: { name: '새이름' } });
    assert.equal(res.status, 404, id);
    assert.equal(res.body.error.code, 'NOT_FOUND', id);
  }
  assert.deepEqual(await snapshot(), before);
});

test('BE-09 BR-11 빈 이름·공백만·누락·101자는 생성·수정 모두 400이고 DB 불변', async () => {
  const before = await snapshot();
  for (const body of [{}, { name: '' }, { name: '   ' }, { name: 123 }, { name: 'a'.repeat(101) }]) {
    const created = await call('POST', '/api/categories', { token: tokenA, body });
    assert.equal(created.status, 400, JSON.stringify(body));
    assert.equal(created.body.error.code, 'VALIDATION_ERROR');

    const updated = await call('PATCH', `/api/categories/${ids['CAT-A-개인']}`, { token: tokenA, body });
    assert.equal(updated.status, 400, JSON.stringify(body));
    assert.equal(updated.body.error.code, 'VALIDATION_ERROR');
  }
  assert.deepEqual(await snapshot(), before);
});

test('BE-09 BR-11 같은 사용자의 기존 이름(업무·기본·" 업무 ")으로 생성하면 409이고 DB 불변', async () => {
  const before = await snapshot();
  for (const name of ['업무', '기본', ' 업무 ']) {
    const res = await call('POST', '/api/categories', { token: tokenA, body: { name } });
    assert.equal(res.status, 409, name);
    assert.equal(res.body.error.code, 'CATEGORY_NAME_DUPLICATED');
  }
  assert.deepEqual(await snapshot(), before);
});

test('BE-09 BR-11 개인을 기존 이름 업무로 수정하면 409이고 DB 불변', async () => {
  const before = await snapshot();
  const res = await call('PATCH', `/api/categories/${ids['CAT-A-개인']}`, { token: tokenA, body: { name: '업무' } });
  assert.equal(res.status, 409);
  assert.equal(res.body.error.code, 'CATEGORY_NAME_DUPLICATED');
  assert.deepEqual(await snapshot(), before);
});

test('BE-09 BR-11 다른 사용자와 같은 이름은 허용: USER-B가 업무 생성 → 201', async () => {
  const res = await call('POST', '/api/categories', { token: tokenB, body: { name: '업무' } });
  assert.equal(res.status, 201);
  const { rows } = await pool.query('SELECT user_id FROM categories WHERE id = $1', [res.body.id]);
  assert.equal(rows[0].user_id, ids['USER-B']);
});

test('BE-09 E-10 BR-10 기본 카테고리 수정 요청은 400 DEFAULT_CATEGORY_PROTECTED이고 DB 불변', async () => {
  const before = await snapshot();
  const res = await call('PATCH', `/api/categories/${ids['CAT-A-기본']}`, { token: tokenA, body: { name: '새이름' } });
  assert.equal(res.status, 400);
  assert.equal(res.body.error.code, 'DEFAULT_CATEGORY_PROTECTED');
  assert.deepEqual(await snapshot(), before);
});

// ---------- BE-10 ----------

test('BE-10 E-09 BR-09 업무 삭제 → 204, A1·A2·A4는 기본으로 이동, todos 7건 유지, 나머지 불변, Client release', async () => {
  const before = await snapshot();
  const res = await call('DELETE', `/api/categories/${ids['CAT-A-업무']}`, { token: tokenA });
  assert.equal(res.status, 204);
  assert.equal(res.body, null);

  const moved = ['TODO-A1', 'TODO-A2', 'TODO-A4'].map((l) => ids[l]);
  const expected = {
    categories: before.categories.filter((c) => c.id !== ids['CAT-A-업무']),
    todos: before.todos.map((t) => (moved.includes(t.id) ? { ...t, category_id: ids['CAT-A-기본'] } : t)),
  };
  const after = await snapshot();
  assert.deepEqual(after, expected); // A3·A5·A6·B1, 다른 카테고리, USER-B 데이터 불변 포함
  assert.equal(after.todos.length, 7);
  assert.equal(pool.totalCount, pool.idleCount);
});

test('BE-10 BR-02 타인 카테고리(USER-B 기본) 삭제 요청은 404이고 카테고리·할일 불변', async () => {
  const before = await snapshot();
  const res = await call('DELETE', `/api/categories/${ids['CAT-B-기본']}`, { token: tokenA });
  assert.equal(res.status, 404);
  assert.equal(res.body.error.code, 'NOT_FOUND');
  assert.deepEqual(await snapshot(), before);
});

test('BE-10 E-10 BR-10 기본 카테고리 삭제 요청은 400 DEFAULT_CATEGORY_PROTECTED이고 DB 불변', async () => {
  const before = await snapshot();
  const res = await call('DELETE', `/api/categories/${ids['CAT-A-기본']}`, { token: tokenA });
  assert.equal(res.status, 400);
  assert.equal(res.body.error.code, 'DEFAULT_CATEGORY_PROTECTED');
  assert.deepEqual(await snapshot(), before);
});

test('BE-10 BR-09 트랜잭션 중간(DELETE 단계) 실패 시 롤백되어 할일 이동도 취소되고 Client release', async () => {
  const before = await snapshot();
  await pool.query(`CREATE FUNCTION test_fail_category_delete() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'forced'; END $$`);
  try {
    await pool.query(`CREATE TRIGGER test_fail_category_delete BEFORE DELETE ON categories FOR EACH ROW EXECUTE FUNCTION test_fail_category_delete()`);
    const res = await call('DELETE', `/api/categories/${ids['CAT-A-업무']}`, { token: tokenA });
    assert.equal(res.status, 500);
    assert.equal(res.body.error.code, 'INTERNAL_ERROR');
    assert.deepEqual(await snapshot(), before); // 업무 존재, A1·A2·A4 category_id 원상태, todos 7건
    assert.equal(pool.totalCount, pool.idleCount);
  } finally {
    await pool.query('DROP TRIGGER IF EXISTS test_fail_category_delete ON categories');
    await pool.query('DROP FUNCTION IF EXISTS test_fail_category_delete()');
  }
});
