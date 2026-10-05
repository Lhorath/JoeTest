export async function register() {
  if (process.env.NEXT_PHASE === "phase-production-build") return;
  if (process.env.NODE_ENV !== "production") return;
  const { validateWebServerEnv } = await import("@platform/validation");
  validateWebServerEnv(process.env);
}
