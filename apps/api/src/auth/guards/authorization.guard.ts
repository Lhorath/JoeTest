import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { ROLES_KEY, PERMISSIONS_KEY } from "../decorators/auth.decorators";
import { Role, AdminPermission } from "@platform/types";
import { AuthenticatedUser, hasPermission } from "@platform/auth";

@Injectable()
export class AuthorizationGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<Role[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    const requiredPermissions = this.reflector.getAllAndOverride<
      AdminPermission[]
    >(PERMISSIONS_KEY, [context.getHandler(), context.getClass()]);

    if (!requiredRoles && !requiredPermissions) {
      return true; // No specific roles or permissions required beyond being authenticated
    }

    const request = context.switchToHttp().getRequest();
    const user: AuthenticatedUser = request.user;

    if (!user) {
      throw new ForbiddenException("Authentication required for authorization");
    }

    // Role check (any required role is sufficient)
    if (requiredRoles && requiredRoles.length > 0) {
      const hasRole = requiredRoles.some((role) => user.roles.includes(role));
      if (!hasRole && !user.roles.includes(Role.OWNER_ADMIN)) {
        throw new ForbiddenException("Insufficient role privileges");
      }
    }

    // Permission check (must have all required permissions)
    if (requiredPermissions && requiredPermissions.length > 0) {
      const hasAllPermissions = requiredPermissions.every((perm) =>
        hasPermission(user, perm),
      );
      if (!hasAllPermissions) {
        throw new ForbiddenException("Insufficient permissions");
      }
    }

    return true;
  }
}
