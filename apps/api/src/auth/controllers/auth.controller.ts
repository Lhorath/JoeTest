import {
  Controller,
  Post,
  Body,
  Req,
  Res,
  Get,
  UseGuards,
  Delete,
  Param,
} from "@nestjs/common";
import { Request, Response } from "express";
import { AuthService } from "../services/auth.service";
import { SessionService } from "../services/session.service";
import {
  SignUpInput,
  LoginInput,
  PasswordResetRequestInput,
  PasswordResetConfirmInput,
  EmailVerificationConfirmInput,
} from "@platform/validation";
import { CurrentUser } from "../decorators/current-user.decorator";
import { PublicRoute } from "../decorators/auth.decorators";
import { SessionGuard } from "../guards/session.guard";
import { AuthenticatedUser } from "@platform/auth";

@Controller("auth")
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly sessionService: SessionService,
  ) {}

  @PublicRoute()
  @Post("register")
  async register(@Body() input: SignUpInput, @Req() req: Request) {
    const ipAddress = req.ip || req.socket.remoteAddress || "unknown";
    await this.authService.register(input, ipAddress);
    return {
      success: true,
      message: "Registration successful. Please check your email to verify.",
    };
  }

  @PublicRoute()
  @Post("login")
  async login(
    @Body() input: LoginInput,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const ipAddress = req.ip || req.socket.remoteAddress || "unknown";
    const userAgent = req.headers["user-agent"];
    const { cookie } = await this.authService.login(
      input,
      ipAddress,
      userAgent,
    );

    res.setHeader("Set-Cookie", cookie);
    return { success: true };
  }

  @UseGuards(SessionGuard)
  @Post("logout")
  async logout(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    const ipAddress = req.ip || req.socket.remoteAddress || "unknown";
    const cookieHeader = req.headers.cookie || "";
    // Note: SessionGuard ensures the cookie is present and valid

    // In a real app we'd extract the token again, or attach it to the request via the guard
    // For now we extract it quickly:
    const { CookieService } = await import("../services/cookie.service");
    const cookieSvc = new CookieService(
      new (await import("@nestjs/config")).ConfigService(),
    );
    const rawToken = cookieSvc.parseSessionToken(cookieHeader);

    if (rawToken) {
      const clearCookie = await this.sessionService.revokeSession(
        rawToken,
        ipAddress,
      );
      res.setHeader("Set-Cookie", clearCookie);
    }
    return { success: true };
  }

  @UseGuards(SessionGuard)
  @Post("logout-all")
  async logoutAll(
    @CurrentUser() user: AuthenticatedUser,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const ipAddress = req.ip || req.socket.remoteAddress || "unknown";
    const clearCookie = await this.sessionService.revokeAllSessions(
      user.id,
      ipAddress,
    );
    res.setHeader("Set-Cookie", clearCookie);
    return { success: true };
  }

  @UseGuards(SessionGuard)
  @Get("me")
  async getMe(@CurrentUser() user: AuthenticatedUser) {
    return {
      user: {
        id: user.id,
        email: user.email,
        username: user.username,
        displayName: user.displayName,
        roles: user.roles,
        permissions: Array.from(user.permissions),
        accountStatus: user.accountStatus,
        emailVerified: user.emailVerified,
      },
    };
  }

  @PublicRoute()
  @Post("email-verification/confirm")
  async verifyEmail(
    @Body() input: EmailVerificationConfirmInput,
    @Req() req: Request,
  ) {
    const ipAddress = req.ip || req.socket.remoteAddress || "unknown";
    await this.authService.verifyEmail(input, ipAddress);
    return { success: true };
  }

  @PublicRoute()
  @Post("password-reset/request")
  async requestPasswordReset(
    @Body() input: PasswordResetRequestInput,
    @Req() req: Request,
  ) {
    const ipAddress = req.ip || req.socket.remoteAddress || "unknown";
    await this.authService.requestPasswordReset(input, ipAddress);
    // Neutral response
    return {
      success: true,
      message: "If an account exists, a reset link has been sent.",
    };
  }

  @PublicRoute()
  @Post("password-reset/confirm")
  async confirmPasswordReset(
    @Body() input: PasswordResetConfirmInput,
    @Req() req: Request,
  ) {
    const ipAddress = req.ip || req.socket.remoteAddress || "unknown";
    await this.authService.confirmPasswordReset(input, ipAddress);
    return { success: true };
  }
}
