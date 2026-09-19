import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
} from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { IS_PUBLIC_KEY } from "../decorators/auth.decorators";
import { CookieService } from "../services/cookie.service";
import { SessionService } from "../services/session.service";
import { Request } from "express";

@Injectable()
export class SessionGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly cookieService: CookieService,
    private readonly sessionService: SessionService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (isPublic) {
      return true;
    }

    const request = context.switchToHttp().getRequest<Request>();
    const cookieHeader = request.headers.cookie;

    const rawToken = this.cookieService.parseSessionToken(cookieHeader);
    if (!rawToken) {
      throw new UnauthorizedException("Authentication required");
    }

    try {
      // validateSession also resolves and attaches roles and effective permissions!
      const user = await this.sessionService.validateSession(rawToken);
      (request as any).user = user;
      return true;
    } catch (error) {
      // Clear cookie if session is invalid to reset client state securely
      const response = context.switchToHttp().getResponse();
      response.setHeader(
        "Set-Cookie",
        this.cookieService.createClearSessionCookie(),
      );
      throw new UnauthorizedException("Session invalid or expired");
    }
  }
}
