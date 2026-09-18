import { useEffect, useState } from 'react';

import {
  ActivityIndicator,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { Redirect } from 'expo-router';

import { supabase } from '../services/supabase';

export default function ProtectedRoute({
  children,
  allowedRoles = [],
}) {
  const [loading, setLoading] = useState(true);
  const [session, setSession] = useState(null);
  const [profile, setProfile] = useState(null);

  useEffect(() => {
    let mounted = true;

    async function loadUser() {
      try {
        const {
          data: { session },
        } = await supabase.auth.getSession();

        if (!mounted) return;

        if (!session?.user) {
          setLoading(false);
          return;
        }

        setSession(session);

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
          .eq('id', session.user.id)
          .single();

        if (error) {
          console.error('Profile loading error:', error);
          await supabase.auth.signOut();

          if (mounted) {
            setSession(null);
            setProfile(null);
            setLoading(false);
          }

          return;
        }

        if (!data.is_active) {
          await supabase.auth.signOut();

          if (mounted) {
            setSession(null);
            setProfile(null);
            setLoading(false);
          }

          return;
        }

        if (
          allowedRoles.length > 0 &&
          !allowedRoles.includes(data.role)
        ) {
          setProfile(data);
          setLoading(false);
          return;
        }

        if (mounted) {
          setProfile(data);
          setLoading(false);
        }
      } catch (error) {
        console.error('ProtectedRoute error:', error);

        await supabase.auth.signOut();

        if (mounted) {
          setSession(null);
          setProfile(null);
          setLoading(false);
        }
      }
    }

    loadUser();

    const {
      data: authListener,
    } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        if (!session) {
          setSession(null);
          setProfile(null);
        }
      }
    );

    return () => {
      mounted = false;
      authListener.subscription.unsubscribe();
    };
  }, []);

  if (loading) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator
          size="large"
          color="#123B63"
        />

        <Text style={styles.text}>
          Verifying access...
        </Text>
      </View>
    );
  }

  if (!session) {
    return <Redirect href="/" />;
  }

  if (!profile) {
    return <Redirect href="/" />;
  }

  if (
    allowedRoles.length > 0 &&
    !allowedRoles.includes(profile.role)
  ) {
    return <Redirect href="/" />;
  }

  return children;
}

const styles = StyleSheet.create({
  loading: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F4F7FA',
  },

  text: {
    marginTop: 12,
    color: '#667085',
  },
});