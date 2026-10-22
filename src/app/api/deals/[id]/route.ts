import { NextRequest, NextResponse } from "next/server";
import { getDb, getDealByOfferId, saveDeal } from "@/lib/db";
import { DEFAULT_DEAL_CHECKPOINTS } from "@/data/deals";

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function GET(request: NextRequest, { params }: RouteContext) {
  try {
    const { id } = await params;
    let deal = await getDealByOfferId(id);

    if (!deal) {
      // Check if offer exists and generate deal
      const db = await getDb();
      const res = await db.execute({
        sql: "SELECT * FROM offers WHERE id = ? LIMIT 1",
        args: [id],
      });

      if (res.rows.length > 0) {
        const off: any = res.rows[0];
        const newDeal = {
          id: `deal-${off.id}`,
          offerId: off.id,
          listingId: off.listing_id,
          listingName: off.listing_name,
          buyerEmail: off.email,
          sellerEmail: "founder@trustledger.io",
          amount: Number(off.amount),
          stage: 2,
          escrowStatus: "funds_secured",
          checkpoints: DEFAULT_DEAL_CHECKPOINTS,
          messages: [
            {
              id: "msg-sys-1",
              sender: "system",
              text: `Closing room created for ${off.listing_name}. Purchase offer of $${Number(off.amount).toLocaleString()} accepted.`,
              time: "Just now",
            },
            {
              id: "msg-sys-2",
              sender: "system",
              text: "Escrow funds secured in TrustLedger Vault. Escrow protection active.",
              time: "Just now",
            },
          ],
        };
        await saveDeal(newDeal);
        deal = await getDealByOfferId(id);
      }
    }

    if (!deal) {
      return NextResponse.json({ error: "Deal not found" }, { status: 404 });
    }

    return NextResponse.json({ deal });
  } catch (error: any) {
    console.error("GET /api/deals/[id] error:", error);
    return NextResponse.json({ error: error.message || "Failed to fetch deal" }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest, { params }: RouteContext) {
  try {
    const { id } = await params;
    const body = await request.json();
    const deal = await getDealByOfferId(id);

    if (!deal) {
      return NextResponse.json({ error: "Deal not found" }, { status: 404 });
    }

    const { stage, escrowStatus, checkpoints, newMessage } = body;

    const updatedCheckpoints = checkpoints ?? deal.checkpoints;
    const updatedMessages = newMessage
      ? [...deal.messages, { id: `msg-${Date.now()}`, ...newMessage, time: "Just now" }]
      : deal.messages;

    const updatedDeal = {
      ...deal,
      stage: typeof stage === "number" ? stage : deal.stage,
      escrowStatus: escrowStatus ?? deal.escrowStatus,
      checkpoints: updatedCheckpoints,
      messages: updatedMessages,
    };

    await saveDeal(updatedDeal);

    return NextResponse.json({ success: true, deal: updatedDeal });
  } catch (error: any) {
    console.error("PATCH /api/deals/[id] error:", error);
    return NextResponse.json({ error: error.message || "Failed to update deal" }, { status: 500 });
  }
}
