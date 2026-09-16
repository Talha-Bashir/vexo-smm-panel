import { NextResponse } from "next/server";
import crypto from "crypto";
import { getRequestUser } from "@/lib/request-user";
import { db, ensureDatabase } from "@/lib/db";

export const dynamic = "force-dynamic";

function generateApiKey() {
  return "vx_live_" + crypto.randomBytes(24).toString("hex");
}

export async function GET() {
  try {
    const user = await getRequestUser();
    if (!user) {
      return NextResponse.json(
        { success: false, error: "Authentication required." },
        { status: 401 }
      );
    }

    await ensureDatabase();

    const result = await db.query(
      `SELECT api_key FROM vexo_users WHERE id = $1 LIMIT 1`,
      [user.id]
    );

    let apiKey = result.rows[0]?.api_key;

    if (!apiKey) {
      apiKey = generateApiKey();
      await db.query(
        `UPDATE vexo_users SET api_key = $1 WHERE id = $2`,
        [apiKey, user.id]
      );
    }

    return NextResponse.json({ success: true, apiKey });
  } catch (error) {
    console.error("VEXO GET API KEY ERROR:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Failed to load API key.",
      },
      { status: 500 }
    );
  }
}

export async function POST() {
  try {
    const user = await getRequestUser();
    if (!user) {
      return NextResponse.json(
        { success: false, error: "Authentication required." },
        { status: 401 }
      );
    }

    await ensureDatabase();

    const newApiKey = generateApiKey();

    await db.query(
      `UPDATE vexo_users SET api_key = $1 WHERE id = $2`,
      [newApiKey, user.id]
    );

    return NextResponse.json({
      success: true,
      apiKey: newApiKey,
      message: "New API key generated successfully. Any previous key has been revoked.",
    });
  } catch (error) {
    console.error("VEXO REGENERATE API KEY ERROR:", error);
    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Failed to regenerate API key.",
      },
      { status: 500 }
    );
  }
}
