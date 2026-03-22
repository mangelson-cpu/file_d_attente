import { createClient, SupabaseClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

declare global {
  var _supabaseInstance: SupabaseClient | undefined;
}

if (!globalThis._supabaseInstance) {
  globalThis._supabaseInstance = createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      storageKey: "gestion-file-attente-auth",
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
      lock: (async (
        _name: string,
        _acquireTimeout: number,
        acquire: () => Promise<unknown>,
      ) => {
        return await acquire();
      }) as unknown as NonNullable<import("@supabase/supabase-js").SupabaseClientOptions<"public">["auth"]>["lock"],
    },
  });
}

export const supabase = globalThis._supabaseInstance;
