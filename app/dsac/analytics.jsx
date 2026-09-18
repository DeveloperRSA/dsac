import { useCallback, useState } from 'react';

import {
  ActivityIndicator,
  Linking,
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
import { supabase } from '../../src/services/supabase';
import { ROLES } from '../../src/constants/roles';

const STATUS_ORDER = [
  'DRAFT',
  'IN PROGRESS',
  'UNDER REVIEW',
  'ACTION REQUIRED',
  'APPROVED',
];

const STATUS_LABELS = {
  DRAFT: 'Not Started',
  'IN PROGRESS': 'In Progress',
  'UNDER REVIEW': 'Under Review',
  'ACTION REQUIRED': 'Action Required',
  APPROVED: 'Completed',
};

const STATUS_COLORS = {
  DRAFT: '#8A9298',
  'IN PROGRESS': '#175CD3',
  'UNDER REVIEW': '#B7791F',
  'ACTION REQUIRED': '#B42318',
  APPROVED: '#1F6B4F',
};

function daysUntil(dateString) {
  if (!dateString) return null;
  const due = new Date(dateString + 'T00:00:00');
  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const diffMs = due.getTime() - startOfToday.getTime();
  return Math.round(diffMs / 86400000);
}

function warningSeverity(days) {
  if (days < 0) return { label: 'OVERDUE', color: '#B42318', bg: '#FEECEB' };
  if (days === 0) return { label: 'DUE TODAY — HOURLY', color: '#B42318', bg: '#FEECEB' };
  if (days <= 15) return { label: `DUE IN ${days} DAYS`, color: '#B7791F', bg: '#FFF7E6' };
  if (days <= 30) return { label: `DUE IN ${days} DAYS`, color: '#175CD3', bg: '#EFF8FF' };
  return null;
}

export default function AnalyticsScreen() {
  const [cases, setCases] = useState([]);
  const [agreements, setAgreements] = useState([]);
  const [organisations, setOrganisations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);

      const [casesResult, agreementsResult, organisationsResult] = await Promise.all([
        supabase
          .from('accountability_cases')
          .select('id, case_number, status, priority, due_date, organisations ( name )')
          .order('due_date', { ascending: true }),

        supabase
          .from('funding_agreements')
          .select('id, allocated_amount, currency, status, created_at')
          .order('created_at', { ascending: true }),

        supabase
          .from('organisations')
          .select('id, created_at')
          .order('created_at', { ascending: true }),
      ]);

      if (casesResult.error) throw casesResult.error;
      if (agreementsResult.error) throw agreementsResult.error;
      if (organisationsResult.error) throw organisationsResult.error;

      setCases(casesResult.data || []);
      setAgreements(agreementsResult.data || []);
      setOrganisations(organisationsResult.data || []);
    } catch (error) {
      console.error('Analytics loading error:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData])
  );

  const onRefresh = () => {
    setRefreshing(true);
    loadData();
  };

  /* ---- Target status breakdown ---- */
  const statusCounts = STATUS_ORDER.reduce((acc, s) => ({ ...acc, [s]: 0 }), {});
  cases.forEach((c) => {
    if (statusCounts[c.status] !== undefined) statusCounts[c.status] += 1;
  });
  const maxStatusCount = Math.max(1, ...Object.values(statusCounts));

  const deadlineMissed = cases.filter((c) => {
    const d = daysUntil(c.due_date);
    return c.status !== 'APPROVED' && d !== null && d < 0;
  }).length;

  /* ---- Early warning list ---- */
  const earlyWarnings = cases
    .filter((c) => c.status !== 'APPROVED' && c.due_date)
    .map((c) => ({ ...c, daysRemaining: daysUntil(c.due_date) }))
    .filter((c) => c.daysRemaining <= 30)
    .sort((a, b) => a.daysRemaining - b.daysRemaining);

  /* ---- Funding trend (by month) ---- */
  const monthKey = (iso) => iso.slice(0, 7); // YYYY-MM
  const fundingByMonth = {};
  agreements.forEach((a) => {
    if (!a.created_at) return;
    const key = monthKey(a.created_at);
    fundingByMonth[key] = (fundingByMonth[key] || 0) + (Number(a.allocated_amount) || 0);
  });
  const fundingMonths = Object.keys(fundingByMonth).sort().slice(-6);
  const maxFunding = Math.max(1, ...fundingMonths.map((m) => fundingByMonth[m]));

  /* ---- Organisation growth (year over year) ---- */
  const orgsByYear = {};
  organisations.forEach((o) => {
    if (!o.created_at) return;
    const year = o.created_at.slice(0, 4);
    orgsByYear[year] = (orgsByYear[year] || 0) + 1;
  });
  const years = Object.keys(orgsByYear).sort();
  const maxOrgs = Math.max(1, ...years.map((y) => orgsByYear[y]));

  return (
    <ProtectedRoute allowedRoles={[ROLES.DSAC_ADMIN]}>
      <SafeAreaView style={styles.safeArea}>
        <StatusBar barStyle="light-content" backgroundColor="#18202A" />

        <ScrollView
          contentContainerStyle={styles.scrollContent}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        >
          <View style={styles.flagStrip}>
            <View style={styles.flagBlack} />
            <View style={styles.flagGold} />
            <View style={styles.flagGreen} />
            <View style={styles.flagBlue} />
            <View style={styles.flagRed} />
          </View>

          <View style={styles.header}>
            <Pressable onPress={() => router.replace('/dsac/dashboard')}>
              <Text style={styles.back}>← Dashboard</Text>
            </Pressable>

            <Text style={styles.title}>Analytics &amp; Early Warning</Text>
            <Text style={styles.subtitle}>
              Predictive KPI overview and risk-based deadline alerts across all public
              entities, in line with the DSAC Analytics Module and Early Warning
              functional requirements.
            </Text>
          </View>

          {loading ? (
            <View style={styles.loadingBox}>
              <ActivityIndicator size="large" color="#123B63" />
              <Text style={styles.loadingText}>Loading analytics…</Text>
            </View>
          ) : (
            <View style={styles.main}>
              {/* ===== TARGET STATUS OVERVIEW ===== */}
              <Text style={styles.sectionTitle}>TARGET STATUS OVERVIEW</Text>
              <Text style={styles.sectionSubtitle}>
                Accountability case targets by status, across all public entities and NPOs
              </Text>

              <View style={styles.card}>
                {STATUS_ORDER.map((status) => (
                  <View key={status} style={styles.barRow}>
                    <Text style={styles.barLabel}>{STATUS_LABELS[status]}</Text>
                    <View style={styles.barTrack}>
                      <View
                        style={[
                          styles.barFill,
                          {
                            width: `${(statusCounts[status] / maxStatusCount) * 100}%`,
                            backgroundColor: STATUS_COLORS[status],
                          },
                        ]}
                      />
                    </View>
                    <Text style={styles.barValue}>{statusCounts[status]}</Text>
                  </View>
                ))}

                <View style={styles.missedRow}>
                  <Text style={styles.missedLabel}>DEADLINE MISSED</Text>
                  <Text style={styles.missedValue}>{deadlineMissed}</Text>
                </View>
              </View>

              {/* ===== EARLY WARNING ===== */}
              <Text style={styles.sectionTitle}>EARLY WARNING — UPCOMING &amp; OVERDUE</Text>
              <Text style={styles.sectionSubtitle}>
                Cases due within 30 days, or already overdue, ranked most urgent first
              </Text>

              <View style={styles.card}>
                {earlyWarnings.length === 0 ? (
                  <Text style={styles.emptyText}>
                    No cases are due within the next 30 days.
                  </Text>
                ) : (
                  earlyWarnings.map((c) => {
                    const sev = warningSeverity(c.daysRemaining);
                    return (
                      <View key={c.id} style={styles.warningRow}>
                        <View style={{ flex: 1 }}>
                          <Text style={styles.warningCase}>{c.case_number}</Text>
                          <Text style={styles.warningOrg}>
                            {c.organisations?.name || 'Unassigned organisation'}
                          </Text>
                        </View>
                        <View style={[styles.warningBadge, { backgroundColor: sev.bg }]}>
                          <Text style={[styles.warningBadgeText, { color: sev.color }]}>
                            {sev.label}
                          </Text>
                        </View>
                      </View>
                    );
                  })
                )}
              </View>

              {/* ===== FUNDING TREND ===== */}
              <Text style={styles.sectionTitle}>FUNDING ALLOCATION TREND</Text>
              <Text style={styles.sectionSubtitle}>
                Total funding agreements allocated per month (last 6 months with activity)
              </Text>

              <View style={styles.card}>
                {fundingMonths.length === 0 ? (
                  <Text style={styles.emptyText}>No funding agreements recorded yet.</Text>
                ) : (
                  fundingMonths.map((m) => (
                    <View key={m} style={styles.barRow}>
                      <Text style={styles.barLabel}>{m}</Text>
                      <View style={styles.barTrack}>
                        <View
                          style={[
                            styles.barFill,
                            {
                              width: `${(fundingByMonth[m] / maxFunding) * 100}%`,
                              backgroundColor: '#D4A72C',
                            },
                          ]}
                        />
                      </View>
                      <Text style={styles.barValue}>
                        R {fundingByMonth[m].toLocaleString('en-ZA')}
                      </Text>
                    </View>
                  ))
                )}
              </View>

              {/* ===== ORGANISATION GROWTH (YoY) ===== */}
              <Text style={styles.sectionTitle}>ORGANISATION GROWTH — YEAR ON YEAR</Text>
              <Text style={styles.sectionSubtitle}>
                Registered public entities and NPOs, by year of registration
              </Text>

              <View style={styles.card}>
                {years.length === 0 ? (
                  <Text style={styles.emptyText}>No organisations registered yet.</Text>
                ) : (
                  years.map((y) => (
                    <View key={y} style={styles.barRow}>
                      <Text style={styles.barLabel}>{y}</Text>
                      <View style={styles.barTrack}>
                        <View
                          style={[
                            styles.barFill,
                            { width: `${(orgsByYear[y] / maxOrgs) * 100}%`, backgroundColor: '#007A4D' },
                          ]}
                        />
                      </View>
                      <Text style={styles.barValue}>{orgsByYear[y]}</Text>
                    </View>
                  ))
                )}
              </View>

              {/* ===== ENTITY REPORTING (STAFF DEMOGRAPHICS / JOB CREATION) ===== */}
              <Text style={styles.sectionTitle}>
                ENTITY REPORTING — STAFF DEMOGRAPHICS &amp; JOB CREATION
              </Text>
              <Text style={styles.sectionSubtitle}>
                Audit findings, staff demographics and job-creation statistics per entity
              </Text>

              <View style={styles.placeholderCard}>
                <Text style={styles.placeholderTitle}>Awaiting entity reporting data</Text>
                <Text style={styles.placeholderText}>
                  This section is scaffolded for the {'entity_reports'} table (see{' '}
                  {'sql/schema.sql'}) — reporting period, staff totals (women / youth /
                  persons with disabilities), jobs created and audit findings, captured per
                  public entity per reporting period. Once entities start submitting
                  quarterly reports through the Document Repository, this section will chart
                  the same way the sections above do.
                </Text>
              </View>

              {/* ===== POWER BI ===== */}
              <Text style={styles.sectionTitle}>POWER BI EXECUTIVE DASHBOARD</Text>
              <Text style={styles.sectionSubtitle}>
                Connect Power BI directly to the CIVITRACK database for executive reporting
              </Text>

              <View style={styles.placeholderCard}>
                <Text style={styles.placeholderText}>
                  CIVITRACK runs on Supabase Postgres, so Power BI Desktop can connect
                  directly using the built-in PostgreSQL connector — no export step needed.
                  Connection details and suggested report pages are documented in{' '}
                  {'POWERBI.md'} in the project root.
                </Text>

                <Pressable
                  style={styles.linkButton}
                  onPress={() =>
                    Linking.openURL('https://learn.microsoft.com/power-bi/connect-data/desktop-connect-postgresql')
                  }
                >
                  <Text style={styles.linkButtonText}>Power BI PostgreSQL connector docs ↗</Text>
                </Pressable>
              </View>
            </View>
          )}
        </ScrollView>
      </SafeAreaView>
    </ProtectedRoute>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#F2F4F5' },
  scrollContent: { flexGrow: 1 },

  flagStrip: { height: 6, flexDirection: 'row' },
  flagBlack: { flex: 1, backgroundColor: '#000000' },
  flagGold: { flex: 1, backgroundColor: '#FFB612' },
  flagGreen: { flex: 2, backgroundColor: '#007A4D' },
  flagBlue: { flex: 1, backgroundColor: '#001489' },
  flagRed: { flex: 1, backgroundColor: '#DE3831' },

  header: {
    backgroundColor: '#18202A',
    paddingHorizontal: 24,
    paddingVertical: 20,
  },
  back: { color: '#D4A72C', fontSize: 12, fontWeight: '700', marginBottom: 10 },
  title: { color: '#FFFFFF', fontSize: 22, fontWeight: '800' },
  subtitle: { color: '#C3C9CF', fontSize: 12, marginTop: 6, lineHeight: 18, maxWidth: 640 },

  loadingBox: { alignItems: 'center', paddingVertical: 60 },
  loadingText: { marginTop: 12, color: '#667085', fontSize: 13 },

  main: { padding: 20 },

  sectionTitle: { fontSize: 13, fontWeight: '800', color: '#18202A', marginTop: 20 },
  sectionSubtitle: { fontSize: 11, color: '#667085', marginTop: 2, marginBottom: 10 },

  card: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#D7DCDF',
    padding: 16,
  },

  barRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  barLabel: { width: 96, fontSize: 11, color: '#4B5560' },
  barTrack: {
    flex: 1,
    height: 10,
    backgroundColor: '#EEF0F2',
    marginHorizontal: 10,
    overflow: 'hidden',
  },
  barFill: { height: '100%' },
  barValue: { width: 90, textAlign: 'right', fontSize: 11, fontWeight: '700', color: '#18202A' },

  missedRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderTopColor: '#EEEEEE',
    paddingTop: 12,
    marginTop: 4,
  },
  missedLabel: { fontSize: 11, fontWeight: '800', color: '#B42318' },
  missedValue: { fontSize: 14, fontWeight: '800', color: '#B42318' },

  emptyText: { fontSize: 12, color: '#8A9298' },

  warningRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#EEEEEE',
  },
  warningCase: { fontSize: 13, fontWeight: '700', color: '#18202A' },
  warningOrg: { fontSize: 11, color: '#8A9298', marginTop: 2 },
  warningBadge: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 3 },
  warningBadgeText: { fontSize: 10, fontWeight: '800', letterSpacing: 0.4 },

  placeholderCard: {
    backgroundColor: '#FAFBFB',
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: '#C8CED2',
    padding: 16,
  },
  placeholderTitle: { fontSize: 12, fontWeight: '800', color: '#4B5560', marginBottom: 6 },
  placeholderText: { fontSize: 12, color: '#667085', lineHeight: 18 },

  linkButton: { marginTop: 12, alignSelf: 'flex-start' },
  linkButtonText: { fontSize: 12, fontWeight: '700', color: '#123B63' },
});
