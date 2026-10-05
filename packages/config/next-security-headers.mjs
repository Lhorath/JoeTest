const baseCsp = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline' https://js.stripe.com",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob: https:",
  "media-src 'self' blob: https:",
  "connect-src 'self' https: wss:",
  "frame-src https://js.stripe.com https://hooks.stripe.com",
  "base-uri 'self'",
  "form-action 'self'",
  "object-src 'none'",
].join("; ");

function headerList(frameAncestors) {
  const headers = [
    { key: "Content-Security-Policy", value: `${baseCsp}; frame-ancestors ${frameAncestors}` },
    { key: "X-Content-Type-Options", value: "nosniff" },
    { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
    { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
    { key: "X-DNS-Prefetch-Control", value: "off" },
  ];
  if (process.env.NODE_ENV === "production") {
    headers.push({
      key: "Strict-Transport-Security",
      value: "max-age=31536000; includeSubDomains",
    });
  }
  return headers;
}

export function securityHeaders() {
  return [
    { source: "/overlay/:path*", headers: headerList("*") },
    { source: "/:path*", headers: headerList("'self'") },
  ];
}
