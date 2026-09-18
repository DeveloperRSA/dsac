import React, { useEffect } from 'react';

import {
  ActivityIndicator,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { router } from 'expo-router';

import { useAuth } from '../src/contexts/AuthContext';

export default function IndexScreen() {
  const {
    loading,
    isAuthenticated,
    role,
  } = useAuth();

  useEffect(() => {
    if (loading) {
      return;
    }

    if (!isAuthenticated) {
      router.replace('/auth/login');
      return;
    }

    switch (role) {
      case 'DSAC_ADMIN':
        router.replace('/dsac/dashboard');
        break;

      case 'DSAC_REVIEWER':
        // No dedicated reviewer dashboard exists yet — see README.
        // Routing to the DSAC dashboard temporarily so reviewers aren't
        // stranded on a dead route.
        router.replace('/dsac/dashboard');
        break;

      case 'ORG_ADMIN':
      case 'ORG_STAFF':
        router.replace('/organisation/dashboard');
        break;

      case 'EXTERNAL_COLLABORATOR':
        router.replace('/organisation/dashboard');
        break;

      default:
        router.replace('/auth/login');
        break;
    }
  }, [
    loading,
    isAuthenticated,
    role,
  ]);

  return (
    <View style={styles.container}>
      <ActivityIndicator
        size="large"
        color="#123B63"
      />

      <Text style={styles.title}>
        CIVITRACK
      </Text>

      <Text style={styles.subtitle}>
        Checking your account...
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F4F7FA',
  },

  title: {
    marginTop: 16,
    fontSize: 24,
    fontWeight: '800',
    color: '#123B63',
  },

  subtitle: {
    marginTop: 6,
    color: '#667085',
  },
});