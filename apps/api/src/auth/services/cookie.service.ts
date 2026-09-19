import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { serialize, parse } from "cookie";

export const SESSION_COOKIE_NAME = "queue_sid";

@Injectable()
export class CookieService {
  private readonly isProduction: boolean;

  constructor(private configService: ConfigService) {
    this.isProduction = process.env.NODE_ENV === "production";
  }

  createSessionCookie(sessionToken: string, maxAgeSeconds: number): string {
    return serialize(SESSION_COOKIE_NAME, sessionToken, {
      httpOnly: true,
      secure: this.isProduction,
      sameSite: "lax", // Standard safe setting for general browser interactions
      path: "/",
      maxAge: maxAgeSeconds,
      // domain could be configured here if necessary
    });
  }

  createClearSessionCookie(): string {
    return serialize(SESSION_COOKIE_NAME, "", {
      httpOnly: true,
      secure: this.isProduction,
      sameSite: "lax",
      path: "/",
      maxAge: 0,
      expires: new Date(0),
    });
  }

  parseSessionToken(cookieHeader?: string): string | null {
    if (!cookieHeader) return null;
    const cookies = parse(cookieHeader);
    return cookies[SESSION_COOKIE_NAME] || null;
  }
}
