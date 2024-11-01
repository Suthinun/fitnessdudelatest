const express = require('express');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const cors = require('cors');
const nodemailer = require('nodemailer');

const app = express();
app.use(express.json());
app.use(cors());

// สร้างตัวส่งเมลไปยัง Users โดยอิงจากหน้า .env
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

// Middleware to check the JWT token
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  if (!token) return res.sendStatus(401);

  jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
    if (err) return res.sendStatus(403);
    req.user = user;
    next();
  });
};

// Signup Route
app.post('/auth/signup', async (req, res) => {
  const { name, email, password } = req.body;

  if (!name || !email || !password) {
    return res.status(400).json({ error: 'Name, email, and password are required' });
  }

  const existingUser = await prisma.user.findUnique({ where: { email } });
  if (existingUser) {
    return res.status(400).json({ error: 'Email is already in use' });
  }

  const hashedPassword = await bcrypt.hash(password, 10);
  const newUser = await prisma.user.create({
    data: { name, email, password: hashedPassword },
  });

  res.status(201).json({ message: 'User created successfully', user: newUser });
});

// Login Route
app.post('/auth/login', async (req, res) => {
  const { email, password } = req.body;
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) {
    return res.status(401).json({ error: 'Invalid email or password' });
  }

  const isPasswordValid = await bcrypt.compare(password, user.password);
  if (!isPasswordValid) {
    return res.status(401).json({ error: 'Invalid email or password' });
  }

  const token = jwt.sign({ userId: user.id }, process.env.JWT_SECRET, { expiresIn: '1h' });
  res.json({ message: 'Login successful', token, user: { id: user.id, name: user.name, email: user.email } });
});

// Request Password Reset Route
app.post('/auth/lost-password', async (req, res) => {
  const { email } = req.body;
  
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) {
    return res.status(404).json({ message: 'Email not found' });
  }

  // Generate reset token and set expiration to 15 minutes from now
  const resetToken = jwt.sign({ userId: user.id }, process.env.JWT_SECRET, { expiresIn: '15m' });
  const resetTokenExpiration = new Date(Date.now() + 15 * 60 * 1000);

  // Update user record with resetToken and resetTokenExpiration
  await prisma.user.update({
    where: { email },
    data: { resetToken, resetTokenExpiration },
  });

  // Send reset link via email
  // Send reset token via email (without clickable link)
const resetTokenMessage = `Your password reset token is: ${resetToken}\n\n
Please use this token in the app to reset your password. The token will expire in 15 minutes.`;

try {
  await transporter.sendMail({
    from: process.env.EMAIL_USER,
    to: email,
    subject: 'Password Reset Token',
    text: resetTokenMessage,
    html: `<p>Your password reset token is:</p><p><strong>${resetToken}</strong></p><p>Please use this token in the app to reset your password. The token will expire in 15 minutes.</p>`,
  });
  res.status(200).json({ message: 'Reset token sent to your email' });
} catch (error) {
  console.error('Error sending email:', error); // เพิ่มการแสดงรายละเอียดข้อผิดพลาด
  res.status(500).json({ message: 'Failed to send reset token', error: error.message });
}
});

// Reset Password Route
app.post('/auth/reset-password', async (req, res) => {
  const { token, newPassword } = req.body;

  try {
    // Verify the token and check expiration
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
    });

    if (!user || user.resetToken !== token || new Date() > user.resetTokenExpiration) {
      return res.status(403).json({ message: 'Invalid or expired token' });
    }

    // Hash the new password and update it in the database
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    await prisma.user.update({
      where: { id: decoded.userId },
      data: {
        password: hashedPassword,
        resetToken: null,
        resetTokenExpiration: null,
      },
    });

    res.json({ message: 'Password reset successfully' });
  } catch (error) {
    res.status(403).json({ message: 'Invalid or expired token' });
  }
});

// Get Profile Route
app.get('/auth/me', authenticateToken, async (req, res) => {
  const userId = req.user.userId;
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, name: true, email: true },
  });

  if (!user) {
    return res.status(404).json({ message: 'User not found' });
  }

  res.json({ user });
});

app.put('/auth/update', authenticateToken, async (req, res) => {
  const userId = req.user.userId;
  const { name, email, newPassword } = req.body;

  try {
    const updateData = { name, email };

    if (newPassword) {
      const hashedPassword = await bcrypt.hash(newPassword, 10);
      updateData.password = hashedPassword;
    }

    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: updateData,
    });

    res.json({ message: 'Profile updated successfully', user: updatedUser });
  } catch (error) {
    console.error('Failed to update profile:', error);
    res.status(500).json({ message: 'Failed to update profile' });
  }
});

// ลบข้อมูลผู้ใช้
app.delete('/auth/delete', authenticateToken, async (req, res) => {
  const userId = req.user.userId;

  try {
    await prisma.user.delete({
      where: { id: userId },
    });
    res.json({ message: 'Profile deleted successfully' });
  } catch (error) {
    console.error('Failed to delete profile:', error);
    res.status(500).json({ message: 'Failed to delete profile' });
  }
});

// Start the server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
