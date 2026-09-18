
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
} from '../../constants/theme';

export default function StatCard({
  title,
  value,
  subtitle,
  icon,
}) {
  return (
    <View style={styles.card}>

      <View style={styles.header}>

        <Text style={styles.title}>
          {title}
        </Text>

        {icon ? (
          <View style={styles.iconContainer}>
            <Text style={styles.icon}>
              {icon}
            </Text>
          </View>
        ) : null}

      </View>

      <Text style={styles.value}>
        {value ?? '—'}
      </Text>

      {subtitle ? (
        <Text style={styles.subtitle}>
          {subtitle}
        </Text>
      ) : null}

    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flex: 1,
    minWidth: 150,

    backgroundColor: COLORS.surface,

    borderRadius: BORDER_RADIUS.md,

    borderWidth: 1,
    borderColor: COLORS.border,

    padding: SPACING.lg,

    marginBottom: SPACING.md,
  },

  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },

  title: {
    color: COLORS.textSecondary,

    fontSize: 13,
    fontWeight: '600',

    flex: 1,
  },

  value: {
    color: COLORS.text,

    fontSize: 28,
    fontWeight: '700',

    marginTop: SPACING.md,
  },

  subtitle: {
    color: COLORS.textSecondary,

    fontSize: 12,

    marginTop: SPACING.xs,
  },

  iconContainer: {
    width: 34,
    height: 34,

    borderRadius: 17,

    backgroundColor: COLORS.goldLight,

    alignItems: 'center',
    justifyContent: 'center',
  },

  icon: {
    fontSize: 16,
  },
});

