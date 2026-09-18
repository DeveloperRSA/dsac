import { useEffect, useState } from 'react';

import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { router } from 'expo-router';

import { supabase } from '../src/services/supabase';

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const [loading, setLoading] = useState(false);
  const [checkingSession, setCheckingSession] = useState(true);

  useEffect(() => {
    checkExistingSession();
  }, []);

  async function checkExistingSession() {
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (session?.user) {
        await routeUser(session.user.id);
      }
    } catch (error) {
      console.log('Session check error:', error);
    } finally {
      setCheckingSession(false);
    }
  }

  async function handleLogin() {
    if (!email.trim() || !password) {
      Alert.alert(
        'Missing information',
        'Please enter your email and password.'
      );
      return;
    }

    setLoading(true);

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.trim().toLowerCase(),
        password,
      });

      if (error) {
        throw error;
      }

      if (!data.user) {
        throw new Error('Login succeeded but no user was returned.');
      }

      await routeUser(data.user.id);
    } catch (error) {
      console.error('Login error:', error);

      Alert.alert(
        'Login failed',
        error.message || 'Unable to sign in.'
      );
    } finally {
      setLoading(false);
    }
  }

  async function routeUser(userId) {
    const { data: profile, error } = await supabase
      .from('user_profiles')
      .select(`
        id,
        full_name,
        email,
        job_title,
        role,
        is_active
      `)
      .eq('id', userId)
      .single();

    if (error) {
      console.error('Profile error:', error);

      await supabase.auth.signOut();

      Alert.alert(
        'Profile error',
        'Your account exists, but your CIVITRACK profile could not be loaded.'
      );

      return;
    }

    if (!profile.is_active) {
      await supabase.auth.signOut();

      Alert.alert(
        'Account inactive',
        'Your CIVITRACK account is currently inactive.'
      );

      return;
    }

    switch (profile.role) {
      case 'DSAC_ADMIN':
        router.replace('/dsac/dashboard');
        break;

      case 'DSAC_REVIEWER':
        Alert.alert(
          'Coming soon',
          'The DSAC Reviewer dashboard has not been connected yet.'
        );
        break;

      case 'ORG_ADMIN':
        Alert.alert(
          'Coming soon',
          'The Organisation Admin dashboard has not been connected yet.'
        );
        break;

      case 'ORG_STAFF':
        Alert.alert(
          'Coming soon',
          'The Organisation Staff dashboard has not been connected yet.'
        );
        break;

      case 'EXTERNAL_COLLABORATOR':
        Alert.alert(
          'Coming soon',
          'The External Collaborator dashboard has not been connected yet.'
        );
        break;

      default:
        await supabase.auth.signOut();

        Alert.alert(
          'Access denied',
          'Your account does not have a valid CIVITRACK role.'
        );
    }
  }

  if (checkingSession) {
    return (
      <View style={styles.loadingScreen}>
        <ActivityIndicator size="large" color="#123B63" />

        <Text style={styles.loadingText}>
          Loading CIVITRACK...
        </Text>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View style={styles.content}>

        <Text style={styles.logo}>
          CIVITRACK
        </Text>

        <Text style={styles.tagline}>
          Public Funding & Accountability Platform
        </Text>

        <View style={styles.card}>

          <Text style={styles.title}>
            Sign in
          </Text>

          <Text style={styles.subtitle}>
            Sign in to access your CIVITRACK workspace.
          </Text>

          <Text style={styles.label}>
            Email address
          </Text>

          <TextInput
            value={email}
            onChangeText={setEmail}
            placeholder="Enter your email"
            placeholderTextColor="#888"
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
            style={styles.input}
          />

          <Text style={styles.label}>
            Password
          </Text>

          <TextInput
            value={password}
            onChangeText={setPassword}
            placeholder="Enter your password"
            placeholderTextColor="#888"
            secureTextEntry
            style={styles.input}
          />

          <Pressable
            style={[
              styles.button,
              loading && styles.buttonDisabled,
            ]}
            onPress={handleLogin}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text style={styles.buttonText}>
                Sign In
              </Text>
            )}
          </Pressable>

        </View>

        <Text style={styles.footer}>
          CIVITRACK • Secure Public Accountability
        </Text>

      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F4F7FA',
  },

  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },

  logo: {
    fontSize: 34,
    fontWeight: '800',
    color: '#123B63',
    letterSpacing: 1,
  },

  tagline: {
    marginTop: 8,
    marginBottom: 32,
    textAlign: 'center',
    color: '#56616F',
    fontSize: 14,
  },

  card: {
    width: '100%',
    maxWidth: 430,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 28,

    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 12,
    shadowOffset: {
      width: 0,
      height: 4,
    },

    elevation: 4,
  },

  title: {
    fontSize: 26,
    fontWeight: '700',
    color: '#123B63',
  },

  subtitle: {
    marginTop: 8,
    marginBottom: 24,
    color: '#667085',
    lineHeight: 20,
  },

  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#344054',
    marginBottom: 7,
    marginTop: 12,
  },

  input: {
    height: 50,
    borderWidth: 1,
    borderColor: '#D0D5DD',
    borderRadius: 8,
    paddingHorizontal: 14,
    fontSize: 15,
    color: '#101828',
    backgroundColor: '#FFFFFF',
  },

  button: {
    height: 52,
    marginTop: 26,
    borderRadius: 8,
    backgroundColor: '#123B63',
    alignItems: 'center',
    justifyContent: 'center',
  },

  buttonDisabled: {
    opacity: 0.7,
  },

  buttonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },

  footer: {
    marginTop: 24,
    color: '#98A2B3',
    fontSize: 12,
  },

  loadingScreen: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F4F7FA',
  },

  loadingText: {
    marginTop: 12,
    color: '#667085',
  },
});