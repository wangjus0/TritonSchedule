import { createClient, type SupabaseClient } from "@supabase/supabase-js";

type SupabaseCache = {
  client: SupabaseClient | null;
};

const globalForSupabase = globalThis as typeof globalThis & {
  __supabaseCache?: SupabaseCache;
};

const supabaseCache: SupabaseCache = globalForSupabase.__supabaseCache ?? {
  client: null,
};

globalForSupabase.__supabaseCache = supabaseCache;

export function getSupabaseConfig() {
  const url = process.env.SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url) throw new Error("Missing SUPABASE_URL environment variable");
  if (!serviceRoleKey) throw new Error("Missing SUPABASE_SERVICE_ROLE_KEY environment variable");

  return { serviceRoleKey, url };
}

export function connectToDB() {
  if (supabaseCache.client) return supabaseCache.client;

  const { serviceRoleKey, url } = getSupabaseConfig();

  supabaseCache.client = createClient(url, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });

  return supabaseCache.client;
}

export async function pingDatabase() {
  const supabase = connectToDB();
  const { error } = await supabase.from("terms").select("id").limit(1);

  if (error) throw error;

  return { ok: 1 };
}
