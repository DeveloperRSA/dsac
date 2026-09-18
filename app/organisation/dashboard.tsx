import React, {
  useCallback,
  useState,
} from 'react';

import {
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { useFocusEffect } from 'expo-router';

import ProtectedRoute from '../../src/components/ProtectedRoute';
import DashboardHeader from '../../src/components/dashboard/DashboardHeader';
import StatCard from '../../src/components/dashboard/StatCard';
import EmptyState from '../../src/components/EmptyState';

import { useAuth } from '../../src/contexts/AuthContext';
import { supabase } from '../../src/services/supabase';
import { ROLES } from '../../src/constants/roles';
import {
  COLORS,
  SPACING,
  BORDER_RADIUS,
} from '../../src/constants/theme';

export default function OrganisationDashboard() {
  const {
    user,
    profile,
  } = useAuth();

  const [organisation, setOrganisation] =
    useState(null);

  const [membership, setMembership] =
    useState(null);

  const [memberCount, setMemberCount] =
    useState(0);

  const [activeMemberCount, setActiveMemberCount] =
    useState(0);

  const [loading, setLoading] =
    useState(true);

  const [refreshing, setRefreshing] =
    useState(false);

  const loadDashboard =
    useCallback(async () => {
      if (!user?.id) {
        setOrganisation(null);
        setMembership(null);
        setMemberCount(0);
        setActiveMemberCount(0);
        setLoading(false);
        return;
      }

      try {
        setLoading(true);

        /*
         * Find the organisation membership
         * belonging to the logged-in user.
         */
        const {
          data: membershipData,
          error: membershipError,
        } = await supabase
          .from('organisation_memberships')
          .select(
            `
              id,
              organisation_id,
              user_id,
              membership_role,
              status,
              joined_at
            `
          )
          .eq(
            'user_id',
            user.id
          )
          .eq(
            'status',
            'ACTIVE'
          )
          .maybeSingle();

        if (membershipError) {
          throw membershipError;
        }

        /*
         * User does not currently belong
         * to an organisation.
         */
        if (!membershipData) {
          setOrganisation(null);
          setMembership(null);
          setMemberCount(0);
          setActiveMemberCount(0);
          return;
        }

        setMembership(
          membershipData
        );

        const organisationId =
          membershipData.organisation_id;

        /*
         * Load the organisation.
         */
        const {
          data: organisationData,
          error: organisationError,
        } = await supabase
          .from('organisations')
          .select(
            `
              id,
              name,
              organisation_type,
              registration_number,
              email,
              phone,
              address,
              province,
              status,
              created_at
            `
          )
          .eq(
            'id',
            organisationId
          )
          .single();

        if (organisationError) {
          throw organisationError;
        }

        setOrganisation(
          organisationData
        );

        /*
         * Load total organisation members.
         */
        const {
          count: totalMembers,
          error: totalMembersError,
        } = await supabase
          .from('organisation_memberships')
          .select(
            'id',
            {
              count: 'exact',
              head: true,
            }
          )
          .eq(
            'organisation_id',
            organisationId
          );

        if (totalMembersError) {
          throw totalMembersError;
        }

        /*
         * Load active organisation members.
         */
        const {
          count: activeMembers,
          error: activeMembersError,
        } = await supabase
          .from('organisation_memberships')
          .select(
            'id',
            {
              count: 'exact',
              head: true,
            }
          )
          .eq(
            'organisation_id',
            organisationId
          )
          .eq(
            'status',
            'ACTIVE'
          );

        if (activeMembersError) {
          throw activeMembersError;
        }

        setMemberCount(
          totalMembers ?? 0
        );

        setActiveMemberCount(
          activeMembers ?? 0
        );
      } catch (error) {
        console.error(
          'Organisation dashboard error:',
          error
        );

        setOrganisation(null);
        setMembership(null);
        setMemberCount(0);
        setActiveMemberCount(0);
      } finally {
        setLoading(false);
      }
    }, [user?.id]);

  /*
   * Reload whenever the dashboard
   * becomes active.
   */
  useFocusEffect(
    useCallback(() => {
      loadDashboard();
    }, [loadDashboard])
  );

  /*
   * Pull to refresh.
   */
  const refresh = async () => {
    setRefreshing(true);

    try {
      await loadDashboard();
    } finally {
      setRefreshing(false);
    }
  };

  return (
    <ProtectedRoute
      allowedRoles={[
        ROLES.ORG_ADMIN,
        ROLES.ORG_STAFF,
      ]}
    >
      <View style={styles.container}>

        <DashboardHeader
          title="Organisation Dashboard"
          subtitle="Accountability Workspace"
          userName={
            profile?.full_name ||
            'User'
          }
          onProfilePress={() => undefined}
        />

        <ScrollView
          contentContainerStyle={
            styles.content
          }
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={refresh}
            />
          }
        >

          {loading ? (
            <View
              style={
                styles.loadingContainer
              }
            >
              <ActivityIndicator
                size="large"
                color={
                  COLORS.secondary
                }
              />

              <Text
                style={
                  styles.loadingText
                }
              >
                Loading organisation...
              </Text>
            </View>
          ) : !organisation ? (
            <View
              style={styles.section}
            >
              <EmptyState
                title="No organisation assigned"
                message="Your account is not currently connected to an active organisation. Please contact the DSAC administrator."
              />
            </View>
          ) : (
            <>
              <Text
                style={
                  styles.welcome
                }
              >
                Welcome,{' '}
                {profile?.full_name ||
                  'User'}
              </Text>

              <Text
                style={
                  styles.welcomeSubtext
                }
              >
                Here is an overview of
                your organisation.
              </Text>

              {/* Organisation information */}
              <View
                style={
                  styles.organisationCard
                }
              >
                <View
                  style={
                    styles.organisationTop
                  }
                >
                  <View
                    style={
                      styles.organisationIcon
                    }
                  >
                    <Text
                      style={
                        styles.organisationIconText
                      }
                    >
                      O
                    </Text>
                  </View>

                  <View
                    style={
                      styles.organisationHeading
                    }
                  >
                    <Text
                      style={
                        styles.organisationName
                      }
                    >
                      {
                        organisation.name
                      }
                    </Text>

                    <Text
                      style={
                        styles.organisationType
                      }
                    >
                      {
                        organisation.organisation_type
                      }
                    </Text>
                  </View>

                  <View
                    style={
                      styles.statusBadge
                    }
                  >
                    <Text
                      style={
                        styles.statusBadgeText
                      }
                    >
                      {
                        organisation.status
                      }
                    </Text>
                  </View>
                </View>

                <View
                  style={
                    styles.divider
                  }
                />

                <View
                  style={
                    styles.detailsGrid
                  }
                >
                  <OrganisationDetail
                    label="Registration Number"
                    value={
                      organisation.registration_number ||
                      'Not provided'
                    }
                  />

                  <OrganisationDetail
                    label="Email"
                    value={
                      organisation.email ||
                      'Not provided'
                    }
                  />

                  <OrganisationDetail
                    label="Province"
                    value={
                      organisation.province ||
                      'Not provided'
                    }
                  />

                  <OrganisationDetail
                    label="Your Role"
                    value={
                      membership?.membership_role ||
                      'Member'
                    }
                  />
                </View>
              </View>

              <Text
                style={
                  styles.sectionTitle
                }
              >
                Overview
              </Text>

              <View
                style={styles.statsRow}
              >

                <StatCard
                  title="Team Members"
                  value={
                    memberCount
                  }
                  subtitle="Organisation members"
                  icon="👥"
                />

                <StatCard
                  title="Active Members"
                  value={
                    activeMemberCount
                  }
                  subtitle="Currently active"
                  icon="✓"
                />

                <StatCard
                  title="Organisation"
                  value="ACTIVE"
                  subtitle="Current organisation status"
                  icon="🏢"
                />

              </View>

              <View
                style={
                  styles.roleCard
                }
              >
                <Text
                  style={
                    styles.roleTitle
                  }
                >
                  YOUR ACCESS
                </Text>

                <Text
                  style={
                    styles.roleValue
                  }
                >
                  {
                    membership?.membership_role ||
                    'Organisation Member'
                  }
                </Text>

                <Text
                  style={
                    styles.roleDescription
                  }
                >
                  Your access to CIVITRACK
                  is determined by your
                  organisation membership.
                </Text>
              </View>

              <View
                style={styles.section}
              >
                <EmptyState
                  title="Accountability workspace"
                  message="Funding agreements, accountability cases, tasks and documents will appear here as those modules are added to CIVITRACK."
                />
              </View>
            </>
          )}

        </ScrollView>
      </View>
    </ProtectedRoute>
  );
}

function OrganisationDetail({
  label,
  value,
}) {
  return (
    <View
      style={
        styles.detailItem
      }
    >
      <Text
        style={
          styles.detailLabel
        }
      >
        {label}
      </Text>

      <Text
        style={
          styles.detailValue
        }
        numberOfLines={2}
      >
        {value}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor:
      COLORS.background,
  },

  content: {
    padding:
      SPACING.lg,
    paddingBottom:
      SPACING.xxl,
  },

  welcome: {
    color:
      COLORS.text,
    fontSize: 24,
    fontWeight: '800',
    marginBottom:
      SPACING.xs,
  },

  welcomeSubtext: {
    color:
      COLORS.textSecondary,
    fontSize: 13,
    marginBottom:
      SPACING.lg,
  },

  loadingContainer: {
    backgroundColor:
      COLORS.surface,
    borderWidth: 1,
    borderColor:
      COLORS.border,
    borderRadius:
      BORDER_RADIUS.md,
    padding:
      SPACING.xxl,
    alignItems: 'center',
    justifyContent: 'center',
  },

  loadingText: {
    color:
      COLORS.textSecondary,
    fontSize: 13,
    marginTop:
      SPACING.md,
  },

  organisationCard: {
    backgroundColor:
      COLORS.surface,
    borderWidth: 1,
    borderColor:
      COLORS.border,
    borderRadius:
      BORDER_RADIUS.md,
    padding:
      SPACING.lg,
    marginBottom:
      SPACING.xl,
  },

  organisationTop: {
    flexDirection: 'row',
    alignItems: 'center',
  },

  organisationIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor:
      COLORS.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },

  organisationIconText: {
    color:
      COLORS.primary,
    fontSize: 20,
    fontWeight: '800',
  },

  organisationHeading: {
    flex: 1,
    marginLeft:
      SPACING.md,
  },

  organisationName: {
    color:
      COLORS.text,
    fontSize: 18,
    fontWeight: '800',
  },

  organisationType: {
    color:
      COLORS.textSecondary,
    fontSize: 12,
    marginTop:
      SPACING.xs,
  },

  statusBadge: {
    backgroundColor:
      COLORS.secondaryLight,
    paddingHorizontal:
      SPACING.md,
    paddingVertical:
      SPACING.sm,
    borderRadius:
      BORDER_RADIUS.round,
  },

  statusBadgeText: {
    color:
      COLORS.secondary,
    fontSize: 10,
    fontWeight: '800',
  },

  divider: {
    height: 1,
    backgroundColor:
      COLORS.borderLight,
    marginVertical:
      SPACING.lg,
  },

  detailsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.lg,
  },

  detailItem: {
    width: '46%',
    minWidth: 180,
  },

  detailLabel: {
    color:
      COLORS.textSecondary,
    fontSize: 10,
    fontWeight: '600',
    marginBottom:
      SPACING.xs,
  },

  detailValue: {
    color:
      COLORS.text,
    fontSize: 13,
    fontWeight: '600',
  },

  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color:
      COLORS.text,
    marginBottom:
      SPACING.md,
  },

  statsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.md,
  },

  roleCard: {
    backgroundColor:
      COLORS.primaryLight,
    borderWidth: 1,
    borderColor:
      COLORS.border,
    borderRadius:
      BORDER_RADIUS.md,
    padding:
      SPACING.lg,
    marginTop:
      SPACING.lg,
  },

  roleTitle: {
    color:
      COLORS.primary,
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1,
  },

  roleValue: {
    color:
      COLORS.text,
    fontSize: 18,
    fontWeight: '800',
    marginTop:
      SPACING.sm,
  },

  roleDescription: {
    color:
      COLORS.textSecondary,
    fontSize: 12,
    lineHeight: 18,
    marginTop:
      SPACING.xs,
  },

  section: {
    marginTop:
      SPACING.xl,
  },
});