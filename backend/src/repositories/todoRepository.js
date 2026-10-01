const { pool } = require('../db/pool');

const COLUMNS = 'id, title, category_id, start_date, end_date, is_completed';
const toTodo = (r) => ({
  id: Number(r.id),
  title: r.title,
  categoryId: Number(r.category_id),
  startDate: r.start_date,
  endDate: r.end_date,
  isCompleted: r.is_completed,
});

// 상태 필터 WHERE (BE-13). $today 자리에 {t}가 치환된다. 값은 항상 $n 바인딩
const STATUS_WHERE = {
  completed: 'is_completed',
  overdue: 'NOT is_completed AND end_date < {t}',
  upcoming: 'NOT is_completed AND end_date >= {t} AND start_date > {t}',
  in_progress: 'NOT is_completed AND start_date <= {t} AND end_date >= {t}',
};

async function createTodo({ userId, categoryId, title, startDate, endDate }) {
  const { rows } = await pool.query(
    `INSERT INTO todos (user_id, category_id, title, start_date, end_date)
     VALUES ($1, $2, $3, $4, $5) RETURNING ${COLUMNS}`,
    [userId, categoryId, title, startDate, endDate],
  );
  return toTodo(rows[0]);
}

async function findTodos(userId, { categoryId, status }, today) {
  const params = [userId];
  const where = ['user_id = $1'];
  if (categoryId !== undefined) {
    params.push(categoryId);
    where.push(`category_id = $${params.length}`);
  }
  if (status === 'completed') {
    where.push(STATUS_WHERE.completed);
  } else if (status !== undefined) {
    params.push(today);
    where.push(STATUS_WHERE[status].replaceAll('{t}', `$${params.length}`));
  }
  const { rows } = await pool.query(
    `SELECT ${COLUMNS} FROM todos WHERE ${where.join(' AND ')} ORDER BY start_date, id`,
    params,
  );
  return rows.map(toTodo);
}

async function findTodoById(todoId, userId) {
  const { rows } = await pool.query(`SELECT ${COLUMNS} FROM todos WHERE id = $1 AND user_id = $2`, [todoId, userId]);
  return rows[0] ? toTodo(rows[0]) : null;
}

async function updateTodo(todoId, userId, { title, categoryId, startDate, endDate, isCompleted }) {
  const { rows } = await pool.query(
    `UPDATE todos SET title = $3, category_id = $4, start_date = $5, end_date = $6, is_completed = $7
     WHERE id = $1 AND user_id = $2 RETURNING ${COLUMNS}`,
    [todoId, userId, title, categoryId, startDate, endDate, isCompleted],
  );
  return rows[0] ? toTodo(rows[0]) : null;
}

async function deleteTodo(todoId, userId) {
  const { rowCount } = await pool.query('DELETE FROM todos WHERE id = $1 AND user_id = $2', [todoId, userId]);
  return rowCount;
}

async function moveTodosToCategory(fromCategoryId, toCategoryId, userId, db = pool) {
  const { rowCount } = await db.query(
    'UPDATE todos SET category_id = $2 WHERE category_id = $1 AND user_id = $3',
    [fromCategoryId, toCategoryId, userId],
  );
  return rowCount;
}

module.exports = { createTodo, findTodos, findTodoById, updateTodo, deleteTodo, moveTodosToCategory };
