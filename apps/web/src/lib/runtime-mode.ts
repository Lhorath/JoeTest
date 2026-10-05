import { devFixturesAllowed } from "@platform/validation";

/** Sandbox users, stations, and mock payments. Never true in production. */
export function isDevFixturesEnabled(): boolean {
  return devFixturesAllowed(process.env);
}
