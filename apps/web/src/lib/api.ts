import { createApiClient } from "@platform/api-client";

// In browser, this defaults to same-origin /api/v1 or explicit custom NEXT_PUBLIC_API_URL
const getApiBaseUrl = () => {
  if (typeof window !== "undefined") {
    const publicUrl = process.env.NEXT_PUBLIC_API_URL;
    if (
      publicUrl &&
      !publicUrl.includes("localhost:4000") &&
      !publicUrl.includes("127.0.0.1:4000")
    ) {
      return publicUrl;
    }
    return "/api/v1";
  }
  return process.env.API_URL || "http://127.0.0.1:3000/api/v1";
};

export const api = createApiClient({
  baseURL: getApiBaseUrl(),
});
