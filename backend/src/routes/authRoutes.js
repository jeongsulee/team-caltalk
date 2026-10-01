// /api/auth (BE-05, BE-06)
const express = require('express');
const { AppError } = require('../middlewares/errorHandler');
const authService = require('../services/authService');

const router = express.Router();

const invalid = (message) => new AppError(400, 'VALIDATION_ERROR', message);
const isFilled = (v) => typeof v === 'string' && v.trim() !== '';

router.post('/signup', async (req, res) => {
  const { email, password, name } = req.body ?? {};
  if (!isFilled(email) || !isFilled(password) || !isFilled(name)) throw invalid('이메일, 비밀번호, 이름은 필수입니다.');
  const normalizedEmail = email.trim().toLowerCase();
  if (normalizedEmail.length > 255 || !/^[^\s@]+@[^\s@]+$/.test(normalizedEmail)) throw invalid('이메일 형식이 올바르지 않습니다.');
  if (name.trim().length > 100) throw invalid('이름은 100자 이하여야 합니다.');
  const user = await authService.signup({ email: normalizedEmail, password, name: name.trim() });
  res.status(201).json(user);
});

router.post('/login', async (req, res) => {
  const { email, password } = req.body ?? {};
  if (!isFilled(email) || !isFilled(password)) throw invalid('이메일과 비밀번호는 필수입니다.');
  res.json(await authService.login({ email, password }));
});

// refreshToken 누락·형식 오류도 401 (jwt.verify 실패로 처리)
router.post('/refresh', (req, res) => {
  res.json(authService.refresh((req.body ?? {}).refreshToken));
});

module.exports = router;
