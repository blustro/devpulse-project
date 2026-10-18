import dotenv from 'dotenv';
import path from 'path';
import { defineConfig, env } from 'prisma/config';

export default defineConfig({
  schema: 'backend/prisma/schema.prisma',
  datasource: {
    url: env('DATABASE_URL'), // Safe: reads from environment variables
  },
});
