import jwt from 'jsonwebtoken';
import User from '../models/User.js';

export const authenticate = async (req, res, next) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) return res.status(401).json({ success: false, message: 'No token provided' });

    const decoded = jwt.verify(token, process.env.VITE_JWT_SECRET);
    const user = await User.findById(decoded.userId).select('-passwordHash');
    if (!user || !user.isActive) return res.status(401).json({ success: false, message: 'Invalid or expired token' });

    req.user = user;
    next();
  } catch (err) {
    res.status(401).json({ success: false, message: 'Unauthorized' });
  }
};

export const requireAdmin = (req, res, next) => {
  if (req.user?.role !== 'admin') {
    return res.status(403).json({ success: false, message: 'Admin access required' });
  }
  next();
};

export const requireOperator = (req, res, next) => {
  if (!['admin', 'operator'].includes(req.user?.role)) {
    return res.status(403).json({ success: false, message: 'Operator access required' });
  }
  next();
};
