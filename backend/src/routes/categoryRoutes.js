// /api/categories (BE-09, BE-10)
const express = require('express');
const { AppError } = require('../middlewares/errorHandler');
const categoryService = require('../services/categoryService');

const router = express.Router();

// 경로 id 형식 오류는 404 (§9-D7)
function parseId(id) {
  if (!/^[1-9]\d{0,17}$/.test(id)) throw new AppError(404, 'NOT_FOUND', '리소스를 찾을 수 없습니다.');
  return id;
}

// BR-11: 빈 이름·공백만·100자 초과 거부
function parseName(name) {
  if (typeof name !== 'string' || name.trim() === '' || name.trim().length > 100) {
    throw new AppError(400, 'VALIDATION_ERROR', '카테고리 이름은 1~100자여야 합니다.');
  }
  return name.trim();
}

router.get('/', async (req, res) => {
  res.json(await categoryService.listCategories(req.user.id));
});

router.post('/', async (req, res) => {
  const name = parseName((req.body ?? {}).name);
  res.status(201).json(await categoryService.createCategory(req.user.id, name));
});

router.patch('/:id', async (req, res) => {
  const id = parseId(req.params.id);
  const name = parseName((req.body ?? {}).name);
  res.json(await categoryService.renameCategory(req.user.id, id, name));
});

router.delete('/:id', async (req, res) => {
  await categoryService.deleteCategory(req.user.id, parseId(req.params.id));
  res.status(204).end();
});

module.exports = router;
