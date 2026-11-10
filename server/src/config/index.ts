import path from 'path';
import dotenv from 'dotenv';

// Explicitly load server/.env if present, then fallback to cwd .env
dotenv.config({ path: path.resolve(__dirname, '../../.env') });
dotenv.config();

const config = {
  port: parseInt(process.env.PORT || '5000', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
  
  // MongoDB — strictly required from server/.env, no silent fallback
  mongodbUri: (process.env.MONGODB_URI || '').trim(),
  
  // JWT
  jwtSecret: process.env.JWT_SECRET || 'dev-secret-key',
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '7d',
  
  // Google OAuth
  googleClientId: process.env.GOOGLE_CLIENT_ID || '',
  googleClientSecret: process.env.GOOGLE_CLIENT_SECRET || '',
  googleCallbackUrl: process.env.GOOGLE_CALLBACK_URL || 'http://localhost:5000/api/auth/google/callback',
  
  // Google Gemini AI
  geminiApiKey: process.env.GEMINI_API_KEY || '',
  get geminiModel(): string {
    return (process.env.GEMINI_MODEL || 'gemini-3.5-flash-lite').trim();
  },
  
  // Client / Public Web Application URL (getter to reflect runtime environment updates)
  get clientUrl(): string {
    return (process.env.APP_URL || process.env.CLIENT_URL || 'http://localhost:5173').trim();
  },
  get appUrl(): string {
    return (process.env.APP_URL || process.env.CLIENT_URL || '').trim();
  },
  
  // File Upload
  maxFileSize: parseInt(process.env.MAX_FILE_SIZE || '10485760', 10),
  uploadDir: process.env.UPLOAD_DIR || 'uploads',

  // SMTP Email Configuration (getter to dynamically reflect environment updates in tests & runtime)
  get smtp() {
    return {
      host: (process.env.SMTP_HOST || '').trim(),
      port: parseInt(process.env.SMTP_PORT || '587', 10),
      user: (process.env.SMTP_USER || '').trim(),
      pass: (process.env.SMTP_PASS || '').trim(),
      from: (process.env.SMTP_FROM || 'noreply@lifeadmin.local').trim(),
      secure: process.env.SMTP_SECURE !== undefined
        ? process.env.SMTP_SECURE === 'true'
        : parseInt(process.env.SMTP_PORT || '587', 10) === 465,
    };
  },
};

export default config;
