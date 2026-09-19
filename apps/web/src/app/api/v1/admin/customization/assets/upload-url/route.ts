import { NextRequest, NextResponse } from "next/server";
import { serverDb, getAuthenticatedUser } from "@/lib/server-state";
import { Role } from "@platform/types";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  const cookieHeader = request.headers.get("cookie");
  const user = getAuthenticatedUser(cookieHeader);

  if (!user) {
    return NextResponse.json(
      { message: "Authentication required", code: "UNAUTHORIZED" },
      { status: 401 },
    );
  }

  if (!user.roles.includes(Role.OWNER_ADMIN)) {
    return NextResponse.json(
      { message: "Administrator access required", code: "FORBIDDEN" },
      { status: 403 },
    );
  }

  const body = await request.json();
  const assetType = body.assetType || "logo";
  const id = `asset-${Date.now()}`;

  // Return asset upload mock url & direct target url
  const assetUrl = `/assets/branding/${assetType}-${id}.png`;
  const uploadUrl = `/api/v1/admin/customization/assets/mock-upload?id=${id}`;

  return NextResponse.json({
    uploadUrl,
    assetUrl,
  });
}
