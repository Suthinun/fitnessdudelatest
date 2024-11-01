const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const authenticateToken = require('../middleware/auth'); // เรียกใช้ middleware

// เส้นทางสำหรับ signup
router.post('/signup', authController.signup);

// เส้นทางสำหรับ login
router.post('/login', authController.login);

// เส้นทางสำหรับดึงข้อมูลผู้ใช้
router.get('/me', authenticateToken, authController.getProfile);

// เส้นทางสำหรับอัปเดตข้อมูลผู้ใช้
router.put('/update', authController.updateProfile);

// เส้นทางสำหรับลบข้อมูลผู้ใช้
router.delete('/delete', authenticateToken, authController.deleteProfile);

module.exports = router;
