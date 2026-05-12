import { Router } from 'express';
import { signup, login, getMe, createAdmin } from '../controllers/auth.controller.js';
import { authenticate } from '../middleware/auth.middleware.js';

const router = Router();
router.post('/signup', signup);
router.post('/login', login);
router.post('/create-admin', createAdmin);
router.get('/me', authenticate, getMe);
export default router;
