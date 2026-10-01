// BE-05 회원가입, BE-06 로그인·재발급, BE-07 인증 미들웨어, BE-08 내 정보
const { test, before, beforeEach, after } = require('node:test');
const assert = require('node:assert/strict');
const util = require('node:util');
const jwt = require('jsonwebtoken');
const config = require('../src/config');
const { authenticate } = require('../src/middlewares/auth');
const { pool, resetAndSeed, startServer, api, tokenFor, TEST_PASSWORD } = require('./fixtures');

const EMAIL_A = 'user-a@example.com';
const NEW_USER = { email: 'new-user@example.com', password: 'new-password-1', name: '신규사용자' };
const HASH_MARKERS = ['$2b$', 'passwordHash', 'password_hash'];

let server, ids, tokenA;
before(async () => { server = await startServer(); });
beforeEach(async () => { ids = await resetAndSeed(); tokenA = tokenFor(ids['USER-A']); });
after(async () => { await server.close(); await pool.end(); });

async function snapshot() {
  const users = await pool.query('SELECT id, email, name, password_hash FROM users ORDER BY id');
  const categories = await pool.query('SELECT id, user_id, name FROM categories ORDER BY id');
  const todos = await pool.query(
    'SELECT id, user_id, category_id, title, start_date::text, end_date::text, is_completed FROM todos ORDER BY id'
  );
  return { users: users.rows, categories: categories.rows, todos: todos.rows };
}

const login = (email, password) => api(server.baseUrl, 'POST', '/api/auth/login', { body: { email, password } });
const refresh = (body) => api(server.baseUrl, 'POST', '/api/auth/refresh', { body });
const expiredToken = (secret) =>
  jwt.sign({ sub: String(ids['USER-A']), exp: Math.floor(Date.now() / 1000) - 60 }, secret);
const forgedToken = () => jwt.sign({ sub: String(ids['USER-A']) }, 'wrong-secret', { expiresIn: '15m' });

function assertNoHash(value) {
  const text = typeof value === 'string' ? value : JSON.stringify(value);
  for (const m of HASH_MARKERS) assert.ok(!text.includes(m), `${m} 포함`);
}

// ---------- BE-05 회원가입 ----------

test('BE-05 S-01 회원가입: 201, users +1, 해시 저장, 응답은 id/email/name만(토큰·비밀번호 없음)', async () => {
  const snap = await snapshot();
  const res = await api(server.baseUrl, 'POST', '/api/auth/signup', { body: NEW_USER });

  assert.equal(res.status, 201);
  assert.deepEqual(Object.keys(res.body).sort(), ['email', 'id', 'name']);
  assert.equal(typeof res.body.id, 'number');
  assert.equal(res.body.email, NEW_USER.email);
  assert.equal(res.body.name, NEW_USER.name);
  assertNoHash(res.body);

  const snapAfter = await snapshot();
  assert.equal(snapAfter.users.length, snap.users.length + 1);
  const { rows } = await pool.query('SELECT password_hash FROM users WHERE email = $1', [NEW_USER.email]);
  assert.equal(rows.length, 1);
  assert.notEqual(rows[0].password_hash, NEW_USER.password);
});

test('BE-05 S-01 BR-03 가입 직후 해당 사용자의 \'기본\' 카테고리가 1건 존재한다', async () => {
  const res = await api(server.baseUrl, 'POST', '/api/auth/signup', { body: NEW_USER });
  assert.equal(res.status, 201);
  const { rows } = await pool.query('SELECT name FROM categories WHERE user_id = $1', [res.body.id]);
  assert.deepEqual(rows, [{ name: '기본' }]);
});

test('BE-05 E-01 BR-07 중복 이메일(대소문자·공백 변형 포함)은 409 EMAIL_DUPLICATED이고 DB 불변', async () => {
  const snap = await snapshot();
  for (const email of [EMAIL_A, 'USER-A@Example.com', ' user-a@example.com ']) {
    const res = await api(server.baseUrl, 'POST', '/api/auth/signup', { body: { email, password: 'pw', name: '중복' } });
    assert.equal(res.status, 409, email);
    assert.equal(res.body.error.code, 'EMAIL_DUPLICATED', email);
  }
  // users 건수 불변 + '기본' 카테고리 생성도 롤백됨
  assert.deepEqual(await snapshot(), snap);
});

test('BE-05 필수값(이메일·비밀번호·이름) 누락·형식 오류는 400 VALIDATION_ERROR이고 DB 불변', async () => {
  const snap = await snapshot();
  const bodies = [
    undefined,
    { password: 'pw', name: '이름' },
    { email: NEW_USER.email, name: '이름' },
    { email: NEW_USER.email, password: 'pw' },
    { email: '', password: 'pw', name: '이름' },
    { email: NEW_USER.email, password: '', name: '이름' },
    { email: NEW_USER.email, password: 'pw', name: '   ' },
    { email: 'not-an-email', password: 'pw', name: '이름' },
    { email: NEW_USER.email, password: 123, name: '이름' },
  ];
  for (const body of bodies) {
    const res = await api(server.baseUrl, 'POST', '/api/auth/signup', { body });
    assert.equal(res.status, 400, JSON.stringify(body));
    assert.equal(res.body.error.code, 'VALIDATION_ERROR', JSON.stringify(body));
  }
  assert.deepEqual(await snapshot(), snap);
});

// ---------- BE-06 로그인·재발급 ----------

test('BE-06 S-02 로그인: 200, accessToken·refreshToken의 sub가 USER-A id', async () => {
  const res = await login(EMAIL_A, TEST_PASSWORD);
  assert.equal(res.status, 200);
  assert.deepEqual(Object.keys(res.body).sort(), ['accessToken', 'refreshToken', 'user']);
  assert.deepEqual(res.body.user, { id: Number(ids['USER-A']), email: EMAIL_A, name: '사용자A' });
  for (const t of [res.body.accessToken, res.body.refreshToken]) {
    const payload = jwt.decode(t);
    assert.equal(payload.sub, ids['USER-A']);
    assert.equal(typeof payload.exp, 'number');
  }
});

test('BE-06 S-02 BR-07 대문자 이메일(USER-A@EXAMPLE.COM)로도 로그인된다', async () => {
  const res = await login('USER-A@EXAMPLE.COM', TEST_PASSWORD);
  assert.equal(res.status, 200);
  assert.equal(res.body.user.email, EMAIL_A);
});

test('BE-06 E-02 틀린 비밀번호와 없는 이메일은 동일한 401 INVALID_CREDENTIALS 응답', async () => {
  const wrongPw = await login(EMAIL_A, 'wrong-password');
  const noUser = await login('nobody@example.com', TEST_PASSWORD);
  const expected = { error: { code: 'INVALID_CREDENTIALS', message: '이메일 또는 비밀번호가 올바르지 않습니다.' } };
  assert.equal(wrongPw.status, 401);
  assert.equal(noUser.status, 401);
  assert.deepEqual(wrongPw.body, expected);
  assert.deepEqual(noUser.body, expected);
});

test('BE-06 로그인 필수값 누락은 400 VALIDATION_ERROR', async () => {
  for (const body of [{}, { email: EMAIL_A }, { email: EMAIL_A, password: '' }, { email: 1, password: TEST_PASSWORD }]) {
    const res = await api(server.baseUrl, 'POST', '/api/auth/login', { body });
    assert.equal(res.status, 400, JSON.stringify(body));
    assert.equal(res.body.error.code, 'VALIDATION_ERROR');
  }
});

test('BE-06 Access는 Refresh 시크릿으로, Refresh는 Access 시크릿으로 검증하면 실패한다', async () => {
  const { body } = await login(EMAIL_A, TEST_PASSWORD);
  assert.equal(jwt.verify(body.accessToken, config.jwtAccessSecret).sub, ids['USER-A']);
  assert.equal(jwt.verify(body.refreshToken, config.jwtRefreshSecret).sub, ids['USER-A']);
  assert.throws(() => jwt.verify(body.accessToken, config.jwtRefreshSecret));
  assert.throws(() => jwt.verify(body.refreshToken, config.jwtAccessSecret));
});

test('BE-06 E-02 유효한 Refresh Token으로 재발급하면 200과 새 accessToken(키 1개)', async () => {
  const { body } = await login(EMAIL_A, TEST_PASSWORD);
  const res = await refresh({ refreshToken: body.refreshToken });
  assert.equal(res.status, 200);
  assert.deepEqual(Object.keys(res.body), ['accessToken']);
  assert.equal(jwt.verify(res.body.accessToken, config.jwtAccessSecret).sub, ids['USER-A']);

  const me = await api(server.baseUrl, 'GET', '/api/users/me', { token: res.body.accessToken });
  assert.equal(me.status, 200);
});

test('BE-06 E-02 위조·만료 Refresh Token, Access Token, 누락·비문자열은 401 UNAUTHORIZED', async () => {
  const { body } = await login(EMAIL_A, TEST_PASSWORD);
  const cases = {
    forged: { refreshToken: forgedToken() },
    expired: { refreshToken: expiredToken(config.jwtRefreshSecret) },
    accessToken: { refreshToken: body.accessToken },
    missing: {},
    notString: { refreshToken: 123 },
  };
  for (const [name, reqBody] of Object.entries(cases)) {
    const res = await refresh(reqBody);
    assert.equal(res.status, 401, name);
    assert.equal(res.body.error.code, 'UNAUTHORIZED', name);
  }
});

test('BE-06 로그인·재발급 응답과 로그에 비밀번호 해시가 없다', async (t) => {
  const logged = [];
  for (const m of ['log', 'info', 'warn', 'error']) {
    t.mock.method(console, m, (...args) => logged.push(args.map((a) => util.inspect(a)).join(' ')));
  }
  const ok = await login(EMAIL_A, TEST_PASSWORD);
  const fail = await login(EMAIL_A, 'wrong-password');
  const re = await refresh({ refreshToken: ok.body.refreshToken });
  assert.equal(ok.status, 200);
  assert.equal(re.status, 200);
  for (const res of [ok, fail, re]) assertNoHash(res.body);
  assertNoHash(logged.join('\n'));
});

// ---------- BE-07 인증 미들웨어 ----------

async function assertUnauthorized(headers, label) {
  const res = await api(server.baseUrl, 'GET', '/api/users/me', { headers });
  assert.equal(res.status, 401, label);
  assert.equal(res.body.error.code, 'UNAUTHORIZED', label);
}

test('BE-07 E-02 미인증 접근: 토큰 없음·위조 토큰·Bearer 형식 아님은 401', async () => {
  await assertUnauthorized(undefined, 'no token');
  await assertUnauthorized({ Authorization: `Bearer ${forgedToken()}` }, 'forged');
  await assertUnauthorized({ Authorization: `Token ${tokenA}` }, 'not Bearer');
});

test('BE-07 E-02 만료 토큰: exp가 지난 Access Token은 401', async () => {
  await assertUnauthorized({ Authorization: `Bearer ${expiredToken(config.jwtAccessSecret)}` }, 'expired');
});

test('BE-07 Refresh Token을 Access 자리에 보내면 401', async () => {
  const { body } = await login(EMAIL_A, TEST_PASSWORD);
  await assertUnauthorized({ Authorization: `Bearer ${body.refreshToken}` }, 'refresh as access');
});

test('BE-07 유효한 Access Token이면 req.user.id가 설정되고 next가 호출된다(단위)', () => {
  const makeReq = (authorization) => ({
    headers: authorization ? { authorization } : {},
    get(name) { return this.headers[name.toLowerCase()]; },
    header(name) { return this.headers[name.toLowerCase()]; },
  });
  const req = makeReq(`Bearer ${tokenA}`);
  let calls = 0;
  authenticate(req, {}, (err) => { assert.equal(err, undefined); calls += 1; });
  assert.equal(calls, 1);
  assert.equal(req.user.id, ids['USER-A']);

  assert.throws(() => authenticate(makeReq(), {}, () => { calls += 1; }), { status: 401, code: 'UNAUTHORIZED' });
  assert.equal(calls, 1);
});

test('BE-07 /api/auth/* 외 모든 보호 경로는 토큰 없이 401이고 DB 불변', async () => {
  const snap = await snapshot();
  const routes = [
    ['GET', '/api/users/me'],
    ['PATCH', '/api/users/me', { name: '무토큰' }],
    ['GET', '/api/categories'],
    ['POST', '/api/categories', { name: '무토큰' }],
    ['PATCH', '/api/categories/1', { name: '무토큰' }],
    ['DELETE', '/api/categories/1'],
    ['GET', '/api/todos'],
    ['POST', '/api/todos', { title: '무토큰' }],
    ['GET', '/api/todos/1'],
    ['PATCH', '/api/todos/1', { title: '무토큰' }],
    ['DELETE', '/api/todos/1'],
  ];
  for (const [method, path, body] of routes) {
    const res = await api(server.baseUrl, method, path, { body });
    assert.equal(res.status, 401, `${method} ${path}`);
    assert.equal(res.body.error.code, 'UNAUTHORIZED', `${method} ${path}`);
  }
  assert.deepEqual(await snapshot(), snap);
});

// ---------- BE-08 내 정보 ----------

test('BE-08 GET /api/users/me는 200과 id/email/name만 반환한다(password_hash 없음)', async () => {
  const res = await api(server.baseUrl, 'GET', '/api/users/me', { token: tokenA });
  assert.equal(res.status, 200);
  assert.deepEqual(res.body, { id: Number(ids['USER-A']), email: EMAIL_A, name: '사용자A' });
  assertNoHash(res.body);
});

test('BE-08 S-03 내 정보 수정: PATCH name → 200, 재조회 시 변경된 이름', async () => {
  const res = await api(server.baseUrl, 'PATCH', '/api/users/me', { token: tokenA, body: { name: '새이름' } });
  assert.equal(res.status, 200);
  assert.deepEqual(res.body, { id: Number(ids['USER-A']), email: EMAIL_A, name: '새이름' });
  assertNoHash(res.body);

  const me = await api(server.baseUrl, 'GET', '/api/users/me', { token: tokenA });
  assert.equal(me.body.name, '새이름');
});

test('BE-08 S-03 본문의 다른 사용자 id·email은 무시되고 USER-B 이름·USER-A 이메일 불변', async () => {
  const res = await api(server.baseUrl, 'PATCH', '/api/users/me', {
    token: tokenA,
    body: { name: '변경', id: Number(ids['USER-B']), userId: Number(ids['USER-B']), email: 'hacker@example.com' },
  });
  assert.equal(res.status, 200);
  assert.deepEqual(res.body, { id: Number(ids['USER-A']), email: EMAIL_A, name: '변경' });

  const { rows } = await pool.query('SELECT id, email, name FROM users ORDER BY id');
  assert.deepEqual(rows, [
    { id: ids['USER-A'], email: EMAIL_A, name: '변경' },
    { id: ids['USER-B'], email: 'user-b@example.com', name: '사용자B' },
  ]);
});

test('BE-08 S-03 name 누락·빈 문자열·공백만·100자 초과는 400이고 DB 불변', async () => {
  const snap = await snapshot();
  for (const body of [undefined, {}, { name: '' }, { name: '   ' }, { name: 'a'.repeat(101) }, { name: 1 }]) {
    const res = await api(server.baseUrl, 'PATCH', '/api/users/me', { token: tokenA, body });
    assert.equal(res.status, 400, JSON.stringify(body));
    assert.equal(res.body.error.code, 'VALIDATION_ERROR', JSON.stringify(body));
  }
  assert.deepEqual(await snapshot(), snap);
});

test('BE-08 BR-01 토큰 없이 GET/PATCH /api/users/me는 401이고 이름 불변', async () => {
  const get = await api(server.baseUrl, 'GET', '/api/users/me');
  const patch = await api(server.baseUrl, 'PATCH', '/api/users/me', { body: { name: '무토큰' } });
  assert.equal(get.status, 401);
  assert.equal(patch.status, 401);
  const { rows } = await pool.query('SELECT name FROM users WHERE id = $1', [ids['USER-A']]);
  assert.equal(rows[0].name, '사용자A');
});

test('BE-08 토큰의 사용자가 DB에 없으면 GET /api/users/me는 404 NOT_FOUND', async () => {
  const res = await api(server.baseUrl, 'GET', '/api/users/me', { token: tokenFor('999999') });
  assert.equal(res.status, 404);
  assert.equal(res.body.error.code, 'NOT_FOUND');
});
