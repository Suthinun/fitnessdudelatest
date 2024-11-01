// src/routes/userRoutes.js

const express = require('express');
const { getAllUsers, getUserById } = require('../controllers/userController');
const authenticateToken = require('../middleware/auth'); // นำเข้า middleware

const router = express.Router();

// ใช้ middleware เพื่อป้องกันเส้นทาง
router.get('/', authenticateToken, getAllUsers);
router.get('/:id', authenticateToken, getUserById);

module.exports = router;
