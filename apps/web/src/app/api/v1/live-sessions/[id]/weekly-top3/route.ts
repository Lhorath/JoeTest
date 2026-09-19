import { NextRequest, NextResponse } from "next/server";
import { getSessionWeeklyTop3 } from "@/lib/server-state";

export const dynamic = "force-dynamic";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    if (!id) {
      return NextResponse.json(
        { message: "Session ID parameter is required", code: "BAD_REQUEST" },
        { status: 400 },
      );
    }

    const { searchParams } = new URL(request.url);
    const dateParam = searchParams.get("date");
    const referenceDate = dateParam ? new Date(dateParam) : new Date();

    const top3 = getSessionWeeklyTop3(id, referenceDate);
    return NextResponse.json(top3);
  } catch (error: any) {
    if (error?.message?.includes("not found")) {
      return NextResponse.json(
        { message: "Live session not found", code: "NOT_FOUND" },
        { status: 404 },
      );
    }
    return NextResponse.json(
      {
        message: error?.message || "Failed to fetch Weekly Top 3",
        code: "INTERNAL_ERROR",
      },
      { status: 500 },
    );
  }
}
