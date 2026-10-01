// 환경변수 읽기·검증 (BE-01). process.env 접근은 이 파일에서만
const KEYS = {
  databaseUrl: 'DATABASE_URL',
  jwtAccessSecret: 'JWT_ACCESS_SECRET',
  jwtRefreshSecret: 'JWT_REFRESH_SECRET',
  jwtAccessExpiresIn: 'JWT_ACCESS_EXPIRES_IN',
  jwtRefreshExpiresIn: 'JWT_REFRESH_EXPIRES_IN',
  dbPoolMax: 'DB_POOL_MAX',
  port: 'PORT',
  corsOrigin: 'CORS_ORIGIN',
};

const missing = Object.values(KEYS).filter((k) => process.env[k] === undefined || process.env[k] === '');
if (missing.length > 0) {
  // 키 이름만 출력, 값은 출력하지 않는다
  console.error('필수 환경변수 누락: ' + missing.join(', '));
  process.exit(1);
}

const config = {};
for (const [name, key] of Object.entries(KEYS)) config[name] = process.env[key];
config.dbPoolMax = Number(config.dbPoolMax);
config.port = Number(config.port);
// 선택 키: 운영(production)에서는 API 문서를 노출하지 않는다
config.isProduction = process.env.NODE_ENV === 'production';

module.exports = config;
