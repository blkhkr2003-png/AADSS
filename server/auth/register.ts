"use server";

import { createClient } from "@/lib/supabase/server";
import { headers } from "next/headers";

export async function register(email: string, password: string) {
  if (!email || !password) {
    return { error: "Email and password are required" };
  }

  const supabase = createClient();
  const origin = (await headers()).get("origin");

  const { error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: `${origin}/auth/callback`,
    },
  });

  if (error) {
    return { error: error.message };
  }

  return { success: true };
}

