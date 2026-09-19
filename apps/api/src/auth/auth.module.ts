import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { PrismaClient } from "@platform/database";
import { AuthProtectionModule } from "./protection/auth-protection.module";
import { CookieService } from "./services/cookie.service";
import { SessionService } from "./services/session.service";
import { UserRepository } from "./repositories/user.repository";
import { SessionRepository } from "./repositories/session.repository";
import { SecurityEventRepository } from "./repositories/security-event.repository";
import { TokenRepository } from "./repositories/token.repository";
import { AuthService } from "./services/auth.service";
import { AuthController } from "./controllers/auth.controller";
import { AdminInvitationService } from "./services/admin-invitation.service";
import { AdminInvitationController } from "./controllers/admin-invitation.controller";
import { MailModule } from "../mail/mail.module";

@Module({
  imports: [ConfigModule, AuthProtectionModule, MailModule],
  controllers: [AuthController, AdminInvitationController],
  providers: [
    {
      provide: PrismaClient,
      useValue: new PrismaClient(),
    },
    CookieService,
    SessionService,
    AuthService,
    AdminInvitationService,
    UserRepository,
    SessionRepository,
    SecurityEventRepository,
    TokenRepository,
  ],
  exports: [
    AuthProtectionModule,
    SessionService,
    CookieService,
    UserRepository,
    TokenRepository,
  ],
})
export class AuthModule {}
