import { Module } from "@nestjs/common";
import { AdminTracksController } from "./admin-tracks.controller";
import { AdminTracksService } from "./admin-tracks.service";
import { AdminUsersController } from "./admin-users.controller";
import { AdminUsersService } from "./admin-users.service";
import { AdminDashboardController } from "./admin-dashboard.controller";
import { AdminDashboardService } from "./admin-dashboard.service";
import { AdminSubmissionsController } from "./admin-submissions.controller";
import { AdminSubmissionsService } from "./admin-submissions.service";
import { AdminHostsController } from "./admin-hosts.controller";
import { AdminHostsService } from "./admin-hosts.service";
import { AdminStationsController } from "./admin-stations.controller";
import { AdminStationsService } from "./admin-stations.service";
import { AdminLiveSessionsController } from "./admin-live-sessions.controller";
import { AdminLiveSessionsService } from "./admin-live-sessions.service";
import { AdminLedgerController } from "./admin-ledger.controller";
import { AdminLedgerService } from "./admin-ledger.service";
import { AdminPaymentsController } from "./admin-payments.controller";
import { AdminPaymentsService } from "./admin-payments.service";
import { AdminReconciliationController } from "./admin-reconciliation.controller";
import { AdminReconciliationService } from "./admin-reconciliation.service";
import { AdminReservationsController } from "./admin-reservations.controller";
import { AdminReservationsService } from "./admin-reservations.service";
import { AdminAuditLogsController } from "./admin-audit-logs.controller";
import { AdminAuditLogsService } from "./admin-audit-logs.service";
import { AdminMediaController } from "./admin-media.controller";
import { PrismaClient } from "@platform/database";
import { TracksModule } from "../tracks/tracks.module";
import { AuthModule } from "../auth/auth.module";
import { MediaProcessingQueueService } from "../tracks/media-processing-queue.service";
import { BullModule } from "@nestjs/bullmq";
import { MEDIA_PROCESSING_QUEUE } from "../tracks/media-processing-queue.service";

@Module({
  imports: [
    AuthModule,
    TracksModule,
    BullModule.registerQueue({
      name: MEDIA_PROCESSING_QUEUE,
    }),
  ],
  controllers: [
    AdminTracksController,
    AdminUsersController,
    AdminDashboardController,
    AdminSubmissionsController,
    AdminHostsController,
    AdminStationsController,
    AdminLiveSessionsController,
    AdminLedgerController,
    AdminPaymentsController,
    AdminReconciliationController,
    AdminReservationsController,
    AdminAuditLogsController,
    AdminMediaController,
  ],
  providers: [
    AdminTracksService,
    AdminUsersService,
    AdminDashboardService,
    AdminSubmissionsService,
    AdminHostsService,
    AdminStationsService,
    AdminLiveSessionsService,
    AdminLedgerService,
    AdminPaymentsService,
    AdminReconciliationService,
    AdminReservationsService,
    AdminAuditLogsService,
    PrismaClient,
    MediaProcessingQueueService,
  ],
  exports: [
    AdminTracksService,
    AdminUsersService,
    AdminDashboardService,
    AdminSubmissionsService,
    AdminHostsService,
    AdminStationsService,
    AdminLiveSessionsService,
    AdminLedgerService,
    AdminPaymentsService,
    AdminReconciliationService,
    AdminReservationsService,
    AdminAuditLogsService,
  ],
})
export class AdminTracksModule {}

