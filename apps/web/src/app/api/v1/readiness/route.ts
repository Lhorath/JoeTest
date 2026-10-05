import { NextResponse } from "next/server";
import { testDbConnection } from "@platform/database";
import { isDevFixturesEnabled } from "@/lib/runtime-mode";
import { storageConfigured } from "@/lib/object-storage";

export const dynamic = "force-dynamic";

export async function GET() {
  const fixtures = isDevFixturesEnabled();
  const database = process.env.DATABASE_URL ? await testDbConnection() : false;
  const storage = storageConfigured();
  const production = process.env.NODE_ENV === "production";
  const ready = !production || (!fixtures && database && storage);

  return NextResponse.json(
    {
      status: ready ? "ready" : "not_ready",
      services: {
        database: database ? "healthy" : "unavailable",
        storage: storage ? "configured" : "missing",
        fixtures: fixtures ? "enabled" : "disabled",
      },
    },
    { status: ready ? 200 : 503 },
  );
}
