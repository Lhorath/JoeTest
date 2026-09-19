import { Module } from "@nestjs/common";
import { ConfigModule, ConfigService } from "@nestjs/config";
import {
  NodemailerMailDeliveryService,
  InMemoryMailDeliveryService,
} from "./mail.service";

@Module({
  imports: [ConfigModule],
  providers: [
    InMemoryMailDeliveryService,
    NodemailerMailDeliveryService,
    {
      provide: "MailDeliveryService",
      useFactory: (
        configService: ConfigService,
        inMemory: InMemoryMailDeliveryService,
        nodeMailer: NodemailerMailDeliveryService,
      ) => {
        const isTest = configService.get<string>("NODE_ENV") === "test";
        return isTest ? inMemory : nodeMailer;
      },
      inject: [
        ConfigService,
        InMemoryMailDeliveryService,
        NodemailerMailDeliveryService,
      ],
    },
  ],
  exports: ["MailDeliveryService", InMemoryMailDeliveryService],
})
export class MailModule {}
