import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import path from 'path';
import config from './config';
import connectDB from './config/database';

// Route imports
import authRoutes from './routes/auth';
import taskRoutes from './routes/tasks';
import billRoutes from './routes/bills';
import appointmentRoutes from './routes/appointments';
import reminderRoutes from './routes/reminders';
import dashboardRoutes from './routes/dashboard';
import documentRoutes from './routes/documents';
import calendarRoutes from './routes/calendar';
import aiRoutes from './routes/ai';
import notificationRoutes from './routes/notifications';
import userRoutes from './routes/users';

const app = express();

// Security middleware
app.use(helmet());
app.use(cors({
  origin: config.clientUrl,
  credentials: true,
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per window
  message: { message: 'Too many requests, please try again later.' },
});
app.use('/api/', limiter);

// Body parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Serve uploaded files securely (auth checked in route handlers)
app.use('/uploads', express.static(path.join(__dirname, '..', config.uploadDir)));

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/tasks', taskRoutes);
app.use('/api/bills', billRoutes);
app.use('/api/appointments', appointmentRoutes);
app.use('/api/reminders', reminderRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/documents', documentRoutes);
app.use('/api/calendar', calendarRoutes);
app.use('/api/ai', aiRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/users', userRoutes);

// Health check
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// 404 handler
app.use((_req, res) => {
  res.status(404).json({ message: 'Route not found' });
});

// Error handler
app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error('Unhandled error:', err);
  const isDev = config.nodeEnv === 'development';
  res.status(500).json({
    message: isDev ? (err?.message || 'Internal server error') : 'Internal server error',
    ...(isDev && { stack: err?.stack }),
  });
});

// Start server
const startServer = async () => {
  try {
    await connectDB();
    app.listen(config.port, () => {
      console.log(`\n🚀 LifeAdmin server running on http://localhost:${config.port}`);
      console.log(`📊 Environment: ${config.nodeEnv}`);
      console.log(`🗄️  MongoDB: ${config.mongodbUri.includes('localhost') ? 'local' : 'Atlas'}\n`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
};

startServer();

export default app;
