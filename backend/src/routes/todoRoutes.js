// /api/todos (BE-11~14)
const express = require('express');
const { AppError } = require('../middlewares/errorHandler');
const todoService = require('../services/todoService');
const { TODO_STATUSES } = require('../services/todoStatus');

const router = express.Router();

const ID_PATTERN = /^[1-9]\d{0,17}$/;
const invalid = (message) => new AppError(400, 'VALIDATION_ERROR', message);

// 경로 id 형식 오류는 404 (§9-D7)
function parseId(id) {
  if (!ID_PATTERN.test(id)) throw new AppError(404, 'NOT_FOUND', '리소스를 찾을 수 없습니다.');
  return id;
}

function parseTitle(v) {
  if (typeof v !== 'string' || v.trim() === '' || v.trim().length > 200) throw invalid('제목은 1~200자여야 합니다.');
  return v.trim();
}

function parseCategoryId(v) {
  if (!Number.isInteger(v) || v <= 0) throw invalid('categoryId 형식이 올바르지 않습니다.');
  return v;
}

// 실제 존재하는 날짜만 허용 (2026-02-30 거부)
function parseDate(v) {
  const d = new Date(v + 'T00:00:00Z');
  if (typeof v !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(v)
    || Number.isNaN(d.getTime()) || d.toISOString().slice(0, 10) !== v) {
    throw invalid('날짜 형식이 올바르지 않습니다.');
  }
  return v;
}

function parseBoolean(v) {
  if (typeof v !== 'boolean') throw invalid('isCompleted는 boolean이어야 합니다.');
  return v;
}

// POST 선택 필드: 키 없음·null은 미전달
const optional = (v, parse) => (v === undefined || v === null ? undefined : parse(v));
// PATCH 필드: undefined만 변경 없음, null은 400
const patchField = (v, parse) => (v === undefined ? undefined : parse(v));

// FR-07: 쿼리 키가 없을 때만 필터 없음. 빈 값·반복 키·그 외 값은 400
router.get('/', async (req, res) => {
  const { categoryId, status } = req.query;
  if (categoryId !== undefined && !(typeof categoryId === 'string' && ID_PATTERN.test(categoryId))) {
    throw invalid('categoryId 형식이 올바르지 않습니다.');
  }
  if (status !== undefined && !TODO_STATUSES.includes(status)) throw invalid('허용되지 않는 status입니다.');
  res.json(await todoService.listTodos(req.user.id, { categoryId, status }));
});

router.get('/:id', async (req, res) => {
  res.json(await todoService.getTodo(req.user.id, parseId(req.params.id)));
});

// 본문의 userId 등 정의되지 않은 키는 무시 (BR-02)
router.post('/', async (req, res) => {
  const body = req.body ?? {};
  const todo = await todoService.createTodo(req.user.id, {
    title: parseTitle(body.title),
    categoryId: optional(body.categoryId, parseCategoryId),
    startDate: optional(body.startDate, parseDate),
    endDate: optional(body.endDate, parseDate),
  });
  res.status(201).json(todo);
});

router.patch('/:id', async (req, res) => {
  const id = parseId(req.params.id);
  const body = req.body ?? {};
  const todo = await todoService.updateTodo(req.user.id, id, {
    title: patchField(body.title, parseTitle),
    categoryId: patchField(body.categoryId, parseCategoryId),
    startDate: patchField(body.startDate, parseDate),
    endDate: patchField(body.endDate, parseDate),
    isCompleted: patchField(body.isCompleted, parseBoolean),
  });
  res.json(todo);
});

router.delete('/:id', async (req, res) => {
  await todoService.deleteTodo(req.user.id, parseId(req.params.id));
  res.status(204).end();
});

module.exports = router;
