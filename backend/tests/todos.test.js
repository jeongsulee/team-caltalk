const { test, before, beforeEach, after } = require('node:test');
const assert = require('node:assert/strict');
const { pool, resetAndSeed, startServer, api, tokenFor, kstDate } = require('./fixtures');

let server, ids, tokenA, tokenB;
before(async () => { server = await startServer(); });
beforeEach(async () => { ids = await resetAndSeed(); tokenA = tokenFor(ids['USER-A']); tokenB = tokenFor(ids['USER-B']); });
after(async () => { await server.close(); await pool.end(); });

const n = (label) => Number(ids[label]);
const idsOf = (...labels) => labels.map(n);
const call = (method, path, opts) => api(server.baseUrl, method, path, opts);
const listIds = async (query = '', token = tokenA) => {
  const res = await call('GET', `/api/todos${query}`, { token });
  assert.equal(res.status, 200, query);
  return res.body.map((t) => t.id);
};

// 거부 테스트용 DB 스냅샷 (id는 pg 문자열 그대로)
async function snapshot() {
  const { rows } = await pool.query(
    `SELECT id, user_id, category_id, title, start_date::text AS start_date, end_date::text AS end_date, is_completed
     FROM todos ORDER BY id`
  );
  return rows;
}

// ---------- BE-11 ----------

test('BE-11 S-04 BR-05 제목만 등록 → 201, startDate=endDate=D+7, isCompleted=false, 소유자 USER-A', async () => {
  const d7 = await kstDate(7);
  const res = await call('POST', '/api/todos', { token: tokenA, body: { title: '  새 할일  ' } });
  assert.equal(res.status, 201);
  assert.equal(res.body.title, '새 할일');
  assert.equal(res.body.startDate, d7);
  assert.equal(res.body.endDate, d7);
  assert.equal(res.body.isCompleted, false);
  assert.equal(res.body.status, 'upcoming');

  const { rows } = await pool.query('SELECT user_id FROM todos WHERE id = $1', [res.body.id]);
  assert.equal(rows[0].user_id, ids['USER-A']);
});

test('BE-11 E-04 BR-03 categoryId 없이 등록하면 USER-A의 기본 카테고리로 저장된다', async () => {
  const res = await call('POST', '/api/todos', { token: tokenA, body: { title: '미지정', categoryId: null } });
  assert.equal(res.status, 201);
  assert.equal(res.body.categoryId, n('CAT-A-기본'));
  const { rows } = await pool.query('SELECT category_id FROM todos WHERE id = $1', [res.body.id]);
  assert.equal(rows[0].category_id, ids['CAT-A-기본']);
});

test('BE-11 BR-05 startDate만 전달하면 endDate=startDate, 본인 categoryId 지정 시 그 카테고리', async () => {
  const d1 = await kstDate(1);
  const res = await call('POST', '/api/todos', {
    token: tokenA, body: { title: '업무 할일', categoryId: n('CAT-A-업무'), startDate: d1 },
  });
  assert.equal(res.status, 201);
  assert.equal(res.body.startDate, d1);
  assert.equal(res.body.endDate, d1);
  assert.equal(res.body.categoryId, n('CAT-A-업무'));
});

test('BE-11 E-03 BR-04 startDate=D+3, endDate=D+2 → 400이고 todos 불변', async () => {
  const before = await snapshot();
  const res = await call('POST', '/api/todos', {
    token: tokenA, body: { title: '역전', startDate: await kstDate(3), endDate: await kstDate(2) },
  });
  assert.equal(res.status, 400);
  assert.equal(res.body.error.code, 'VALIDATION_ERROR');
  assert.deepEqual(await snapshot(), before);
});

test('BE-11 E-03 BR-05 endDate만 D+7보다 이르게 보내면 400이고 todos 불변', async () => {
  const before = await snapshot();
  const res = await call('POST', '/api/todos', { token: tokenA, body: { title: '종료만', endDate: await kstDate(6) } });
  assert.equal(res.status, 400);
  assert.equal(res.body.error.code, 'VALIDATION_ERROR');
  assert.deepEqual(await snapshot(), before);
});

test('BE-11 E-03 같은 날(startDate = endDate) 등록은 201', async () => {
  const d2 = await kstDate(2);
  const res = await call('POST', '/api/todos', { token: tokenA, body: { title: '하루', startDate: d2, endDate: d2 } });
  assert.equal(res.status, 201);
  assert.equal(res.body.startDate, d2);
  assert.equal(res.body.endDate, d2);
});

test('BE-11 BR-02 USER-B 소유 categoryId·없는 categoryId로 등록하면 404이고 todos 불변', async () => {
  const before = await snapshot();
  for (const categoryId of [n('CAT-B-기본'), 999999]) {
    const res = await call('POST', '/api/todos', { token: tokenA, body: { title: '침범', categoryId } });
    assert.equal(res.status, 404, String(categoryId));
    assert.equal(res.body.error.code, 'NOT_FOUND');
  }
  assert.deepEqual(await snapshot(), before);
});

test('BE-11 BR-02 본문 userId는 무시되고 토큰 사용자(USER-A) 소유로 저장된다', async () => {
  const res = await call('POST', '/api/todos', { token: tokenA, body: { title: '위장', userId: n('USER-B') } });
  assert.equal(res.status, 201);
  const { rows } = await pool.query('SELECT user_id, category_id FROM todos WHERE id = $1', [res.body.id]);
  assert.deepEqual(rows[0], { user_id: ids['USER-A'], category_id: ids['CAT-A-기본'] });
});

test('BE-11 제목 누락·형식 오류, 날짜 형식 오류·없는 날짜, 문자열 categoryId는 400이고 DB 불변', async () => {
  const before = await snapshot();
  const bodies = [
    {},
    { title: '' },
    { title: '   ' },
    { title: 1 },
    { title: 'a'.repeat(201) },
    { title: 't', startDate: '20261001' },
    { title: 't', endDate: 'tomorrow' },
    { title: 't', startDate: '2026-02-30' },
    { title: 't', categoryId: String(ids['CAT-A-업무']) },
  ];
  for (const body of bodies) {
    const res = await call('POST', '/api/todos', { token: tokenA, body });
    assert.equal(res.status, 400, JSON.stringify(body));
    assert.equal(res.body.error.code, 'VALIDATION_ERROR', JSON.stringify(body));
  }
  assert.deepEqual(await snapshot(), before);
});

// ---------- BE-12 ----------

test('BE-12 S-07 BR-02 USER-A 목록은 A1~A6 6건만(start_date·id 순), B1 없음', async () => {
  assert.deepEqual(await listIds(), idsOf('TODO-A4', 'TODO-A5', 'TODO-A3', 'TODO-A2', 'TODO-A6', 'TODO-A1'));
});

test('BE-12 E-06 BR-08 status: A1 upcoming, A2·A3·A6 in_progress, A4 overdue, A5 completed', async () => {
  const res = await call('GET', '/api/todos', { token: tokenA });
  const statusById = Object.fromEntries(res.body.map((t) => [t.id, t.status]));
  assert.deepEqual(statusById, {
    [n('TODO-A1')]: 'upcoming',
    [n('TODO-A2')]: 'in_progress',
    [n('TODO-A3')]: 'in_progress',
    [n('TODO-A4')]: 'overdue',
    [n('TODO-A5')]: 'completed',
    [n('TODO-A6')]: 'in_progress',
  });
});

test('BE-12 E-05 BR-02 타인 할일(B1) 조회는 404이고 B1 내용이 없다, 없는 id·형식 오류 id도 404', async () => {
  const res = await call('GET', `/api/todos/${ids['TODO-B1']}`, { token: tokenA });
  assert.equal(res.status, 404);
  assert.equal(res.body.error.code, 'NOT_FOUND');
  assert.ok(!JSON.stringify(res.body).includes('TODO-B1'));

  for (const id of ['999999', 'abc']) {
    const other = await call('GET', `/api/todos/${id}`, { token: tokenA });
    assert.equal(other.status, 404, id);
    assert.equal(other.body.error.code, 'NOT_FOUND', id);
  }
});

test('BE-12 BR-02 USER-B 토큰 목록에는 B1만 있다', async () => {
  assert.deepEqual(await listIds('', tokenB), idsOf('TODO-B1'));
});

test('BE-12 응답 필드는 camelCase 7개, 날짜 YYYY-MM-DD, status 영문 코드', async () => {
  const list = await call('GET', '/api/todos', { token: tokenA });
  for (const todo of list.body) {
    assert.deepEqual(Object.keys(todo).sort(), ['categoryId', 'endDate', 'id', 'isCompleted', 'startDate', 'status', 'title']);
  }

  const one = await call('GET', `/api/todos/${ids['TODO-A1']}`, { token: tokenA });
  assert.equal(one.status, 200);
  assert.deepEqual(one.body, {
    id: n('TODO-A1'),
    title: 'TODO-A1',
    categoryId: n('CAT-A-업무'),
    startDate: await kstDate(3),
    endDate: await kstDate(5),
    isCompleted: false,
    status: 'upcoming',
  });
});

// ---------- BE-13 ----------

test('BE-13 원칙 1-5 각 status 필터 결과가 판단 함수(status 필드) 결과와 일치한다', async () => {
  const all = (await call('GET', '/api/todos', { token: tokenA })).body;
  const expected = {
    upcoming: idsOf('TODO-A1'),
    in_progress: idsOf('TODO-A3', 'TODO-A2', 'TODO-A6'),
    completed: idsOf('TODO-A5'),
    overdue: idsOf('TODO-A4'),
  };
  for (const [status, want] of Object.entries(expected)) {
    const got = await listIds(`?status=${status}`);
    assert.deepEqual(got, want, status);
    assert.deepEqual(got, all.filter((t) => t.status === status).map((t) => t.id), status);
  }
});

test('BE-13 E-07 status=overdue → A4만, A5(완료)는 제외', async () => {
  assert.deepEqual(await listIds('?status=overdue'), idsOf('TODO-A4'));
});

test('BE-13 E-08 필터 조합: 업무+in_progress={A2}, 업무+overdue={A4}, 업무+completed=[]', async () => {
  const cat = ids['CAT-A-업무'];
  assert.deepEqual(await listIds(`?categoryId=${cat}&status=in_progress`), idsOf('TODO-A2'));
  assert.deepEqual(await listIds(`?categoryId=${cat}&status=overdue`), idsOf('TODO-A4'));
  assert.deepEqual(await listIds(`?categoryId=${cat}&status=completed`), []);
});

test('BE-13 S-08 categoryId=개인만 → {A3, A5}, 필터 없음 → 6건', async () => {
  assert.deepEqual((await listIds(`?categoryId=${ids['CAT-A-개인']}`)).sort(), idsOf('TODO-A3', 'TODO-A5').sort());
  assert.equal((await listIds()).length, 6);
});

test('BE-13 허용되지 않는 status 값·잘못된 쿼리 형식은 400', async () => {
  for (const query of ['?status=done', '?status=', '?status=overdue&status=completed', '?categoryId=abc', '?categoryId=0', '?categoryId=']) {
    const res = await call('GET', `/api/todos${query}`, { token: tokenA });
    assert.equal(res.status, 400, query);
    assert.equal(res.body.error.code, 'VALIDATION_ERROR', query);
  }
});

test('BE-13 BR-02 USER-A가 USER-B의 categoryId로 필터하면 200 []', async () => {
  assert.deepEqual(await listIds(`?categoryId=${ids['CAT-B-기본']}`), []);
});

// ---------- BE-14 ----------

test('BE-14 S-05 A2의 제목·카테고리·날짜 수정 → 200, 재조회 시 반영', async () => {
  const expected = {
    id: n('TODO-A2'),
    title: '수정된 제목',
    categoryId: n('CAT-A-개인'),
    startDate: await kstDate(1),
    endDate: await kstDate(4),
    isCompleted: false,
    status: 'upcoming',
  };
  const res = await call('PATCH', `/api/todos/${ids['TODO-A2']}`, {
    token: tokenA,
    body: { title: '수정된 제목', categoryId: n('CAT-A-개인'), startDate: expected.startDate, endDate: expected.endDate },
  });
  assert.equal(res.status, 200);
  assert.deepEqual(res.body, expected);

  const again = await call('GET', `/api/todos/${ids['TODO-A2']}`, { token: tokenA });
  assert.deepEqual(again.body, expected);
});

test('BE-14 E-03 BR-04 수정 시 종료일자 < 시작일자 → 400이고 기존 값 불변', async () => {
  const before = await snapshot();
  const res = await call('PATCH', `/api/todos/${ids['TODO-A2']}`, { token: tokenA, body: { endDate: await kstDate(-1) } });
  assert.equal(res.status, 400);
  assert.equal(res.body.error.code, 'VALIDATION_ERROR');
  assert.deepEqual(await snapshot(), before);
});

test('BE-14 E-03 BR-04 시작일자만 기존 종료일자(D+2)보다 늦게 바꾸면 400이고 불변', async () => {
  const before = await snapshot();
  const res = await call('PATCH', `/api/todos/${ids['TODO-A2']}`, { token: tokenA, body: { startDate: await kstDate(3) } });
  assert.equal(res.status, 400);
  assert.equal(res.body.error.code, 'VALIDATION_ERROR');
  assert.deepEqual(await snapshot(), before);
});

test('BE-14 E-03 수정 결과가 같은 날이면 200', async () => {
  const d2 = await kstDate(2);
  const res = await call('PATCH', `/api/todos/${ids['TODO-A2']}`, { token: tokenA, body: { startDate: d2 } });
  assert.equal(res.status, 200);
  assert.equal(res.body.startDate, d2);
  assert.equal(res.body.endDate, d2);
});

test('BE-14 E-05 BR-02 타인 할일(B1) 수정은 404이고 B1 불변', async () => {
  const before = await snapshot();
  const res = await call('PATCH', `/api/todos/${ids['TODO-B1']}`, { token: tokenA, body: { title: '탈취', isCompleted: true } });
  assert.equal(res.status, 404);
  assert.equal(res.body.error.code, 'NOT_FOUND');
  assert.deepEqual(await snapshot(), before);
});

test('BE-14 E-05 BR-02 타인 할일(B1) 삭제는 404이고 B1이 그대로 존재', async () => {
  const before = await snapshot();
  const res = await call('DELETE', `/api/todos/${ids['TODO-B1']}`, { token: tokenA });
  assert.equal(res.status, 404);
  assert.equal(res.body.error.code, 'NOT_FOUND');
  assert.deepEqual(await snapshot(), before);
});

test('BE-14 S-06 A2 삭제 → 204, 목록에서 사라지고 다른 할일은 불변', async () => {
  const before = await snapshot();
  const res = await call('DELETE', `/api/todos/${ids['TODO-A2']}`, { token: tokenA });
  assert.equal(res.status, 204);
  assert.equal(res.body, null);

  assert.deepEqual(await snapshot(), before.filter((t) => t.id !== ids['TODO-A2']));
  assert.deepEqual(await listIds(), idsOf('TODO-A4', 'TODO-A5', 'TODO-A3', 'TODO-A6', 'TODO-A1'));
});

test('BE-14 E-06 BR-12 isCompleted true → completed, false로 되돌리면 날짜 기준 재계산(A4 overdue, A2 in_progress)', async () => {
  for (const [label, restored] of [['TODO-A4', 'overdue'], ['TODO-A2', 'in_progress']]) {
    const path = `/api/todos/${ids[label]}`;
    const done = await call('PATCH', path, { token: tokenA, body: { isCompleted: true } });
    assert.equal(done.status, 200);
    assert.equal(done.body.isCompleted, true);
    assert.equal((await call('GET', path, { token: tokenA })).body.status, 'completed', label);

    const undone = await call('PATCH', path, { token: tokenA, body: { isCompleted: false } });
    assert.equal(undone.status, 200);
    assert.equal((await call('GET', path, { token: tokenA })).body.status, restored, label);
  }
});

test('BE-14 BR-02 타인 소유·없는 categoryId로 수정하면 404이고 할일 불변', async () => {
  const before = await snapshot();
  for (const categoryId of [n('CAT-B-기본'), 999999]) {
    const res = await call('PATCH', `/api/todos/${ids['TODO-A2']}`, { token: tokenA, body: { categoryId } });
    assert.equal(res.status, 404, String(categoryId));
    assert.equal(res.body.error.code, 'NOT_FOUND');
  }
  assert.deepEqual(await snapshot(), before);
});

test('BE-14 수정 형식 오류(null·빈 제목·문자열 isCompleted·없는 날짜)는 400, 없는 id·형식 오류 id는 404, 모두 DB 불변', async () => {
  const before = await snapshot();
  for (const body of [{ title: null }, { title: '  ' }, { isCompleted: 'true' }, { startDate: '2026-02-30' }, { categoryId: 1.5 }]) {
    const res = await call('PATCH', `/api/todos/${ids['TODO-A2']}`, { token: tokenA, body });
    assert.equal(res.status, 400, JSON.stringify(body));
    assert.equal(res.body.error.code, 'VALIDATION_ERROR', JSON.stringify(body));
  }
  for (const [method, id] of [['PATCH', '999999'], ['PATCH', 'abc'], ['DELETE', '999999'], ['DELETE', 'abc']]) {
    const res = await call(method, `/api/todos/${id}`, { token: tokenA, body: method === 'PATCH' ? { title: 'x' } : undefined });
    assert.equal(res.status, 404, `${method} ${id}`);
    assert.equal(res.body.error.code, 'NOT_FOUND');
  }
  assert.deepEqual(await snapshot(), before);
});

test('BE-14 빈 본문 {} 수정은 200이고 현재 값 그대로 반환', async () => {
  const res = await call('PATCH', `/api/todos/${ids['TODO-A2']}`, { token: tokenA, body: {} });
  assert.equal(res.status, 200);
  assert.deepEqual(res.body, {
    id: n('TODO-A2'),
    title: 'TODO-A2',
    categoryId: n('CAT-A-업무'),
    startDate: await kstDate(0),
    endDate: await kstDate(2),
    isCompleted: false,
    status: 'in_progress',
  });
});
