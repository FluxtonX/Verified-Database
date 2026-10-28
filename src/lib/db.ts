import { createClient } from "@libsql/client";
import { STARTUPS, totalRevenue } from "@/data/startups";
import { LISTINGS } from "@/data/listings";

// SQLite database: connects to Turso (cloud) if env vars are present, or falls back to local SQLite file
const client = createClient({
  url: process.env.TURSO_DATABASE_URL || "file:trustledger.db",
  authToken: process.env.TURSO_AUTH_TOKEN,
});

let isInitialized = false;

export async function getDb() {
  if (!isInitialized) {
    await initDb();
    isInitialized = true;
  }
  return client;
}

async function initDb() {
  // Create Startups Table
  await client.execute(`
    CREATE TABLE IF NOT EXISTS startups (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      logo TEXT NOT NULL,
      category TEXT NOT NULL,
      tagline TEXT NOT NULL,
      founded INTEGER NOT NULL,
      hq TEXT NOT NULL,
      how TEXT NOT NULL,
      revenue_json TEXT NOT NULL,
      profit REAL DEFAULT 0,
      asking_price REAL DEFAULT 0,
      is_for_sale INTEGER DEFAULT 0,
      verified INTEGER DEFAULT 0,
      verification_status TEXT DEFAULT 'unverified',
      stripe_key_hint TEXT,
      team_size INTEGER DEFAULT 1,
      stack_json TEXT,
      includes_json TEXT,
      reason TEXT,
      growth_yoy REAL DEFAULT 0,
      listed_days_ago INTEGER DEFAULT 0,
      created_at TEXT NOT NULL
    )
  `);

  // Create Offers Table
  await client.execute(`
    CREATE TABLE IF NOT EXISTS offers (
      id TEXT PRIMARY KEY,
      listing_id TEXT NOT NULL,
      listing_name TEXT NOT NULL,
      amount REAL NOT NULL,
      email TEXT NOT NULL,
      message TEXT,
      status TEXT DEFAULT 'pending',
      is_received INTEGER DEFAULT 0,
      created_at TEXT NOT NULL
    )
  `);

  // Create Deals Table (Escrow Closing Room)
  await client.execute(`
    CREATE TABLE IF NOT EXISTS deals (
      id TEXT PRIMARY KEY,
      offer_id TEXT NOT NULL UNIQUE,
      listing_id TEXT NOT NULL,
      listing_name TEXT NOT NULL,
      buyer_email TEXT NOT NULL,
      seller_email TEXT NOT NULL,
      amount REAL NOT NULL,
      stage INTEGER DEFAULT 2,
      escrow_status TEXT DEFAULT 'funds_secured',
      checkpoints_json TEXT NOT NULL,
      messages_json TEXT NOT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    )
  `);

  // Check if we need to seed initial startups
  const countRes = await client.execute("SELECT COUNT(*) as count FROM startups");
  const count = Number(countRes.rows[0]?.count || 0);

  if (count === 0) {
    // Seed initial public startups
    for (const s of STARTUPS) {
      await client.execute({
        sql: `INSERT OR IGNORE INTO startups (
          id, name, logo, category, tagline, founded, hq, how,
          revenue_json, profit, asking_price, is_for_sale, verified,
          verification_status, growth_yoy, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        args: [
          s.id,
          s.name,
          s.logo,
          s.category,
          s.tagline,
          s.founded,
          s.hq,
          s.how,
          JSON.stringify(s.revenue),
          0,
          0,
          0,
          1,
          "verified",
          0.3,
          new Date().toISOString(),
        ],
      });
    }

    // Seed marketplace listings
    for (const l of LISTINGS) {
      await client.execute({
        sql: `INSERT OR REPLACE INTO startups (
          id, name, logo, category, tagline, founded, hq, how,
          revenue_json, profit, asking_price, is_for_sale, verified,
          verification_status, team_size, stack_json, includes_json,
          reason, growth_yoy, listed_days_ago, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        args: [
          l.id,
          l.name,
          l.logo,
          l.category,
          l.tagline,
          l.founded,
          l.hq,
          l.how,
          JSON.stringify(l.revenue),
          l.profit,
          l.askingPrice,
          1,
          l.verified ? 1 : 0,
          l.verified ? "verified" : "unverified",
          l.teamSize,
          JSON.stringify(l.stack),
          JSON.stringify(l.includes),
          l.reason,
          l.growthYoY,
          l.listedDaysAgo,
          new Date(Date.now() - l.listedDaysAgo * 86400000).toISOString(),
        ],
      });
    }

    // Seed default demo offers
    await client.execute({
      sql: `INSERT OR IGNORE INTO offers (id, listing_id, listing_name, amount, email, message, status, is_received, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      args: [
        "off-1",
        "pixelpress",
        "PixelPress",
        800000,
        "david@acquisitions-syndicate.com",
        "Interested in full cash purchase via escrow. Can close in 14 days.",
        "pending",
        1,
        new Date(Date.now() - 86400000 * 2).toISOString(),
      ],
    });

    await client.execute({
      sql: `INSERT OR IGNORE INTO offers (id, listing_id, listing_name, amount, email, message, status, is_received, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      args: [
        "off-2",
        "invoicenest",
        "InvoiceNest",
        1500000,
        "invest@fintechfunds.io",
        "Offer subject to 30-day technical due diligence and code audit.",
        "pending",
        1,
        new Date(Date.now() - 86400000 * 4).toISOString(),
      ],
    });
  }
}

export async function getStartupById(id: string) {
  try {
    const db = await getDb();
    const res = await db.execute({
      sql: "SELECT * FROM startups WHERE id = ? LIMIT 1",
      args: [id],
    });
    if (res.rows.length === 0) return null;
    const row: any = res.rows[0];
    return {
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
      stack: row.stack_json ? JSON.parse(row.stack_json) : undefined,
      includes: row.includes_json ? JSON.parse(row.includes_json) : undefined,
      reason: row.reason,
      createdAt: row.created_at,
    };
  } catch (err) {
    console.warn("getStartupById db error:", err);
    return null;
  }
}

export async function getDealByOfferId(offerId: string) {
  try {
    const db = await getDb();
    const res = await db.execute({
      sql: "SELECT * FROM deals WHERE offer_id = ? OR id = ? LIMIT 1",
      args: [offerId, offerId],
    });
    if (res.rows.length === 0) return null;
    const row: any = res.rows[0];
    return {
      id: row.id,
      offerId: row.offer_id,
      listingId: row.listing_id,
      listingName: row.listing_name,
      buyerEmail: row.buyer_email,
      sellerEmail: row.seller_email,
      amount: Number(row.amount),
      stage: Number(row.stage),
      escrowStatus: row.escrow_status,
      checkpoints: JSON.parse(row.checkpoints_json || "[]"),
      messages: JSON.parse(row.messages_json || "[]"),
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  } catch (err) {
    console.warn("getDealByOfferId db error:", err);
    return null;
  }
}

export async function saveDeal(deal: {
  id: string;
  offerId: string;
  listingId: string;
  listingName: string;
  buyerEmail: string;
  sellerEmail: string;
  amount: number;
  stage: number;
  escrowStatus: string;
  checkpoints: any[];
  messages: any[];
}) {
  try {
    const db = await getDb();
    const now = new Date().toISOString();
    const args = [
      deal.id || `deal-${deal.offerId}`,
      deal.offerId || "",
      deal.listingId || "",
      deal.listingName || "",
      deal.buyerEmail || "",
      deal.sellerEmail || "founder@trustledger.io",
      Number(deal.amount || 0),
      Number(deal.stage || 2),
      deal.escrowStatus || "funds_secured",
      JSON.stringify(Array.isArray(deal.checkpoints) ? deal.checkpoints : []) || "[]",
      JSON.stringify(Array.isArray(deal.messages) ? deal.messages : []) || "[]",
      now,
      now,
    ];
    console.log("saveDeal DEBUG args:", args);
    await db.execute({
      sql: `INSERT INTO deals (
        id, offer_id, listing_id, listing_name, buyer_email, seller_email,
        amount, stage, escrow_status, checkpoints_json, messages_json, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET
        stage = excluded.stage,
        escrow_status = excluded.escrow_status,
        checkpoints_json = excluded.checkpoints_json,
        messages_json = excluded.messages_json,
        updated_at = excluded.updated_at`,
      args,
    });
    return true;
  } catch (err) {
    console.warn("saveDeal db error:", err);
    return false;
  }
}
