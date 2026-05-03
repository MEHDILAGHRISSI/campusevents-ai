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

import { AppButton, AppInput, Card, HelperText, Screen } from '@/components/ui-kit';
import { demoUsers } from '@/constants/users';
import { useAuth } from '@/context/auth-context';

export default function LoginScreen() {
  // ⚠️ On a supprimé router, isAuthenticated et role, on n'en a plus besoin ici !
  const { ready, login } = useAuth(); 

  const [email, setEmail] = useState('admin@campus.ma');
  const [password, setPassword] = useState('admin123');
  const [submitting, setSubmitting] = useState(false);

  // ⚠️ J'AI SUPPRIMÉ LE useEffect QUI FAISAIT LE AUTO-REDIRECT ICI.

  if (!ready) return null;

  function handleLogin() {
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
      // 1. Mise à jour du state
      login(user.email, user.role);

      // ⚠️ J'AI SUPPRIMÉ LES router.replace() ICI.
      // Le fichier app/_layout.tsx va voir que l'état a changé et va te rediriger magiquement !
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
              Connectez-vous avec un compte de démonstration pour accéder instantanément à l’espace correspondant.
            </Text>
          </View>

          <Card style={styles.card}>
            <Text style={styles.cardTitle}>Connexion</Text>

            <AppInput value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address" placeholder="Email" />
            <AppInput value={password} onChangeText={setPassword} secureTextEntry placeholder="Mot de passe" />

            <AppButton title={submitting ? 'Connexion...' : 'Se connecter'} onPress={handleLogin} disabled={submitting} />

            <HelperText tone="warning">Les comptes préconfigurés partagent la même base SQLite locale sur cet appareil.</HelperText>
          </Card>

          <View style={styles.demoList}>
            <Text style={styles.sectionLabel}>Comptes disponibles</Text>
            {demoUsers.map((user) => (
              <Pressable key={user.email} style={styles.demoChip} onPress={() => { setEmail(user.email); setPassword(user.password); }}>
                <Text style={styles.demoChipTitle}>{user.role === 'admin' ? 'Admin' : 'Étudiant'}</Text>
                <Text style={styles.demoChipSubtitle}>{user.email}</Text>
              </Pressable>
            ))}
          </View>

        </ScrollView>
      </KeyboardAvoidingView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 }, container: { paddingHorizontal: 20 }, content: { paddingTop: 28, paddingBottom: 32, gap: 20 },
  hero: { gap: 10 }, kicker: { fontSize: 13, fontWeight: '700', letterSpacing: 1.8, textTransform: 'uppercase', color: '#0a7ea4' },
  title: { fontSize: 34, lineHeight: 38, fontWeight: '800', color: '#111827' }, subtitle: { fontSize: 15, lineHeight: 22, color: '#5b6472' },
  card: { gap: 12 }, cardTitle: { fontSize: 18, fontWeight: '700', color: '#111827' }, demoList: { gap: 12 },
  sectionLabel: { fontSize: 14, fontWeight: '700', color: '#111827' },
  demoChip: { borderRadius: 18, borderWidth: 1, borderColor: '#dbe4ee', padding: 14, gap: 4, backgroundColor: '#fff' },
  demoChipTitle: { fontSize: 15, fontWeight: '700', color: '#111827' }, demoChipSubtitle: { fontSize: 13, color: '#5b6472' },
});