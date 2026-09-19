import { SetMetadata } from "@nestjs/common";
import { Role, AdminPermission } from "@platform/types";

export const IS_PUBLIC_KEY = "isPublic";
export const PublicRoute = () => SetMetadata(IS_PUBLIC_KEY, true);

export const ROLES_KEY = "roles";
export const RequiredRoles = (...roles: Role[]) =>
  SetMetadata(ROLES_KEY, roles);

export const PERMISSIONS_KEY = "permissions";
export const RequiredPermissions = (...permissions: AdminPermission[]) =>
  SetMetadata(PERMISSIONS_KEY, permissions);
