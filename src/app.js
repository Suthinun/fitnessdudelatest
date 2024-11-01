const express = require('express');
const app = express();
const authRoutes = require('./routes/authRoutes'); // เรียกใช้ authRoutes

app.use(express.json());

// ใช้เส้นทางจาก authRoutes สำหรับการยืนยันตัวตน (เช่น /auth/signup, /auth/login, /auth/me)
app.use('/auth', authRoutes);

module.exports = app;
