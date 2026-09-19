import { Module } from "@nestjs/common";
import { SubmissionsController } from "./submissions.controller";
import { UserSubmissionsController } from "./user-submissions.controller";
import { SubmissionsService } from "./submissions.service";
import { SubmissionEligibilityService } from "./submission-eligibility.service";

import { LiveSessionsModule } from "../live-sessions/live-sessions.module";
import { IdempotencyModule } from "../common/idempotency/idempotency.module";
import { PaymentsModule } from "../payments/payments.module";
import { AuthProtectionModule } from "../auth/protection/auth-protection.module";
import { AuthModule } from "../auth/auth.module";
import { PrismaClient } from "@platform/database";

@Module({
  imports: [
    LiveSessionsModule,
    IdempotencyModule,
    PaymentsModule,
    AuthProtectionModule,
    AuthModule,
  ],
  controllers: [SubmissionsController, UserSubmissionsController],
  providers: [
    SubmissionsService,
    SubmissionEligibilityService,
    {
      provide: PrismaClient,
      useValue: new PrismaClient(),
    },
  ],
  exports: [SubmissionsService, SubmissionEligibilityService],
})
export class SubmissionsModule {}

