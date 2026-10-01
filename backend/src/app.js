const express = require('express');
const cors = require('cors');
const config = require('./config');
const { authenticate } = require('./middlewares/auth');
const { errorHandler } = require('./middlewares/errorHandler');
const authRoutes = require('./routes/authRoutes');
const userRoutes = require('./routes/userRoutes');
const categoryRoutes = require('./routes/categoryRoutes');
const todoRoutes = require('./routes/todoRoutes');
const docsRoutes = require('./routes/docsRoutes');

const app = express();

// 배열로 전달해야 불일치 Origin에 허용 헤더가 붙지 않는다
app.use(cors({ origin: [config.corsOrigin] }));
app.use(express.json());

if (!config.isProduction) app.use('/api-docs', docsRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/users', authenticate, userRoutes);
app.use('/api/categories', authenticate, categoryRoutes);
app.use('/api/todos', authenticate, todoRoutes);

app.use(errorHandler);

module.exports = app;
