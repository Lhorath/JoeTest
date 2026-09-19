import { describe, it, expect } from "vitest";
import {
  signUpSchema,
  validatePasswordConfirmation,
} from "./index";

describe("Registration Password Confirmation & Validation", () => {
  const validUser = {
    email: "producer@example.com",
    username: "sound_designer",
    displayName: "Sound Designer",
    password: "StrongPassword123!",
    passwordConfirmation: "StrongPassword123!",
    acceptTerms: true,
  };

  it("should successfully validate when password and confirmation match and terms accepted", () => {
    const result = signUpSchema.safeParse(validUser);
    expect(result.success).toBe(true);
  });

  it("should fail validation when terms are not accepted", () => {
    const resultMissing = signUpSchema.safeParse({
      ...validUser,
      acceptTerms: undefined,
    });
    expect(resultMissing.success).toBe(false);

    const resultFalse = signUpSchema.safeParse({
      ...validUser,
      acceptTerms: false,
    });
    expect(resultFalse.success).toBe(false);
  });

  it("should fail validation when passwords do not match", () => {
    const result = signUpSchema.safeParse({
      ...validUser,
      passwordConfirmation: "DifferentPassword123!",
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      const confirmationError = result.error.errors.find(
        (err) => err.path.includes("passwordConfirmation"),
      );
      expect(confirmationError).toBeDefined();
      expect(confirmationError?.message).toBe("Passwords do not match");
    }
  });

  it("should fail validation when password confirmation is missing", () => {
    const { passwordConfirmation, ...missingConfirmation } = validUser;
    const result = signUpSchema.safeParse(missingConfirmation);
    expect(result.success).toBe(false);
  });

  it("should fail validation when password is too short", () => {
    const result = signUpSchema.safeParse({
      ...validUser,
      password: "123",
      passwordConfirmation: "123",
    });
    expect(result.success).toBe(false);
  });

  it("should test validatePasswordConfirmation helper correctly", () => {
    expect(
      validatePasswordConfirmation("SecurePass1!", "SecurePass1!"),
    ).toBe(true);
    expect(
      validatePasswordConfirmation("SecurePass1!", "MismatchPass2@"),
    ).toBe(false);
    expect(validatePasswordConfirmation("", "")).toBe(false);
  });
});
