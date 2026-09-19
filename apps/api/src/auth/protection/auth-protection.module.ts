import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { AuthProtectionService } from "./auth-protection.service";

@Module({
  imports: [ConfigModule],
  providers: [AuthProtectionService],
  exports: [AuthProtectionService],
})
export class AuthProtectionModule {}
