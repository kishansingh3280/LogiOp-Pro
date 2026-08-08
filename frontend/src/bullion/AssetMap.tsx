// Asset Map — physical location tracker for bullion assets.
// Buckets every txn into India Vault / Bangkok Vault / In Transit and
// aggregates totals per currency + gold weight so the operator can see
// at a glance where the money is.

import { Ionicons } from "@expo/vector-icons";
import { useMemo } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";

import type { BullionTxn } from "@/src/bullion/types";
import { GRAMS_PER_BAHT, txnLocation } from "@/src/bullion/types";
import { colors, radii, spacing } from "@/src/theme";

interface BucketTotals {
  gold_baht: number;      // sum of gold_amount converted to baht
  currencies: Record<string, number>; // { USD: 5000, AED: 1200, ... }
}

const emptyBucket = (): BucketTotals => ({ gold_baht: 0, currencies: {} });

export function AssetMap({ txns }: { txns: BullionTxn[] }) {
  const { buckets, itemsByBucket } = useMemo(() => {
    const b: Record<string, BucketTotals> = {
      vault_in: emptyBucket(),
      vault_th: emptyBucket(),
      in_transit: emptyBucket(),
    };
    const items: Record<string, BullionTxn[]> = {
      vault_in: [],
      vault_th: [],
      in_transit: [],
    };
    txns.forEach((t) => {
      const loc = txnLocation(t);
      if (loc === "delivered") return; // out of the vault system
      const bucket = b[loc];
      if (!bucket) return;
      if (t.type === "gold") {
        const amt = Number(t.gold_amount) || 0;
        const bahtEquiv = t.gold_unit === "grams" ? amt / GRAMS_PER_BAHT : amt;
        bucket.gold_baht += bahtEquiv;
      } else if (t.type === "currency") {
        const cur = t.currency || "USD";
        const amt = Number(t.currency_amount) || 0;
        bucket.currencies[cur] = (bucket.currencies[cur] || 0) + amt;
      }
      items[loc].push(t);
    });
    return { buckets: b, itemsByBucket: items };
  }, [txns]);

  return (
    <ScrollView
      contentContainerStyle={styles.scroll}
      showsVerticalScrollIndicator={false}
    >
      <BucketCard
        icon="location"
        title="Vault (India)"
        tint={colors.warn}
        bucket={buckets.vault_in}
        items={itemsByBucket.vault_in}
      />
      <BucketCard
        icon="business-outline"
        title="Vault (Bangkok)"
        tint={colors.info}
        bucket={buckets.vault_th}
        items={itemsByBucket.vault_th}
      />
      <BucketCard
        icon="airplane"
        title="In transit"
        tint={colors.lime}
        bucket={buckets.in_transit}
        items={itemsByBucket.in_transit}
      />
    </ScrollView>
  );
}

function BucketCard({
  icon,
  title,
  tint,
  bucket,
  items,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  tint: string;
  bucket: BucketTotals;
  items: BullionTxn[];
}) {
  const currencyLines = Object.entries(bucket.currencies).filter(([, v]) => v > 0);
  const hasGold = bucket.gold_baht > 0;
  const isEmpty = !hasGold && currencyLines.length === 0;
  return (
    <View style={[styles.card, { borderLeftColor: tint }]}>
      <View style={styles.cardHead}>
        <View style={[styles.cardIcon, { backgroundColor: tint + "22", borderColor: tint }]}>
          <Ionicons name={icon} size={16} color={tint} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.cardTitle}>{title}</Text>
          <Text style={styles.cardMeta}>
            {items.length} asset{items.length === 1 ? "" : "s"}
          </Text>
        </View>
      </View>
      {isEmpty ? (
        <Text style={styles.empty}>No assets here right now.</Text>
      ) : (
        <View style={styles.totals}>
          {hasGold ? (
            <View style={styles.totalRow}>
              <Ionicons name="diamond" size={12} color="#F5C518" />
              <Text style={styles.totalLbl}>Gold</Text>
              <Text style={styles.totalVal}>{formatBaht(bucket.gold_baht)} baht</Text>
            </View>
          ) : null}
          {currencyLines.map(([code, amt]) => (
            <View key={code} style={styles.totalRow}>
              <Ionicons name="cash-outline" size={12} color={colors.lime} />
              <Text style={styles.totalLbl}>{code}</Text>
              <Text style={styles.totalVal}>{amt.toLocaleString()}</Text>
            </View>
          ))}
        </View>
      )}
      {items.length > 0 ? (
        <View style={styles.list}>
          {items.slice(0, 6).map((t) => (
            <View key={t.id} style={styles.listRow}>
              <Text style={styles.listNo}>{t.txn_no}</Text>
              <Text style={styles.listLine} numberOfLines={1}>
                {t.type === "gold"
                  ? `${t.gold_amount || 0} ${t.gold_unit || "baht"} gold`
                  : `${(t.currency_amount || 0).toLocaleString()} ${t.currency || "USD"}`}
              </Text>
            </View>
          ))}
          {items.length > 6 ? (
            <Text style={styles.listMore}>+{items.length - 6} more</Text>
          ) : null}
        </View>
      ) : null}
    </View>
  );
}

function formatBaht(n: number): string {
  return Number.isInteger(n) ? String(n) : n.toFixed(2);
}

const styles = StyleSheet.create({
  scroll: { paddingHorizontal: spacing.lg, paddingBottom: 100, gap: spacing.md },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    borderColor: colors.border,
    borderWidth: StyleSheet.hairlineWidth,
    borderLeftWidth: 4,
    padding: spacing.md,
    marginTop: spacing.md,
  },
  cardHead: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: spacing.sm,
  },
  cardIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  cardTitle: { color: colors.text, fontSize: 15, fontWeight: "800" },
  cardMeta: { color: colors.textDim, fontSize: 11, marginTop: 2 },
  empty: { color: colors.textDim, fontStyle: "italic", fontSize: 12 },
  totals: {
    marginTop: spacing.sm,
    paddingTop: spacing.sm,
    borderTopColor: colors.border,
    borderTopWidth: StyleSheet.hairlineWidth,
    gap: 6,
  },
  totalRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  totalLbl: {
    color: colors.textMuted,
    fontSize: 11,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.4,
    minWidth: 40,
  },
  totalVal: {
    color: colors.text,
    fontSize: 14,
    fontWeight: "800",
    marginLeft: "auto",
  },
  list: {
    marginTop: spacing.md,
    paddingTop: spacing.sm,
    borderTopColor: colors.border,
    borderTopWidth: StyleSheet.hairlineWidth,
    gap: 4,
  },
  listRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingVertical: 3,
  },
  listNo: {
    color: colors.lime,
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 0.3,
    minWidth: 62,
  },
  listLine: {
    color: colors.textMuted,
    fontSize: 12,
    flex: 1,
  },
  listMore: { color: colors.textDim, fontSize: 11, fontStyle: "italic", marginTop: 4 },
});

// Small helper the dashboard uses to compute the same totals.
export function computeAssetTotals(txns: BullionTxn[]) {
  const totals: Record<"vault_in" | "vault_th" | "in_transit", BucketTotals> = {
    vault_in: emptyBucket(),
    vault_th: emptyBucket(),
    in_transit: emptyBucket(),
  };
  txns.forEach((t) => {
    const loc = txnLocation(t);
    if (loc === "delivered") return;
    const bucket = totals[loc];
    if (!bucket) return;
    if (t.type === "gold") {
      const amt = Number(t.gold_amount) || 0;
      const bahtEquiv = t.gold_unit === "grams" ? amt / GRAMS_PER_BAHT : amt;
      bucket.gold_baht += bahtEquiv;
    } else if (t.type === "currency") {
      const cur = t.currency || "USD";
      const amt = Number(t.currency_amount) || 0;
      bucket.currencies[cur] = (bucket.currencies[cur] || 0) + amt;
    }
  });
  return totals;
}
