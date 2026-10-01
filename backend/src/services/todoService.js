// 할일 (BE-11~14, FR-03~07)
const { AppError } = require('../middlewares/errorHandler');
const todoRepository = require('../repositories/todoRepository');
const categoryRepository = require('../repositories/categoryRepository');
const { DEFAULT_CATEGORY_NAME } = require('./categoryService');
const { getTodayKst, getTodoStatus } = require('./todoStatus');

const notFound = () => new AppError(404, 'NOT_FOUND', '리소스를 찾을 수 없습니다.');

function addDays(date, days) {
  const d = new Date(date + 'T00:00:00Z');
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

// BR-04: 시작일 ≤ 종료일 (같은 날 허용)
function assertDateRange(startDate, endDate) {
  if (startDate > endDate) throw new AppError(400, 'VALIDATION_ERROR', '시작일은 종료일보다 늦을 수 없습니다.');
}

async function assertOwnedCategory(userId, categoryId) {
  if (!(await categoryRepository.findCategoryById(categoryId, userId))) throw notFound();
}

// BR-08: 상태는 저장하지 않고 응답 시 계산
const withStatus = (todo, today = getTodayKst()) => ({ ...todo, status: getTodoStatus(todo, today) });

async function listTodos(userId, { categoryId, status }) {
  const today = getTodayKst();
  const todos = await todoRepository.findTodos(userId, { categoryId, status }, today);
  return todos.map((t) => withStatus(t, today));
}

async function getTodo(userId, todoId) {
  const todo = await todoRepository.findTodoById(todoId, userId);
  if (!todo) throw notFound();
  return withStatus(todo);
}

async function createTodo(userId, { title, categoryId, startDate, endDate }) {
  startDate ??= addDays(getTodayKst(), 7); // BR-05
  endDate ??= startDate; // BR-05
  assertDateRange(startDate, endDate);
  if (categoryId === undefined) {
    categoryId = (await categoryRepository.findCategoryByName(userId, DEFAULT_CATEGORY_NAME)).id; // BR-03
  } else {
    await assertOwnedCategory(userId, categoryId);
  }
  const todo = await todoRepository.createTodo({ userId, categoryId, title, startDate, endDate });
  return withStatus(todo);
}

async function updateTodo(userId, todoId, patch) {
  const current = await todoRepository.findTodoById(todoId, userId);
  if (!current) throw notFound();
  const merged = { ...current };
  for (const [key, value] of Object.entries(patch)) if (value !== undefined) merged[key] = value;
  assertDateRange(merged.startDate, merged.endDate);
  if (patch.categoryId !== undefined) await assertOwnedCategory(userId, patch.categoryId);
  const todo = await todoRepository.updateTodo(todoId, userId, merged);
  if (!todo) throw notFound();
  return withStatus(todo);
}

async function deleteTodo(userId, todoId) {
  if ((await todoRepository.deleteTodo(todoId, userId)) === 0) throw notFound();
}

module.exports = { listTodos, getTodo, createTodo, updateTodo, deleteTodo };
