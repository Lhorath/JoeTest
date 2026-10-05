import { createApiClient } from "@platform/api-client";

// In browser, this defaults to same-origin /api/v1 or explicit custom NEXT_PUBLIC_API_URL
const getApiBaseUrl = () => {
  if (typeof window !== "undefined") {
    const publicUrl = process.env.NEXT_PUBLIC_API_URL;
    if (publicUrl && !/(localhost|127\.0\.0\.1)/.test(publicUrl)) {
      return publicUrl;
    }
    return "/api/v1";
  }
  const configured = process.env.API_URL;
  if (configured && !/(localhost|127\.0\.0\.1)/.test(configured)) {
    return configured;
  }
  // Server-side calls stay on this web process. The browser uses a relative /api/v1.
  const port = process.env.PORT || "3000";
  return `http://127.0.0.1:${port}/api/v1`;
};

export const api = createApiClient({
  baseURL: getApiBaseUrl(),
});
