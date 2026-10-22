import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const db = await getDb();

    const res = await db.execute({
      sql: "SELECT * FROM startups WHERE id = ?",
      args: [id],
    });

    if (res.rows.length === 0) {
      return NextResponse.json({ error: "Startup not found" }, { status: 404 });
    }

    const row: any = res.rows[0];
    const startup = {
      id: row.id,
      name: row.name,
      logo: row.logo,
      category: row.category,
      tagline: row.tagline,
      founded: Number(row.founded),
      hq: row.hq,
      how: row.how,
      revenue: JSON.parse(row.revenue_json || "{}"),
      profit: Number(row.profit || 0),
      askingPrice: Number(row.asking_price || 0),
      isForSale: Boolean(row.is_for_sale),
      verified: Boolean(row.verified),
      verificationStatus: row.verification_status,
      stripeKeyHint: row.stripe_key_hint,
      teamSize: Number(row.team_size || 1),
      stack: JSON.parse(row.stack_json || "[]"),
      includes: JSON.parse(row.includes_json || "[]"),
      reason: row.reason,
      growthYoY: Number(row.growth_yoy || 0),
      listedDaysAgo: Number(row.listed_days_ago || 0),
      createdAt: row.created_at,
    };

    return NextResponse.json({ startup });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Failed to fetch startup" }, { status: 500 });
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const db = await getDb();
    const body = await request.json();

    const updates: string[] = [];
    const args: any[] = [];

    if (body.isForSale !== undefined) {
      updates.push("is_for_sale = ?");
      args.push(body.isForSale ? 1 : 0);
    }

    if (body.askingPrice !== undefined) {
      updates.push("asking_price = ?");
      args.push(Number(body.askingPrice));
    }

    if (body.profit !== undefined) {
      updates.push("profit = ?");
      args.push(Number(body.profit));
    }

    if (body.verified !== undefined) {
      updates.push("verified = ?");
      args.push(body.verified ? 1 : 0);
    }

    if (body.verificationStatus !== undefined) {
      updates.push("verification_status = ?");
      args.push(body.verificationStatus);
    }

    if (updates.length === 0) {
      return NextResponse.json({ error: "No fields to update" }, { status: 400 });
    }

    args.push(id);
    await db.execute({
      sql: `UPDATE startups SET ${updates.join(", ")} WHERE id = ?`,
      args,
    });

    return NextResponse.json({ success: true, message: "Startup updated" });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Failed to update startup" }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const db = await getDb();

    await db.execute({
      sql: "DELETE FROM startups WHERE id = ?",
      args: [id],
    });

    return NextResponse.json({ success: true, message: "Startup deleted" });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Failed to delete startup" }, { status: 500 });
  }
}
