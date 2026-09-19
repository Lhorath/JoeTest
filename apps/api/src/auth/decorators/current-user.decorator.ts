import { createParamDecorator, ExecutionContext } from "@nestjs/common";
import { AuthenticatedUser } from "@platform/auth";

export const CurrentUser = createParamDecorator(
  (data: unknown, ctx: ExecutionContext): AuthenticatedUser => {
    const request = ctx.switchToHttp().getRequest();
    return request.user;
  },
);
