import { createClient, SupabaseClient } from '@supabase/supabase-js';

type SupabaseCache = {
  client: SupabaseClient | null;
  clientPromise: Promise<SupabaseClient> | null;
};

const globalForSupabase = globalThis as typeof globalThis & {
  __supabaseCache?: SupabaseCache;
};

const supabaseCache: SupabaseCache = globalForSupabase.__supabaseCache ?? {
  client: null,
  clientPromise: null,
};

globalForSupabase.__supabaseCache = supabaseCache;

export let supabase: SupabaseClient | null = supabaseCache.client;
let connecting: Promise<SupabaseClient> | null = null;

export function getSupabaseConfig() {
  const url = process.env.SUPABASE_URL;
  const anonKey = process.env.SUPABASE_ANON_KEY;

  if (!url) throw new Error("Missing SUPABASE_URL environment variable");
  if (!anonKey) throw new Error("Missing SUPABASE_ANON_KEY environment variable");

  return { url, anonKey };
}

async function getConnectedSupabase() {
  if (supabaseCache.client) return supabaseCache.client;

  const { url, anonKey } = getSupabaseConfig();

  if (!supabaseCache.clientPromise) {
    supabaseCache.client = createClient(url, anonKey);
    supabaseCache.clientPromise = Promise.resolve(supabaseCache.client);
  }

  const connectedClient = await supabaseCache.clientPromise;
  supabase = connectedClient;

  return connectedClient;
}

export async function connectToSupabase() {
  if (supabaseCache.client) return supabaseCache.client;
  if (connecting) return connecting;

  connecting = (async () => {
    try {
      return await getConnectedSupabase();
    } finally {
      connecting = null;
    }
  })();

  return connecting;
}

export async function disconnectFromSupabase() {
  if (supabaseCache.client) {
    // Type assertion to any to avoid TS error about close not existing
    await (supabaseCache.client as any).close();
  }
  supabaseCache.client = null;
  supabaseCache.clientPromise = null;
  supabase = null;
}
