import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { authError } from './errors';
import { loadIdentity } from './session';
import { supabase } from './client';

const AuthContext = createContext(null);
export const useAuth = () => useContext(AuthContext);
const initial = { status: 'loading', user: null, profile: null, error: '' };
export function AuthProvider({ children }) {
  const [identity, setIdentity] = useState(initial);
  const sequence = useRef(0);
  const mounted = useRef(false);
  const refreshSession = useCallback(async session => {
    const version = ++sequence.current;
    setIdentity(previous => previous.status === 'ready' && previous.user?.id === session?.user?.id ? previous : initial);
    try {
      const next = await loadIdentity(supabase, session);
      if (mounted.current && version === sequence.current) setIdentity(next);
    } catch (error) {
      if (mounted.current && version === sequence.current) setIdentity({ ...initial, status: 'error', error: authError(error) });
    }
  }, []);
  const reload = useCallback(async () => {
    try {
      const { data, error } = await supabase.auth.getSession();
      if (error) throw error;
      await refreshSession(data.session);
    } catch (error) { if (mounted.current) setIdentity({ ...initial, status: 'error', error: authError(error) }); }
  }, [refreshSession]);
  useEffect(() => {
    if (!supabase) return;
    mounted.current = true;
    let active = true;
    const { data } = supabase.auth.onAuthStateChange((_event, session) => {
      // Avoid calling another Supabase auth API while its event lock is held.
      setTimeout(() => { if (active) void refreshSession(session); }, 0);
    });
    return () => { active = false; mounted.current = false; sequence.current++; data.subscription.unsubscribe(); };
  }, [refreshSession]);
  const signOut = async () => {
    const { error } = await supabase.auth.signOut({ scope: 'local' });
    if (error) throw error;
    ++sequence.current;
    setIdentity({ status: 'signedOut', user: null, profile: null, error: '' });
  };
  return <AuthContext.Provider value={{ ...identity, reload, signOut }}>{children}</AuthContext.Provider>;
}
