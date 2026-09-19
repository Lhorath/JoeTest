import {
  Controller,
  Get,
  Post,
  Param,
  Query,
  Body,
  UseGuards,
  Req,
} from "@nestjs/common";
import { SessionGuard } from "../auth/guards/session.guard";
import { AuthorizationGuard } from "../auth/guards/authorization.guard";
import { RequiredRoles, RequiredPermissions } from "../auth/decorators/auth.decorators";
import { Role, AdminPermission, AdminSubmissionFilterDto, AdminSubmissionActionDto } from "@platform/types";
import { RequestWithUser } from "../auth/interfaces/request-with-user.interface";
import { AdminSubmissionsService } from "./admin-submissions.service";

@Controller("admin/submissions")
@UseGuards(SessionGuard, AuthorizationGuard)
@RequiredRoles(Role.OWNER_ADMIN, Role.MODERATOR)
export class AdminSubmissionsController {
  constructor(private readonly submissionsService: AdminSubmissionsService) {}

  @Get()
  @RequiredPermissions(AdminPermission.CONTENT_MODERATE)
  async getSubmissions(@Query() query: AdminSubmissionFilterDto) {
    return this.submissionsService.getSubmissions(query);
  }

  @Get(":id")
  @RequiredPermissions(AdminPermission.CONTENT_MODERATE)
  async getSubmission(@Param("id") id: string) {
    return this.submissionsService.getSubmission(id);
  }

  @Post(":id/action")
  @RequiredPermissions(AdminPermission.CONTENT_MODERATE)
  async moderateSubmission(
    @Req() req: RequestWithUser,
    @Param("id") id: string,
    @Body() body: AdminSubmissionActionDto,
  ) {
    return this.submissionsService.moderateSubmission(
      id,
      req.user.id,
      body,
    );
  }
}
