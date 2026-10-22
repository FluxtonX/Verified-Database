import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const db = await getDb();
    const body = await request.json();

    const { status } = body;

    if (!status || !["pending", "accepted", "declined"].includes(status)) {
      return NextResponse.json({ error: "Valid status (pending, accepted, declined) is required" }, { status: 400 });
    }

    await db.execute({
      sql: "UPDATE offers SET status = ? WHERE id = ?",
      args: [status, id],
    });

    return NextResponse.json({ success: true, message: `Offer marked as ${status}` });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Failed to update offer" }, { status: 500 });
  }
}
