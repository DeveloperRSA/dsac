import React from "react";
import {
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";

import {
  COLORS,
  SPACING,
} from "../../constants/theme";

export default function DashboardHeader({
  title,
  subtitle,
  userName,
  onProfilePress,
}) {
  return (
    <View style={styles.container}>
      <View style={styles.brandRow}>
        <View style={styles.brandMark}>
          <Text style={styles.brandMarkText}>
            DSAC
          </Text>
        </View>

        <View style={styles.brandText}>
          <Text style={styles.department}>
            Department
          </Text>

          <Text style={styles.departmentName}>
            Sport, Arts and Culture
          </Text>
        </View>
      </View>

      <View style={styles.divider} />

      <View style={styles.contentRow}>
        <View style={styles.titleContainer}>
          <Text style={styles.title}>
            {title}
          </Text>

          {subtitle ? (
            <Text style={styles.subtitle}>
              {subtitle}
            </Text>
          ) : null}
        </View>

        {userName ? (
          <Pressable
            onPress={onProfilePress}
            style={styles.user}
          >
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>
                {userName.charAt(0).toUpperCase()}
              </Text>
            </View>

            <Text style={styles.userName}>
              {userName}
            </Text>
          </Pressable>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: COLORS.white,
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.lg,
  },

  brandRow: {
    flexDirection: "row",
    alignItems: "center",
  },

  brandMark: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: COLORS.primary,
    alignItems: "center",
    justifyContent: "center",
  },

  brandMarkText: {
    color: COLORS.white,
    fontSize: 12,
    fontWeight: "800",
  },

  brandText: {
    marginLeft: SPACING.md,
  },

  department: {
    fontSize: 11,
    color: COLORS.textSecondary,
  },

  departmentName: {
    fontSize: 16,
    fontWeight: "700",
    color: COLORS.black,
  },

  divider: {
    height: 1,
    backgroundColor: COLORS.border,
    marginTop: SPACING.lg,
  },

  contentRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: SPACING.lg,
  },

  titleContainer: {
    flex: 1,
  },

  title: {
    fontSize: 24,
    fontWeight: "700",
    color: COLORS.text,
  },

  subtitle: {
    fontSize: 13,
    color: COLORS.textSecondary,
    marginTop: SPACING.xs,
  },

  user: {
    flexDirection: "row",
    alignItems: "center",
    marginLeft: SPACING.md,
  },

  avatar: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: COLORS.primary,
    alignItems: "center",
    justifyContent: "center",
  },

  avatarText: {
    color: COLORS.white,
    fontWeight: "700",
  },

  userName: {
    marginLeft: SPACING.sm,
    fontSize: 13,
    fontWeight: "600",
    color: COLORS.text,
  },
});