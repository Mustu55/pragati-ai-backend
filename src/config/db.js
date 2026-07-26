const mongoose = require('mongoose');
const env = require('./env');
const logger = require('../utils/logger');

const connectDB = async () => {
  if (mongoose.connection.readyState === 1) {
    return mongoose.connection;
  }

  if (!env.MONGO_URI) {
    const error = new Error('MONGO_URI is not configured');
    logger.error(error.message);
    throw error;
  }

  try {
    const conn = await mongoose.connect(env.MONGO_URI, {
      serverSelectionTimeoutMS: 15000,
      maxPoolSize: 10,
      socketTimeoutMS: 45000,
    });
    logger.info(`MongoDB Connected: ${conn.connection.host}`);
    return conn;
  } catch (error) {
    logger.error(`Error connecting to MongoDB: ${error.message}`);
    throw error;
  }
};

const ensureDbConnection = async () => {
  if (mongoose.connection.readyState === 1) {
    return;
  }

  await connectDB();
};

module.exports = connectDB;
module.exports.ensureDbConnection = ensureDbConnection;
