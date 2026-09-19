import { Module } from "@nestjs/common";
import { IdempotencyService } from "./idempotency.service";
import { PrismaClient } from "@platform/database";

@Module({
  providers: [
    IdempotencyService,
    {
      provide: PrismaClient,
      useValue: new PrismaClient(),
    },
  ],
  exports: [IdempotencyService],
})
export class IdempotencyModule {}
