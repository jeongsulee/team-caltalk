const { pool } = require('../db/pool');

const toUser = (r) => ({ id: Number(r.id), email: r.email, name: r.name });

async function findUserByEmail(email) {
  const { rows } = await pool.query('SELECT id, email, name, password_hash FROM users WHERE email = $1', [email]);
  return rows[0] ? { ...toUser(rows[0]), passwordHash: rows[0].password_hash } : null;
}

async function findUserById(userId) {
  const { rows } = await pool.query('SELECT id, email, name FROM users WHERE id = $1', [userId]);
  return rows[0] ? toUser(rows[0]) : null;
}

async function createUser({ email, passwordHash, name }, db = pool) {
  const { rows } = await db.query(
    'INSERT INTO users (email, password_hash, name) VALUES ($1, $2, $3) RETURNING id, email, name',
    [email, passwordHash, name],
  );
  return toUser(rows[0]);
}

async function updateUserName(userId, name) {
  const { rows } = await pool.query('UPDATE users SET name = $2 WHERE id = $1 RETURNING id, email, name', [userId, name]);
  return rows[0] ? toUser(rows[0]) : null;
}

module.exports = { findUserByEmail, findUserById, createUser, updateUserName };
