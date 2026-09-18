
import React, {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';

import { supabase } from '../services/supabase';
import { isValidRole } from '../constants/roles';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null);
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  /*
   * Load CIVITRACK profile from user_profiles
   */
  const loadProfile = async (authUser) => {
    if (!authUser) {
      setProfile(null);
      return null;
    }

    try {
      const { data, error } = await supabase
        .from('user_profiles')
        .select(`
          id,
          full_name,
          email,
          job_title,
          role,
          is_active
        `)
        .eq('id', authUser.id)
        .single();

      if (error) {
        console.error(
          'Profile loading error:',
          error
        );

        setProfile(null);
        return null;
      }

      if (!data) {
        setProfile(null);
        return null;
      }

      if (!data.is_active) {
        console.warn(
          'User account is inactive.'
        );

        setProfile(null);
        return null;
      }

      if (!isValidRole(data.role)) {
        console.warn(
          'Invalid CIVITRACK role:',
          data.role
        );

        setProfile(null);
        return null;
      }

      setProfile(data);

      return data;
    } catch (error) {
      console.error(
        'Profile loading error:',
        error
      );

      setProfile(null);

      return null;
    }
  };

  /*
   * Initialise authentication
   */
  useEffect(() => {
    let mounted = true;

    const initialiseAuth = async () => {
      try {
        const {
          data: { session: currentSession },
          error,
        } = await supabase.auth.getSession();

        if (error) {
          console.error(
            'Session error:',
            error
          );
        }

        if (!mounted) {
          return;
        }

        setSession(currentSession);
        setUser(
          currentSession?.user ?? null
        );

        if (currentSession?.user) {
          const loadedProfile =
            await loadProfile(
              currentSession.user
            );

          if (!loadedProfile) {
            await supabase.auth.signOut();
          }
        }
      } catch (error) {
        console.error(
          'Authentication initialisation error:',
          error
        );

        if (mounted) {
          setSession(null);
          setUser(null);
          setProfile(null);
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    };

    initialiseAuth();

    /*
     * Listen for authentication changes
     */
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(
      async (_event, currentSession) => {
        if (!mounted) {
          return;
        }

        setSession(currentSession);
        setUser(
          currentSession?.user ?? null
        );

        if (currentSession?.user) {
          const loadedProfile =
            await loadProfile(
              currentSession.user
            );

          if (!loadedProfile) {
            await supabase.auth.signOut();
          }
        } else {
          setProfile(null);
        }

        setLoading(false);
      }
    );

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  /*
   * Sign in
   */
  const signIn = async (
    email,
    password
  ) => {
    try {
      const {
        data,
        error,
      } = await supabase.auth.signInWithPassword({
        email: email
          .trim()
          .toLowerCase(),
        password,
      });

      if (error) {
        return {
          success: false,
          error: error.message,
        };
      }

      if (!data?.user) {
        return {
          success: false,
          error: 'Authentication failed.',
        };
      }

      const loadedProfile =
        await loadProfile(data.user);

      if (!loadedProfile) {
        await supabase.auth.signOut();

        return {
          success: false,
          error:
            'Your account is inactive or your CIVITRACK profile could not be verified.',
        };
      }

      return {
        success: true,
        user: data.user,
        profile: loadedProfile,
      };
    } catch (error) {
      console.error(
        'Sign in error:',
        error
      );

      return {
        success: false,
        error:
          error?.message ||
          'Unable to sign in. Please try again.',
      };
    }
  };

  /*
   * Sign out
   */
  const signOut = async () => {
    const {
      error,
    } = await supabase.auth.signOut();

    if (error) {
      throw error;
    }

    setSession(null);
    setUser(null);
    setProfile(null);
  };

  const value = useMemo(
    () => ({
      session,
      user,
      profile,
      loading,

      signIn,
      signOut,

      isAuthenticated:
        !!session &&
        !!profile &&
        profile.is_active === true,

      role:
        profile?.role ?? null,

      /*
       * Organisation ID is intentionally
       * not read from user_profiles.
       *
       * Organisation membership is handled
       * through organisation_memberships.
       */
      organisationId: null,
    }),
    [
      session,
      user,
      profile,
      loading,
    ]
  );

  return (
    <AuthContext.Provider
      value={value}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context =
    useContext(AuthContext);

  if (!context) {
    throw new Error(
      'useAuth must be used inside AuthProvider'
    );
  }

  return context;
}

