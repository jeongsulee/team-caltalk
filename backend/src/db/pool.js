// pg 풀 싱글턴 (BE-02)
const { Pool, types } = require('pg');
const config = require('../config');

types.setTypeParser(1082, (v) => v); // DATE → 'YYYY-MM-DD' 문자열 (원칙 1-7)

const pool = new Pool({ connectionString: config.databaseUrl, max: config.dbPoolMax });

module.exports = { pool };
