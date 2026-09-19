import {
  Controller,
  Post,
  Get,
  Body,
  Param,
  UseGuards,
  Req,
  Headers,
  BadRequestException,
} from "@nestjs/common";
import { Throttle, ThrottlerGuard } from "@nestjs/throttler";
import { SubmissionsService } from "./submissions.service";
import { SubmissionEligibilityService } from "./submission-eligibility.service";
import { SessionGuard } from "../auth/guards/session.guard";
import { RequestWithUser } from "../auth/interfaces/request-with-user.interface";
import { IsString, IsOptional, IsUUID } from "class-validator";
import { UpgradeSubmissionDto } from "./dto/upgrade-submission.dto";

export class CreateSubmissionDto {
  @IsUUID()
  sourceTrackId: string;

  @IsOptional()
  @IsUUID()
  artistIdentityId?: string;

  @IsOptional()
  @IsUUID()
  tierSnapshotId?: string;
}

@Controller("live-sessions")
@UseGuards(SessionGuard, ThrottlerGuard)
export class SubmissionsController {
  constructor(
    private readonly submissionsService: SubmissionsService,
    private readonly eligibilityService: SubmissionEligibilityService,
  ) {}

  @Get(":id/submission-eligibility")
  async getEligibility(@Req() req: RequestWithUser, @Param("id") id: string) {
    return this.eligibilityService.getEligibility(req.user.id, id);
  }

  @Post(":id/submissions")
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  async createSubmission(
    @Req() req: RequestWithUser,
    @Param("id") id: string,
    @Body() dto: CreateSubmissionDto,
    @Headers("idempotency-key") idempotencyKey?: string,
  ) {
    if (!idempotencyKey) {
      throw new BadRequestException("Idempotency-Key header is required");
    }
    return this.submissionsService.createSubmission(
      req.user.id,
      id,
      dto,
      idempotencyKey,
    );
  }
}
