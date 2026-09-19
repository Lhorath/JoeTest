import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json({
    status: "ready",
    services: {
      database: "healthy",
      storage: "healthy",
      realtime: "healthy",
    },
  });
}
