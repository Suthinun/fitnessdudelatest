const jwt = require('jsonwebtoken');

// Middleware สำหรับตรวจสอบ token
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // แยก token ออกจาก Bearer

  if (!token) return res.sendStatus(401); // ถ้าไม่มี token ให้ส่ง status 401 Unauthorized

  jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
    if (err) return res.sendStatus(403); // token ไม่ถูกต้อง ส่งสถานะ 403 Forbidden
    req.user = user; // เก็บข้อมูลจาก token ใน req.user
    next(); // ไปยังขั้นตอนถัดไป
  });
};

module.exports = authenticateToken;
