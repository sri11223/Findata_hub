import { z } from 'zod';

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.coerce.number().default(3000),
  DATABASE_URL: z.string().min(1, 'DATABASE_URL is required'),
  JWT_ACCESS_SECRET: z.string().min(1, 'JWT_ACCESS_SECRET is required'),
  JWT_REFRESH_SECRET: z.string().min(1, 'JWT_REFRESH_SECRET is required'),
  JWT_ACCESS_EXPIRES_IN: z.string().default('15m'),
  JWT_REFRESH_EXPIRES_IN: z.string().default('7d'),
  RATE_LIMIT_WINDOW_MS: z.coerce.number().default(900_000),
  RATE_LIMIT_MAX_REQUESTS: z.coerce.number().default(100),
  BCRYPT_SALT_ROUNDS: z.coerce.number().default(12),
  CORS_ORIGIN: z.string().default('*'),
  LOG_LEVEL: z.enum(['error', 'warn', 'info', 'debug']).default('info'),
});

export type EnvConfig = z.infer<typeof envSchema>;

function loadEnv(): EnvConfig {
  const result = envSchema.safeParse(process.env);

  if (!result.success) {
    const formatted = result.error.format();
    console.error('❌ Invalid environment variables:\n', JSON.stringify(formatted, null, 2));
    process.exit(1);
  }

  return result.data;
}

export const env = loadEnv();
