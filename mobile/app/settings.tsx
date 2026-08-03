import { useEffect, useState } from "react";
import { Alert, Text, StyleSheet } from "react-native";
import { getApiBase, setApiBase, defaultApiBase, apiGet } from "@/lib/api";
import { colors } from "@/lib/theme";
import { Screen, Title, Card, Field, Button } from "@/components/ui";

export default function SettingsScreen() {
  const [url, setUrl] = useState("");
  const [status, setStatus] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    getApiBase().then(setUrl);
  }, []);

  async function save() {
    setSaving(true);
    try {
      await setApiBase(url.trim());
      const dash = await apiGet<{ bagCount: number }>("/api/dashboard");
      setStatus(`Connected · ${dash.bagCount} bags on server`);
      Alert.alert("Saved", "API URL updated and connection OK");
    } catch (e) {
      setStatus(e instanceof Error ? e.message : "Connection failed");
      Alert.alert(
        "Saved URL, but connection failed",
        e instanceof Error ? e.message : "Check that the web server is running"
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <Screen>
      <Title subtitle="Point the Android app at your LogiOp Pro server">
        Settings
      </Title>
      <Card>
        <Text style={styles.help}>
          Run the web backend with `npm run dev`, then set the API URL here.
        </Text>
        <Text style={styles.help}>
          Android emulator default: {defaultApiBase()}
        </Text>
        <Text style={styles.help}>
          Physical phone: use your computer&apos;s LAN IP, e.g.
          http://192.168.1.10:3000
        </Text>
        <Field
          label="API base URL"
          autoCapitalize="none"
          autoCorrect={false}
          value={url}
          onChangeText={setUrl}
          placeholder={defaultApiBase()}
        />
        <Button label={saving ? "Testing…" : "Save & test"} onPress={save} disabled={saving} />
        {status ? <Text style={styles.status}>{status}</Text> : null}
      </Card>
    </Screen>
  );
}

const styles = StyleSheet.create({
  help: { color: colors.muted, fontSize: 13, marginBottom: 8, lineHeight: 18 },
  status: { marginTop: 12, color: colors.accentInk, fontWeight: "600" },
});
