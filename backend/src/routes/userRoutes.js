// /api/users (BE-08)
const express = require('express');
const { AppError } = require('../middlewares/errorHandler');
const userService = require('../services/userService');

const router = express.Router();

router.get('/me', async (req, res) => {
  res.json(await userService.getMe(req.user.id));
});

// name 외 키(id, email 등)는 무시
router.patch('/me', async (req, res) => {
  const { name } = req.body ?? {};
  if (typeof name !== 'string' || name.trim() === '' || name.trim().length > 100) {
    throw new AppError(400, 'VALIDATION_ERROR', '이름은 1~100자여야 합니다.');
  }
  res.json(await userService.updateMyName(req.user.id, name.trim()));
});

module.exports = router;
