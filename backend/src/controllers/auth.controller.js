import jwt from 'jsonwebtoken';
import User from '../models/User.js';

const signToken = (userId) =>
  jwt.sign({ userId }, process.env.VITE_JWT_SECRET, { expiresIn: '7d' });

export const signup = async (req, res) => {
  try {
    const { name, phone, password } = req.body;
    if (!name || !phone || !password)
      return res.status(400).json({ success: false, message: 'All fields required' });

    const existing = await User.findOne({ phone });
    if (existing)
      return res.status(409).json({ success: false, message: 'Phone number already registered' });

    const passwordHash = await User.hashPassword(password);
    const user = await User.create({ name, phone, passwordHash });

    const token = signToken(user._id);
    res.status(201).json({ success: true, token, user: { _id: user._id, name: user.name, phone: user.phone, role: user.role } });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

export const login = async (req, res) => {
  try {
    const { phone, password } = req.body;
    console.log(phone,password)
    const user = await User.findOne({ phone });
    if (!user || !user.isActive)
      return res.status(401).json({ success: false, message: 'Invalid credentials' });

    const valid = await user.comparePassword(password);
    if (!valid) return res.status(401).json({ success: false, message: 'Invalid credentials' });

    const token = signToken(user._id);
    res.json({ success: true, token, user: { _id: user._id, name: user.name, phone: user.phone, role: user.role } });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

export const getMe = async (req, res) => {
  res.json({ success: true, user: req.user });
};

export const createAdmin = async (req, res) => {
  try {
    const { name, phone, password, secretKey } = req.body;
    if (secretKey !== process.env.ADMIN_SECRET_KEY)
      return res.status(403).json({ success: false, message: 'Invalid secret key' });

    const passwordHash = await User.hashPassword(password);
    const user = await User.create({ name, phone, passwordHash, role: 'admin' });
    const token = signToken(user._id);
    res.status(201).json({ success: true, token, user: { _id: user._id, name: user.name, role: user.role } });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};
