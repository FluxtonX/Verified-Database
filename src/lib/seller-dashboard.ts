export const sellerTabs = ["chat", "interested", "my-startups", "my-profile", "settings", "feedback"] as const;
export type SellerTab = typeof sellerTabs[number];
export type DashboardMode = "buyer" | "seller";

export function sellerUrl(tab: SellerTab, params: Record<string, string> = {}) {
  return `/dashboard?${new URLSearchParams({ tab, mode: "seller", ...params })}`;
}

export type SellerLead = {
  id: string;
  buyer_name: string;
  startup_name: string;
  created_at: string;
  last_message_at: string | null;
  last_sender: "buyer" | "seller" | null;
  archived: boolean;
};

export type SellerMessage = { id: string; sender: "buyer" | "seller"; body: string; created_at: string };

export type SellerProfile = {
  display_name: string | null;
  avatar_url: string | null;
  x_handle: string | null;
  bio: string;
  linkedin_url: string | null;
  notify_messages: boolean;
  notify_saved: boolean;
  timezone: string;
  deletion_requested_at: string | null;
};

export const profilePictureBucket = "profile-pictures";
