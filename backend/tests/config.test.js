// BE-01 프로젝트 셋업·환경설정·앱 골격
const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const net = require('node:net');
const path = require('node:path');
const { spawn, spawnSync } = require('node:child_process');
const config = require('../src/config');
const { pool, startServer, api } = require('./fixtures');

const BACKEND_DIR = path.join(__dirname, '..');
const REPO_ROOT = path.join(BACKEND_DIR, '..');
const KEYS = [
  'DATABASE_URL', 'JWT_ACCESS_SECRET', 'JWT_REFRESH_SECRET', 'JWT_ACCESS_EXPIRES_IN',
  'JWT_REFRESH_EXPIRES_IN', 'DB_POOL_MAX', 'PORT', 'CORS_ORIGIN',
];
const SECRET_KEYS = ['DATABASE_URL', 'JWT_ACCESS_SECRET', 'JWT_REFRESH_SECRET'];

let server;
before(async () => { server = await startServer(); });
after(async () => { await server.close(); await pool.end(); });

function runServerSync(env) {
  return spawnSync(process.execPath, ['src/server.js'], { cwd: BACKEND_DIR, env, encoding: 'utf8', timeout: 10000 });
}

function assertNoSecretValues(output) {
  for (const key of SECRET_KEYS) {
    if (process.env[key]) assert.ok(!output.includes(process.env[key]), `${key} 값이 출력됨`);
  }
}

for (const key of KEYS) {
  test(`BE-01 ${key} 누락 시 서버가 exit 1로 종료하고 키 이름만 출력한다`, () => {
    const env = { ...process.env };
    delete env[key];
    const r = runServerSync(env);
    assert.equal(r.status, 1, r.stderr);
    assert.ok(r.stderr.includes(key), r.stderr);
    assertNoSecretValues(r.stderr + r.stdout);
  });
}

test('BE-01 빈 문자열 키(JWT_ACCESS_SECRET=\'\')도 누락으로 보고 exit 1', () => {
  const r = runServerSync({ ...process.env, JWT_ACCESS_SECRET: '' });
  assert.equal(r.status, 1, r.stderr);
  assert.ok(r.stderr.includes('JWT_ACCESS_SECRET'), r.stderr);
  assertNoSecretValues(r.stderr + r.stdout);
});

function freePort() {
  return new Promise((resolve, reject) => {
    const s = net.createServer();
    s.once('error', reject);
    s.listen(0, '127.0.0.1', () => {
      const { port } = s.address();
      s.close(() => resolve(port));
    });
  });
}

test('BE-01 모든 키가 있으면 server.js가 PORT에서 기동한다', async () => {
  const port = await freePort();
  const child = spawn(process.execPath, ['src/server.js'], {
    cwd: BACKEND_DIR,
    env: { ...process.env, PORT: String(port) },
  });
  try {
    await new Promise((resolve, reject) => {
      let out = '';
      let err = '';
      const timer = setTimeout(() => reject(new Error(`기동 대기 시간 초과\n${out}\n${err}`)), 10000);
      child.stdout.on('data', (chunk) => {
        out += chunk;
        if (out.includes(`listening on ${port}`)) { clearTimeout(timer); resolve(); }
      });
      child.stderr.on('data', (chunk) => { err += chunk; });
      child.on('exit', (code) => { clearTimeout(timer); reject(new Error(`조기 종료 code=${code}\n${err}`)); });
    });
    const res = await fetch(`http://127.0.0.1:${port}/api/categories`);
    assert.equal(res.status, 401);
  } finally {
    child.kill();
  }
});

test('BE-01 backend/src 안에서 process.env를 참조하는 파일은 config.js 하나뿐이다', () => {
  const srcDir = path.join(BACKEND_DIR, 'src');
  const files = fs.readdirSync(srcDir, { recursive: true })
    .filter((f) => f.endsWith('.js'))
    .filter((f) => fs.readFileSync(path.join(srcDir, f), 'utf8').includes('process.env'));
  assert.deepEqual(files, ['config.js']);
});

test('BE-01 .env.example에 8개 키가 있고 시크릿·연결 문자열은 비어 있으며 15m/7d/20이 들어 있다', () => {
  const text = fs.readFileSync(path.join(BACKEND_DIR, '.env.example'), 'utf8');
  const entries = {};
  for (const raw of text.split(/\r?\n/)) {
    const line = raw.trim();
    if (!line || line.startsWith('#')) continue;
    const i = line.indexOf('=');
    entries[line.slice(0, i)] = line.slice(i + 1);
  }
  assert.deepEqual(Object.keys(entries).sort(), [...KEYS].sort());
  for (const key of SECRET_KEYS) assert.equal(entries[key], '', key);
  assert.equal(entries.JWT_ACCESS_EXPIRES_IN, '15m');
  assert.equal(entries.JWT_REFRESH_EXPIRES_IN, '7d');
  assert.equal(entries.DB_POOL_MAX, '20');
});

test('BE-01 backend/.env는 git 추적 대상에서 제외된다', () => {
  const ignored = spawnSync('git', ['check-ignore', '-q', 'backend/.env'], { cwd: REPO_ROOT });
  assert.equal(ignored.status, 0);
  const tracked = spawnSync('git', ['ls-files', 'backend/.env'], { cwd: REPO_ROOT, encoding: 'utf8' });
  assert.equal(tracked.stdout.trim(), '');
});

test('BE-01 CORS_ORIGIN과 다른 Origin은 CORS 허용 헤더를 받지 못한다', async () => {
  const res = await api(server.baseUrl, 'GET', '/api/categories', { headers: { Origin: 'http://evil.example' } });
  assert.equal(res.status, 401);
  assert.equal(res.headers.get('access-control-allow-origin'), null);
});

test('BE-01 CORS_ORIGIN과 같은 Origin은 허용 헤더를 받는다', async () => {
  const res = await api(server.baseUrl, 'GET', '/api/categories', { headers: { Origin: config.corsOrigin } });
  assert.equal(res.headers.get('access-control-allow-origin'), config.corsOrigin);
});
