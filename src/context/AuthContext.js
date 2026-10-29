import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { Alert, AppState } from 'react-native';

import { supabase } from '../services/supabase';

/*
|--------------------------------------------------------------------------
| AUTH CONTEXT
|--------------------------------------------------------------------------
| Besides the Supabase session this now exposes:
|   - profile      : the signed-in user's row from public.profiles
|   - isAdmin      : true when profiles.role === 'admin'
|   - refreshProfile()
|
| Suspended users are signed out automatically (on launch, whenever the app
| returns to the foreground, and every 60 seconds while it is open), which is
| how an admin "kicks out" a user.
|--------------------------------------------------------------------------
*/

const AuthContext = createContext({
  session: null,
  user: null,
  profile: null,
  isAdmin: false,
  loading: true,
  signOut: async () => {},
  refreshProfile: async () => null,
});

const SUSPENSION_POLL_MS = 60 * 1000;

// Longest the startup spinner will wait for the profile before opening the app.
const PROFILE_WAIT_MS = 1500;

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  const kickedRef = useRef(false);

  const forceSignOut = useCallback(async (reason) => {
    if (kickedRef.current) {
      return;
    }

    kickedRef.current = true;

    try {
      await supabase.auth.signOut();
    } catch (error) {
      console.log('Forced sign-out error:', error?.message);
    }

    setProfile(null);

    Alert.alert(
      'Account suspended',
      reason || 'Your MedTrack account has been suspended by an administrator.'
    );
  }, []);

  const loadProfile = useCallback(
    async (userId) => {
      if (!userId) {
        setProfile(null);
        return null;
      }

      const { data, error } = await supabase
        .from('profiles')
        .select('id, full_name, email, avatar_url, role, is_suspended, suspended_reason')
        .eq('id', userId)
        .maybeSingle();

      if (error) {
        // The admin columns only exist after supabase/admin_setup.sql has been run.
        // Fall back so the rest of the app keeps working until then.
        console.log('Profile loading error:', error.message);

        const fallback = await supabase
          .from('profiles')
          .select('id, full_name, email, avatar_url')
          .eq('id', userId)
          .maybeSingle();

        const base = fallback.data ?? null;
        setProfile(base ? { ...base, role: 'user', is_suspended: false } : null);
        return base;
      }

      if (data?.is_suspended) {
        await forceSignOut(
          data.suspended_reason
            ? `Your account has been suspended: ${data.suspended_reason}`
            : undefined
        );
        return null;
      }

      setProfile(data ?? null);
      return data ?? null;
    },
    [forceSignOut]
  );

  useEffect(() => {
    let mounted = true;

    const loadSession = async () => {
      const { data, error } = await supabase.auth.getSession();

      if (!mounted) {
        return;
      }

      if (error) {
        console.log('Session loading error:', error.message);
      }

      setSession(data.session);

      if (data.session?.user) {
        // Wait for the profile (it carries the suspension check), but never
        // keep the person on the loading spinner for more than a moment.
        // If the network is slow the profile simply finishes in the background.
        await Promise.race([
          loadProfile(data.session.user.id).catch((profileError) => {
            console.log('Profile loading error:', profileError?.message);
          }),
          new Promise((resolve) => setTimeout(resolve, PROFILE_WAIT_MS)),
        ]);
      }

      if (mounted) {
        setLoading(false);
      }
    };

    loadSession();

    const { data: authListener } = supabase.auth.onAuthStateChange((event, newSession) => {
      if (!mounted) {
        return;
      }

      setSession(newSession);

      if (newSession?.user) {
        if (event === 'SIGNED_IN') {
          kickedRef.current = false;
        }

        // Defer: calling supabase inside this callback can dead-lock the client.
        setTimeout(() => {
          if (mounted) {
            loadProfile(newSession.user.id);
          }
        }, 0);
      } else {
        setProfile(null);
      }

      setLoading(false);
    });

    return () => {
      mounted = false;
      authListener.subscription.unsubscribe();
    };
  }, [loadProfile]);

  // Re-check suspension / role when the app comes back to the foreground and periodically.
  useEffect(() => {
    const userId = session?.user?.id;

    if (!userId) {
      return undefined;
    }

    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') {
        loadProfile(userId);
      }
    });

    const interval = setInterval(() => {
      loadProfile(userId);
    }, SUSPENSION_POLL_MS);

    return () => {
      subscription.remove();
      clearInterval(interval);
    };
  }, [session?.user?.id, loadProfile]);

  const signOut = async () => {
    const { error } = await supabase.auth.signOut();

    if (error) {
      throw error;
    }
  };

  const refreshProfile = useCallback(async () => {
    const userId = session?.user?.id;
    return userId ? loadProfile(userId) : null;
  }, [session?.user?.id, loadProfile]);

  return (
    <AuthContext.Provider
      value={{
        session,
        user: session?.user ?? null,
        profile,
        isAdmin: profile?.role === 'admin',
        loading,
        signOut,
        refreshProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
