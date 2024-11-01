const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");

// สมัครสมาชิก (Signup)
exports.signup = async (req, res) => {
  const { name, email, password } = req.body;

  try {
    if (!name || !email || !password) {
      return res
        .status(400)
        .json({ error: "Name, email, and password are required" });
    }

    // ตรวจสอบว่า email มีอยู่แล้วหรือไม่
    const existingUser = await prisma.users.findUnique({
      where: { email },
    });

    if (existingUser) {
      return res.status(400).json({ error: "Email is already in use" });
    }

    // ถ้าไม่มี email ซ้ำ ให้สร้างผู้ใช้ใหม่
    const hashedPassword = await bcrypt.hash(password, 10);
    const newUser = await prisma.users.create({
      data: {
        name,
        email,
        password: hashedPassword,
      },
    });

    res
      .status(201)
      .json({ message: "User created successfully", user: newUser });
  } catch (error) {
    console.error("Error during signup:", error);
    res
      .status(500)
      .json({
        error: "An error occurred during signup",
        details: error.message,
      });
  }
};

// เข้าสู่ระบบ (Login)
exports.login = async (req, res) => {
  const { email, password } = req.body;

  try {
    const user = await prisma.users.findUnique({ where: { email } });
    if (!user) {
      return res.status(401).json({ error: "Invalid email or password" });
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return res.status(401).json({ error: "Invalid email or password" });
    }

    const token = jwt.sign({ userId: user.id }, process.env.JWT_SECRET, {
      expiresIn: "1h",
    });

    res.json({
      message: "Login successful",
      token,
      user: { id: user.id, name: user.name, email: user.email },
    });
  } catch (error) {
    console.error("Error during login:", error);
    res.status(500).json({ error: "An error occurred during login" });
  }
};
// ฟังก์ชันสำหรับดึงข้อมูลผู้ใช้
exports.getProfile = async (req, res) => {
  const userId = req.user.userId;

  try {
    const user = await prisma.users.findUnique({
      where: { id: userId },
      select: { id: true, name: true, email: true }, // เลือกข้อมูลที่จะส่งกลับ
    });

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.json({ user });
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch user data' });
  }
};

// ฟังก์ชันสำหรับอัปเดตข้อมูลผู้ใช้
exports.updateProfile = async (req, res) => {
  const userId = req.user.userId;
  const { name, email } = req.body;

  try {
    const updatedUser = await prisma.users.update({
      where: { id: userId },
      data: { name, email },
    });

    res.json({ message: 'Profile updated successfully', user: updatedUser });
  } catch (error) {
    res.status(500).json({ message: 'Failed to update profile' });
  }
};

// ลบข้อมูลผู้ใช้
exports.deleteProfile = async (req, res) => {
  const userId = req.user.userId;

  try {
    await prisma.users.delete({ where: { id: userId } });
    res.json({ message: 'Profile deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Failed to delete profile' });
  }
};
