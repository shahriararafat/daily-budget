import { useEffect, useState } from "react";
import { ActivityIndicator, StyleSheet, View } from "react-native";
import { StatusBar } from "expo-status-bar";
import { DashboardScreen } from "./src/DashboardScreen";
import { PasscodeScreen } from "./src/PasscodeScreen";
import { clearPasscode, readPasscode } from "./src/storage";
import { colors } from "./src/theme";

export default function App() {
  const [passcode, setPasscode] = useState<string | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    readPasscode()
      .then((value) => setPasscode(value))
      .finally(() => setReady(true));
  }, []);

  async function signOut() {
    await clearPasscode();
    setPasscode(null);
  }

  return (
    <View style={styles.root}>
      <StatusBar style="dark" />
      {!ready ? (
        <ActivityIndicator color={colors.good} />
      ) : passcode ? (
        <DashboardScreen passcode={passcode} onSignOut={() => void signOut()} />
      ) : (
        <PasscodeScreen onUnlock={setPasscode} />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.paper,
  },
});
