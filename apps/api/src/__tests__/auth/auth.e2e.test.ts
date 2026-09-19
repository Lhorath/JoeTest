import { Test, TestingModule } from "@nestjs/testing";
import {
  INestApplication,
  VersioningType,
  ValidationPipe,
} from "@nestjs/common";
import request from "supertest";
import { AppModule } from "../../app.module";
import {
  describe,
  it,
  expect,
  beforeAll,
  afterAll,
  vi,
  beforeEach,
} from "vitest";
import { PrismaClient } from "@platform/database";
import { InMemoryMailDeliveryService } from "../../mail/mail.service";

// Mock ioredis completely to prevent attempting local socket connections during integration testing
vi.mock("ioredis", () => {
  let store: Record<string, string> = {};
  return {
    default: vi.fn().mockImplementation(() => {
      return {
        ping: vi.fn().mockResolvedValue("PONG"),
        disconnect: vi.fn(),
        on: vi.fn(),
        get: vi.fn(async (key: string) => store[key] || null),
        setex: vi.fn(async (key: string, ttl: number, val: string) => {
          store[key] = val;
          return "OK";
        }),
        del: vi.fn(async (key: string) => {
          delete store[key];
          return 1;
        }),
        incr: vi.fn(async (key: string) => {
          const val = (parseInt(store[key] || "0", 10) || 0) + 1;
          store[key] = val.toString();
          return val;
        }),
        expire: vi.fn().mockResolvedValue(1),
        quit: vi.fn().mockResolvedValue("OK"),
        // Reset helper for tests
        flushall: vi.fn(() => {
          store = {};
        }),
      };
    }),
  };
});

describe("TheQueue Auth API Integration Flows", () => {
  let app: INestApplication;
  let prisma: PrismaClient;
  let mailService: InMemoryMailDeliveryService;
  let isDbAvailable = false;

  beforeAll(async () => {
    // Suppress verbose logging during tests
    process.env.LOG_LEVEL = "error";
    process.env.NODE_ENV = "test";

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();

    // Wire up global pipes and versioning to match main application setup exactly
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        transform: true,
        forbidNonWhitelisted: true,
        transformOptions: { enableImplicitConversion: true },
      }),
    );
    app.setGlobalPrefix("api");
    app.enableVersioning({
      type: VersioningType.URI,
      defaultVersion: "1",
    });

    await app.init();

    // We use a real test database so we can test the transactions.
    prisma = app.get(PrismaClient);

    mailService = app.get(InMemoryMailDeliveryService);

    try {
      await prisma.$queryRaw`SELECT 1`;
      isDbAvailable = true;
    } catch {
      isDbAvailable = false;
    }
  });

  afterAll(async () => {
    try {
      await prisma.$disconnect();
    } catch (e) {}
    await app.close();
  });

  beforeEach(async () => {
    if (!prisma || !isDbAvailable) return;
    try {
      await prisma.$executeRawUnsafe(`TRUNCATE TABLE "user_sessions" CASCADE`);
      await prisma.$executeRawUnsafe(
        `TRUNCATE TABLE "authentication_attempts" CASCADE`,
      );
      await prisma.$executeRawUnsafe(
        `TRUNCATE TABLE "user_security_events" CASCADE`,
      );
      await prisma.$executeRawUnsafe(
        `TRUNCATE TABLE "user_role_assignments" CASCADE`,
      );
      await prisma.$executeRawUnsafe(
        `TRUNCATE TABLE "user_permission_assignments" CASCADE`,
      );
      await prisma.$executeRawUnsafe(
        `TRUNCATE TABLE "email_verification_token_records" CASCADE`,
      );
      await prisma.$executeRawUnsafe(
        `TRUNCATE TABLE "password_reset_token_records" CASCADE`,
      );
      await prisma.$executeRawUnsafe(
        `TRUNCATE TABLE "admin_audit_logs" CASCADE`,
      );
      await prisma.$executeRawUnsafe(
        `TRUNCATE TABLE "admin_role_changes" CASCADE`,
      );
      await prisma.$executeRawUnsafe(
        `TRUNCATE TABLE "admin_invitations" CASCADE`,
      );
      await prisma.$executeRawUnsafe(`TRUNCATE TABLE "users" CASCADE`);
    } catch (err) {
      // Intentionally swallow errors here if the DB hasn't been instantiated correctly
      // (like in environment setup failures, handled elsewhere)
    }

    mailService.clear();
  });

  it("should complete full register -> verify -> login -> protected route flow", async () => {
    if (!isDbAvailable) return;
    // 1. Register
    const registerPayload = {
      email: "test@example.com",
      username: "testuser",
      displayName: "Test User",
      password: "StrongPassword!123",
      passwordConfirmation: "StrongPassword!123",
      acceptTerms: true,
    };

    await request(app.getHttpServer())
      .post("/api/v1/auth/register")
      .send(registerPayload)
      .expect(201);

    // Verify email was sent and capture token
    expect(mailService.sentEmails.length).toBe(1);
    const verificationToken = mailService.sentEmails[0].token;

    // 2. Verify Email
    await request(app.getHttpServer())
      .post("/api/v1/auth/email-verification/confirm")
      .send({ token: verificationToken })
      .expect(201);

    // 3. Login
    const loginRes = await request(app.getHttpServer())
      .post("/api/v1/auth/login")
      .send({
        email: "test@example.com",
        password: "StrongPassword!123",
      })
      .expect(201);

    // Expect cookie
    const cookie = loginRes.headers["set-cookie"][0];
    expect(cookie).toContain("queue_sid=");
    expect(cookie).toContain("HttpOnly");

    // 4. Authenticated Request (/api/v1/auth/me)
    const meRes = await request(app.getHttpServer())
      .get("/api/v1/auth/me")
      .set("Cookie", cookie)
      .expect(200);

    expect(meRes.body.user).toHaveProperty("email", "test@example.com");
    expect(meRes.body.user).toHaveProperty("accountStatus", "ACTIVE");
    expect(meRes.body.user).toHaveProperty("emailVerified", true);
    expect(meRes.body.user.roles).toContain("USER");

    // 5. Logout
    const logoutRes = await request(app.getHttpServer())
      .post("/api/v1/auth/logout")
      .set("Cookie", cookie)
      .expect(201);

    const logoutCookie = logoutRes.headers["set-cookie"][0];
    expect(logoutCookie).toContain("Max-Age=0");

    // 6. Rejected after logout
    await request(app.getHttpServer())
      .get("/api/v1/auth/me")
      .set("Cookie", cookie) // Send the old cookie
      .expect(401);
  });

  it("should rotate session and invalidate old ones on password reset", async () => {
    if (!isDbAvailable) return;
    // 1. Setup user
    await request(app.getHttpServer())
      .post("/api/v1/auth/register")
      .send({
        email: "reset@example.com",
        username: "resetuser",
        displayName: "Reset User",
        password: "StrongPassword!123",
        passwordConfirmation: "StrongPassword!123",
        acceptTerms: true,
      })
      .expect(201);

    const vToken = mailService.sentEmails.find((e) =>
      e.subject.includes("Verify"),
    )?.token;
    await request(app.getHttpServer())
      .post("/api/v1/auth/email-verification/confirm")
      .send({ token: vToken });

    // 2. Login
    const loginRes = await request(app.getHttpServer())
      .post("/api/v1/auth/login")
      .send({ email: "reset@example.com", password: "StrongPassword!123" })
      .expect(201);

    const initialCookie = loginRes.headers["set-cookie"][0];

    // 3. Request Reset
    await request(app.getHttpServer())
      .post("/api/v1/auth/password-reset/request")
      .send({ email: "reset@example.com" })
      .expect(201);

    const resetToken = mailService.sentEmails.find((e) =>
      e.subject.includes("Password Reset"),
    )?.token;

    // 4. Confirm Reset
    await request(app.getHttpServer())
      .post("/api/v1/auth/password-reset/confirm")
      .send({ token: resetToken, password: "NewStrongPassword!123" })
      .expect(201);

    // 5. Old session should be invalid
    await request(app.getHttpServer())
      .get("/api/v1/auth/me")
      .set("Cookie", initialCookie)
      .expect(401);

    // 6. Login with new password
    await request(app.getHttpServer())
      .post("/api/v1/auth/login")
      .send({ email: "reset@example.com", password: "NewStrongPassword!123" })
      .expect(201);
  });

  it("should prevent login for banned accounts", async () => {
    if (!isDbAvailable) return;
    // Setup and verify
    await request(app.getHttpServer()).post("/api/v1/auth/register").send({
      email: "banned@example.com",
      username: "banneduser",
      displayName: "Banned User",
      password: "StrongPassword!123",
      passwordConfirmation: "StrongPassword!123",
      acceptTerms: true,
    });

    const vToken = mailService.sentEmails[0].token;
    await request(app.getHttpServer())
      .post("/api/v1/auth/email-verification/confirm")
      .send({ token: vToken });

    // Manually ban them
    const user = await prisma.user.findUnique({
      where: { email: "banned@example.com" },
    });
    await prisma.user.update({
      where: { id: user!.id },
      data: { accountStatus: "BANNED" },
    });

    // Attempt login
    await request(app.getHttpServer())
      .post("/api/v1/auth/login")
      .send({ email: "banned@example.com", password: "StrongPassword!123" })
      .expect(401); // Unauthorized
  });
});
