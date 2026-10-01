// 인증 미들웨어 (BE-07)
const { AppError } = require('./errorHandler');
const { verifyAccessToken } = require('../services/authService');

function authenticate(req, res, next) {
  const header = req.headers.authorization;
  let userId;
  try {
    if (typeof header !== 'string' || !header.startsWith('Bearer ')) throw new Error('no token');
    userId = verifyAccessToken(header.slice(7));
  } catch {
    throw new AppError(401, 'UNAUTHORIZED', '인증이 필요합니다.');
  }
  req.user = { id: userId };
  next();
}

module.exports = { authenticate };
