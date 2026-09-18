import React, {
  useCallback,
  useState,
} from 'react';

import {
  Image,
  Pressable,
  RefreshControl,
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { router, useFocusEffect } from 'expo-router';

import ProtectedRoute from '../../src/components/ProtectedRoute';
import { useAuth } from '../../src/contexts/AuthContext';
import { supabase } from '../../src/services/supabase';
import { ROLES } from '../../src/constants/roles';

export default function DSACDashboard() {
  const {
    profile,
    signOut,
  } = useAuth();

  const [stats, setStats] = useState({
    organisations: 0,
    fundingAgreements: 0,
    accountabilityCases: 0,
    pendingReviews: 0,
  });

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadDashboard = useCallback(async () => {
    try {
      setLoading(true);

      const [
        organisationsResult,
        fundingResult,
        casesResult,
        reviewsResult,
      ] = await Promise.all([
        supabase
          .from('organisations')
          .select('id', {
            count: 'exact',
            head: true,
          }),

        supabase
          .from('funding_agreements')
          .select('id', {
            count: 'exact',
            head: true,
          }),

        supabase
          .from('accountability_cases')
          .select('id', {
            count: 'exact',
            head: true,
          })
          .in('status', [
            'DRAFT',
            'IN PROGRESS',
            'UNDER REVIEW',
            'ACTION REQUIRED',
          ]),

        supabase
          .from('approvals')
          .select('id', {
            count: 'exact',
            head: true,
          })
          .eq('status', 'PENDING'),
      ]);

      if (organisationsResult.error) {
        throw organisationsResult.error;
      }

      if (fundingResult.error) {
        throw fundingResult.error;
      }

      if (casesResult.error) {
        throw casesResult.error;
      }

      if (reviewsResult.error) {
        throw reviewsResult.error;
      }

      setStats({
        organisations: organisationsResult.count ?? 0,
        fundingAgreements: fundingResult.count ?? 0,
        accountabilityCases: casesResult.count ?? 0,
        pendingReviews: reviewsResult.count ?? 0,
      });
    } catch (error) {
      console.error(
        'DSAC dashboard loading error:',
        error
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadDashboard();
    }, [loadDashboard])
  );

  const refresh = async () => {
    setRefreshing(true);

    try {
      await loadDashboard();
    } finally {
      setRefreshing(false);
    }
  };

  const logout = async () => {
    try {
      await signOut();
      router.replace('/auth/login');
    } catch (error) {
      console.error(
        'Sign out error:',
        error
      );
    }
  };

  return (
    <ProtectedRoute
      allowedRoles={[ROLES.DSAC_ADMIN]}
    >
      <SafeAreaView style={styles.safeArea}>

        <StatusBar
          barStyle="light-content"
          backgroundColor="#18202A"
        />

        <ScrollView
          style={styles.container}
          contentContainerStyle={styles.content}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={refresh}
            />
          }
        >

          {/* ================================================= */}
          {/* SOUTH AFRICAN COLOUR STRIP */}
          {/* ================================================= */}

          <View style={styles.flagStrip}>
            <View style={styles.flagBlack} />
            <View style={styles.flagGold} />
            <View style={styles.flagGreen} />
            <View style={styles.flagBlue} />
            <View style={styles.flagRed} />
          </View>


          {/* ================================================= */}
          {/* GOVERNMENT MASTHEAD */}
          {/* ================================================= */}

          <View style={styles.govHeader}>

            <View style={styles.govIdentity}>

              {/* Official Coat of Arms */}
              <View style={styles.coatOfArmsContainer}>

                <Image
                  source={require('../../assets/images/sa.jpg')}
                  style={styles.coatOfArms}
                  resizeMode="contain"
                />

              </View>


              <View style={styles.govText}>

                <Text style={styles.republic}>
                  REPUBLIC OF SOUTH AFRICA
                </Text>

                <Text style={styles.department}>
                  DEPARTMENT OF SPORT, ARTS AND CULTURE
                </Text>

                <View style={styles.dividerLine} />

                <Text style={styles.govSubtitle}>
                  National Department
                </Text>

              </View>

            </View>


            {/* Administrator area */}

            <View style={styles.userPanel}>

              <Text style={styles.userLabel}>
                SYSTEM USER
              </Text>

              <Text style={styles.userRole}>
                DSAC ADMINISTRATOR
              </Text>

              <Text style={styles.userEmail}>
                {profile?.email || 'Administrator'}
              </Text>

              <Pressable
                onPress={logout}
                style={styles.logoutButton}
              >
                <Text style={styles.logoutText}>
                  SIGN OUT
                </Text>
              </Pressable>

            </View>

          </View>


          {/* ================================================= */}
          {/* SYSTEM IDENTITY */}
          {/* ================================================= */}

          <View style={styles.systemBar}>

            <View>

              <Text style={styles.systemName}>
                CIVITRACK
              </Text>

              <Text style={styles.systemDescription}>
                Public Funding & Accountability Management System
              </Text>

            </View>


            <View style={styles.systemStatus}>

              <View style={styles.statusIndicator} />

              <View>
                <Text style={styles.statusLabel}>
                  SYSTEM STATUS
                </Text>

                <Text style={styles.statusValue}>
                  OPERATIONAL
                </Text>
              </View>

            </View>

          </View>


          {/* ================================================= */}
          {/* NAVIGATION */}
          {/* ================================================= */}

          <View style={styles.navigation}>

            <View style={styles.navActive}>
              <Text style={styles.navActiveText}>
                Dashboard
              </Text>
            </View>


            <Pressable
              style={styles.navItem}
              onPress={() =>
                router.push('/dsac/organisations')
              }
            >
              <Text style={styles.navText}>
                Organisations
              </Text>
            </Pressable>


            <Pressable
              style={styles.navItem}
              onPress={() =>
                router.push('/dsac/funding-agreements')
              }
            >
              <Text style={styles.navText}>
                Funding Agreements
              </Text>
            </Pressable>


            <Pressable
              style={styles.navItem}
              onPress={() =>
                router.push('/dsac/cases')
              }
            >
              <Text style={styles.navText}>
                Accountability Cases
              </Text>
            </Pressable>


            <Pressable
              style={styles.navItem}
              onPress={() =>
                router.push('/dsac/analytics')
              }
            >
              <Text style={styles.navText}>
                Analytics
              </Text>
            </Pressable>


            <Pressable style={styles.navItem}>
              <Text style={styles.navText}>
                Audit Log
              </Text>
            </Pressable>

          </View>


          {/* ================================================= */}
          {/* MAIN CONTENT */}
          {/* ================================================= */}

          <View style={styles.main}>

            {/* Breadcrumb */}

            <View style={styles.breadcrumb}>

              <Text style={styles.breadcrumbText}>
                DSAC ADMINISTRATION
              </Text>

              <Text style={styles.breadcrumbDivider}>
                /
              </Text>

              <Text style={styles.breadcrumbCurrent}>
                Dashboard
              </Text>

            </View>


            {/* Page heading */}

            <View style={styles.pageHeading}>

              <View style={styles.headingLeft}>

                <Text style={styles.pageTitle}>
                  DSAC Accountability Dashboard
                </Text>

                <Text style={styles.pageDescription}>
                  Central administration and oversight of public
                  funding, organisations and accountability matters.
                </Text>

              </View>


              <View style={styles.periodBox}>

                <Text style={styles.periodLabel}>
                  FINANCIAL YEAR
                </Text>

                <Text style={styles.periodValue}>
                  2026 / 2027
                </Text>

              </View>

            </View>


            {/* ================================================= */}
            {/* OVERVIEW */}
            {/* ================================================= */}

            <View style={styles.sectionHeader}>

              <View style={styles.sectionAccent} />

              <View>
                <Text style={styles.sectionTitle}>
                  ACCOUNTABILITY OVERVIEW
                </Text>

                <Text style={styles.sectionSubtitle}>
                  Current system records and outstanding activities
                </Text>
              </View>

            </View>


            <View style={styles.stats}>

              <GovernmentStatCard
                title="REGISTERED ORGANISATIONS"
                value={
                  loading
                    ? '—'
                    : stats.organisations
                }
                description="NPOs and public entities"
                accent="#007A4D"
              />


              <GovernmentStatCard
                title="FUNDING AGREEMENTS"
                value={
                  loading
                    ? '—'
                    : stats.fundingAgreements
                }
                description="Recorded funding agreements"
                accent="#D4A72C"
              />


              <GovernmentStatCard
                title="ACCOUNTABILITY CASES"
                value={
                  loading
                    ? '—'
                    : stats.accountabilityCases
                }
                description="Active accountability matters"
                accent="#1D2733"
              />


              <GovernmentStatCard
                title="PENDING REVIEWS"
                value={
                  loading
                    ? '—'
                    : stats.pendingReviews
                }
                description="Items awaiting official review"
                accent="#C62828"
              />

            </View>


            {/* ================================================= */}
            {/* QUICK ACTIONS */}
            {/* ================================================= */}

            <View style={styles.sectionHeader}>

              <View style={styles.sectionAccent} />

              <View>
                <Text style={styles.sectionTitle}>
                  ADMINISTRATIVE ACTIONS
                </Text>

                <Text style={styles.sectionSubtitle}>
                  Common departmental administration functions
                </Text>
              </View>

            </View>


            <View style={styles.actions}>

              <GovernmentAction
                number="01"
                title="Manage Organisations"
                description="Register and maintain NPO and public entity records."
                accent="#007A4D"
                onPress={() =>
                  router.push('/dsac/organisations')
                }
              />


              <GovernmentAction
                number="02"
                title="Funding Agreements"
                description="Record allocations, agreements and accountability requirements."
                accent="#D4A72C"
                onPress={() =>
                  router.push('/dsac/funding-agreements')
                }
              />


              <GovernmentAction
                number="03"
                title="Accountability Cases"
                description="Create, assign and monitor accountability cases."
                accent="#1D2733"
                onPress={() =>
                  router.push('/dsac/cases')
                }
              />


              <GovernmentAction
                number="04"
                title="Analytics & Early Warning"
                description="KPI trends, target status and at-risk deadline alerts."
                accent="#123B63"
                onPress={() =>
                  router.push('/dsac/analytics')
                }
              />

            </View>


            {/* ================================================= */}
            {/* WORKFLOW */}
            {/* ================================================= */}

            <View style={styles.sectionHeader}>

              <View style={styles.sectionAccent} />

              <View>
                <Text style={styles.sectionTitle}>
                  CIVITRACK GOVERNANCE WORKFLOW
                </Text>

                <Text style={styles.sectionSubtitle}>
                  Standard administrative process
                </Text>
              </View>

            </View>


            <View style={styles.workflow}>

              <WorkflowStep
                number="01"
                title="Organisation"
                description="Register organisation"
              />

              <WorkflowLine />

              <WorkflowStep
                number="02"
                title="Funding"
                description="Create agreement"
              />

              <WorkflowLine />

              <WorkflowStep
                number="03"
                title="Case"
                description="Assign case"
              />

              <WorkflowLine />

              <WorkflowStep
                number="04"
                title="Workspace"
                description="Manage evidence"
              />

              <WorkflowLine />

              <WorkflowStep
                number="05"
                title="Review"
                description="Review and approve"
              />

            </View>


            {/* ================================================= */}
            {/* ADMINISTRATIVE NOTICE */}
            {/* ================================================= */}

            <View style={styles.notice}>

              <View style={styles.noticeBar} />

              <View style={styles.noticeContent}>

                <Text style={styles.noticeTitle}>
                  ADMINISTRATIVE INFORMATION
                </Text>

                <Text style={styles.noticeText}>
                  All records and transactions within CIVITRACK
                  should be maintained in accordance with applicable
                  departmental policies, financial controls and
                  records-management requirements.
                </Text>

              </View>

            </View>

          </View>


          {/* ================================================= */}
          {/* FOOTER */}
          {/* ================================================= */}

          <View style={styles.footer}>

            <View style={styles.footerInner}>

              <Text style={styles.footerRepublic}>
                REPUBLIC OF SOUTH AFRICA
              </Text>

              <Text style={styles.footerDepartment}>
                Department of Sport, Arts and Culture
              </Text>

              <Text style={styles.footerSystem}>
                CIVITRACK — Public Funding & Accountability
                Management System
              </Text>

              <View style={styles.footerLine} />

              <Text style={styles.footerCopyright}>
                © 2026 Department of Sport, Arts and Culture
              </Text>

            </View>

          </View>

        </ScrollView>

      </SafeAreaView>
    </ProtectedRoute>
  );
}


/* ========================================================= */
/* GOVERNMENT STAT CARD */
/* ========================================================= */

function GovernmentStatCard({
  title,
  value,
  description,
  accent,
}) {
  return (
    <View style={styles.statCard}>

      <View
        style={[
          styles.statAccent,
          { backgroundColor: accent },
        ]}
      />

      <Text style={styles.statLabel}>
        {title}
      </Text>

      <Text style={styles.statNumber}>
        {value}
      </Text>

      <Text style={styles.statDescription}>
        {description}
      </Text>

      <View style={styles.statBottomLine} />

    </View>
  );
}


/* ========================================================= */
/* GOVERNMENT ACTION */
/* ========================================================= */

function GovernmentAction({
  number,
  title,
  description,
  accent,
  onPress,
}) {
  return (
    <Pressable
      style={({ pressed }) => [
        styles.actionCard,
        pressed && styles.actionCardPressed,
      ]}
      onPress={onPress}
    >

      <View
        style={[
          styles.actionNumber,
          { backgroundColor: accent },
        ]}
      >
        <Text style={styles.actionNumberText}>
          {number}
        </Text>
      </View>

      <View style={styles.actionContent}>

        <Text style={styles.actionTitle}>
          {title}
        </Text>

        <Text style={styles.actionDescription}>
          {description}
        </Text>

      </View>

      <Text style={styles.actionArrow}>
        →
      </Text>

    </Pressable>
  );
}


/* ========================================================= */
/* WORKFLOW STEP */
/* ========================================================= */

function WorkflowStep({
  number,
  title,
  description,
}) {
  return (
    <View style={styles.workflowStep}>

      <View style={styles.workflowCircle}>

        <Text style={styles.workflowNumber}>
          {number}
        </Text>

      </View>

      <Text style={styles.workflowTitle}>
        {title}
      </Text>

      <Text style={styles.workflowDescription}>
        {description}
      </Text>

    </View>
  );
}


/* ========================================================= */
/* WORKFLOW LINE */
/* ========================================================= */

function WorkflowLine() {
  return (
    <View style={styles.workflowLineContainer}>

      <View style={styles.workflowLine} />

    </View>
  );
}


/* ========================================================= */
/* STYLES */
/* ========================================================= */

const styles = StyleSheet.create({

  safeArea: {
    flex: 1,
    backgroundColor: '#F2F4F5',
  },

  container: {
    flex: 1,
    backgroundColor: '#F2F4F5',
  },

  content: {
    flexGrow: 1,
  },


  /* --------------------------------------------- */
  /* SA FLAG STRIP */
  /* --------------------------------------------- */

  flagStrip: {
    height: 6,
    flexDirection: 'row',
  },

  flagBlack: {
    flex: 1,
    backgroundColor: '#000000',
  },

  flagGold: {
    flex: 1,
    backgroundColor: '#FFB612',
  },

  flagGreen: {
    flex: 2,
    backgroundColor: '#007A4D',
  },

  flagBlue: {
    flex: 1,
    backgroundColor: '#001489',
  },

  flagRed: {
    flex: 1,
    backgroundColor: '#DE3831',
  },


  /* --------------------------------------------- */
  /* GOVERNMENT HEADER */
  /* --------------------------------------------- */

  govHeader: {
    backgroundColor: '#18202A',
    minHeight: 112,
    paddingHorizontal: 34,
    paddingVertical: 18,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },

  govIdentity: {
    flexDirection: 'row',
    alignItems: 'center',
  },

  coatOfArmsContainer: {
    width: 74,
    height: 74,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 18,
  },

  coatOfArms: {
    width: 68,
    height: 68,
  },

  govText: {
    justifyContent: 'center',
  },

  republic: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '900',
    letterSpacing: 1.3,
  },

  department: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '700',
    marginTop: 5,
  },

  dividerLine: {
    width: 100,
    height: 2,
    backgroundColor: '#D4A72C',
    marginTop: 9,
    marginBottom: 6,
  },

  govSubtitle: {
    color: '#B8C0C8',
    fontSize: 10,
    fontWeight: '600',
    letterSpacing: 0.7,
  },


  /* --------------------------------------------- */
  /* USER PANEL */
  /* --------------------------------------------- */

  userPanel: {
    alignItems: 'flex-end',
  },

  userLabel: {
    color: '#9FA8B1',
    fontSize: 8,
    fontWeight: '800',
    letterSpacing: 1,
  },

  userRole: {
    color: '#D4A72C',
    fontSize: 10,
    fontWeight: '900',
    marginTop: 4,
    letterSpacing: 0.6,
  },

  userEmail: {
    color: '#D7DCE0',
    fontSize: 10,
    marginTop: 3,
  },

  logoutButton: {
    marginTop: 8,
    borderWidth: 1,
    borderColor: '#68737E',
    paddingHorizontal: 11,
    paddingVertical: 5,
  },

  logoutText: {
    color: '#FFFFFF',
    fontSize: 8,
    fontWeight: '800',
    letterSpacing: 0.8,
  },


  /* --------------------------------------------- */
  /* SYSTEM BAR */
  /* --------------------------------------------- */

  systemBar: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 34,
    paddingVertical: 19,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#D9DDE0',
  },

  systemName: {
    color: '#18202A',
    fontSize: 24,
    fontWeight: '900',
    letterSpacing: 2.2,
  },

  systemDescription: {
    color: '#65707A',
    fontSize: 10,
    marginTop: 3,
  },

  systemStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#D9E4DD',
    backgroundColor: '#F7FAF8',
    paddingHorizontal: 13,
    paddingVertical: 8,
  },

  statusIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#007A4D',
    marginRight: 9,
  },

  statusLabel: {
    color: '#758078',
    fontSize: 7,
    fontWeight: '900',
    letterSpacing: 0.8,
  },

  statusValue: {
    color: '#007A4D',
    fontSize: 9,
    fontWeight: '900',
    marginTop: 2,
  },


  /* --------------------------------------------- */
  /* NAVIGATION */
  /* --------------------------------------------- */

  navigation: {
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#D2D7DA',
    flexDirection: 'row',
    paddingHorizontal: 25,
  },

  navItem: {
    paddingHorizontal: 17,
    paddingVertical: 14,
    justifyContent: 'center',
  },

  navText: {
    color: '#4E5963',
    fontSize: 10,
    fontWeight: '700',
  },

  navActive: {
    paddingHorizontal: 17,
    paddingVertical: 14,
    backgroundColor: '#F7F9F8',
  },

  navActiveText: {
    color: '#18202A',
    fontSize: 10,
    fontWeight: '900',
  },


  /* --------------------------------------------- */
  /* MAIN */
  /* --------------------------------------------- */

  main: {
    width: '100%',
    maxWidth: 1320,
    alignSelf: 'center',
    paddingHorizontal: 34,
    paddingVertical: 28,
  },


  /* --------------------------------------------- */
  /* BREADCRUMB */
  /* --------------------------------------------- */

  breadcrumb: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },

  breadcrumbText: {
    color: '#78838C',
    fontSize: 8,
    fontWeight: '900',
    letterSpacing: 0.7,
  },

  breadcrumbDivider: {
    color: '#B4BBC0',
    marginHorizontal: 7,
    fontSize: 10,
  },

  breadcrumbCurrent: {
    color: '#18202A',
    fontSize: 8,
    fontWeight: '900',
  },


  /* --------------------------------------------- */
  /* PAGE HEADING */
  /* --------------------------------------------- */

  pageHeading: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 30,
  },

  headingLeft: {
    flex: 1,
  },

  pageTitle: {
    color: '#18202A',
    fontSize: 25,
    fontWeight: '900',
  },

  pageDescription: {
    color: '#626D76',
    fontSize: 11,
    lineHeight: 17,
    marginTop: 7,
    maxWidth: 760,
  },

  periodBox: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#D9DDE0',
    paddingHorizontal: 16,
    paddingVertical: 11,
    minWidth: 150,
  },

  periodLabel: {
    color: '#7A838A',
    fontSize: 7,
    fontWeight: '900',
    letterSpacing: 0.8,
  },

  periodValue: {
    color: '#18202A',
    fontSize: 15,
    fontWeight: '900',
    marginTop: 4,
  },


  /* --------------------------------------------- */
  /* SECTION */
  /* --------------------------------------------- */

  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 13,
    marginTop: 4,
  },

  sectionAccent: {
    width: 4,
    height: 28,
    backgroundColor: '#007A4D',
    marginRight: 10,
  },

  sectionTitle: {
    color: '#27313A',
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 0.8,
  },

  sectionSubtitle: {
    color: '#7A848C',
    fontSize: 9,
    marginTop: 3,
  },


  /* --------------------------------------------- */
  /* STATISTICS */
  /* --------------------------------------------- */

  stats: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -6,
    marginBottom: 31,
  },

  statCard: {
    flex: 1,
    minWidth: 210,
    minHeight: 145,
    margin: 6,
    padding: 19,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#D7DCDF',
    position: 'relative',
    overflow: 'hidden',
  },

  statAccent: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 4,
  },

  statLabel: {
    color: '#68737C',
    fontSize: 8,
    fontWeight: '900',
    letterSpacing: 0.6,
    marginTop: 3,
  },

  statNumber: {
    color: '#18202A',
    fontSize: 34,
    fontWeight: '900',
    marginTop: 13,
  },

  statDescription: {
    color: '#737D85',
    fontSize: 9,
    marginTop: 3,
  },

  statBottomLine: {
    position: 'absolute',
    bottom: 0,
    left: 19,
    right: 19,
    height: 1,
    backgroundColor: '#E7E9EA',
  },


  /* --------------------------------------------- */
  /* ACTIONS */
  /* --------------------------------------------- */

  actions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -6,
    marginBottom: 31,
  },

  actionCard: {
    flex: 1,
    minWidth: 280,
    minHeight: 104,
    margin: 6,
    padding: 17,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#D7DCDF',
    flexDirection: 'row',
    alignItems: 'center',
  },

  actionCardPressed: {
    backgroundColor: '#F5F7F7',
  },

  actionNumber: {
    width: 42,
    height: 42,
    justifyContent: 'center',
    alignItems: 'center',
  },

  actionNumberText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '900',
  },

  actionContent: {
    flex: 1,
    marginLeft: 13,
  },

  actionTitle: {
    color: '#202A32',
    fontSize: 12,
    fontWeight: '900',
  },

  actionDescription: {
    color: '#737D85',
    fontSize: 9,
    lineHeight: 15,
    marginTop: 5,
  },

  actionArrow: {
    color: '#007A4D',
    fontSize: 20,
    fontWeight: '900',
    marginLeft: 8,
  },


  /* --------------------------------------------- */
  /* WORKFLOW */
  /* --------------------------------------------- */

  workflow: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#D7DCDF',
    paddingHorizontal: 22,
    paddingVertical: 24,
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    marginBottom: 25,
  },

  workflowStep: {
    flex: 1,
    minWidth: 125,
    alignItems: 'center',
  },

  workflowCircle: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: '#18202A',
    alignItems: 'center',
    justifyContent: 'center',
  },

  workflowNumber: {
    color: '#FFFFFF',
    fontSize: 9,
    fontWeight: '900',
  },

  workflowTitle: {
    color: '#263039',
    fontSize: 11,
    fontWeight: '900',
    marginTop: 8,
  },

  workflowDescription: {
    color: '#7A848C',
    fontSize: 8,
    textAlign: 'center',
    marginTop: 4,
  },

  workflowLineContainer: {
    flex: 0.4,
    minWidth: 25,
    alignItems: 'center',
  },

  workflowLine: {
    width: '100%',
    height: 1,
    backgroundColor: '#D4A72C',
  },


  /* --------------------------------------------- */
  /* NOTICE */
  /* --------------------------------------------- */

  notice: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#D7DCDF',
    flexDirection: 'row',
    marginBottom: 10,
  },

  noticeBar: {
    width: 5,
    backgroundColor: '#007A4D',
  },

  noticeContent: {
    padding: 17,
    flex: 1,
  },

  noticeTitle: {
    color: '#27313A',
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 0.7,
  },

  noticeText: {
    color: '#69747D',
    fontSize: 9,
    lineHeight: 15,
    marginTop: 5,
  },


  /* --------------------------------------------- */
  /* FOOTER */
  /* --------------------------------------------- */

  footer: {
    backgroundColor: '#18202A',
    paddingVertical: 30,
    alignItems: 'center',
  },

  footerInner: {
    alignItems: 'center',
    paddingHorizontal: 20,
  },

  footerRepublic: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 1,
  },

  footerDepartment: {
    color: '#D4A72C',
    fontSize: 10,
    fontWeight: '800',
    marginTop: 5,
  },

  footerSystem: {
    color: '#AAB2B9',
    fontSize: 9,
    marginTop: 6,
    textAlign: 'center',
  },

  footerLine: {
    width: 80,
    height: 1,
    backgroundColor: '#53606B',
    marginVertical: 13,
  },

  footerCopyright: {
    color: '#7F8992',
    fontSize: 8,
  },

});