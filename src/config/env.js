const { z } = require('zod');
const dotenv = require('dotenv');

dotenv.config();

const envSchema = z.object({
  PORT: z.string().default('5000'),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  MONGO_URI: z.string(),
  JWT_SECRET: z.string(),
  GEMINI_API_KEY: z.string().optional(), // Make optional so app doesn't crash immediately without it
});

const _env = envSchema.safeParse(process.env);

if (!_env.success) {
  console.error('❌ Invalid environment variables:', _env.error.format());
  // Export raw env so server can at least boot and return API errors
  module.exports = process.env;
} else {
  module.exports = _env.data;
}
