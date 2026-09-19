#!/bin/sh

echo "🔍 Running fast local pre-commit verification..."

# 1. Check Formatting
echo "👉 Checking formatting (Prettier)..."
pnpm format:check
if [ $? -ne 0 ]; then
  echo "❌ Formatting errors detected. Run 'pnpm format' to resolve."
  exit 1
fi

# 2. Run Typechecks on packages & api
echo "👉 Running strict typechecks..."
pnpm typecheck
if [ $? -ne 0 ]; then
  echo "❌ TypeScript compiler errors detected."
  exit 1
fi

echo "✅ All local pre-commit checks passed successfully!"
exit 0
