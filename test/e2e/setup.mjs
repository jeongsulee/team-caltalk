// E2E 테스트 데이터 준비 (3-user-scenario.md §3). DB를 비우는 seed 대신 API로 고유 계정을 만든다.
// 실행: node test/e2e/setup.mjs  → 생성된 계정·ID를 JSON으로 출력
const API = 'http://localhost:3000/api';
const PASSWORD = 'password123';
const run = Date.now();

async function call(method, path, body, token) {
  const res = await fetch(API + path, {
    method,
    headers: { 'Content-Type': 'application/json', ...(token && { Authorization: `Bearer ${token}` }) },
    body: body && JSON.stringify(body),
  });
  const data = res.status === 204 ? null : await res.json();
  if (!res.ok) throw new Error(`${method} ${path} ${res.status} ${JSON.stringify(data)}`);
  return data;
}

// KST 오늘(D) 기준 상대 날짜
const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Seoul' }).format(new Date());
const d = (n) => {
  const x = new Date(today + 'T00:00:00Z');
  x.setUTCDate(x.getUTCDate() + n);
  return x.toISOString().slice(0, 10);
};

async function user(label, name) {
  const email = `e2e-${label}-${run}@example.com`;
  await call('POST', '/auth/signup', { email, password: PASSWORD, name });
  const { accessToken } = await call('POST', '/auth/login', { email, password: PASSWORD });
  return { email, token: accessToken };
}

const a = await user('a', '사용자A');
const b = await user('b', '사용자B');

const cats = {};
for (const c of await call('GET', '/categories', null, a.token)) cats[c.name] = c.id;
for (const name of ['업무', '개인']) cats[name] = (await call('POST', '/categories', { name }, a.token)).id;

// [제목, 카테고리, 시작 n, 종료 n, 완료]
const TODOS_A = [
  ['TODO-A1', '업무', 3, 5, false],
  ['TODO-A2', '업무', 0, 2, false],
  ['TODO-A3', '개인', -2, 0, false],
  ['TODO-A4', '업무', -5, -1, false],
  ['TODO-A5', '개인', -5, -1, true],
  ['TODO-A6', '기본', 0, 0, false],
];
for (const [title, cat, s, e, done] of TODOS_A) {
  const todo = await call('POST', '/todos', { title, categoryId: cats[cat], startDate: d(s), endDate: d(e) }, a.token);
  if (done) await call('PATCH', `/todos/${todo.id}`, { isCompleted: true }, a.token);
}
const b1 = await call('POST', '/todos', { title: 'TODO-B1', startDate: d(0), endDate: d(1) }, b.token);

console.log(JSON.stringify({ today, password: PASSWORD, userA: a.email, userB: b.email, todoB1Id: b1.id }, null, 2));
