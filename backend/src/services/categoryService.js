// 카테고리 (BE-09, BE-10, FR-08)
const { pool } = require('../db/pool');
const { AppError } = require('../middlewares/errorHandler');
const categoryRepository = require('../repositories/categoryRepository');
const todoRepository = require('../repositories/todoRepository');

const DEFAULT_CATEGORY_NAME = '기본'; // BR-10

const notFound = () => new AppError(404, 'NOT_FOUND', '리소스를 찾을 수 없습니다.');
const duplicated = () => new AppError(409, 'CATEGORY_NAME_DUPLICATED', '이미 있는 카테고리 이름입니다.');
const protectedDefault = () =>
  new AppError(400, 'DEFAULT_CATEGORY_PROTECTED', `'${DEFAULT_CATEGORY_NAME}' 카테고리는 수정하거나 삭제할 수 없습니다.`);

function listCategories(userId) {
  return categoryRepository.findCategoriesByUser(userId);
}

async function createCategory(userId, name) {
  try {
    return await categoryRepository.createCategory(userId, name);
  } catch (err) {
    if (err.code === '23505') throw duplicated(); // BR-11
    throw err;
  }
}

// 본인 소유(404) → 기본 카테고리 보호(400, BR-10) 순서로 확인
async function assertEditable(userId, categoryId) {
  const category = await categoryRepository.findCategoryById(categoryId, userId);
  if (!category) throw notFound();
  if (category.name === DEFAULT_CATEGORY_NAME) throw protectedDefault();
}

async function renameCategory(userId, categoryId, name) {
  await assertEditable(userId, categoryId);
  try {
    return await categoryRepository.updateCategoryName(categoryId, userId, name);
  } catch (err) {
    if (err.code === '23505') throw duplicated(); // BR-11
    throw err;
  }
}

// BR-09: 소속 할일을 기본 카테고리로 옮긴 뒤 삭제, 한 트랜잭션
async function deleteCategory(userId, categoryId) {
  await assertEditable(userId, categoryId);
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const defaultCategory = await categoryRepository.findCategoryByName(userId, DEFAULT_CATEGORY_NAME, client);
    await todoRepository.moveTodosToCategory(categoryId, defaultCategory.id, userId, client);
    await categoryRepository.deleteCategory(categoryId, userId, client);
    await client.query('COMMIT');
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

module.exports = { DEFAULT_CATEGORY_NAME, listCategories, createCategory, renameCategory, deleteCategory };
