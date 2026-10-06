import app from './app';
import config from './config';
import connectDB from './config/database';

// Start server
const startServer = async () => {
  try {
    await connectDB();
    app.listen(config.port, () => {
      console.log(`\n🚀 LifeAdmin server running on http://localhost:${config.port}`);
      console.log(`📊 Environment: ${config.nodeEnv}`);
      const isLocal = config.mongodbUri.includes('localhost') || config.mongodbUri.includes('127.0.0.1');
      console.log(`🗄️  MongoDB: ${isLocal ? 'local' : 'Atlas'}\n`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
};

startServer();

export default app;
