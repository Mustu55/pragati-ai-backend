const app = require('../src/app');
const connectDB = require('../src/config/db');
const logger = require('../src/utils/logger');

// Connect to Database (non-blocking for serverless, catching synchronous and async errors)
try {
  connectDB().catch(err => {
    logger.error(`Failed to connect to MongoDB: ${err.message}`);
  });
} catch (err) {
  logger.error(`Failed to initiate MongoDB connection: ${err.message}`);
}

// Export for Vercel serverless
module.exports = app;
