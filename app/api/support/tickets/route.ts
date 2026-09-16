import { NextResponse } from "next/server";
import { getRequestUser } from "@/lib/request-user";
import { db, ensureDatabase } from "@/lib/db";

export const dynamic = "force-dynamic";

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
      `SELECT id, subject, category, order_id, message, status, created_at, updated_at
       FROM vexo_support_tickets
       WHERE user_id = $1
       ORDER BY created_at DESC
       LIMIT 50`,
      [user.id]
    );

    const tickets = result.rows.map((r) => ({
      id: String(r.id),
      subject: r.subject,
      category: r.category,
      orderId: r.order_id,
      message: r.message,
      status: r.status,
      createdAt: r.created_at,
      updatedAt: r.updated_at,
    }));

    return NextResponse.json({ success: true, tickets });
  } catch (error) {
    console.error("VEXO GET TICKETS ERROR:", error);
    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Failed to load support tickets.",
      },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const user = await getRequestUser();
    if (!user) {
      return NextResponse.json(
        { success: false, error: "Authentication required." },
        { status: 401 }
      );
    }

    await ensureDatabase();

    const body = await request.json().catch(() => ({}));
    const subject = String(body.subject || "").trim();
    const category = String(body.category || "General Inquiry").trim();
    const orderId = body.orderId ? String(body.orderId).trim() : null;
    const message = String(body.message || "").trim();

    if (!subject || subject.length < 3) {
      return NextResponse.json(
        { success: false, error: "Please enter a subject (minimum 3 characters)." },
        { status: 400 }
      );
    }

    if (!message || message.length < 10) {
      return NextResponse.json(
        { success: false, error: "Please provide detailed information in your message (minimum 10 characters)." },
        { status: 400 }
      );
    }

    const insertResult = await db.query(
      `INSERT INTO vexo_support_tickets (user_id, subject, category, order_id, message, status)
       VALUES ($1, $2, $3, $4, $5, 'Open')
       RETURNING id, subject, category, order_id, message, status, created_at`,
      [user.id, subject, category, orderId, message]
    );

    const newTicket = insertResult.rows[0];

    return NextResponse.json({
      success: true,
      message: "Ticket submitted successfully! We will review and respond shortly.",
      ticket: {
        id: String(newTicket.id),
        subject: newTicket.subject,
        category: newTicket.category,
        orderId: newTicket.order_id,
        message: newTicket.message,
        status: newTicket.status,
        createdAt: newTicket.created_at,
      },
    });
  } catch (error) {
    console.error("VEXO CREATE TICKET ERROR:", error);
    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Failed to submit support ticket.",
      },
      { status: 500 }
    );
  }
}
