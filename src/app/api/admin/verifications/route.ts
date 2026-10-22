import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";

export async function GET() {
  try {
    const db = await getDb();

    const res = await db.execute({
      sql: `SELECT id, name, category, stripe_key_hint, revenue_json, verification_status, created_at
            FROM startups
            WHERE stripe_key_hint IS NOT NULL OR verification_status = 'pending'
            ORDER BY created_at DESC`,
    });

    const verifications = res.rows.map((row: any) => {
      const rev = JSON.parse(row.revenue_json || "{}");
      const totalRev = Object.values(rev).reduce((acc: number, curr: any) => acc + (Number(curr) || 0), 0);

      return {
        id: row.id,
        startupName: row.name,
        category: row.category,
        claimedRevenue: totalRev,
        stripeKeyHint: row.stripe_key_hint || "rk_live_...demo",
        status: row.verification_status,
        submittedAt: row.created_at,
      };
    });

    return NextResponse.json({ verifications, total: verifications.length });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Failed to fetch verifications" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const db = await getDb();
    const body = await request.json();

    const { startupId, action } = body; // action: "approved" | "rejected"

    if (!startupId || !["approved", "rejected"].includes(action)) {
      return NextResponse.json({ error: "startupId and action ('approved' or 'rejected') required" }, { status: 400 });
    }

    const isVerified = action === "approved" ? 1 : 0;
    const status = action === "approved" ? "verified" : "rejected";

    await db.execute({
      sql: "UPDATE startups SET verified = ?, verification_status = ? WHERE id = ?",
      args: [isVerified, status, startupId],
    });

    return NextResponse.json({ success: true, message: `Startup verification ${action}` });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Failed to update verification" }, { status: 500 });
  }
}
