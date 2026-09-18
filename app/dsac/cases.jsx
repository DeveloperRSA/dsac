import React, { useCallback, useState } from 'react';

import {
  Alert,
  ActivityIndicator,
  Pressable,
  RefreshControl,
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import {
  router,
  useFocusEffect,
} from 'expo-router';

import ProtectedRoute from '../../src/components/ProtectedRoute';
import { useAuth } from '../../src/contexts/AuthContext';
import { supabase } from '../../src/services/supabase';
import { ROLES } from '../../src/constants/roles';

export default function CasesScreen() {
  const { user } = useAuth();

  const [showForm, setShowForm] = useState(false);

  const [caseNumber, setCaseNumber] = useState('');
  const [description, setDescription] = useState('');
  const [dueDate, setDueDate] = useState('');

  const [organisations, setOrganisations] = useState([]);
  const [fundingAgreements, setFundingAgreements] =
    useState([]);
  const [cases, setCases] = useState([]);

  const [selectedOrganisation, setSelectedOrganisation] =
    useState(null);

  const [selectedFundingAgreement, setSelectedFundingAgreement] =
    useState(null);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const [showOrganisationList, setShowOrganisationList] =
    useState(false);

  const [showFundingList, setShowFundingList] =
    useState(false);

  const [stats, setStats] = useState({
    DRAFT: 0,
    'IN PROGRESS': 0,
    'UNDER REVIEW': 0,
    'ACTION REQUIRED': 0,
    APPROVED: 0,
  });

  const loadData = useCallback(async () => {
    try {
      setLoading(true);

      const [
        organisationsResult,
        agreementsResult,
        casesResult,
      ] = await Promise.all([
        supabase
          .from('organisations')
          .select(
            'id, name, organisation_type, registration_number, status'
          )
          .order('name', {
            ascending: true,
          }),

        supabase
          .from('funding_agreements')
          .select(
            `
              id,
              organisation_id,
              agreement_number,
              title,
              allocated_amount,
              currency,
              status
            `
          )
          .order('created_at', {
            ascending: false,
          }),

        supabase
          .from('accountability_cases')
          .select(
            `
              id,
              case_number,
              title,
              description,
              status,
              priority,
              organisation_id,
              funding_agreement_id,
              due_date,
              created_at,
              organisations (
                id,
                name
              ),
              funding_agreements (
                id,
                agreement_number,
                title
              )
            `
          )
          .order('created_at', {
            ascending: false,
          }),
      ]);

      if (organisationsResult.error) {
        throw organisationsResult.error;
      }

      if (agreementsResult.error) {
        throw agreementsResult.error;
      }

      if (casesResult.error) {
        throw casesResult.error;
      }

      setOrganisations(
        organisationsResult.data || []
      );

      setFundingAgreements(
        agreementsResult.data || []
      );

      const loadedCases = casesResult.data || [];

      setCases(loadedCases);

      const calculatedStats = {
        DRAFT: 0,
        'IN PROGRESS': 0,
        'UNDER REVIEW': 0,
        'ACTION REQUIRED': 0,
        APPROVED: 0,
      };

      loadedCases.forEach((item) => {
        const status = item.status;

        if (
          Object.prototype.hasOwnProperty.call(
            calculatedStats,
            status
          )
        ) {
          calculatedStats[status] += 1;
        }
      });

      setStats(calculatedStats);
    } catch (error) {
      console.error(
        'Cases loading error:',
        error
      );

      Alert.alert(
        'Unable to Load Cases',
        error?.message ||
          'Something went wrong while loading accountability cases.'
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData])
  );

  const refresh = async () => {
    setRefreshing(true);

    try {
      await loadData();
    } finally {
      setRefreshing(false);
    }
  };

  const selectOrganisation = (organisation) => {
    setSelectedOrganisation(
      organisation
    );

    setSelectedFundingAgreement(null);

    setShowOrganisationList(false);
    setShowFundingList(false);
  };

  const selectFundingAgreement = (
    agreement
  ) => {
    setSelectedFundingAgreement(
      agreement
    );

    setShowFundingList(false);
  };

  const createCase = async () => {
    if (!caseNumber.trim()) {
      Alert.alert(
        'Missing Information',
        'Please enter a case number.'
      );
      return;
    }

    if (!selectedOrganisation) {
      Alert.alert(
        'Missing Information',
        'Please select an organisation.'
      );
      return;
    }

    if (!selectedFundingAgreement) {
      Alert.alert(
        'Missing Information',
        'Please select a funding agreement.'
      );
      return;
    }

    if (!description.trim()) {
      Alert.alert(
        'Missing Information',
        'Please enter a case description.'
      );
      return;
    }

    if (!user?.id) {
      Alert.alert(
        'Authentication Error',
        'Your account could not be identified. Please sign in again.'
      );
      return;
    }

    if (
      selectedFundingAgreement.organisation_id !==
      selectedOrganisation.id
    ) {
      Alert.alert(
        'Invalid Funding Agreement',
        'The selected funding agreement does not belong to the selected organisation.'
      );
      return;
    }

    try {
      setSaving(true);

      const { error } = await supabase
        .from('accountability_cases')
        .insert({
          case_number:
            caseNumber.trim(),

          title:
            caseNumber.trim(),

          description:
            description.trim(),

          due_date:
            dueDate.trim() || null,

          organisation_id:
            selectedOrganisation.id,

          funding_agreement_id:
            selectedFundingAgreement.id,

          status: 'DRAFT',

          priority: 'MEDIUM',

          created_by:
            user.id,

          responsible_user_id:
            null,
        });

      if (error) {
        throw error;
      }

      Alert.alert(
        'Accountability Case Created',
        `Case ${caseNumber.trim()} has been created successfully.`
      );

      setCaseNumber('');
      setDescription('');
      setDueDate('');

      setSelectedOrganisation(null);
      setSelectedFundingAgreement(null);

      setShowOrganisationList(false);
      setShowFundingList(false);

      setShowForm(false);

      await loadData();
    } catch (error) {
      console.error(
        'Create case error:',
        error
      );

      Alert.alert(
        'Unable to Create Case',
        error?.message ||
          'The accountability case could not be created.'
      );
    } finally {
      setSaving(false);
    }
  };

  const filteredFundingAgreements =
    selectedOrganisation
      ? fundingAgreements.filter(
          (agreement) =>
            agreement.organisation_id ===
            selectedOrganisation.id
        )
      : [];

  return (
    <ProtectedRoute
      allowedRoles={[
        ROLES.DSAC_ADMIN,
      ]}
    >
      <SafeAreaView style={styles.safeArea}>
        <StatusBar
          barStyle="light-content"
          backgroundColor="#111111"
        />

        <ScrollView
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={refresh}
            />
          }
        >
          <View style={styles.flagStrip}>
            <View style={styles.black} />
            <View style={styles.gold} />
            <View style={styles.green} />
            <View style={styles.blue} />
            <View style={styles.red} />
          </View>

          <View style={styles.header}>
            <Pressable
              onPress={() =>
                router.replace(
                  '/dsac/dashboard'
                )
              }
            >
              <Text style={styles.back}>
                ← Dashboard
              </Text>
            </Pressable>

            <View>
              <Text style={styles.brand}>
                CIVITRACK
              </Text>

              <Text style={styles.subtitle}>
                DSAC Accountability Cases
              </Text>
            </View>
          </View>

          <View style={styles.main}>
            <View style={styles.heading}>
              <View
                style={
                  styles.headingContent
                }
              >
                <Text style={styles.title}>
                  Accountability Cases
                </Text>

                <Text
                  style={
                    styles.description
                  }
                >
                  Create, assign and monitor
                  accountability cases linked
                  to funding agreements.
                </Text>
              </View>

              <Pressable
                style={styles.createButton}
                onPress={() =>
                  setShowForm(
                    !showForm
                  )
                }
              >
                <Text
                  style={
                    styles.createButtonText
                  }
                >
                  + CREATE CASE
                </Text>
              </Pressable>
            </View>

            {showForm && (
              <View style={styles.form}>
                <View style={styles.formTop} />

                <Text
                  style={styles.formTitle}
                >
                  Create Accountability Case
                </Text>

                <Text
                  style={
                    styles.formDescription
                  }
                >
                  A case becomes the main
                  accountability workspace
                  for an organisation.
                </Text>

                <Text style={styles.label}>
                  CASE NUMBER *
                </Text>

                <TextInput
                  style={styles.input}
                  placeholder="e.g. DSAC-CASE-2026-001"
                  placeholderTextColor="#888888"
                  value={caseNumber}
                  onChangeText={
                    setCaseNumber
                  }
                  autoCapitalize="characters"
                />

                <Text style={styles.label}>
                  ORGANISATION *
                </Text>

                <Pressable
                  style={[
                    styles.selectInput,
                    showOrganisationList &&
                      styles.selectInputActive,
                  ]}
                  onPress={() =>
                    setShowOrganisationList(
                      !showOrganisationList
                    )
                  }
                >
                  <Text
                    style={
                      selectedOrganisation
                        ? styles.selectText
                        : styles.placeholderText
                    }
                  >
                    {selectedOrganisation
                      ? selectedOrganisation.name
                      : 'Select organisation'}
                  </Text>

                  <Text
                    style={
                      styles.selectArrow
                    }
                  >
                    {showOrganisationList
                      ? '▲'
                      : '▼'}
                  </Text>
                </Pressable>

                {showOrganisationList && (
                  <View
                    style={
                      styles.dropdown
                    }
                  >
                    {organisations.length ===
                    0 ? (
                      <Text
                        style={
                          styles.dropdownEmpty
                        }
                      >
                        No organisations
                        available.
                      </Text>
                    ) : (
                      organisations.map(
                        (
                          organisation
                        ) => (
                          <Pressable
                            key={
                              organisation.id
                            }
                            style={
                              styles.dropdownItem
                            }
                            onPress={() =>
                              selectOrganisation(
                                organisation
                              )
                            }
                          >
                            <Text
                              style={
                                styles.dropdownItemTitle
                              }
                            >
                              {
                                organisation.name
                              }
                            </Text>

                            <Text
                              style={
                                styles.dropdownItemSubtitle
                              }
                            >
                              {
                                organisation.organisation_type
                              }

                              {organisation.registration_number
                                ? ` • ${organisation.registration_number}`
                                : ''}
                            </Text>
                          </Pressable>
                        )
                      )
                    )}
                  </View>
                )}

                <Text style={styles.label}>
                  FUNDING AGREEMENT *
                </Text>

                <Pressable
                  style={[
                    styles.selectInput,
                    !selectedOrganisation &&
                      styles.disabledInput,
                  ]}
                  disabled={
                    !selectedOrganisation
                  }
                  onPress={() =>
                    setShowFundingList(
                      !showFundingList
                    )
                  }
                >
                  <Text
                    style={
                      selectedFundingAgreement
                        ? styles.selectText
                        : styles.placeholderText
                    }
                  >
                    {selectedFundingAgreement
                      ? `${selectedFundingAgreement.agreement_number} — ${selectedFundingAgreement.title || 'Funding Agreement'}`
                      : selectedOrganisation
                      ? 'Select funding agreement'
                      : 'Select an organisation first'}
                  </Text>

                  <Text
                    style={
                      styles.selectArrow
                    }
                  >
                    {selectedOrganisation
                      ? showFundingList
                        ? '▲'
                        : '▼'
                      : ''}
                  </Text>
                </Pressable>

                {showFundingList &&
                  selectedOrganisation && (
                    <View
                      style={
                        styles.dropdown
                      }
                    >
                      {filteredFundingAgreements.length ===
                      0 ? (
                        <Text
                          style={
                            styles.dropdownEmpty
                          }
                        >
                          No funding agreements
                          found for this
                          organisation.
                        </Text>
                      ) : (
                        filteredFundingAgreements.map(
                          (
                            agreement
                          ) => (
                            <Pressable
                              key={
                                agreement.id
                              }
                              style={
                                styles.dropdownItem
                              }
                              onPress={() =>
                                selectFundingAgreement(
                                  agreement
                                )
                              }
                            >
                              <Text
                                style={
                                  styles.dropdownItemTitle
                                }
                              >
                                {
                                  agreement.agreement_number
                                }
                              </Text>

                              <Text
                                style={
                                  styles.dropdownItemSubtitle
                                }
                              >
                                {agreement.title ||
                                  'Funding Agreement'}

                                {agreement.allocated_amount !==
                                null
                                  ? ` • ${agreement.currency || 'ZAR'} ${Number(
                                      agreement.allocated_amount
                                    ).toLocaleString(
                                      'en-ZA'
                                    )}`
                                  : ''}
                              </Text>
                            </Pressable>
                          )
                        )
                      )}
                    </View>
                  )}

                <Text style={styles.label}>
                  CASE DESCRIPTION *
                </Text>

                <TextInput
                  style={[
                    styles.input,
                    styles.textArea,
                  ]}
                  placeholder="Describe the accountability requirements..."
                  placeholderTextColor="#888888"
                  value={description}
                  onChangeText={
                    setDescription
                  }
                  multiline
                  textAlignVertical="top"
                />

                <Text style={styles.label}>
                  DUE DATE
                </Text>

                <TextInput
                  style={styles.input}
                  placeholder="YYYY-MM-DD"
                  placeholderTextColor="#888888"
                  value={dueDate}
                  onChangeText={setDueDate}
                />

                <View style={styles.actions}>
                  <Pressable
                    style={styles.cancel}
                    onPress={() =>
                      setShowForm(false)
                    }
                    disabled={saving}
                  >
                    <Text
                      style={
                        styles.cancelText
                      }
                    >
                      CANCEL
                    </Text>
                  </Pressable>

                  <Pressable
                    style={[
                      styles.save,
                      saving &&
                        styles.saveDisabled,
                    ]}
                    onPress={createCase}
                    disabled={saving}
                  >
                    {saving ? (
                      <ActivityIndicator
                        size="small"
                        color="#FFFFFF"
                      />
                    ) : (
                      <Text
                        style={
                          styles.saveText
                        }
                      >
                        CREATE CASE
                      </Text>
                    )}
                  </Pressable>
                </View>
              </View>
            )}

            {loading ? (
              <View
                style={
                  styles.loadingContainer
                }
              >
                <ActivityIndicator
                  size="large"
                  color="#007A4D"
                />

                <Text
                  style={
                    styles.loadingText
                  }
                >
                  Loading accountability
                  cases...
                </Text>
              </View>
            ) : (
              <>
                <View
                  style={styles.statusGrid}
                >
                  <StatusCard
                    label="DRAFT"
                    number={stats.DRAFT}
                  />

                  <StatusCard
                    label="IN PROGRESS"
                    number={
                      stats['IN PROGRESS']
                    }
                  />

                  <StatusCard
                    label="UNDER REVIEW"
                    number={
                      stats['UNDER REVIEW']
                    }
                  />

                  <StatusCard
                    label="ACTION REQUIRED"
                    number={
                      stats[
                        'ACTION REQUIRED'
                      ]
                    }
                  />

                  <StatusCard
                    label="APPROVED"
                    number={
                      stats.APPROVED
                    }
                  />
                </View>

                <Text
                  style={
                    styles.sectionTitle
                  }
                >
                  ACCOUNTABILITY CASES
                </Text>

                {cases.length === 0 ? (
                  <View
                    style={styles.empty}
                  >
                    <View
                      style={
                        styles.caseIcon
                      }
                    >
                      <Text
                        style={
                          styles.caseIconText
                        }
                      >
                        C
                      </Text>
                    </View>

                    <Text
                      style={
                        styles.emptyTitle
                      }
                    >
                      No accountability cases
                    </Text>

                    <Text
                      style={
                        styles.emptyText
                      }
                    >
                      Create a case after an
                      organisation and
                      funding agreement have
                      been established.
                    </Text>

                    <View
                      style={
                        styles.workflow
                      }
                    >
                      <Text
                        style={
                          styles.workflowText
                        }
                      >
                        Organisation
                      </Text>

                      <Text
                        style={
                          styles.workflowArrow
                        }
                      >
                        →
                      </Text>

                      <Text
                        style={
                          styles.workflowText
                        }
                      >
                        Funding Agreement
                      </Text>

                      <Text
                        style={
                          styles.workflowArrow
                        }
                      >
                        →
                      </Text>

                      <Text
                        style={
                          styles.workflowText
                        }
                      >
                        Accountability Case
                      </Text>
                    </View>
                  </View>
                ) : (
                  <View
                    style={
                      styles.caseList
                    }
                  >
                    {cases.map(
                      (item) => (
                        <CaseCard
                          key={item.id}
                          item={item}
                        />
                      )
                    )}
                  </View>
                )}
              </>
            )}
          </View>
        </ScrollView>
      </SafeAreaView>
    </ProtectedRoute>
  );
}

function StatusCard({
  label,
  number,
}) {
  return (
    <View style={styles.statusCard}>
      <Text
        style={styles.statusLabel}
      >
        {label}
      </Text>

      <Text
        style={styles.statusNumber}
      >
        {number}
      </Text>
    </View>
  );
}

function CaseCard({ item }) {
  const organisationName =
    item.organisations?.name ||
    'Organisation';

  const agreementNumber =
    item.funding_agreements
      ?.agreement_number ||
    'Funding Agreement';

  return (
    <Pressable
      style={styles.caseCard}
      onPress={() =>
        router.push(
          `/cases/${item.id}`
        )
      }
    >
      <View style={styles.caseCardHeader}>
        <View
          style={
            styles.caseCardHeading
          }
        >
          <Text
            style={
              styles.caseNumber
            }
          >
            {item.case_number}
          </Text>

          <Text
            style={
              styles.caseTitle
            }
          >
            {item.title ||
              'Accountability Case'}
          </Text>
        </View>

        <View
          style={[
            styles.statusBadge,
            getStatusStyle(
              item.status
            ),
          ]}
        >
          <Text
            style={
              styles.statusBadgeText
            }
          >
            {item.status}
          </Text>
        </View>
      </View>

      <Text
        style={
          styles.caseDescription
        }
        numberOfLines={2}
      >
        {item.description ||
          'No description provided.'}
      </Text>

      <View
        style={
          styles.caseMeta
        }
      >
        <Text
          style={
            styles.caseMetaText
          }
        >
          Organisation: {organisationName}
        </Text>

        <Text
          style={
            styles.caseMetaText
          }
        >
          Agreement: {agreementNumber}
        </Text>

        <Text
          style={
            styles.caseMetaText
          }
        >
          Priority:{' '}
          {item.priority ||
            'MEDIUM'}
        </Text>
      </View>

      <Text
        style={
          styles.viewCase
        }
      >
        VIEW CASE →
      </Text>
    </Pressable>
  );
}

function getStatusStyle(status) {
  switch (status) {
    case 'APPROVED':
      return {
        backgroundColor:
          '#E8F3EE',
      };

    case 'ACTION REQUIRED':
      return {
        backgroundColor:
          '#FFF3CD',
      };

    case 'UNDER REVIEW':
      return {
        backgroundColor:
          '#E8F0F7',
      };

    case 'IN PROGRESS':
      return {
        backgroundColor:
          '#E8F3EE',
      };

    default:
      return {
        backgroundColor:
          '#F0F0F0',
      };
  }
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#F3F3F0',
  },

  flagStrip: {
    height: 7,
    flexDirection: 'row',
  },

  black: {
    flex: 1,
    backgroundColor: '#111111',
  },

  gold: {
    flex: 1,
    backgroundColor: '#FFB81C',
  },

  green: {
    flex: 2,
    backgroundColor: '#007A4D',
  },

  blue: {
    flex: 1,
    backgroundColor: '#001489',
  },

  red: {
    flex: 1,
    backgroundColor: '#DE3831',
  },

  header: {
    backgroundColor: '#111111',
    padding: 22,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },

  back: {
    color: '#FFB81C',
    fontSize: 12,
    fontWeight: '800',
  },

  brand: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: '900',
    letterSpacing: 1.5,
    textAlign: 'right',
  },

  subtitle: {
    color: '#AAAAAA',
    fontSize: 10,
    marginTop: 3,
  },

  main: {
    width: '100%',
    maxWidth: 1200,
    alignSelf: 'center',
    padding: 30,
  },

  heading: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 25,
  },

  headingContent: {
    flex: 1,
  },

  title: {
    color: '#171717',
    fontSize: 28,
    fontWeight: '900',
  },

  description: {
    color: '#666666',
    fontSize: 13,
    marginTop: 7,
  },

  createButton: {
    backgroundColor: '#007A4D',
    paddingHorizontal: 18,
    paddingVertical: 13,
    marginLeft: 20,
  },

  createButtonText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '900',
  },

  form: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#DDDDDD',
    padding: 25,
    marginBottom: 25,
    overflow: 'hidden',
  },

  formTop: {
    height: 5,
    backgroundColor: '#111111',
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
  },

  formTitle: {
    marginTop: 5,
    color: '#222222',
    fontSize: 21,
    fontWeight: '900',
  },

  formDescription: {
    color: '#777777',
    fontSize: 12,
    marginTop: 5,
  },

  label: {
    color: '#333333',
    fontSize: 10,
    fontWeight: '900',
    marginTop: 14,
    marginBottom: 7,
  },

  input: {
    height: 48,
    borderWidth: 1,
    borderColor: '#CCCCCC',
    backgroundColor: '#FAFAFA',
    paddingHorizontal: 13,
    color: '#222222',
    fontSize: 14,
  },

  selectInput: {
    minHeight: 48,
    borderWidth: 1,
    borderColor: '#CCCCCC',
    backgroundColor: '#FAFAFA',
    paddingHorizontal: 13,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },

  selectInputActive: {
    borderColor: '#123B63',
  },

  disabledInput: {
    backgroundColor: '#EEEEEE',
    borderColor: '#DDDDDD',
  },

  selectText: {
    color: '#222222',
    fontSize: 14,
    flex: 1,
    paddingRight: 10,
  },

  placeholderText: {
    color: '#888888',
    fontSize: 14,
    flex: 1,
    paddingRight: 10,
  },

  selectArrow: {
    color: '#007A4D',
    fontSize: 11,
    fontWeight: '900',
  },

  dropdown: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#CCCCCC',
    borderTopWidth: 0,
    maxHeight: 220,
  },

  dropdownItem: {
    paddingHorizontal: 13,
    paddingVertical: 13,
    borderBottomWidth: 1,
    borderBottomColor: '#EEEEEE',
  },

  dropdownItemTitle: {
    color: '#222222',
    fontSize: 13,
    fontWeight: '800',
  },

  dropdownItemSubtitle: {
    color: '#777777',
    fontSize: 11,
    marginTop: 4,
  },

  dropdownEmpty: {
    color: '#777777',
    fontSize: 12,
    padding: 15,
    textAlign: 'center',
  },

  textArea: {
    height: 110,
    paddingTop: 13,
  },

  actions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 10,
    marginTop: 25,
  },

  cancel: {
    borderWidth: 1,
    borderColor: '#CCCCCC',
    paddingHorizontal: 20,
    paddingVertical: 13,
  },

  cancelText: {
    color: '#555555',
    fontSize: 10,
    fontWeight: '900',
  },

  save: {
    backgroundColor: '#007A4D',
    paddingHorizontal: 20,
    paddingVertical: 13,
    minWidth: 130,
    alignItems: 'center',
    justifyContent: 'center',
  },

  saveDisabled: {
    opacity: 0.7,
  },

  saveText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '900',
  },

  loadingContainer: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#DDDDDD',
    padding: 45,
    alignItems: 'center',
    marginBottom: 30,
  },

  loadingText: {
    color: '#777777',
    fontSize: 12,
    marginTop: 12,
  },

  statusGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 30,
  },

  statusCard: {
    flex: 1,
    minWidth: 150,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#DDDDDD',
    padding: 17,
  },

  statusLabel: {
    color: '#777777',
    fontSize: 9,
    fontWeight: '900',
  },

  statusNumber: {
    color: '#111111',
    fontSize: 27,
    fontWeight: '900',
    marginTop: 8,
  },

  sectionTitle: {
    color: '#333333',
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 1,
    marginBottom: 12,
  },

  empty: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#DDDDDD',
    padding: 45,
    alignItems: 'center',
  },

  caseIcon: {
    width: 45,
    height: 45,
    borderRadius: 23,
    backgroundColor: '#111111',
    justifyContent: 'center',
    alignItems: 'center',
  },

  caseIconText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '900',
  },

  emptyTitle: {
    color: '#222222',
    fontSize: 17,
    fontWeight: '900',
    marginTop: 15,
  },

  emptyText: {
    color: '#777777',
    fontSize: 12,
    textAlign: 'center',
    maxWidth: 500,
    marginTop: 7,
  },

  workflow: {
    marginTop: 25,
    padding: 15,
    backgroundColor: '#F5F5F2',
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 10,
  },

  workflowText: {
    color: '#007A4D',
    fontSize: 11,
    fontWeight: '900',
  },

  workflowArrow: {
    color: '#FFB81C',
    fontSize: 18,
    fontWeight: '900',
  },

  caseList: {
    gap: 12,
  },

  caseCard: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#DDDDDD',
    padding: 20,
  },

  caseCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },

  caseCardHeading: {
    flex: 1,
    paddingRight: 15,
  },

  caseNumber: {
    color: '#007A4D',
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 0.8,
  },

  caseTitle: {
    color: '#222222',
    fontSize: 17,
    fontWeight: '900',
    marginTop: 5,
  },

  statusBadge: {
    paddingHorizontal: 9,
    paddingVertical: 6,
  },

  statusBadgeText: {
    color: '#333333',
    fontSize: 8,
    fontWeight: '900',
  },

  caseDescription: {
    color: '#666666',
    fontSize: 12,
    lineHeight: 18,
    marginTop: 12,
  },

  caseMeta: {
    marginTop: 15,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#EEEEEE',
    gap: 5,
  },

  caseMetaText: {
    color: '#777777',
    fontSize: 10,
  },

  viewCase: {
    color: '#007A4D',
    fontSize: 9,
    fontWeight: '900',
    marginTop: 15,
  },
});