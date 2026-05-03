import { Redirect } from 'expo-router';
import { useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { AppButton, AppInput, Card, HelperText, Screen } from '@/components/ui-kit';
import { demoUsers } from '@/constants/users';
import { useAuth } from '@/context/auth-context';

export default function LoginScreen() {
  const { ready, isAuthenticated, role, login } = useAuth();

  const [email, setEmail] = useState('admin@campus.ma');
  const [password, setPassword] = useState('admin123');
  const [submitting, setSubmitting] = useState(false);

  // 🔥 MAGIE DÉCLARATIVE : Si connecté, on le jette vers sa page cible
  if (ready && isAuthenticated) {
    return <Redirect href={role === 'admin' ? '/admin' : '/(tabs)'} />;
  }

  if (!ready) return null;

  function handleLogin() {
    const user = demoUsers.find((u) => u.email === email && u.password === password);
    if (!user) {
      Alert.alert('Connexion refusée', 'Identifiants invalides.');
      return;
    }
    setSubmitting(true);
    try {
      login(user.email, user.role);
      // ⚠️ Pas de router.replace ici. Le `login` met à jour l'état, et le <Redirect> en haut fait le travail !
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Screen style={styles.container}>
      {/* GARDE TON CODE D'AFFICHAGE EXACTEMENT COMME AVANT ICI */}
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.flex}>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <Card style={styles.card}>
            <AppInput value={email} onChangeText={setEmail} autoCapitalize="none" placeholder="Email" />
            <AppInput value={password} onChangeText={setPassword} secureTextEntry placeholder="Mot de passe" />
            <AppButton title={submitting ? 'Connexion...' : 'Se connecter'} onPress={handleLogin} disabled={submitting} />
          </Card>
        </ScrollView>
      </KeyboardAvoidingView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 }, container: { paddingHorizontal: 20 }, content: { paddingTop: 28, paddingBottom: 32, gap: 20 },
  card: { gap: 12 },
});