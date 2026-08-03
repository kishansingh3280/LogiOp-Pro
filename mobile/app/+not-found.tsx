import { Link, Stack } from "expo-router";
import { Text, StyleSheet, View } from "react-native";
import { colors } from "@/lib/theme";

export default function NotFoundScreen() {
  return (
    <>
      <Stack.Screen options={{ title: "Not found" }} />
      <View style={styles.container}>
        <Text style={styles.title}>Screen not found</Text>
        <Link href="/" style={styles.link}>
          <Text style={styles.linkText}>Go to dashboard</Text>
        </Link>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 20,
    backgroundColor: colors.bg,
  },
  title: { fontSize: 20, fontWeight: "700", color: colors.ink },
  link: { marginTop: 16 },
  linkText: { color: colors.accent, fontWeight: "600" },
});
