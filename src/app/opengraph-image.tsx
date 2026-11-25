import { ImageResponse } from "next/og";
import { OgCard, OgStat } from "./og-card";

export const alt = "VerifedDB — the open market for indie startups";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function Image() {
  return new ImageResponse(<OgCard eyebrow="Startups for sale" title="Real revenue on the table. Buyers ready to talk.">
    <OgStat label="Revenue from" value="Stripe · RevenueCat" />
    <OgStat label="Deals" value="Direct with founders" />
  </OgCard>, size);
}
