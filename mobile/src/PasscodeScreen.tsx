import { useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { fetchSummary } from "./api";
import { savePasscode } from "./storage";
import { colors } from "./theme";

export function PasscodeScreen({ onUnlock }: { onUnlock: (passcode: string) => void }) {
  const [passcode, setPasscode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function unlock() {
    const value = passcode.trim();
    if (!value || pending) return;
    setPending(true);
    setError(null);
    const result = await fetchSummary(value);
    if (!result.ok) {
      setError(result.message);
      setPending(false);
      return;
    }
    await savePasscode(value);
    onUnlock(value);
  }

  return (
    <View style={styles.screen}>
      <Text style={styles.kicker}>Daily budget</Text>
      <Text style={styles.title}>Enter the passcode</Text>
      <Text style={styles.subtitle}>It stays on this phone. The sheet key does not.</Text>
      <Text style={styles.label}>Passcode</Text>
      <TextInput
        value={passcode}
        onChangeText={setPasscode}
        secureTextEntry
        autoCapitalize="none"
        autoCorrect={false}
        spellCheck={false}
        textContentType="password"
        onSubmitEditing={() => void unlock()}
        style={styles.input}
      />
      {error ? <Text style={styles.error}>{error}</Text> : null}
      <Pressable
        accessibilityRole="button"
        disabled={pending || passcode.trim().length === 0}
        onPress={() => void unlock()}
        style={[styles.button, (pending || passcode.trim().length === 0) && styles.buttonDisabled]}
      >
        {pending ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Unlock</Text>}
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.paper,
    justifyContent: "center",
    paddingHorizontal: 24,
    paddingVertical: 32,
  },
  kicker: {
    color: colors.muted,
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 1.4,
    textTransform: "uppercase",
  },
  title: {
    marginTop: 12,
    color: colors.ink,
    fontFamily: "serif",
    fontSize: 36,
    lineHeight: 42,
  },
  subtitle: {
    marginTop: 10,
    color: colors.ink,
    fontSize: 15,
    lineHeight: 22,
    opacity: 0.75,
  },
  label: {
    marginTop: 28,
    color: colors.ink,
    fontSize: 14,
    fontWeight: "600",
  },
  input: {
    marginTop: 8,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.card,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    color: colors.ink,
  },
  error: {
    marginTop: 12,
    color: colors.over,
    fontSize: 14,
  },
  button: {
    marginTop: 16,
    minHeight: 48,
    borderRadius: 16,
    backgroundColor: colors.good,
    alignItems: "center",
    justifyContent: "center",
  },
  buttonDisabled: {
    opacity: 0.4,
  },
  buttonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
});
