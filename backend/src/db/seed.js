// 공통 테스트 데이터 시드 (DB-02, 3-user-scenario.md §3, 원칙 4-2)
const bcrypt = require('bcrypt');

const TEST_PASSWORD = 'password123';

// [title, 소유 라벨, 카테고리 이름, start n, end n, is_completed] — n은 D(KST 오늘) 기준 일수
const TODOS = [
  ['TODO-A1', 'A', '업무', 3, 5, false],
  ['TODO-A2', 'A', '업무', 0, 2, false],
  ['TODO-A3', 'A', '개인', -2, 0, false],
  ['TODO-A4', 'A', '업무', -5, -1, false],
  ['TODO-A5', 'A', '개인', -5, -1, true],
  ['TODO-A6', 'A', '기본', 0, 0, false],
  ['TODO-B1', 'B', '기본', 0, 1, false],
];

// db: .query를 가진 pg.Pool 또는 pg.Client. end()는 호출자 책임
async function seed(db) {
  await db.query('TRUNCATE users, categories, todos RESTART IDENTITY CASCADE');

  // 평문 저장 금지 (FR-01)
  const hash = await bcrypt.hash(TEST_PASSWORD, 10);
  const ids = {};

  // NEW(new-user@example.com)는 미가입 상태 유지 (S-01)
  for (const [label, email, name] of [
    ['A', 'user-a@example.com', '사용자A'],
    ['B', 'user-b@example.com', '사용자B'],
  ]) {
    const { rows } = await db.query(
      'INSERT INTO users (email, password_hash, name) VALUES ($1, $2, $3) RETURNING id',
      [email, hash, name],
    );
    ids[`USER-${label}`] = rows[0].id;
  }

  // '기본'은 사용자별 행 (BR-10)
  for (const [label, name] of [['A', '기본'], ['A', '업무'], ['A', '개인'], ['B', '기본']]) {
    const { rows } = await db.query(
      'INSERT INTO categories (user_id, name) VALUES ($1, $2) RETURNING id',
      [ids[`USER-${label}`], name],
    );
    ids[`CAT-${label}-${name}`] = rows[0].id;
  }

  // 날짜는 SQL로 계산, 하드코딩 금지 (원칙 4-2)
  for (const [title, label, cat, s, e, done] of TODOS) {
    const { rows } = await db.query(
      `INSERT INTO todos (user_id, category_id, title, start_date, end_date, is_completed)
       VALUES ($1, $2, $3,
               (now() AT TIME ZONE 'Asia/Seoul')::date + $4::int,
               (now() AT TIME ZONE 'Asia/Seoul')::date + $5::int,
               $6)
       RETURNING id`,
      [ids[`USER-${label}`], ids[`CAT-${label}-${cat}`], title, s, e, done],
    );
    ids[title] = rows[0].id;
  }

  return ids;
}

module.exports = { seed, TEST_PASSWORD };

if (require.main === module) {
  // 직접 실행 시에만 pool(→ config)을 불러온다
  const { pool } = require('./pool');
  seed(pool).then(() => console.log('seed 완료'))
    .catch((e) => { console.error(e.message); process.exitCode = 1; })
    .finally(() => pool.end());
}
