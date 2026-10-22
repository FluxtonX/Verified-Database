import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";

export async function GET(request: NextRequest) {
  try {
    const db = await getDb();
    const { searchParams } = new URL(request.url);

    const listingId = searchParams.get("listingId");
    const role = searchParams.get("role"); // "received" or "sent"

    let query = "SELECT * FROM offers WHERE 1=1";
    const args: any[] = [];

    if (listingId) {
      query += " AND listing_id = ?";
      args.push(listingId);
    }

    if (role === "received") {
      query += " AND is_received = 1";
    } else if (role === "sent") {
      query += " AND is_received = 0";
    }

    query += " ORDER BY created_at DESC";

    const res = await db.execute({ sql: query, args });

    const offers = res.rows.map((row: any) => ({
      id: row.id,
      listingId: row.listing_id,
      listingName: row.listing_name,
      amount: Number(row.amount),
      email: row.email,
      message: row.message,
      status: row.status,
      isReceived: Boolean(row.is_received),
      createdAt: row.created_at,
    }));

    return NextResponse.json({ offers, total: offers.length });
  } catch (error: any) {
    console.error("Error in GET /api/offers:", error);
    return NextResponse.json({ error: error.message || "Failed to fetch offers" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const db = await getDb();
    const body = await request.json();

    const { listingId, listingName, amount, email, message, isReceived } = body;

    if (!listingId || !amount || !email) {
      return NextResponse.json({ error: "listingId, amount, and email are required" }, { status: 400 });
    }

    const id = `off-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
    const createdAt = new Date().toISOString();

    await db.execute({
      sql: `INSERT INTO offers (id, listing_id, listing_name, amount, email, message, status, is_received, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      args: [
        id,
        listingId,
        listingName || "Startup Acquisition",
        Number(amount),
        email,
        message || "",
        "pending",
        isReceived ? 1 : 0,
        createdAt,
      ],
    });

    return NextResponse.json({ success: true, id, message: "Offer created successfully" }, { status: 201 });
  } catch (error: any) {
    console.error("Error in POST /api/offers:", error);
    return NextResponse.json({ error: error.message || "Failed to submit offer" }, { status: 500 });
  }
}
