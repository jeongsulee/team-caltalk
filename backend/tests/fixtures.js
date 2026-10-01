// 통합 테스트 공통 헬퍼 (BE-03)
const config = require('../src/config');

// 테스트 DB 가드: resetAndSeed가 TRUNCATE하므로 _test DB에서만 동작
const dbName = new URL(config.databaseUrl).pathname.slice(1);
if (!dbName.endsWith('_test')) throw new Error(`테스트 DB가 아니다: "${dbName}" (_test로 끝나야 함)`);

const { pool } = require('../src/db/pool');
const { seed, TEST_PASSWORD } = require('../src/db/seed');
const app = require('../src/app');
const { signAccessToken } = require('../src/services/authService');

const resetAndSeed = () => seed(pool);

// D(KST 오늘) 기준 상대 날짜를 DB에서 계산
async function kstDate(offset = 0) {
  const { rows } = await pool.query(
    "SELECT ((now() AT TIME ZONE 'Asia/Seoul')::date + $1::int)::text AS d",
    [offset],
  );
  return rows[0].d;
}

function startServer() {
  return new Promise((resolve) => {
    const server = app.listen(0, '127.0.0.1', () => {
      resolve({
        baseUrl: `http://127.0.0.1:${server.address().port}`,
        close: () => new Promise((done, fail) => {
          server.closeAllConnections();
          server.close((err) => (err ? fail(err) : done()));
        }),
      });
    });
  });
}

async function api(baseUrl, method, path, { token, body, headers } = {}) {
  const h = { ...headers };
  if (body !== undefined) h['Content-Type'] = 'application/json';
  if (token) h.Authorization = `Bearer ${token}`;
  const res = await fetch(baseUrl + path, {
    method,
    headers: h,
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const text = await res.text();
  return { status: res.status, headers: res.headers, body: text === '' ? null : JSON.parse(text) };
}

const tokenFor = (userId) => signAccessToken(userId);

module.exports = { pool, TEST_PASSWORD, resetAndSeed, kstDate, startServer, api, tokenFor };
