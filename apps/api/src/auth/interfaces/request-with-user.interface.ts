import { Request } from "express";
import { AuthenticatedUser } from "@platform/auth";

export interface RequestWithUser extends Request {
  user: AuthenticatedUser;
}
