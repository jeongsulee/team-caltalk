// API 문서 (Swagger UI). 명세는 backend/swagger.yaml, UI는 CDN에서 로드 (의존성 추가 없음)
const path = require('node:path');
const express = require('express');

const SPEC_PATH = path.join(__dirname, '..', '..', 'swagger.yaml');
const UI = 'https://cdn.jsdelivr.net/npm/swagger-ui-dist@5';

const html = `<!doctype html>
<html lang="ko">
<head>
  <meta charset="utf-8">
  <title>cal-todo API</title>
  <link rel="stylesheet" href="${UI}/swagger-ui.css">
</head>
<body>
  <div id="swagger-ui"></div>
  <script src="${UI}/swagger-ui-bundle.js"></script>
  <script>SwaggerUIBundle({ url: '/api-docs/swagger.yaml', dom_id: '#swagger-ui' });</script>
</body>
</html>`;

const router = express.Router();

router.get('/', (req, res) => res.type('html').send(html));
router.get('/swagger.yaml', (req, res) => res.type('yaml').sendFile(SPEC_PATH));

module.exports = router;
