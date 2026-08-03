import { useEffect, useState } from "react";
import { Alert, Text, StyleSheet, Switch, View } from "react-native";
import {
  getApiBase,
  setApiBase,
  defaultApiBase,
  apiGet,
  getDemoMode,
  setDemoMode,
} from "@/lib/api";
import { resetDemo } from "@/lib/demo-data";
import { colors } from "@/lib/theme";
import { Screen, Title, Card, Field, Button } from "@/components/ui";

export default function SettingsScreen() {
  const [url, setUrl] = useState("");
  const [demo, setDemo] = useState(true);
  const [status, setStatus] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    getApiBase().then(setUrl);
    getDemoMode().then(setDemo);
  }, []);

  async function toggleDemo(on: boolean) {
    setDemo(on);
    await setDemoMode(on);
    setStatus(on ? "Demo mode ON — works offline with sample data" : "Demo mode OFF — using server API");
  }

  async function save() {
    setSaving(true);
    try {
      await setApiBase(url.trim());
      await setDemoMode(false);
      setDemo(false);
      const dash = await apiGet<{ bagCount: number }>("/api/dashboard");
      setStatus(`Connected to server · ${dash.bagCount} bags`);
      Alert.alert("Connected", "Server API is working. Demo mode turned off.");
    } catch (e) {
      setStatus(e instanceof Error ? e.message : "Connection failed");
      Alert.alert(
        "Could not connect",
        "Keep Demo mode ON to use the app without a server, or check your API URL."
      );
      await setDemoMode(true);
      setDemo(true);
    } finally {
      setSaving(false);
    }
  }

  return (
    <Screen>
      <Title subtitle="Beginner tip: keep Demo mode ON to explore without a server">
        Settings
      </Title>

      <Card>
        <View style={styles.switchRow}>
          <View style={{ flex: 1, marginRight: 12 }}>
            <Text style={styles.switchTitle}>Demo mode (offline)</Text>
            <Text style={styles.help}>
              ON = sample customers, ledger & bags work without internet. Perfect for trying the app.
            </Text>
          </View>
          <Switch
            value={demo}
            onValueChange={toggleDemo}
            trackColor={{ true: colors.accent }}
          />
        </View>
        <Button
          label="Reset demo data"
          variant="secondary"
          onPress={() => {
            resetDemo();
            Alert.alert("Reset", "Demo data restored to sample values.");
          }}
        />
      </Card>

      <Card>
        <Text style={styles.section}>Connect to your computer (optional)</Text>
        <Text style={styles.help}>
          Only needed later when you run the web server at home/office.
        </Text>
        <Text style={styles.help}>Emulator default: {defaultApiBase()}</Text>
        <Text style={styles.help}>
          Phone example: http://192.168.1.10:3000
        </Text>
        <Field
          label="API base URL"
          autoCapitalize="none"
          autoCorrect={false}
          value={url}
          onChangeText={setUrl}
          placeholder={defaultApiBase()}
        />
        <Button
          label={saving ? "Testing…" : "Save & connect to server"}
          onPress={save}
          disabled={saving}
        />
        {status ? <Text style={styles.status}>{status}</Text> : null}
      </Card>
    </Screen>
  );
}

const styles = StyleSheet.create({
  help: { color: colors.muted, fontSize: 13, marginBottom: 8, lineHeight: 18 },
  status: { marginTop: 12, color: colors.accentInk, fontWeight: "600" },
  switchRow: { flexDirection: "row", alignItems: "center", marginBottom: 12 },
  switchTitle: { fontWeight: "700", color: colors.ink, marginBottom: 4 },
  section: { fontWeight: "700", color: colors.ink, marginBottom: 8 },
});
