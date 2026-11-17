export const buyerTabs = ["overview", "acquire", "chat", "my-profile", "settings", "feedback"] as const;
export type BuyerTab = typeof buyerTabs[number];
export function buyerUrl(tab: BuyerTab = "overview", params: Record<string, string> = {}) {
  return `/dashboard?${new URLSearchParams({ mode: "buyer", tab, ...params })}`;
}
export const isUuid = (value: string) => /^[a-f\d]{8}(?:-[a-f\d]{4}){3}-[a-f\d]{12}$/i.test(value);
export type ActionResult = { error?: string; message?: string };
export type BuyerProfile = {
  display_name: string; bio: string; budget_min: number | null; budget_max: number | null;
  categories: string[]; notify_messages: boolean; notify_price_drops: boolean;
};
export type BuyerConversation = {
  id: string; listing_id: string; startup_name: string; buyer_name: string;
  created_at: string; last_message_at: string | null; last_sender: "buyer" | "seller" | null;
  inquiry_at: string | null; offer_cents: number | null; inquiry_status: InquiryStatus;
};
export type InquiryStatus = "none" | "open" | "accepted" | "declined" | "withdrawn" | "completed";
export const inquiryLabels: Record<InquiryStatus, string> = {
  none: "Conversation", open: "Inquiry sent", accepted: "In discussion", declined: "Declined", withdrawn: "Withdrawn", completed: "Acquired",
};
export function moneyCents(value: string): number | null {
  if (!/^\d{1,12}(\.\d{1,2})?$/.test(value)) return null;
  const cents = Math.round(Number(value) * 100);
  return Number.isSafeInteger(cents) && cents > 0 && cents <= 10000000000000 ? cents : null;
}

export function listingReturn(value: unknown): string | undefined {
  return typeof value === "string" && /^\/acquire\/[a-f\d]{8}(?:-[a-f\d]{4}){3}-[a-f\d]{12}(\?intent=inquiry)?$/i.test(value) ? value : undefined;
}
