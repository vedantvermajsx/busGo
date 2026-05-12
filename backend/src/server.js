import express from 'express';
import cors from 'cors';
import morgan from 'morgan';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { connectDB } from './config/db.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config();

// Routes
import authRoutes from './routes/auth.routes.js';
import busRoutes from './routes/bus.routes.js';
import stopRoutes from './routes/stop.routes.js';
import routeRoutes from './routes/route.routes.js';
import tripRoutes from './routes/trip.routes.js';
import bookingRoutes from './routes/booking.routes.js';
import adminRoutes from './routes/admin.routes.js';

const app = express();
const PORT = process.env.VITE_PORT || 5000;

app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json());
app.use(morgan('dev'));


app.use('/api/auth', authRoutes);
app.use('/api/buses', busRoutes);
app.use('/api/stops', stopRoutes);
app.use('/api/routes', routeRoutes);
app.use('/api/trips', tripRoutes);
app.use('/api/bookings', bookingRoutes);
app.use('/api/admin', adminRoutes);

const frontendPath = path.resolve(__dirname, '../../frontend/dist');
const adminPath = path.resolve(__dirname, '../../admin/dist');

// Serve Admin
app.use('/admin', express.static(adminPath));
app.get('/admin/*', (req, res) => {
  res.sendFile(path.join(adminPath, 'index.html'));
});

// Serve Frontend
app.use(express.static(frontendPath));
app.get('*', (req, res) => {
  res.sendFile(path.join(frontendPath, 'index.html'));
});

// Health check
app.get('/api/health', (req, res) => res.json({ status: 'OK', timestamp: new Date() }));

// Error handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(err.status || 500).json({
    success: false,
    message: err.message || 'Internal Server Error',
  });
});

connectDB().then(() => {
  app.listen(PORT, () => console.log(`🚌 Server running on http://localhost:${PORT}`));
});

export default app;
