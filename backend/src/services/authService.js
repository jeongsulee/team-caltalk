// 회원가입·로그인·토큰 (BE-05, BE-06, FR-01, FR-02)
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const config = require('../config');
const { pool } = require('../db/pool');
const { AppError } = require('../middlewares/errorHandler');
const userRepository = require('../repositories/userRepository');
const categoryRepository = require('../repositories/categoryRepository');
const { DEFAULT_CATEGORY_NAME } = require('./categoryService');

// payload는 sub만 (이메일·이름 미포함)
function signAccessToken(userId) {
  return jwt.sign({}, config.jwtAccessSecret, {
    subject: String(userId), expiresIn: config.jwtAccessExpiresIn, algorithm: 'HS256',
  });
}

function signRefreshToken(userId) {
  return jwt.sign({}, config.jwtRefreshSecret, {
    subject: String(userId), expiresIn: config.jwtRefreshExpiresIn, algorithm: 'HS256',
  });
}

function verifyAccessToken(token) {
  return jwt.verify(token, config.jwtAccessSecret, { algorithms: ['HS256'] }).sub;
}

// 사용자 + 기본 카테고리를 한 트랜잭션으로 생성 (BR-10)
async function signup({ email, password, name }) {
  const passwordHash = await bcrypt.hash(password, 10);
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const user = await userRepository.createUser({ email: email.trim().toLowerCase(), passwordHash, name }, client);
    await categoryRepository.createCategory(user.id, DEFAULT_CATEGORY_NAME, client);
    await client.query('COMMIT');
    return user;
  } catch (err) {
    await client.query('ROLLBACK');
    if (err.code === '23505') throw new AppError(409, 'EMAIL_DUPLICATED', '이미 가입된 이메일입니다.'); // BR-07
    throw err;
  } finally {
    client.release();
  }
}

async function login({ email, password }) {
  const found = await userRepository.findUserByEmail(email.trim().toLowerCase());
  // 없는 이메일과 틀린 비밀번호는 같은 응답
  if (!found || !(await bcrypt.compare(password, found.passwordHash))) {
    throw new AppError(401, 'INVALID_CREDENTIALS', '이메일 또는 비밀번호가 올바르지 않습니다.');
  }
  const user = { id: found.id, email: found.email, name: found.name };
  return { accessToken: signAccessToken(user.id), refreshToken: signRefreshToken(user.id), user };
}

function refresh(refreshToken) {
  let sub;
  try {
    sub = jwt.verify(refreshToken, config.jwtRefreshSecret, { algorithms: ['HS256'] }).sub;
  } catch {
    throw new AppError(401, 'UNAUTHORIZED', '인증이 필요합니다.');
  }
  return { accessToken: signAccessToken(sub) };
}

module.exports = { signup, login, refresh, signAccessToken, signRefreshToken, verifyAccessToken };
