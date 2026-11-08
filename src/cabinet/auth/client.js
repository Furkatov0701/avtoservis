import { createClient } from '@supabase/supabase-js';
import { readAuthConfig } from './config';

export const authConfig = readAuthConfig(import.meta.env);
export const supabase = authConfig.error ? null : createClient(authConfig.url, authConfig.key, {
  auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: false, storageKey: 'avto-auth-session' },
});
