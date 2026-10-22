import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import type { RevenueTypeId } from "@/data/startups";

export async function GET(request: NextRequest) {
  try {
    const db = await getDb();
    const { searchParams } = new URL(request.url);

    const category = searchParams.get("category");
    const search = searchParams.get("search")?.toLowerCase();
    const forSale = searchParams.get("forSale");
    const verifiedOnly = searchParams.get("verifiedOnly") === "true";
    const type = searchParams.get("type") as RevenueTypeId | null;

    let query = "SELECT * FROM startups WHERE 1=1";
    const args: any[] = [];

    if (category && category !== "all") {
      query += " AND category = ?";
      args.push(category);
    }

    if (forSale === "true") {
      query += " AND is_for_sale = 1";
    }

    if (verifiedOnly) {
      query += " AND verified = 1";
    }

    query += " ORDER BY asking_price DESC, created_at DESC";

    const res = await db.execute({ sql: query, args });

    let startups = res.rows.map((row: any) => ({
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
    }));

    // In-memory filters for search and revenue type
    if (search) {
      startups = startups.filter(
        (s) =>
          s.name.toLowerCase().includes(search) ||
          s.tagline.toLowerCase().includes(search) ||
          s.category.toLowerCase().includes(search)
      );
    }

    if (type && type !== ("all" as any)) {
      startups = startups.filter((s) => s.revenue[type] && s.revenue[type] > 0);
    }

    return NextResponse.json({ startups, total: startups.length });
  } catch (error: any) {
    console.error("Error in GET /api/startups:", error);
    return NextResponse.json({ error: error.message || "Failed to fetch startups" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const db = await getDb();
    const body = await request.json();

    const {
      name,
      logo,
      category,
      tagline,
      founded,
      hq,
      how,
      revenue,
      isForSale,
      askingPrice,
      profit,
      verified,
      verificationStatus,
      stripeKeyHint,
      teamSize,
      stack,
      includes,
      reason,
    } = body;

    if (!name || !tagline) {
      return NextResponse.json({ error: "Name and tagline are required" }, { status: 400 });
    }

    const id = `usr-${name.toLowerCase().replace(/[^a-z0-9]/g, "")}-${Date.now().toString(36)}`;
    const createdAt = new Date().toISOString();

    await db.execute({
      sql: `INSERT INTO startups (
        id, name, logo, category, tagline, founded, hq, how,
        revenue_json, profit, asking_price, is_for_sale, verified,
        verification_status, stripe_key_hint, team_size, stack_json,
        includes_json, reason, growth_yoy, listed_days_ago, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      args: [
        id,
        name,
        logo || "🚀",
        category || "AI",
        tagline,
        Number(founded) || 2023,
        hq || "Remote",
        how || "",
        JSON.stringify(revenue || {}),
        Number(profit || 0),
        Number(askingPrice || 0),
        isForSale ? 1 : 0,
        verified ? 1 : 0,
        verificationStatus || (verified ? "verified" : "unverified"),
        stripeKeyHint || null,
        Number(teamSize || 1),
        JSON.stringify(stack || []),
        JSON.stringify(includes || []),
        reason || "",
        0.35,
        0,
        createdAt,
      ],
    });

    return NextResponse.json({ success: true, id, message: "Startup registered successfully" }, { status: 201 });
  } catch (error: any) {
    console.error("Error in POST /api/startups:", error);
    return NextResponse.json({ error: error.message || "Failed to create startup" }, { status: 500 });
  }
}
