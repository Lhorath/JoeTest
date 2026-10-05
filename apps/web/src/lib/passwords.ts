import argon2 from "argon2";
import { isDevFixturesEnabled } from "./runtime-mode";

export async function hashPassword(password: string): Promise<string> {
  return argon2.hash(password, {
    type: argon2.argon2id,
    memoryCost: 19456,
    timeCost: 2,
    parallelism: 1,
  });
}

export async function passwordMatches(
  storedHash: string,
  attempt: string,
): Promise<boolean> {
  if (storedHash.startsWith("$argon2")) {
    try {
      return await argon2.verify(storedHash, attempt);
    } catch {
      return false;
    }
  }
  // Seeded sandbox accounts store a plaintext password only while fixtures are on.
  if (isDevFixturesEnabled()) {
    return storedHash === attempt;
  }
  return false;
}
