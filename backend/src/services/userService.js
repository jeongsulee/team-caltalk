// 내 정보 (BE-08, FR-02)
const { AppError } = require('../middlewares/errorHandler');
const userRepository = require('../repositories/userRepository');

const notFound = () => new AppError(404, 'NOT_FOUND', '리소스를 찾을 수 없습니다.');

async function getMe(userId) {
  const user = await userRepository.findUserById(userId);
  if (!user) throw notFound();
  return user;
}

async function updateMyName(userId, name) {
  const user = await userRepository.updateUserName(userId, name);
  if (!user) throw notFound();
  return user;
}

module.exports = { getMe, updateMyName };
