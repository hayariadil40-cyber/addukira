/* ============================================================
   Connessione a Supabase.
   La chiave `publishable` è PENSATA per stare nel browser: non è un
   segreto. La protezione vera è la Row Level Security sul database —
   senza una sessione valida non si legge nulla di personale, e le
   traduzioni non si leggono affatto.
   ============================================================ */
const SUPA_URL = 'https://jfrxqxbtcqhtuhdffrup.supabase.co';
const SUPA_KEY = 'sb_publishable_tG2TWmTLPxPm6IgckdGnKQ_N18JCkf_';

const sb = window.supabase.createClient(SUPA_URL, SUPA_KEY, {
  auth: { persistSession: true, autoRefreshToken: true, storageKey: 'addukira-auth' },
});
