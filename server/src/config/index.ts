import dotenv from 'dotenv';
dotenv.config();

const config = {
  port: parseInt(process.env.PORT || '5000', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
  
  // MongoDB
  mongodbUri: process.env.MONGODB_URI || 'mongodb://localhost:27017/lifeadmin',
  
  // JWT
  jwtSecret: process.env.JWT_SECRET || 'dev-secret-key',
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '7d',
  
  // Google OAuth
  googleClientId: process.env.GOOGLE_CLIENT_ID || '',
  googleClientSecret: process.env.GOOGLE_CLIENT_SECRET || '',
  googleCallbackUrl: process.env.GOOGLE_CALLBACK_URL || 'http://localhost:5000/api/auth/google/callback',
  
  // Google Gemini AI
  geminiApiKey: process.env.GEMINI_API_KEY || '',
  
  // Client URL
  clientUrl: process.env.CLIENT_URL || 'http://localhost:5173',
  
  // File Upload
  maxFileSize: parseInt(process.env.MAX_FILE_SIZE || '10485760', 10),
  uploadDir: process.env.UPLOAD_DIR || 'uploads',
};

export default config;
