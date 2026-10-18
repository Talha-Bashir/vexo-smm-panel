import { NextResponse } from "next/server";
import { db, ensureDatabase } from "@/lib/db";
import { getRequestUser } from "@/lib/request-user";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * Validates request authorization:
 * - Bearer token matching CRON_SECRET or query param ?secret=CRON_SECRET
 * - OR legitimate Vercel Cron headers (user-agent: vercel-cron or x-vercel-cron-schedule)
 * - OR request originating from localhost in development
 * - OR authenticated Admin user
 */
async function isAuthorized(request: Request): Promise<boolean> {
  const cronSecret = process.env.CRON_SECRET?.trim().replace(/^["']|["']$/g, "");
  const url = new URL(request.url);
  const querySecret = url.searchParams.get("secret")?.trim().replace(/^["']|["']$/g, "");

  const authHeader = request.headers.get("authorization") || "";
  const bearerToken = authHeader.replace(/^Bearer\s+/i, "").trim().replace(/^["']|["']$/g, "");

  if (cronSecret && (bearerToken === cronSecret || querySecret === cronSecret)) {
    return true;
  }

  const userAgent = (request.headers.get("user-agent") || "").toLowerCase();
  const hasCronSchedule = request.headers.has("x-vercel-cron-schedule");
  const isVercelCron = userAgent.includes("vercel-cron") || hasCronSchedule;

  if (!cronSecret && isVercelCron) {
    return true;
  }

  const host = request.headers.get("host") || "";
  if (
    process.env.NODE_ENV !== "production" &&
    (host.startsWith("localhost:") || host.startsWith("127.0.0.1:") || host === "localhost")
  ) {
    return true;
  }

  try {
    const user = await getRequestUser();
    if (user && (user.is_admin || user.is_super_admin)) {
      return true;
    }
  } catch {}

  return false;
}

function buildReengagementEmailHtml(name: string): string {
  const safeName = name ? name.split(" ")[0] : "Creator";

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Your 1,000 Free Views are waiting on VEXARO SMM</title>
</head>
<body style="margin:0;padding:0;background-color:#0b0f19;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#f1f5f9;">
  <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color:#0b0f19;padding:30px 15px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" max-width="560" border="0" cellspacing="0" cellpadding="0" style="max-width:560px;background-color:#111827;border:1px solid #1e293b;border-radius:24px;overflow:hidden;box-shadow:0 20px 40px rgba(0,0,0,0.5);">
          
          <!-- Header -->
          <tr>
            <td style="padding:32px 32px 20px 32px;text-align:center;border-bottom:1px solid #1e293b;">
              <span style="display:inline-block;padding:4px 12px;background:rgba(99,102,241,0.15);border:1px solid rgba(99,102,241,0.3);border-radius:999px;font-size:11px;font-weight:800;color:#818cf8;text-transform:uppercase;letter-spacing:1px;margin-bottom:12px;">
                🎁 1-Time Free Test Trial
              </span>
              <h1 style="margin:0;font-size:24px;font-weight:900;color:#ffffff;letter-spacing:-0.5px;">
                VEXARO <span style="color:#6366f1;">SMM</span>
              </h1>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding:32px;">
              <h2 style="margin:0 0 12px 0;font-size:20px;font-weight:800;color:#ffffff;">
                Hey ${safeName}, your free trial is ready! 👋
              </h2>
              <p style="margin:0 0 20px 0;font-size:14px;line-height:1.6;color:#94a3b8;">
                We noticed you created your VEXARO account but haven’t tested our delivery speed yet. You have an exclusive <strong>1-Time Free Test Trial</strong> waiting on your dashboard — completely free with zero deposit required!
              </p>

              <!-- Trial Options Card -->
              <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0" style="background:#0d131f;border:1px solid #1e293b;border-radius:16px;margin:20px 0;padding:16px;">
                <tr>
                  <td>
                    <p style="margin:0 0 10px 0;font-size:12px;font-weight:700;color:#818cf8;text-transform:uppercase;letter-spacing:0.5px;">
                      Choose Your Free Package:
                    </p>
                    <ul style="margin:0;padding-left:18px;font-size:13px;line-height:1.7;color:#cbd5e1;">
                      <li><strong style="color:#ffffff;">1,000 Free Views</strong> on TikTok or Instagram Reels</li>
                      <li><strong style="color:#ffffff;">50 Free Likes</strong> on TikTok or Instagram Posts</li>
                    </ul>
                  </td>
                </tr>
              </table>

              <!-- Benefits -->
              <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0" style="margin-bottom:24px;">
                <tr>
                  <td style="font-size:12px;color:#94a3b8;line-height:1.8;">
                    ⚡ <strong>100% Free (₨ 0.00):</strong> No credit card or deposit needed to test.<br />
                    🔒 <strong>Zero Passwords:</strong> Just paste your public post link.<br />
                    🚀 <strong>Instant Start:</strong> Automated delivery begins in 0–15 minutes.
                  </td>
                </tr>
              </table>

              <!-- CTA Button -->
              <div style="text-align:center;margin:30px 0 20px 0;">
                <a href="https://vexarosmm.com/login" target="_blank" style="display:inline-block;background:linear-gradient(135deg, #6366f1 0%, #3b82f6 100%);color:#ffffff;text-decoration:none;font-weight:800;font-size:15px;padding:14px 32px;border-radius:14px;box-shadow:0 8px 24px rgba(99,102,241,0.35);">
                  Claim Free Trial Now →
                </a>
              </div>

              <p style="text-align:center;font-size:11px;color:#64748b;margin:0;">
                Takes under 30 seconds: Sign in, paste your link, and watch the count rise!
              </p>
            </td>
          </tr>

          <!-- WhatsApp & Community Footer -->
          <tr>
            <td style="padding:24px 32px;background:#0d131f;border-top:1px solid #1e293b;text-align:center;">
              <p style="margin:0 0 12px 0;font-size:12px;color:#94a3b8;">
                Need help or have questions? Chat with our Admin directly:
              </p>
              <div>
                <a href="https://wa.me/923176437013" target="_blank" style="display:inline-block;color:#10b981;font-weight:700;font-size:12px;text-decoration:none;margin-right:16px;">
                  💬 WhatsApp: +92 317 6437013
                </a>
                <a href="https://whatsapp.com/channel/0029VbDBiTC35fLrgdgBnB0Q" target="_blank" style="display:inline-block;color:#38bdf8;font-weight:700;font-size:12px;text-decoration:none;">
                  📢 Join VIP Channel
                </a>
              </div>
              <p style="margin:16px 0 0 0;font-size:10px;color:#475569;">
                © 2026 VEXARO SMM Panel • Pakistan &amp; Worldwide Automated Social Growth
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `;
}

export async function GET(request: Request) {
  if (!(await isAuthorized(request))) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  await ensureDatabase();

  const resendApiKey = process.env.RESEND_API_KEY?.trim();
  const fromEmail = process.env.RESEND_FROM_EMAIL?.trim() || "VEXARO SMM <noreply@vexarosmm.com>";

  if (!resendApiKey) {
    return NextResponse.json({
      success: false,
      error: "RESEND_API_KEY is not configured",
    }, { status: 500 });
  }

  try {
    // Find inactive users:
    // 1. Registered > 24 hours ago
    // 2. Never claimed free trial
    // 3. Never placed an order
    // 4. Have not been reengaged in the last 7 days (or reengaged_at is null)
    // 5. Reengagement count < 3
    const candidates = await db.query(`
      SELECT u.id, u.name, u.email, u.created_at, COALESCE(u.reengagement_count, 0) as reengagement_count
      FROM vexo_users u
      WHERE u.created_at < NOW() - INTERVAL '24 hours'
        AND (u.free_trial_claimed IS NOT TRUE)
        AND (u.reengaged_at IS NULL OR u.reengaged_at < NOW() - INTERVAL '7 days')
        AND COALESCE(u.reengagement_count, 0) < 3
        AND NOT EXISTS (
          SELECT 1 FROM vexo_orders o WHERE o.user_id = u.id
        )
        AND NOT EXISTS (
          SELECT 1 FROM vexo_free_trial_claims c WHERE c.user_id = u.id
        )
        AND u.email IS NOT NULL AND u.email != ''
      ORDER BY u.created_at DESC
      LIMIT 25;
    `);

    const users = candidates.rows;
    const results: Array<{ id: number; email: string; status: string; error?: string }> = [];

    for (const user of users) {
      try {
        const html = buildReengagementEmailHtml(user.name);

        const emailRes = await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${resendApiKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            from: fromEmail,
            to: user.email,
            subject: "🎁 Your 1,000 Free Views are waiting on VEXARO SMM!",
            html,
          }),
        });

        const emailData = await emailRes.json().catch(() => null);

        if (!emailRes.ok) {
          results.push({
            id: user.id,
            email: user.email,
            status: "failed",
            error: emailData?.message || "Resend API error",
          });
          continue;
        }

        // Update reengaged state
        await db.query(
          `UPDATE vexo_users
           SET reengaged_at = NOW(),
               reengagement_count = COALESCE(reengagement_count, 0) + 1
           WHERE id = $1`,
          [user.id]
        );

        results.push({
          id: user.id,
          email: user.email,
          status: "sent",
        });
      } catch (err) {
        results.push({
          id: user.id,
          email: user.email,
          status: "error",
          error: err instanceof Error ? err.message : "Unknown error",
        });
      }
    }

    const sentCount = results.filter((r) => r.status === "sent").length;

    // Log admin activity
    if (sentCount > 0) {
      try {
        await db.query(
          `INSERT INTO vexo_admin_activity (action, details)
           VALUES ($1, $2::jsonb)`,
          [
            "cron_reengagement_emails",
            JSON.stringify({
              sentCount,
              totalCandidates: users.length,
              timestamp: new Date().toISOString(),
            }),
          ]
        );
      } catch {}
    }

    return NextResponse.json({
      success: true,
      processed: users.length,
      sent: sentCount,
      details: results,
    });
  } catch (err) {
    console.error("Cron reengage-users error:", err);
    return NextResponse.json({
      success: false,
      error: err instanceof Error ? err.message : "Internal error",
    }, { status: 500 });
  }
}

export async function POST(request: Request) {
  return GET(request);
}
