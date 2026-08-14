/**
 * Bullion trips + vault snapshot — Phase 6.
 *
 * Two big sections:
 *   1. Vault snapshot (computed from `/api/bullion/transactions`):
 *        • Total gold weight (baht)
 *        • Total currency held (INR + THB)
 *        • Live rates from `/api/bullion/rates`
 *   2. Trips list (chronological, from `/api/bullion/trips`):
 *        • Date · route (IN→TH / TH→IN) · airline · flight
 *        • Carrier name · weight capacity · status pill
 */
import { Ionicons } from "@expo/vector-icons";
import { Stack, useFocusEffect, useRouter } from "expo-router";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Platform,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { apiGet } from "@/src/lib/api";
import { useAuth } from "@/src/lib/auth-context";
import { appendCompanyQuery, useCompany } from "@/src/lib/company-context";
import { fmtCurrency, shortDate, titleCase } from "@/src/lib/format";
import { colors, radii, spacing } from "@/src/lib/theme";
import { GlassCard, Pill } from "@/src/lib/ui";

type BullionTrip = {
  id: string;
  date: string;
  route?: "IN_TO_TH" | "TH_TO_IN" | string | null;
  direction?: string | null;
  origin?: string;
  destination?: string;
  available_weight_kg?: number;
  // Fix 3 (Phase 7 · Batch C-1) · allocated weight aggregated from
  // bags linked to this trip. Populated server-side.
  allocated_kg?: number;
  carrier_name?: string;
  carrier_party_id?: string;
  airline?: string;
  airline_code?: string;
  flight_number?: string;
  status?: string;
  notes?: string;
  currency_type?: string;
  currency_amount?: number;
  gold_baht?: number;
  carry_charge_inr?: number;
};

type BullionTxn = {
  id: string;
  type: "gold" | "currency";
  status?: string;
  gold_amount?: number;
  gold_unit?: string;
  gold_cost_inr?: number;
  currency?: string;
  currency_amount?: number;
  location?: string;
  created_at?: string;
};

type BullionRates = {
  currency_rate_per_1000?: number;
  gold_rate_per_baht?: number;
  hand_carry_rate_inr_per_kg?: number;
  updated_at?: string;
};

// Fix 6 (Phase 7 · Batch C-2) · Live scraped rates (polled every 60 s).
type LiveRateSource = {
  rates: Record<string, number | string>;
  fetched_at: string | null;
  ok: boolean;
  error: string | null;
  is_stale: boolean;
};
type LiveRatesResponse = {
  sources: {
    sln_bullion?: LiveRateSource;
    intergold_th?: LiveRateSource;
    superrich_th?: LiveRateSource;
    xe?: LiveRateSource;
  };
  fetched_at: string;
};

// Fix 2 · vault summary shape returned by GET /api/bullion/vault
type VaultSummary = {
  total_gold_baht: number;
  total_inr: number;
  total_thb: number;
  open_txn_count: number;
};

// Fix 2 · generic trip shape (from /api/trips)
type GenericTrip = {
  id: string;
  carrier_id?: string;
  flight_number?: string;
  airline?: string;
  departure_date?: string;
  origin?: string;
  destination?: string;
  capacity_kg?: number;
  gold_baht?: number;
  currency_amount?: number;
  carry_charge?: number;
  status?: string;
};

type Party = { id: string; name: string; role?: string };

const STATUS: Record<string, { tint: string; soft: string }> = {
  planned: { tint: colors.warn, soft: colors.warnSoft },
  in_transit: { tint: colors.info, soft: colors.infoSoft },
  completed: { tint: colors.brand, soft: colors.brandSoft },
  cancelled: { tint: colors.textDim, soft: colors.divider },
};

export default function BullionScreen() {
  const { token } = useAuth();
  const { activeCompany, activeMode } = useCompany();
  const router = useRouter();
  const [trips, setTrips] = useState<BullionTrip[] | null>(null);
  const [genericTrips, setGenericTrips] = useState<GenericTrip[] | null>(null);
  const [carriers, setCarriers] = useState<Party[]>([]);
  const [txns, setTxns] = useState<BullionTxn[] | null>(null);
  const [rates, setRates] = useState<BullionRates | null>(null);
  const [vaultLive, setVaultLive] = useState<VaultSummary | null>(null);
  // Fix 6 · Live scraped rates (polled every 60 s)
  const [liveRates, setLiveRates] = useState<LiveRatesResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Fix 5 · Add Trip moved to full-page route /trips/new — modal state removed.

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [t, gt, x, r, v, ps] = await Promise.all([
        apiGet<BullionTrip[]>(
          appendCompanyQuery("/api/bullion/trips", activeCompany, activeMode),
        ),
        apiGet<GenericTrip[]>(
          appendCompanyQuery("/api/trips", activeCompany, activeMode),
        ).catch(() => [] as GenericTrip[]),
        apiGet<BullionTxn[]>("/api/bullion/transactions"),
        apiGet<BullionRates>("/api/bullion/rates").catch(() => null as BullionRates | null),
        apiGet<VaultSummary>("/api/bullion/vault").catch(() => null as VaultSummary | null),
        apiGet<Party[]>("/api/parties").catch(() => [] as Party[]),
      ]);
      setTrips(Array.isArray(t) ? t : []);
      setGenericTrips(Array.isArray(gt) ? gt : []);
      setTxns(Array.isArray(x) ? x : []);
      setRates(r);
      setVaultLive(v);
      setCarriers(
        (Array.isArray(ps) ? ps : []).filter(
          (p) => (p.role || "").toLowerCase() === "carrier",
        ),
      );
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, [activeCompany, activeMode]);

  useEffect(() => {
    if (token) load();
  }, [token, load, activeCompany, activeMode]);

  // Fix 5 · Refresh trips after returning from /trips/new full-page route.
  useFocusEffect(
    useCallback(() => {
      if (token) load();
    }, [token, load]),
  );

  // Fix 6 (Phase 7 · Batch C-2) · Live rates polling.
  // Backend scheduler updates /api/live-rates every 60 s; we poll on
  // the same cadence so a mounted screen sees fresh gold + currency
  // numbers without a manual refresh. Also fires an immediate fetch
  // on focus so opening the screen never shows stale data.
  useEffect(() => {
    if (!token) return;
    let cancelled = false;
    const fetchLive = async () => {
      try {
        const data = await apiGet<LiveRatesResponse>("/api/live-rates");
        if (!cancelled) setLiveRates(data);
      } catch {
        /* silent — endpoint is best-effort */
      }
    };
    fetchLive();
    const iv = setInterval(fetchLive, 60000);
    return () => {
      cancelled = true;
      clearInterval(iv);
    };
  }, [token]);

  // ── Vault snapshot — total gold in vault (open txns) and net currency
  const vault = useMemo(() => {
    if (!txns) return { goldBaht: 0, currencyInr: 0, currencyThb: 0, openTxns: 0 };
    let goldBaht = 0;
    let currencyInr = 0;
    let currencyThb = 0;
    let openTxns = 0;
    for (const t of txns) {
      if (t.status === "completed" || t.status === "cancelled") continue;
      openTxns += 1;
      if (t.type === "gold") {
        if (t.gold_unit === "baht") goldBaht += Number(t.gold_amount || 0);
        else if (t.gold_unit === "grams") goldBaht += Number(t.gold_amount || 0) / 15.244;
      }
      if (t.type === "currency" && t.currency_amount) {
        if (t.currency === "THB") currencyThb += Number(t.currency_amount);
        else currencyInr += Number(t.currency_amount);
      }
    }
    return { goldBaht, currencyInr, currencyThb, openTxns };
  }, [txns]);

  const goldValueInr = useMemo(() => {
    if (!rates || !vault.goldBaht) return 0;
    // 1 baht (Thai gold) ≈ rates.gold_rate_per_baht ×1000 INR
    return vault.goldBaht * (rates.gold_rate_per_baht ?? 0) * 1000;
  }, [rates, vault.goldBaht]);

  const sortedTrips = useMemo(() => {
    // Merge legacy bullion trips + generic /api/trips into one list.
    const adapted: BullionTrip[] = (genericTrips || []).map((g) => {
      const carrier = carriers.find((c) => c.id === g.carrier_id);
      return {
        id: `gt-${g.id}`,
        date: g.departure_date || "",
        origin: g.origin,
        destination: g.destination,
        carrier_name: carrier?.name || g.carrier_id || undefined,
        carrier_party_id: g.carrier_id,
        airline: g.airline,
        flight_number: g.flight_number,
        status: g.status,
        available_weight_kg: g.capacity_kg,
        gold_baht: g.gold_baht,
        currency_amount: g.currency_amount,
        carry_charge_inr: g.carry_charge,
      };
    });
    return [...(trips || []), ...adapted]
      .slice()
      .sort((a, b) => (b.date || "").localeCompare(a.date || ""));
  }, [trips, genericTrips, carriers]);

  return (
    <SafeAreaView edges={["top", "left", "right"]} style={styles.safe}>
      <Stack.Screen options={{ headerShown: false }} />

      {/* Header */}
      <View style={styles.headerBar}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()} activeOpacity={0.7}>
          <Ionicons name="chevron-back" size={22} color={colors.text} />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={styles.title}>Bullion</Text>
          <Text style={styles.subtitle}>Trips · Vault · Live rates</Text>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={styles.scroll}
        refreshControl={
          <RefreshControl refreshing={loading} onRefresh={load} tintColor={colors.brand} />
        }
        showsVerticalScrollIndicator={false}
      >
        {trips === null && loading ? (
          <View style={styles.loading}>
            <ActivityIndicator color={colors.brand} />
            <Text style={styles.dim}>Loading bullion…</Text>
          </View>
        ) : null}

        {error ? (
          <GlassCard style={styles.errorCard}>
            <Ionicons name="alert-circle" size={20} color={colors.danger} />
            <Text style={styles.errorText}>{error}</Text>
            <TouchableOpacity style={styles.retry} onPress={load}>
              <Text style={styles.retryText}>Retry</Text>
            </TouchableOpacity>
          </GlassCard>
        ) : null}

        {/* Vault snapshot */}
        {txns !== null ? (
          <>
            <Text style={styles.section}>Vault snapshot</Text>
            <GlassCard glow>
              <View style={styles.vaultRow}>
                <View style={styles.vaultCell}>
                  <View style={styles.vaultHeader}>
                    <Ionicons name="diamond" size={14} color={colors.brand} />
                    <Text style={styles.vaultLabel}>Gold on hand</Text>
                  </View>
                  <Text style={styles.vaultValueGold}>
                    {(vaultLive?.total_gold_baht ?? vault.goldBaht).toFixed(2)}
                    <Text style={styles.vaultUnit}> baht</Text>
                  </Text>
                  {goldValueInr ? (
                    <Text style={styles.vaultSub}>≈ {fmtCurrency(goldValueInr, "INR")}</Text>
                  ) : null}
                </View>
                <View style={styles.vaultDivider} />
                <View style={styles.vaultCell}>
                  <View style={styles.vaultHeader}>
                    <Ionicons name="wallet" size={14} color={colors.info} />
                    <Text style={styles.vaultLabel}>Currency</Text>
                  </View>
                  {(vaultLive?.total_inr ?? vault.currencyInr) ? (
                    <Text style={styles.vaultValueCash}>
                      {fmtCurrency(vaultLive?.total_inr ?? vault.currencyInr, "INR")}
                    </Text>
                  ) : null}
                  {(vaultLive?.total_thb ?? vault.currencyThb) ? (
                    <Text style={styles.vaultValueCashSm}>
                      {fmtCurrency(vaultLive?.total_thb ?? vault.currencyThb, "THB")}
                    </Text>
                  ) : null}
                  {!(vaultLive?.total_inr ?? vault.currencyInr) &&
                  !(vaultLive?.total_thb ?? vault.currencyThb) ? (
                    <Text style={styles.vaultValueCash}>—</Text>
                  ) : null}
                </View>
              </View>
              <View style={styles.vaultFooter}>
                <Ionicons name="lock-closed" size={12} color={colors.textDim} />
                <Text style={styles.dim}>
                  {vaultLive?.open_txn_count ?? vault.openTxns} open transaction
                  {(vaultLive?.open_txn_count ?? vault.openTxns) === 1 ? "" : "s"}
                </Text>
              </View>
            </GlassCard>
          </>
        ) : null}

        {/* Live rates */}
        {rates ? (
          <>
            <Text style={styles.section}>Live rates</Text>
            <GlassCard>
              <RateRow
                icon="diamond"
                label="Gold · per baht"
                value={`${fmtCurrency(rates.gold_rate_per_baht ?? 0, "INR")} k`}
                tint={colors.brand}
              />
              <RateRow
                icon="cash"
                label="Currency · per 1,000"
                value={fmtCurrency(rates.currency_rate_per_1000 ?? 0, "INR")}
                tint={colors.info}
              />
              <RateRow
                icon="airplane"
                label="Hand carry · per kg"
                value={fmtCurrency(rates.hand_carry_rate_inr_per_kg ?? 0, "INR")}
                tint={colors.warn}
              />
              <Text style={styles.updatedText}>
                Updated {shortDate(rates.updated_at)}
              </Text>
            </GlassCard>
          </>
        ) : null}

        {/* Fix 6 (Phase 7 · Batch C-2) · Live scraped rates (60 s polling) */}
        {liveRates ? (
          <>
            <View style={styles.liveRatesHeader}>
              <Text style={styles.section}>Live market rates</Text>
              <View style={styles.livePill}>
                <View style={styles.liveDot} />
                <Text style={styles.livePillText}>LIVE · 60s</Text>
              </View>
            </View>

            {/* India gold — SLN Bullion / GoodReturns */}
            {liveRates.sources.sln_bullion ? (
              <LiveRateCard
                icon="diamond"
                title="India Gold (per gram)"
                source="GoodReturns · IBJA benchmark"
                isStale={liveRates.sources.sln_bullion.is_stale}
                fetchedAt={liveRates.sources.sln_bullion.fetched_at}
                rows={[
                  {
                    label: "24K (999)",
                    value:
                      Number(liveRates.sources.sln_bullion.rates.gold_24k_1g_inr || 0) > 0
                        ? `₹${Number(liveRates.sources.sln_bullion.rates.gold_24k_1g_inr).toLocaleString("en-IN")}/g`
                        : "—",
                  },
                  {
                    label: "22K (916)",
                    value:
                      Number(liveRates.sources.sln_bullion.rates.gold_22k_1g_inr || 0) > 0
                        ? `₹${Number(liveRates.sources.sln_bullion.rates.gold_22k_1g_inr).toLocaleString("en-IN")}/g`
                        : "—",
                  },
                  {
                    label: "Silver (per kg)",
                    value:
                      Number(liveRates.sources.sln_bullion.rates.silver_1kg_inr || 0) > 0
                        ? `₹${Number(liveRates.sources.sln_bullion.rates.silver_1kg_inr).toLocaleString("en-IN")}/kg`
                        : "—",
                  },
                ]}
              />
            ) : null}

            {/* Thai gold — InterGold / Thai Gold Traders Assn */}
            {liveRates.sources.intergold_th ? (
              <LiveRateCard
                icon="diamond-outline"
                title="Thai Gold Buy"
                source="InterGold / Gold Traders Assn"
                isStale={liveRates.sources.intergold_th.is_stale}
                fetchedAt={liveRates.sources.intergold_th.fetched_at}
                rows={[
                  {
                    label: "Bar · Buy",
                    value:
                      Number(liveRates.sources.intergold_th.rates.gold_bar_buy_thb || 0) > 0
                        ? `฿${Number(liveRates.sources.intergold_th.rates.gold_bar_buy_thb).toLocaleString("en-US")}`
                        : "—",
                  },
                  {
                    label: "Bar · Sell",
                    value:
                      Number(liveRates.sources.intergold_th.rates.gold_bar_sell_thb || 0) > 0
                        ? `฿${Number(liveRates.sources.intergold_th.rates.gold_bar_sell_thb).toLocaleString("en-US")}`
                        : "—",
                  },
                  {
                    label: "Ornament · Sell",
                    value:
                      Number(liveRates.sources.intergold_th.rates.gold_ornament_sell_thb || 0) > 0
                        ? `฿${Number(liveRates.sources.intergold_th.rates.gold_ornament_sell_thb).toLocaleString("en-US")}`
                        : "—",
                  },
                ]}
              />
            ) : null}

            {/* Super Rich Thailand currency */}
            {liveRates.sources.superrich_th ? (
              <LiveRateCard
                icon="cash"
                title="Booth Exchange (Bangkok)"
                source="grandsuperrich.com · buy/sell"
                isStale={liveRates.sources.superrich_th.is_stale}
                fetchedAt={liveRates.sources.superrich_th.fetched_at}
                rows={[
                  {
                    label: "1 INR → THB",
                    value:
                      Number(liveRates.sources.superrich_th.rates.inr_thb_buy || 0) > 0
                        ? `฿${Number(liveRates.sources.superrich_th.rates.inr_thb_buy).toFixed(3)}`
                        : "—",
                  },
                  {
                    label: "1 USD → THB",
                    value:
                      Number(liveRates.sources.superrich_th.rates.usd_thb_buy || 0) > 0
                        ? `฿${Number(liveRates.sources.superrich_th.rates.usd_thb_buy).toFixed(2)}`
                        : "—",
                  },
                  {
                    label: "1 SGD → THB",
                    value:
                      Number(liveRates.sources.superrich_th.rates.sgd_thb_buy || 0) > 0
                        ? `฿${Number(liveRates.sources.superrich_th.rates.sgd_thb_buy).toFixed(2)}`
                        : "—",
                  },
                ]}
              />
            ) : null}

            {/* XE.com mid-market */}
            {liveRates.sources.xe ? (
              <LiveRateCard
                icon="globe-outline"
                title="XE.com Mid-Market"
                source="xe.com"
                isStale={liveRates.sources.xe.is_stale}
                fetchedAt={liveRates.sources.xe.fetched_at}
                rows={[
                  {
                    label: "1 USD",
                    value:
                      Number(liveRates.sources.xe.rates.usd_inr || 0) > 0
                        ? `₹${Number(liveRates.sources.xe.rates.usd_inr).toFixed(2)}`
                        : "—",
                  },
                  {
                    label: "1 INR",
                    value:
                      Number(liveRates.sources.xe.rates.inr_thb || 0) > 0
                        ? `฿${Number(liveRates.sources.xe.rates.inr_thb).toFixed(4)}`
                        : "—",
                  },
                  {
                    label: "1 USD → THB",
                    value:
                      Number(liveRates.sources.xe.rates.usd_thb || 0) > 0
                        ? `฿${Number(liveRates.sources.xe.rates.usd_thb).toFixed(2)}`
                        : "—",
                  },
                ]}
              />
            ) : null}
          </>
        ) : null}

        {/* Trips list */}
        <View style={styles.tripsHeader}>
          <View style={{ flex: 1 }}>
            <Text style={styles.section}>Carrier flights</Text>
            <Text style={styles.dim}>{sortedTrips.length} total</Text>
          </View>
          <TouchableOpacity
            style={styles.addTripBtn}
            onPress={() => router.push("/trips/new" as any)}
            activeOpacity={0.85}
          >
            <Ionicons name="add" size={16} color={colors.bgSolid} />
            <Text style={styles.addTripBtnText}>Add Trip</Text>
          </TouchableOpacity>
        </View>

        {sortedTrips.length === 0 && !loading ? (
          <GlassCard>
            <View style={styles.emptyBody}>
              <Ionicons name="airplane-outline" size={32} color={colors.textDim} />
              <Text style={styles.emptyTitle}>No bullion trips yet</Text>
              <Text style={styles.emptyBodyText}>
                Tap &quot;+ Add Trip&quot; to schedule your first carrier flight.
              </Text>
              <TouchableOpacity
                style={[styles.addTripBtn, { marginTop: spacing.md }]}
                onPress={() => router.push("/trips/new" as any)}
                activeOpacity={0.85}
              >
                <Ionicons name="add" size={16} color={colors.bgSolid} />
                <Text style={styles.addTripBtnText}>Add Trip</Text>
              </TouchableOpacity>
            </View>
          </GlassCard>
        ) : null}

        {sortedTrips.map((trip) => (
          <TripRow key={trip.id} trip={trip} />
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

function RateRow({
  icon,
  label,
  value,
  tint,
}: {
  icon: React.ComponentProps<typeof Ionicons>["name"];
  label: string;
  value: string;
  tint: string;
}) {
  return (
    <View style={styles.rateRow}>
      <View style={[styles.rateIcon, { backgroundColor: colors.brandSoft, borderColor: tint }]}>
        <Ionicons name={icon} size={14} color={tint} />
      </View>
      <Text style={styles.rateLabel}>{label}</Text>
      <Text style={styles.rateValue}>{value}</Text>
    </View>
  );
}

// Fix 6 (Phase 7 · Batch C-2) · Live scraped-rate card
function LiveRateCard({
  icon,
  title,
  source,
  isStale,
  fetchedAt,
  rows,
}: {
  icon: React.ComponentProps<typeof Ionicons>["name"];
  title: string;
  source: string;
  isStale: boolean;
  fetchedAt: string | null;
  rows: { label: string; value: string }[];
}) {
  const timeAgo = React.useMemo(() => {
    if (!fetchedAt) return "never";
    try {
      const diff = (Date.now() - new Date(fetchedAt).getTime()) / 1000;
      if (diff < 60) return `${Math.max(1, Math.round(diff))}s ago`;
      if (diff < 3600) return `${Math.round(diff / 60)}m ago`;
      return `${Math.round(diff / 3600)}h ago`;
    } catch {
      return "—";
    }
  }, [fetchedAt]);

  return (
    <GlassCard style={styles.liveCard}>
      <View style={styles.liveCardHeader}>
        <View style={[styles.rateIcon, { backgroundColor: colors.brandSoft, borderColor: colors.brand }]}>
          <Ionicons name={icon} size={14} color={colors.brand} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.liveCardTitle}>{title}</Text>
          <Text style={styles.liveCardSource}>{source}</Text>
        </View>
        {isStale ? (
          <View style={[styles.liveStatePill, { backgroundColor: colors.warnSoft, borderColor: colors.warn }]}>
            <Ionicons name="time-outline" size={11} color={colors.warn} />
            <Text style={[styles.liveStateText, { color: colors.warn }]}>STALE</Text>
          </View>
        ) : (
          <View style={[styles.liveStatePill, { backgroundColor: colors.brandSoft, borderColor: colors.brand }]}>
            <View style={styles.liveDot} />
            <Text style={[styles.liveStateText, { color: colors.brand }]}>{timeAgo}</Text>
          </View>
        )}
      </View>
      <View style={styles.liveRowsWrap}>
        {rows.map((r, idx) => (
          <View key={idx} style={styles.liveDataRow}>
            <Text style={styles.liveDataLabel}>{r.label}</Text>
            <Text style={styles.liveDataValue}>{r.value}</Text>
          </View>
        ))}
      </View>
    </GlassCard>
  );
}

function TripRow({ trip }: { trip: BullionTrip }) {
  const dir = (trip.route || trip.direction || "").toString();
  const dirLabel = dir === "IN_TO_TH" ? "IN → TH" : dir === "TH_TO_IN" ? "TH → IN" : titleCase(dir);
  const s = STATUS[(trip.status || "planned").toLowerCase()] ?? STATUS.planned;

  return (
    <View style={styles.tripCard}>
      <View style={styles.tripLeft}>
        <View style={styles.tripHeader}>
          <View style={styles.tripDirIcon}>
            <Ionicons
              name={dir === "IN_TO_TH" ? "arrow-forward" : "arrow-back"}
              size={14}
              color={colors.brand}
            />
          </View>
          <Text style={styles.tripDir}>{dirLabel || "—"}</Text>
          <Pill
            label={titleCase(trip.status || "planned")}
            tint={s.tint}
            soft={s.soft}
            size="sm"
          />
        </View>
        <Text style={styles.tripFlight}>
          {trip.airline || trip.airline_code || "—"}
          {trip.flight_number ? ` · ${trip.flight_number}` : ""}
        </Text>
        <Text style={styles.tripCarrier} numberOfLines={1}>
          Carrier: {trip.carrier_name || "—"}
        </Text>
        <View style={styles.tripMeta}>
          <Text style={styles.dim}>{shortDate(trip.date)}</Text>
          {trip.available_weight_kg ? (
            <Text style={styles.dim}>· {trip.available_weight_kg} kg cap</Text>
          ) : null}
          {trip.gold_baht ? (
            <Text style={[styles.dim, { color: colors.brand }]}>
              · {trip.gold_baht} baht gold            </Text>
          ) : null}
          {trip.carry_charge_inr ? (
            <Text style={[styles.dim, { color: colors.debit }]}>
              · {fmtCurrency(trip.carry_charge_inr, "INR")} carry
            </Text>
          ) : null}
        </View>

        {/* Fix 3 (Phase 7) · Capacity progress bar — green under
            80%, orange from 80-100%, red on overflow. */}
        {(() => {
          const capacity = Number(trip.available_weight_kg || 0);
          const allocated = Number(trip.allocated_kg || 0);
          if (!capacity && !allocated) return null;
          const pct = capacity > 0 ? (allocated / capacity) * 100 : 0;
          const overflow = allocated > capacity;
          const barColor = overflow
            ? colors.debit
            : pct >= 80
            ? "#FFB74D"
            : colors.credit;
          const fillPct = Math.min(100, Math.max(0, pct));
          const remaining = Math.max(0, capacity - allocated);
          const extra = Math.max(0, allocated - capacity);
          return (
            <View style={{ marginTop: 8, gap: 4 }}>
              <View style={styles.progressTrack}>
                <View
                  style={[
                    styles.progressFill,
                    { width: `${fillPct}%`, backgroundColor: barColor },
                  ]}
                />
              </View>
              <View style={styles.tripMeta}>
                <Text
                  style={[
                    styles.dim,
                    { color: overflow ? colors.debit : colors.text, fontWeight: "700" },
                  ]}
                >
                  {allocated}/{capacity} kg
                </Text>
                {overflow ? (
                  <Text style={[styles.dim, { color: colors.debit }]}>
                    · {extra} kg extra
                  </Text>
                ) : (
                  <Text style={styles.dim}>
                    · {Math.round(pct)}% · {remaining} kg free
                  </Text>
                )}
              </View>
            </View>
          );
        })()}
      </View>
    </View>
  );
}


const styles = StyleSheet.create({
  // Fix 2 · Add Trip button + modal
  addTripBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: colors.brand,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    shadowColor: colors.brand,
    shadowOpacity: 0.35,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 0 },
    elevation: 4,
  },
  addTripBtnText: {
    color: colors.bgSolid,
    fontSize: 12,
    fontWeight: "800",
    letterSpacing: 0.3,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.6)",
    justifyContent: "flex-end",
    ...(Platform.OS === "web" ? { alignItems: "center" } : {}),
  },
  modalSheet: {
    backgroundColor: colors.bgSolid,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    borderTopWidth: 1,
    borderTopColor: colors.cardBorder,
    borderLeftWidth: 1,
    borderRightWidth: 1,
    borderLeftColor: colors.cardBorder,
    borderRightColor: colors.cardBorder,
    padding: spacing.lg,
    paddingBottom: Platform.OS === "web" ? spacing.lg : 32,
    ...(Platform.OS === "web"
      ? { width: 500, maxWidth: "92%", borderRadius: 20, borderWidth: 1, marginBottom: 32 }
      : {}),
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: spacing.md,
  },
  modalTitle: { color: colors.text, fontSize: 18, fontWeight: "800" },
  modalLabel: {
    color: colors.textDim,
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 0.6,
    textTransform: "uppercase",
    marginTop: spacing.md,
    marginBottom: 6,
  },
  modalRow: { flexDirection: "row", gap: spacing.md, alignItems: "flex-start" },
  input: {
    backgroundColor: colors.card,
    borderColor: colors.cardBorder,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: colors.text,
    fontSize: 14,
  },
  segment: { flexDirection: "row", gap: 8 },
  segmentBtn: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    backgroundColor: colors.card,
  },
  segmentText: { fontSize: 12, fontWeight: "700", letterSpacing: 0.3 },
  mChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    backgroundColor: colors.card,
    maxWidth: 180,
  },
  mChipActive: { borderColor: colors.brandBorder, backgroundColor: colors.brandSoft },
  mChipText: { fontSize: 12, fontWeight: "700" },
  modalActions: {
    flexDirection: "row",
    gap: 10,
    marginTop: spacing.md,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.divider,
  },
  modalBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 12,
    borderRadius: 999,
  },
  modalBtnGhost: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  modalBtnGhostText: { color: colors.textMuted, fontSize: 13, fontWeight: "700" },
  modalBtnPrimary: { backgroundColor: colors.brand },
  modalBtnPrimaryText: { color: colors.bgSolid, fontSize: 13, fontWeight: "800" },

  safe: { flex: 1, backgroundColor: colors.bg },
  headerBar: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    gap: spacing.sm,
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.card,
    borderColor: colors.cardBorder,
    borderWidth: 1,
  },
  title: { color: colors.text, fontSize: 22, fontWeight: "800", letterSpacing: -0.5 },
  subtitle: { color: colors.textMuted, fontSize: 11, marginTop: 2 },
  scroll: { padding: spacing.lg, paddingBottom: 100 },
  section: {
    color: colors.text,
    fontSize: 12,
    fontWeight: "800",
    marginTop: spacing.md,
    marginBottom: spacing.sm,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  // ─ Vault card
  vaultRow: {
    flexDirection: "row",
    alignItems: "stretch",
    gap: spacing.md,
    paddingVertical: spacing.sm,
  },
  vaultCell: { flex: 1 },
  vaultDivider: { width: 1, backgroundColor: colors.divider },
  vaultHeader: { flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 6 },
  vaultLabel: {
    color: colors.textDim,
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 0.6,
    textTransform: "uppercase",
  },
  vaultValueGold: {
    color: colors.text,
    fontSize: 26,
    fontWeight: "800",
    letterSpacing: -0.3,
  },
  vaultUnit: { fontSize: 12, color: colors.textMuted, fontWeight: "700" },
  vaultSub: { color: colors.brand, fontSize: 12, marginTop: 2, fontWeight: "700" },
  vaultValueCash: {
    color: colors.text,
    fontSize: 20,
    fontWeight: "800",
    letterSpacing: -0.3,
  },
  vaultValueCashSm: { color: colors.text, fontSize: 14, fontWeight: "700", marginTop: 2 },
  vaultFooter: {
    marginTop: spacing.sm,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.divider,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  // ─ Rates
  rateRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 10,
    gap: spacing.md,
  },
  rateIcon: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  rateLabel: { flex: 1, color: colors.textMuted, fontSize: 12 },
  rateValue: { color: colors.text, fontSize: 14, fontWeight: "800", letterSpacing: 0.2 },
  updatedText: {
    color: colors.textDim,
    fontSize: 10,
    fontStyle: "italic",
    marginTop: 4,
    textAlign: "right",
  },
  // ─ Fix 6 · Live scraped rates
  liveRatesHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: spacing.md,
    marginBottom: spacing.sm,
  },
  livePill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999,
    backgroundColor: colors.brandSoft,
    borderWidth: 1,
    borderColor: colors.brandBorder,
  },
  livePillText: {
    color: colors.brand,
    fontSize: 9,
    fontWeight: "800",
    letterSpacing: 0.5,
  },
  liveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.brand,
  },
  liveCard: {
    marginBottom: spacing.sm,
  },
  liveCardHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: spacing.sm,
  },
  liveCardTitle: {
    color: colors.text,
    fontSize: 14,
    fontWeight: "800",
    letterSpacing: 0.2,
  },
  liveCardSource: {
    color: colors.textDim,
    fontSize: 10,
    marginTop: 1,
  },
  liveStatePill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999,
    borderWidth: 1,
  },
  liveStateText: {
    fontSize: 9,
    fontWeight: "800",
    letterSpacing: 0.5,
  },
  liveRowsWrap: {
    borderTopWidth: 1,
    borderTopColor: colors.divider,
    paddingTop: spacing.sm,
    gap: 6,
  },
  liveDataRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  liveDataLabel: {
    color: colors.textMuted,
    fontSize: 12,
  },
  liveDataValue: {
    color: colors.text,
    fontSize: 13,
    fontWeight: "800",
    letterSpacing: 0.2,
  },
  // ─ Trips
  tripsHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: spacing.md,
    marginBottom: spacing.sm,
  },
  tripCard: {
    backgroundColor: colors.card,
    borderColor: colors.cardBorder,
    borderWidth: 1,
    borderRadius: radii.md,
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  tripLeft: { flex: 1 },
  tripHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 6,
  },
  tripDirIcon: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: colors.brandSoft,
    borderColor: colors.brandBorder,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  tripDir: {
    color: colors.text,
    fontSize: 14,
    fontWeight: "800",
    letterSpacing: 0.3,
    flex: 1,
  },
  tripFlight: { color: colors.text, fontSize: 13, fontWeight: "700", marginTop: 2 },
  tripCarrier: { color: colors.textMuted, fontSize: 12, marginTop: 2 },
  // Fix 3 (Phase 7) · Capacity progress bar.
  progressTrack: {
    height: 6,
    borderRadius: 3,
    backgroundColor: "rgba(255,255,255,0.08)",
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    borderRadius: 3,
  },
  tripMeta: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
    marginTop: 8,
  },
  dim: { color: colors.textDim, fontSize: 11 },
  emptyBody: {
    padding: spacing.lg,
    alignItems: "center",
    gap: spacing.sm,
  },
  emptyTitle: { color: colors.text, fontSize: 15, fontWeight: "700" },
  emptyBodyText: { color: colors.textMuted, fontSize: 12, textAlign: "center" },
  loading: {
    flexDirection: "row",
    gap: spacing.sm,
    justifyContent: "center",
    alignItems: "center",
    padding: spacing.lg,
  },
  errorCard: {
    padding: spacing.md,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    borderColor: colors.danger,
    marginBottom: spacing.md,
  },
  errorText: { flex: 1, color: colors.text, fontSize: 12 },
  retry: {
    backgroundColor: colors.danger,
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
    borderRadius: radii.pill,
  },
  retryText: { color: "#FFFFFF", fontSize: 11, fontWeight: "700" },
});
