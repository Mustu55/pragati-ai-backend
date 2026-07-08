const app = require('./app');
const connectDB = require('./config/db');
const logger = require('./utils/logger');

// Connect to Database (non-blocking for serverless)
connectDB().catch(err => {
  logger.error(`Failed to connect to MongoDB: ${err.message}`);
});

// For local development
if (!process.env.VERCEL) {
  const env = require('./config/env');
  const PORT = env.PORT || 5000;

  const server = app.listen(PORT, () => {
    logger.info(`Server running in ${env.NODE_ENV} mode on port ${PORT}`);
  });

  process.on('unhandledRejection', (err, promise) => {
    logger.error(`Error: ${err.message}`);
    server.close(() => process.exit(1));
  });
}

// Export for Vercel serverless
module.exports = app;
