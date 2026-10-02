// /api/health: 서버와 DB 연결 상태 확인 (인증 없음)
const express = require('express');
const { pool } = require('../db/pool');

const DB_TIMEOUT_MS = 3000; // pg 기본값은 연결 대기 무제한이므로 응답이 멈추지 않게 제한

const router = express.Router();

router.get('/', async (req, res) => {
  let timer;
  try {
    await Promise.race([
      pool.query('SELECT 1'),
      new Promise((_, reject) => { timer = setTimeout(() => reject(new Error('DB timeout')), DB_TIMEOUT_MS); }),
    ]);
    res.json({ status: 'ok', db: 'ok' });
  } catch {
    res.status(503).json({ status: 'error', db: 'error' }); // 연결 정보·오류 원문은 응답하지 않는다
  } finally {
    clearTimeout(timer);
  }
});

module.exports = router;
