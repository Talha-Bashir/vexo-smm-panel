import { NextResponse } from "next/server";
import { getRequestUser } from "@/lib/request-user";
import { getCorsHeaders, handleCorsPreflight } from "@/lib/cors";

export async function OPTIONS(request: Request) {
  return handleCorsPreflight(request.headers.get("origin"));
}

export async function GET(request: Request) {
  const origin = request.headers.get("origin");
  const corsHeaders = getCorsHeaders(origin);

  try {
    const user = await getRequestUser();
    if (!user) {
      return NextResponse.json(
        { success: false, user: null },
        { status: 401, headers: corsHeaders }
      );
    }

    return NextResponse.json({ success: true, user }, { headers: corsHeaders });
  } catch (error) {
    console.error("VEXO AUTH CHECK ERROR:", error);
    return NextResponse.json(
      { success: false, user: null },
      { status: 500, headers: corsHeaders }
    );
  }
}

