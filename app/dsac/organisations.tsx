
import React, {
  useCallback,
  useState,
} from 'react';

import {
  ActivityIndicator,
  Alert,
  Pressable,
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

type Organisation = {
  id: any;
  name: any;
  organisation_type: any;
  registration_number: any;
  email: any;
  phone: any;
  province: any;
  status: any;
  created_at: any;
};


export default function OrganisationsScreen() {

  const { profile } = useAuth();

  const [showForm, setShowForm] =
    useState(false);

  const [organisationName, setOrganisationName] =
    useState('');

  const [organisationType, setOrganisationType] =
    useState('NPO');

  const [registrationNumber, setRegistrationNumber] =
    useState('');

  const [email, setEmail] =
    useState('');

  const [organisations, setOrganisations] =
    useState<Organisation[]>([]);

  const [loading, setLoading] =
    useState(true);

  const [saving, setSaving] =
    useState(false);


  /*
   * Load organisations from Supabase
   */

  const loadOrganisations =
    useCallback(async () => {

      try {

        setLoading(true);

        const {
          data,
          error,
        } = await supabase
          .from('organisations')
          .select(`
            id,
            name,
            organisation_type,
            registration_number,
            email,
            phone,
            province,
            status,
            created_at
          `)
          .order('created_at', {
            ascending: false,
          });


        if (error) {
          throw error;
        }


        setOrganisations(
          data || []
        );

      } catch (error) {

        console.error(
          'Organisation loading error:',
          error
        );

        Alert.alert(
          'Unable to Load',
          'Organisations could not be loaded from Supabase.'
        );

      } finally {

        setLoading(false);

      }

    }, []);


  useFocusEffect(
    useCallback(() => {

      loadOrganisations();

    }, [loadOrganisations])
  );


  /*
   * Create organisation
   */

  const createOrganisation =
    async () => {

      if (
        !organisationName.trim() ||
        !registrationNumber.trim() ||
        !email.trim()
      ) {

        Alert.alert(
          'Missing Information',
          'Please complete all required fields.'
        );

        return;
      }


      const emailPattern =
        /^[^\s@]+@[^\s@]+\.[^\s@]+$/;


      if (
        !emailPattern.test(
          email.trim()
        )
      ) {

        Alert.alert(
          'Invalid Email',
          'Please enter a valid organisation email address.'
        );

        return;
      }


      try {

        setSaving(true);


        /*
         * Check for duplicate registration number
         */

        const {
          data: existingOrganisation,
          error: duplicateError,
        } = await supabase
          .from('organisations')
          .select('id')
          .eq(
            'registration_number',
            registrationNumber.trim()
          )
          .maybeSingle();


        if (duplicateError) {
          throw duplicateError;
        }


        if (existingOrganisation) {

          Alert.alert(
            'Organisation Already Exists',
            'An organisation with this registration number already exists.'
          );

          return;
        }


        /*
         * Insert organisation
         */

        const {
          data,
          error,
        } = await supabase
          .from('organisations')
          .insert({
            name:
              organisationName.trim(),

            organisation_type:
              organisationType,

            registration_number:
              registrationNumber.trim(),

            email:
              email.trim().toLowerCase(),

            status:
              'ACTIVE',

            created_by:
              profile?.id || null,
          })
          .select()
          .single();


        if (error) {
          throw error;
        }


        Alert.alert(
          'Organisation Created',
          `${data.name} has been successfully registered in CIVITRACK.`
        );


        /*
         * Reset form
         */

        setOrganisationName('');
        setOrganisationType('NPO');
        setRegistrationNumber('');
        setEmail('');
        setShowForm(false);


        /*
         * Reload real data
         */

        await loadOrganisations();

      } catch (error) {

        console.error(
          'Organisation creation error:',
          error
        );

        Alert.alert(
          'Creation Failed',
          error?.message ||
            'The organisation could not be created.'
        );

      } finally {

        setSaving(false);

      }

    };


  /*
   * Format date for display
   */

  const formatDate =
    (date) => {

      if (!date) {
        return '—';
      }

      const value =
        new Date(date);

      if (
        Number.isNaN(
          value.getTime()
        )
      ) {
        return '—';
      }

      return value.toLocaleDateString(
        'en-ZA',
        {
          year: 'numeric',
          month: 'short',
          day: 'numeric',
        }
      );

    };


  return (
    <ProtectedRoute
      allowedRoles={[
        ROLES.DSAC_ADMIN,
      ] as never[]}
    >

      <SafeAreaView
        style={styles.safeArea}
      >

        <StatusBar
          barStyle="light-content"
          backgroundColor="#111111"
        />


        <ScrollView>

          {/* Government colour strip */}

          <View
            style={styles.flagStrip}
          >

            <View style={styles.black} />

            <View style={styles.gold} />

            <View style={styles.green} />

            <View style={styles.blue} />

            <View style={styles.red} />

          </View>


          {/* Header */}

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

              <Text
                style={styles.headerBrand}
              >
                CIVITRACK
              </Text>

              <Text
                style={styles.headerSubtitle}
              >
                DSAC Accountability Workspace
              </Text>

            </View>

          </View>


          {/* Main */}

          <View style={styles.main}>

            {/* Heading */}

            <View style={styles.heading}>

              <View
                style={styles.headingContent}
              >

                <Text style={styles.title}>
                  Organisations
                </Text>

                <Text
                  style={styles.description}
                >
                  Register and manage NPOs and Public Entities
                  participating in DSAC-funded programmes.
                </Text>

              </View>


              <Pressable
                style={styles.createButton}
                onPress={() =>
                  setShowForm(!showForm)
                }
              >

                <Text
                  style={styles.createButtonText}
                >
                  + CREATE ORGANISATION
                </Text>

              </Pressable>

            </View>


            {/* Form */}

            {showForm && (

              <View
                style={styles.formCard}
              >

                <View
                  style={styles.formTop}
                />


                <Text
                  style={styles.formTitle}
                >
                  Register Organisation
                </Text>


                <Text
                  style={styles.formDescription}
                >
                  Only authorised DSAC administrators can create
                  organisations.
                </Text>


                {/* Organisation name */}

                <Text style={styles.label}>
                  ORGANISATION NAME *
                </Text>


                <TextInput
                  style={styles.input}
                  placeholder="Enter organisation name"
                  placeholderTextColor="#888888"
                  value={organisationName}
                  onChangeText={
                    setOrganisationName
                  }
                  editable={!saving}
                />


                {/* Organisation type */}

                <Text style={styles.label}>
                  ORGANISATION TYPE *
                </Text>


                <View
                  style={styles.typeRow}
                >

                  <Pressable
                    style={[
                      styles.typeButton,
                      organisationType ===
                        'NPO' &&
                        styles.selectedType,
                    ]}
                    onPress={() =>
                      setOrganisationType(
                        'NPO'
                      )
                    }
                    disabled={saving}
                  >

                    <Text
                      style={[
                        styles.typeText,
                        organisationType ===
                          'NPO' &&
                          styles.selectedTypeText,
                      ]}
                    >
                      NPO
                    </Text>

                  </Pressable>


                  <Pressable
                    style={[
                      styles.typeButton,
                      organisationType ===
                        'PUBLIC_ENTITY' &&
                        styles.selectedType,
                    ]}
                    onPress={() =>
                      setOrganisationType(
                        'PUBLIC_ENTITY'
                      )
                    }
                    disabled={saving}
                  >

                    <Text
                      style={[
                        styles.typeText,
                        organisationType ===
                          'PUBLIC_ENTITY' &&
                          styles.selectedTypeText,
                      ]}
                    >
                      PUBLIC ENTITY
                    </Text>

                  </Pressable>

                </View>


                {/* Registration number */}

                <Text style={styles.label}>
                  REGISTRATION NUMBER *
                </Text>


                <TextInput
                  style={styles.input}
                  placeholder="e.g. NPO / registration number"
                  placeholderTextColor="#888888"
                  value={registrationNumber}
                  onChangeText={
                    setRegistrationNumber
                  }
                  editable={!saving}
                />


                {/* Email */}

                <Text style={styles.label}>
                  ORGANISATION EMAIL *
                </Text>


                <TextInput
                  style={styles.input}
                  placeholder="organisation@example.org"
                  placeholderTextColor="#888888"
                  value={email}
                  onChangeText={setEmail}
                  autoCapitalize="none"
                  keyboardType="email-address"
                  editable={!saving}
                />


                {/* Actions */}

                <View
                  style={styles.formActions}
                >

                  <Pressable
                    style={styles.cancelButton}
                    onPress={() =>
                      setShowForm(false)
                    }
                    disabled={saving}
                  >

                    <Text
                      style={styles.cancelText}
                    >
                      CANCEL
                    </Text>

                  </Pressable>


                  <Pressable
                    style={[
                      styles.saveButton,
                      saving &&
                        styles.saveDisabled,
                    ]}
                    onPress={
                      createOrganisation
                    }
                    disabled={saving}
                  >

                    {saving ? (

                      <ActivityIndicator
                        size="small"
                        color="#FFFFFF"
                      />

                    ) : (

                      <Text
                        style={styles.saveText}
                      >
                        SAVE ORGANISATION
                      </Text>

                    )}

                  </Pressable>

                </View>

              </View>

            )}


            {/* Information */}

            <View
              style={styles.infoCard}
            >

              <View
                style={styles.infoIcon}
              >

                <Text
                  style={styles.infoIconText}
                >
                  i
                </Text>

              </View>


              <View
                style={styles.infoContent}
              >

                <Text
                  style={styles.infoTitle}
                >
                  Organisation access
                </Text>


                <Text
                  style={styles.infoText}
                >
                  Organisations do not self-register. A DSAC
                  administrator creates the organisation and
                  provisions its first Organisation Administrator.
                </Text>

              </View>

            </View>


            {/* Registered organisations */}

            <Text
              style={styles.sectionTitle}
            >
              REGISTERED ORGANISATIONS
            </Text>


            {loading ? (

              <View
                style={styles.loadingState}
              >

                <ActivityIndicator
                  size="large"
                  color="#007A4D"
                />

                <Text
                  style={styles.loadingText}
                >
                  Loading organisations...
                </Text>

              </View>

            ) : organisations.length === 0 ? (

              <View
                style={styles.emptyState}
              >

                <Text
                  style={styles.emptyIcon}
                >
                  +
                </Text>


                <Text
                  style={styles.emptyTitle}
                >
                  No organisations yet
                </Text>


                <Text
                  style={styles.emptyText}
                >
                  Create the first organisation to begin the
                  CIVITRACK accountability workflow.
                </Text>


                <Pressable
                  style={styles.emptyButton}
                  onPress={() =>
                    setShowForm(true)
                  }
                >

                  <Text
                    style={styles.emptyButtonText}
                  >
                    CREATE FIRST ORGANISATION
                  </Text>

                </Pressable>

              </View>

            ) : (

              <View
                style={styles.organisationList}
              >

                {organisations.map(
                  (organisation) => (

                    <View
                      key={organisation.id}
                      style={
                        styles.organisationCard
                      }
                    >

                      <View
                        style={
                          styles.organisationTop
                        }
                      />


                      <View
                        style={
                          styles.organisationHeader
                        }
                      >

                        <View
                          style={
                            styles.organisationHeaderContent
                          }
                        >

                          <Text
                            style={
                              styles.organisationName
                            }
                          >
                            {organisation.name}
                          </Text>


                          <Text
                            style={
                              styles.organisationRegistration
                            }
                          >
                            {
                              organisation.registration_number
                            }
                          </Text>

                        </View>


                        <View
                          style={[
                            styles.statusBadge,
                            organisation.status ===
                              'ACTIVE' &&
                              styles.activeBadge,
                          ]}
                        >

                          <Text
                            style={
                              styles.statusText
                            }
                          >
                            {
                              organisation.status ||
                              'UNKNOWN'
                            }
                          </Text>

                        </View>

                      </View>


                      <View
                        style={
                          styles.organisationDetails
                        }
                      >

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
                            TYPE
                          </Text>

                          <Text
                            style={
                              styles.detailValue
                            }
                          >
                            {
                              organisation.organisation_type
                            }
                          </Text>

                        </View>


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
                            EMAIL
                          </Text>

                          <Text
                            style={
                              styles.detailValue
                            }
                          >
                            {
                              organisation.email ||
                              '—'
                            }
                          </Text>

                        </View>


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
                            REGISTERED
                          </Text>

                          <Text
                            style={
                              styles.detailValue
                            }
                          >
                            {formatDate(
                              organisation.created_at
                            )}
                          </Text>

                        </View>

                      </View>

                    </View>

                  )
                )}

              </View>

            )}

          </View>


          {/* Footer */}

          <View
            style={styles.footer}
          >

            <Text
              style={styles.footerTitle}
            >
              CIVITRACK
            </Text>

            <Text
              style={styles.footerText}
            >
              Public Funding & Accountability Platform
            </Text>

            <Text
              style={styles.footerText}
            >
              Department of Sport, Arts and Culture
            </Text>

            <Text
              style={styles.footerCopyright}
            >
              © 2026 Republic of South Africa
            </Text>

          </View>

        </ScrollView>

      </SafeAreaView>

    </ProtectedRoute>
  );
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
    alignItems: 'center',
    justifyContent: 'space-between',
  },

  back: {
    color: '#FFB81C',
    fontWeight: '800',
    fontSize: 12,
  },

  headerBrand: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: '900',
    letterSpacing: 1.5,
    textAlign: 'right',
  },

  headerSubtitle: {
    color: '#AAAAAA',
    fontSize: 10,
    marginTop: 3,
  },

  main: {
    maxWidth: 1200,
    width: '100%',
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
    marginTop: 7,
    fontSize: 13,
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
    letterSpacing: 0.5,
  },

  formCard: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#DDDDDD',
    padding: 25,
    marginBottom: 20,
    overflow: 'hidden',
  },

  formTop: {
    height: 5,
    backgroundColor: '#FFB81C',
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
  },

  formTitle: {
    marginTop: 5,
    fontSize: 21,
    fontWeight: '900',
    color: '#222222',
  },

  formDescription: {
    color: '#777777',
    fontSize: 12,
    marginTop: 5,
    marginBottom: 22,
  },

  label: {
    color: '#333333',
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 0.6,
    marginBottom: 7,
    marginTop: 12,
  },

  input: {
    height: 48,
    borderWidth: 1,
    borderColor: '#CCCCCC',
    backgroundColor: '#FAFAFA',
    paddingHorizontal: 13,
    fontSize: 14,
    color: '#222222',
  },

  typeRow: {
    flexDirection: 'row',
    gap: 10,
  },

  typeButton: {
    borderWidth: 1,
    borderColor: '#CCCCCC',
    paddingHorizontal: 20,
    paddingVertical: 12,
  },

  selectedType: {
    backgroundColor: '#007A4D',
    borderColor: '#007A4D',
  },

  typeText: {
    color: '#555555',
    fontSize: 11,
    fontWeight: '800',
  },

  selectedTypeText: {
    color: '#FFFFFF',
  },

  formActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 10,
    marginTop: 25,
  },

  cancelButton: {
    paddingHorizontal: 20,
    paddingVertical: 13,
    borderWidth: 1,
    borderColor: '#CCCCCC',
  },

  cancelText: {
    color: '#555555',
    fontSize: 10,
    fontWeight: '900',
  },

  saveButton: {
    backgroundColor: '#007A4D',
    paddingHorizontal: 20,
    paddingVertical: 13,
    minWidth: 150,
    minHeight: 43,
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

  infoCard: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#DDDDDD',
    padding: 18,
    flexDirection: 'row',
    marginBottom: 30,
  },

  infoIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#007A4D',
    alignItems: 'center',
    justifyContent: 'center',
  },

  infoIconText: {
    color: '#FFFFFF',
    fontWeight: '900',
  },

  infoContent: {
    flex: 1,
    marginLeft: 12,
  },

  infoTitle: {
    color: '#222222',
    fontSize: 12,
    fontWeight: '900',
  },

  infoText: {
    color: '#666666',
    fontSize: 11,
    lineHeight: 17,
    marginTop: 4,
  },

  sectionTitle: {
    color: '#333333',
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 1,
    marginBottom: 12,
  },

  loadingState: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#DDDDDD',
    padding: 45,
    alignItems: 'center',
    justifyContent: 'center',
  },

  loadingText: {
    color: '#777777',
    fontSize: 12,
    marginTop: 10,
  },

  emptyState: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#DDDDDD',
    padding: 45,
    alignItems: 'center',
  },

  emptyIcon: {
    width: 45,
    height: 45,
    borderRadius: 23,
    backgroundColor: '#007A4D',
    color: '#FFFFFF',
    fontSize: 30,
    fontWeight: '300',
    textAlign: 'center',
    lineHeight: 42,
  },

  emptyTitle: {
    marginTop: 15,
    color: '#222222',
    fontSize: 17,
    fontWeight: '900',
  },

  emptyText: {
    marginTop: 7,
    color: '#777777',
    fontSize: 12,
    textAlign: 'center',
    maxWidth: 450,
  },

  emptyButton: {
    marginTop: 20,
    backgroundColor: '#007A4D',
    paddingHorizontal: 18,
    paddingVertical: 12,
  },

  emptyButtonText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '900',
  },

  organisationList: {
    gap: 12,
  },

  organisationCard: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#DDDDDD',
    padding: 20,
    overflow: 'hidden',
  },

  organisationTop: {
    height: 4,
    backgroundColor: '#007A4D',
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
  },

  organisationHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },

  organisationHeaderContent: {
    flex: 1,
  },

  organisationName: {
    color: '#171717',
    fontSize: 16,
    fontWeight: '900',
  },

  organisationRegistration: {
    color: '#007A4D',
    fontSize: 11,
    fontWeight: '700',
    marginTop: 5,
  },

  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    backgroundColor: '#F3F3F0',
  },

  activeBadge: {
    backgroundColor: '#EFF7F3',
  },

  statusText: {
    color: '#007A4D',
    fontSize: 9,
    fontWeight: '900',
  },

  organisationDetails: {
    flexDirection: 'row',
    gap: 25,
    marginTop: 18,
    paddingTop: 15,
    borderTopWidth: 1,
    borderTopColor: '#EEEEEE',
  },

  detailItem: {
    flex: 1,
  },

  detailLabel: {
    color: '#888888',
    fontSize: 9,
    fontWeight: '900',
  },

  detailValue: {
    color: '#222222',
    fontSize: 12,
    fontWeight: '700',
    marginTop: 4,
  },

  footer: {
    backgroundColor: '#111111',
    paddingVertical: 28,
    alignItems: 'center',
  },

  footerTitle: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '900',
    letterSpacing: 1.5,
  },

  footerText: {
    color: '#AAAAAA',
    fontSize: 10,
    marginTop: 5,
  },

  footerCopyright: {
    color: '#666666',
    fontSize: 9,
    marginTop: 12,
  },

});
