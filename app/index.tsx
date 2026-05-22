import { Redirect } from 'expo-router';
import { useState } from 'react';
import {
    Alert,
    KeyboardAvoidingView,
    Platform,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    View,
} from 'react-native';

import { AppButton, AppInput, Card, Screen } from '@/components/ui-kit';
import { Fonts } from '@/constants/theme';
import { demoUsers } from '@/constants/users';
import { useAuth } from '@/context/auth-context';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';

export default function LoginScreen() {
  console.log('🟢 [LoginScreen] RENDER - début');
  const { ready, login, isAuthenticated, role } = useAuth();
  console.log('🟢 [LoginScreen] ready:', ready, 'login exists:', !!login);

  const [email, setEmail] = useState('admin@campus.ma');
  const [password, setPassword] = useState('admin123');
  const [submitting, setSubmitting] = useState(false);

  console.log('🟢 [LoginScreen] demoUsers:', demoUsers?.length);

  if (ready && isAuthenticated) {
    return <Redirect href={role === 'admin' ? '/admin' : '/student'} />;
  }

  // Si l'utilisateur n'est pas prêt, on affiche un loader (évite le retour null brutal)
  if (!ready) {
    console.log('🟡 [LoginScreen] Pas encore prêt, retour loader');
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <Text>Chargement de l&apos;authentification...</Text>
      </View>
    );
  }

  // Vérification que demoUsers existe et n'est pas vide
  if (!demoUsers || demoUsers.length === 0) {
    console.error('🔴 [LoginScreen] demoUsers est vide ou indéfini !');
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <Text style={{ color: 'red' }}>Erreur : liste des utilisateurs introuvable</Text>
      </View>
    );
  }

  function handleLogin() {
    console.log('🔵 [LoginScreen] Tentative de login avec', email, password);
    const user = demoUsers.find(
      (u) => u.email === email && u.password === password
    );

    if (!user) {
      Alert.alert(
        'Connexion refusée',
        'Identifiants invalides. Utilisez un des comptes préconfigurés.'
      );
      return;
    }

    setSubmitting(true);
    try {
      console.log('🔵 [LoginScreen] Appel login() avec', user.email, user.role);
      login(user.email, user.role);
    } catch (error) {
      console.error('🔴 [LoginScreen] Erreur login:', error);
      Alert.alert('Erreur', 'Impossible de se connecter');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Screen style={styles.container}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.flex}>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <View style={styles.hero}>
            <Text style={styles.kicker}>CampusEvents AI</Text>
            <Text style={styles.title}>Agenda intelligent du campus</Text>
            <Text style={styles.subtitle}>
              Connectez-vous avec un compte de démonstration pour accéder instantanément à l&apos;espace correspondant.
            </Text>
          </View>

          <Card style={styles.card}>
            <Text style={styles.cardTitle}>Connexion</Text>

            <AppInput
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              keyboardType="email-address"
              placeholder="Email"
              style={styles.inputOverride}
            />
            <AppInput
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              placeholder="Mot de passe"
              style={styles.inputOverride}
            />

            <AppButton
              title={submitting ? 'Connexion...' : 'Se connecter'}
              onPress={handleLogin}
              disabled={submitting}
              style={styles.loginButton}
            />

            <Text style={styles.sqliteInfo}>
              Les comptes préconfigurés partagent la même base SQLite locale sur cet appareil.
            </Text>
          </Card>

          <View style={styles.demoList}>
            <Text style={styles.sectionLabel}>Comptes disponibles</Text>
            <View style={styles.demoCards}>
              {(() => {
                const adminUser = demoUsers.find((u) => u.role === 'admin');
                const studentUser = demoUsers.find((u) => u.role === 'student');

                return (
                  <>
                    <Pressable
                      style={styles.roleCard}
                      onPress={() => {
                        if (adminUser) {
                          setEmail(adminUser.email);
                          setPassword(adminUser.password);
                        }
                      }}
                    >
                      <View style={styles.roleInner}>
                        <MaterialIcons name="security" size={22} color="#111827" />
                        <View style={{ gap: 2 }}>
                          <Text style={styles.roleTitle}>Admin</Text>
                          <Text style={styles.roleSubtitle}>{adminUser?.email ?? 'admin@...'}</Text>
                        </View>
                      </View>
                    </Pressable>

                    <Pressable
                      style={styles.roleCard}
                      onPress={() => {
                        if (studentUser) {
                          setEmail(studentUser.email);
                          setPassword(studentUser.password);
                        }
                      }}
                    >
                      <View style={styles.roleInner}>
                        <MaterialIcons name="school" size={22} color="#111827" />
                        <View style={{ gap: 2 }}>
                          <Text style={styles.roleTitle}>Étudiant</Text>
                          <Text style={styles.roleSubtitle}>{studentUser?.email ?? 'student@...'}</Text>
                        </View>
                      </View>
                    </Pressable>
                  </>
                );
              })()}
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  container: { paddingHorizontal: 20 },
  content: { paddingTop: 28, paddingBottom: 32, gap: 20, alignItems: 'center' },
  hero: { gap: 10, width: '100%' },
  kicker: {
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 1.8,
    textTransform: 'uppercase',
    color: '#4B5563',
    fontFamily: Fonts.sans,
  },
  title: {
    fontSize: 34,
    lineHeight: 38,
    fontWeight: '800',
    color: '#111827',
    fontFamily: Fonts.sans,
  },
  subtitle: {
    fontSize: 15,
    lineHeight: 22,
    color: '#5b6472',
    fontFamily: Fonts.sans,
  },
  card: {
    gap: 12,
    width: '100%',
    maxWidth: 520,
    borderRadius: 16,
    backgroundColor: '#FFFFFF',
    padding: 18,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
    fontFamily: Fonts.sans,
  },
  demoList: { gap: 12, width: '100%', maxWidth: 520 },
  sectionLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: '#111827',
    fontFamily: Fonts.sans,
  },
  inputOverride: {
    backgroundColor: '#F3F4F6',
    borderColor: '#E5E7EB',
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 14,
  },
  loginButton: {
    backgroundColor: '#4B5563',
    borderRadius: 12,
    alignSelf: 'stretch',
    minHeight: 48,
  },
  sqliteInfo: {
    fontSize: 13,
    color: '#6B7280',
    fontFamily: Fonts.sans,
  },
  demoCards: { flexDirection: 'row', gap: 12 },
  roleCard: {
    flex: 1,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    padding: 12,
    backgroundColor: '#FFFFFF',
  },
  roleInner: { flexDirection: 'row', gap: 10, alignItems: 'center' },
  roleTitle: { fontSize: 15, fontWeight: '700', color: '#111827', fontFamily: Fonts.sans },
  roleSubtitle: { fontSize: 13, color: '#6B7280', fontFamily: Fonts.sans },
});