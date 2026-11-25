"use server";

import { revalidatePath } from "next/cache";
import { createSupabase } from "@/lib/supabase/server";

export async function setActivityLike(postId: string, liked: boolean) {
  const supabase = await createSupabase();
  const session = await supabase?.auth.getClaims();
  if (!supabase || !session?.data?.claims.sub || !/^[a-f\d-]{36}$/i.test(postId)) return false;

  const { error } = liked
    ? await supabase.from("activity_likes").insert({ post_id: postId })
    : await supabase.from("activity_likes").delete().eq("post_id", postId);
  if (error && error.code !== "23505") return false;
  revalidatePath("/");
  return true;
}
