const { pool } = require('../db/pool');

const toCategory = (r) => ({ id: Number(r.id), name: r.name });

async function findCategoriesByUser(userId) {
  const { rows } = await pool.query('SELECT id, name FROM categories WHERE user_id = $1 ORDER BY id', [userId]);
  return rows.map(toCategory);
}

async function findCategoryById(categoryId, userId) {
  const { rows } = await pool.query('SELECT id, name FROM categories WHERE id = $1 AND user_id = $2', [categoryId, userId]);
  return rows[0] ? toCategory(rows[0]) : null;
}

async function findCategoryByName(userId, name, db = pool) {
  const { rows } = await db.query('SELECT id, name FROM categories WHERE user_id = $1 AND name = $2', [userId, name]);
  return rows[0] ? toCategory(rows[0]) : null;
}

async function createCategory(userId, name, db = pool) {
  const { rows } = await db.query('INSERT INTO categories (user_id, name) VALUES ($1, $2) RETURNING id, name', [userId, name]);
  return toCategory(rows[0]);
}

async function updateCategoryName(categoryId, userId, name) {
  const { rows } = await pool.query(
    'UPDATE categories SET name = $3 WHERE id = $1 AND user_id = $2 RETURNING id, name',
    [categoryId, userId, name],
  );
  return rows[0] ? toCategory(rows[0]) : null;
}

async function deleteCategory(categoryId, userId, db = pool) {
  const { rowCount } = await db.query('DELETE FROM categories WHERE id = $1 AND user_id = $2', [categoryId, userId]);
  return rowCount;
}

module.exports = {
  findCategoriesByUser, findCategoryById, findCategoryByName, createCategory, updateCategoryName, deleteCategory,
};
