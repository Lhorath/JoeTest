import swc from "unplugin-swc";
import { defineConfig } from "vitest/config";

export default defineConfig({
  plugins: [
    swc.vite({
      module: { type: "es6" },
    }),
  ],
  test: {
    environment: "node",
    env: {
      DATABASE_URL: "postgresql://postgres:local_postgres_secret_123@localhost:5432/thequeue_dev?schema=public",
      NODE_ENV: "test",
      STRIPE_SECRET_KEY: "sk_test_dummy_key_for_testing",
      S3_REGION: "us-east-1",
      S3_ACCESS_KEY: "test-key",
      S3_SECRET_KEY: "test-secret",
    },
  },
});
