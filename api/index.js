const app = require('../src/app');
const connectDB = require('../src/config/db');
const logger = require('../src/utils/logger');

// Connect to Database (non-blocking for serverless)
connectDB().catch(err => {
  logger.error(`Failed to connect to MongoDB: ${err.message}`);
});

// Export for Vercel serverless
module.exports = app;
