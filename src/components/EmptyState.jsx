
import React from 'react';

import {
  StyleSheet,
  Text,
  View,
} from 'react-native';

import {
  COLORS,
  SPACING,
  BORDER_RADIUS,
} from '../constants/theme';

export default function EmptyState({
  title,
  message,
}) {
  return (
    <View style={styles.container}>

      <View style={styles.icon}>
        <Text style={styles.iconText}>
          —
        </Text>
      </View>

      <Text style={styles.title}>
        {title}
      </Text>

      <Text style={styles.message}>
        {message}
      </Text>

    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: COLORS.surface,

    borderRadius: BORDER_RADIUS.md,

    borderWidth: 1,
    borderColor: COLORS.border,

    padding: SPACING.xxl,

    alignItems: 'center',
    justifyContent: 'center',
  },

  icon: {
    width: 46,
    height: 46,

    borderRadius: 23,

    backgroundColor: COLORS.goldLight,

    alignItems: 'center',
    justifyContent: 'center',

    marginBottom: SPACING.md,
  },

  iconText: {
    fontSize: 24,
    fontWeight: '700',
    color: COLORS.primary,
  },

  title: {
    fontSize: 16,
    fontWeight: '700',

    color: COLORS.text,

    textAlign: 'center',
  },

  message: {
    marginTop: SPACING.sm,

    fontSize: 13,

    color: COLORS.textSecondary,

    textAlign: 'center',

    maxWidth: 320,
  },
});

