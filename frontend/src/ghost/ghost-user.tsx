/**
 * Ghost-User action engine.
 *
 * When the Assistant emits a ```json``` block containing a supported
 * `action`, the frontend parses it here, presents a confirmation modal
 * (for writes), animates a "ghost cursor" flying across the screen to
 * indicate where the AI is "typing", and finally invokes the real API.
 *
 * Actions:
 *   - navigate          → auto-executes (no confirmation).
 *   - create_party      → confirm → POST /api/parties.
 *   - create_item       → confirm → POST /api/items.
 *   - update_ledger     → confirm → POST /api/ledger.
 *   - carrier_update    → confirm → PATCH /api/shipments/{id}.
 *   - add_bag           → confirm → POST /api/shipments/{id}/bags.
 *
 * The action host lives in `<GhostUserProvider>` mounted at the root so
 * any component (Assistant, sample buttons in a "Try me" demo, etc.) can
 * fire actions via `useGhostUser().run(action)`.
 */
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  ActivityIndicator,
  Animated,
  Dimensions,
  Easing,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { API_BASE } from "@/src/api/client";
import { getAuthTokenSync } from "@/src/auth/context";
import { setGhostPayload, type GhostPayload } from "@/src/ghost/store";
import { colors, radii, spacing } from "@/src/theme";

// ---------------------------------------------------------------------------
// Action schema
// ---------------------------------------------------------------------------

export type GhostAction =
  | { action: "navigate"; route: string }
  | {
      action: "create_party";
      name: string;
      role?: "buyer" | "seller" | "carrier";
      city?: string;
      phone?: string;
      notes?: string;
    }
  | {
      action: "create_item";
      name: string;
      unit?: string;
      hsn_code?: string;
      notes?: string;
    }
  | {
      action: "create_shipment";
      consignment_no?: string;
      direction?: "IN_TO_TH" | "TH_TO_IN";
      mode?: "air" | "sea" | "land" | "hand_carry";
      origin?: string;
      destination?: string;
      freight?: number;
      freight_ccy?: "INR" | "THB";
      notes?: string;
    }
  | {
      action: "create_invoice";
      invoice_no?: string;
      party_name?: string;
      amount?: number;
      currency?: "INR" | "THB";
      description?: string;
      notes?: string;
    }
  | {
      action: "update_ledger";
      party_name: string;
      debit?: number;
      credit?: number;
      description?: string;
    }
  | {
      action: "carrier_update";
      consignment_no: string;
      status?: "in_transit" | "delivered" | "delayed";
      notes?: string;
    }
  | {
      action: "add_bag";
      shipment_ref: string;
      weight_kg: number;
      notes?: string;
    };

const READ_ACTIONS: GhostAction["action"][] = ["navigate"];

/** Human-readable one-liner for the confirmation modal header. */
function actionHeadline(a: GhostAction): string {
  switch (a.action) {
    case "navigate":
      return `Navigate to ${a.route}`;
    case "create_party":
      return `Create Party: ${a.name}`;
    case "create_item":
      return `Create Item: ${a.name}`;
    case "create_shipment":
      return `Create Shipment ${a.consignment_no || ""}`.trim();
    case "create_invoice":
      return `Create Invoice ${a.invoice_no || ""}`.trim();
    case "update_ledger":
      return `Ledger entry for ${a.party_name}`;
    case "carrier_update":
      return `Update shipment ${a.consignment_no}`;
    case "add_bag":
      return `Add ${a.weight_kg} kg bag to ${a.shipment_ref}`;
    default:
      return "AI action";
  }
}

/** Detail rows for the confirmation modal body. */
function actionDetails(a: GhostAction): Array<[string, string]> {
  switch (a.action) {
    case "create_party":
      return [
        ["Name", a.name],
        ["Role", a.role || "buyer"],
        ...(a.city ? ([["City", a.city]] as Array<[string, string]>) : []),
        ...(a.phone ? ([["Phone", a.phone]] as Array<[string, string]>) : []),
        ...(a.notes ? ([["Notes", a.notes]] as Array<[string, string]>) : []),
      ];
    case "create_item":
      return [
        ["Name", a.name],
        ...(a.unit ? ([["Unit", a.unit]] as Array<[string, string]>) : []),
        ...(a.hsn_code ? ([["HSN", a.hsn_code]] as Array<[string, string]>) : []),
      ];
    case "update_ledger":
      return [
        ["Party", a.party_name],
        ...(a.debit ? ([["Debit", `₹${a.debit}`]] as Array<[string, string]>) : []),
        ...(a.credit ? ([["Credit", `₹${a.credit}`]] as Array<[string, string]>) : []),
        ...(a.description ? ([["Description", a.description]] as Array<[string, string]>) : []),
      ];
    case "carrier_update":
      return [
        ["Consignment", a.consignment_no],
        ...(a.status ? ([["Status", a.status]] as Array<[string, string]>) : []),
        ...(a.notes ? ([["Notes", a.notes]] as Array<[string, string]>) : []),
      ];
    case "add_bag":
      return [
        ["Shipment", a.shipment_ref],
        ["Weight", `${a.weight_kg} kg`],
        ...(a.notes ? ([["Notes", a.notes]] as Array<[string, string]>) : []),
      ];
    case "navigate":
      return [["Route", a.route]];
    default:
      return [];
  }
}

// ---------------------------------------------------------------------------
// Ghost cursor overlay
// ---------------------------------------------------------------------------

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get("window");

/** A little lime cursor dot that trails a translucent halo. */
function GhostCursor({
  visible,
  trail,
}: {
  visible: boolean;
  trail: { x: number; y: number }[];
}) {
  const x = useRef(new Animated.Value(SCREEN_W / 2)).current;
  const y = useRef(new Animated.Value(SCREEN_H / 2)).current;
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(opacity, {
      toValue: visible ? 1 : 0,
      duration: 250,
      useNativeDriver: false,
    }).start();
  }, [visible, opacity]);

  useEffect(() => {
    if (trail.length === 0) return;
    const [next] = trail.slice(-1);
    Animated.parallel([
      Animated.timing(x, {
        toValue: next.x,
        duration: 480,
        easing: Easing.inOut(Easing.cubic),
        useNativeDriver: false,
      }),
      Animated.timing(y, {
        toValue: next.y,
        duration: 480,
        easing: Easing.inOut(Easing.cubic),
        useNativeDriver: false,
      }),
    ]).start();
  }, [trail, x, y]);

  return (
    <Animated.View
      pointerEvents="none"
      style={[
        StyleSheet.absoluteFillObject,
        { opacity, zIndex: 9999 },
      ]}
    >
      <Animated.View
        style={[
          styles.cursorHalo,
          {
            transform: [
              { translateX: Animated.subtract(x, new Animated.Value(18)) },
              { translateY: Animated.subtract(y, new Animated.Value(18)) },
            ],
          },
        ]}
      />
      <Animated.View
        style={[
          styles.cursorDot,
          {
            transform: [
              { translateX: Animated.subtract(x, new Animated.Value(4)) },
              { translateY: Animated.subtract(y, new Animated.Value(4)) },
            ],
          },
        ]}
      />
    </Animated.View>
  );
}

// ---------------------------------------------------------------------------
// Context
// ---------------------------------------------------------------------------

type Toast = { message: string; kind: "ok" | "err" };

type GhostUserApi = {
  /** Attempt to parse an AI reply — extracts a JSON action if present and dispatches it. */
  parseAndRun: (aiReply: string) => Promise<boolean>;
  /** Run a specific action directly (bypasses parsing). */
  run: (action: GhostAction) => Promise<void>;
  /** Show the ghost cursor at the given screen point. Used from AI hints. */
  hintCursor: (x: number, y: number) => void;
  /** Called by useGhostFill when it starts typing a form. */
  beginFill?: (p: GhostPayload) => void;
  /** Called by useGhostFill after each field is typed. */
  progressFill?: (field: string) => void;
  /** Called by useGhostFill when all fields are filled and ready to save. */
  readyFill?: (p: GhostPayload) => void;
};

const Ctx = createContext<GhostUserApi | null>(null);

export function GhostUserProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [pending, setPending] = useState<GhostAction | null>(null);
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState<Toast | null>(null);
  const [cursorVisible, setCursorVisible] = useState(false);
  const [cursorTrail, setCursorTrail] = useState<{ x: number; y: number }[]>([]);
  // Visual-fill state — a persistent bottom banner replaces the popup for
  // any action that ends in a real form (create_party / create_item).
  const [fillState, setFillState] = useState<null | { p: GhostPayload; stage: "typing" | "ready" | "saving"; currentField?: string }>(null);

  const showCursor = useCallback((points: { x: number; y: number }[], duration = 1500) => {
    setCursorVisible(true);
    setCursorTrail(points);
    setTimeout(() => setCursorVisible(false), duration);
  }, []);

  const showToast = useCallback((message: string, kind: "ok" | "err" = "ok") => {
    setToast({ message, kind });
    setTimeout(() => setToast(null), 3200);
  }, []);

  // Programmatic navigation that reliably reaches the target route even
  // when we're deep inside an async callback on web. Strategy:
  //   1. router.push (SPA-friendly, preserves in-memory ghost store).
  //   2. If the path didn't change within 600ms, retry with router.navigate.
  //   3. NEVER use window.location.assign — a hard reload would wipe the
  //      in-memory GhostPayload before the target screen mounts.
  const navigateSafely = useCallback(
    (target: string) => {
      const tryPush = () => {
        try {
          router.push(target as never);
        } catch {
          /* fall through */
        }
      };
      const tryNavigate = () => {
        try {
          router.navigate(target as never);
        } catch {
          /* last-resort: ignore */
        }
      };
      // First attempt on next microtask so React batching commits any
      // pending state (setGhostPayload) before the router transitions.
      setTimeout(tryPush, 20);
      // Retry once with router.navigate if the pathname didn't move.
      setTimeout(() => {
        if (typeof window !== "undefined" && window.location) {
          const p = window.location.pathname || "";
          if (!p.endsWith(target)) tryNavigate();
        } else {
          tryNavigate();
        }
      }, 600);
    },
    [router],
  );

  // Set the pending payload AND navigate to its target route. Called by
  // every "create_*" action so the visual-fill flow is uniform.
  const dispatchVisualFill = useCallback(
    (payload: GhostPayload) => {
      // eslint-disable-next-line no-console
      console.log("[Ghost] dispatching visual-fill →", payload.route, payload.values);
      setGhostPayload(payload);
      navigateSafely(payload.route);
    },
    [navigateSafely],
  );

  // Execute the action against the backend after user confirmation.
  const execute = useCallback(
    async (a: GhostAction) => {
      const token = getAuthTokenSync();
      const headers: Record<string, string> = {
        "Content-Type": "application/json",
        "X-Entry-Source": "ai",
      };
      if (token) headers.Authorization = `Bearer ${token}`;

      const jsonRequest = async (method: string, path: string, body?: unknown) => {
        const res = await fetch(`${API_BASE}${path}`, {
          method,
          headers,
          body: body === undefined ? undefined : JSON.stringify(body),
        });
        if (!res.ok) {
          let msg = `HTTP ${res.status}`;
          try {
            const j = (await res.json()) as { detail?: string };
            msg = j.detail || msg;
          } catch {
            /* ignore */
          }
          throw new Error(msg);
        }
        return res.json();
      };

      switch (a.action) {
        case "navigate":
          // Ghost-cursor swipe from the centre to the tab area on the way out.
          showCursor([
            { x: SCREEN_W / 2, y: SCREEN_H / 2 },
            { x: SCREEN_W / 2, y: SCREEN_H - insets.bottom - 40 },
          ]);
          setTimeout(() => router.push(a.route as never), 400);
          return;

        case "create_party": {
          // Visual-fill path — hand off to /party/new. The form's
          // useGhostFill hook will type each field one-by-one, then
          // present its own Save button in Hindi.
          const roleMap: Record<string, string> = {
            buyer: "customer",
            purchaser: "customer",
            client: "customer",
            seller: "supplier",
            vendor: "supplier",
            supplier: "supplier",
            customer: "customer",
            end_customer: "end_customer",
            "end customer": "end_customer",
            carrier: "carrier",
            hand_carrier: "carrier",
          };
          const roleIn = (a.role || "customer").toString().toLowerCase().trim();
          const role = roleMap[roleIn] || "customer";
          const payload: GhostPayload = {
            route: "/party/new",
            headline: `Party बना रहा हूँ — ${a.name}`,
            values: {
              name: a.name,
              role,
              ...(a.city ? { city: a.city } : {}),
              ...(a.phone ? { phone: a.phone } : {}),
              ...(a.notes ? { notes: a.notes } : {}),
            },
            submit: {
              method: "POST",
              path: "/api/parties",
              body: { name: a.name, role, city: a.city, phone: a.phone, notes: a.notes },
            },
          };
          dispatchVisualFill(payload);
          return;
        }

        case "create_item": {
          const payload: GhostPayload = {
            // Item detail route uses [id].tsx with id="new" to create.
            route: "/item/new",
            headline: `Item बना रहा हूँ — ${a.name}`,
            values: {
              name: a.name,
              ...(a.unit ? { unit: a.unit } : {}),
              ...(a.hsn_code ? { hsn_code: a.hsn_code } : {}),
              ...(a.notes ? { notes: a.notes } : {}),
            },
            submit: {
              method: "POST",
              path: "/api/items",
              body: { name: a.name, unit: a.unit || "pcs", hsn_code: a.hsn_code, notes: a.notes },
            },
          };
          dispatchVisualFill(payload);
          return;
        }

        case "create_shipment": {
          const payload: GhostPayload = {
            route: "/shipment/new",
            headline: `Shipment बना रहा हूँ${a.consignment_no ? ` — ${a.consignment_no}` : ""}`,
            values: {
              ...(a.consignment_no ? { consignmentNo: a.consignment_no } : {}),
              ...(a.direction ? { direction: a.direction } : {}),
              ...(a.mode ? { mode: a.mode } : {}),
              ...(a.origin ? { origin: a.origin } : {}),
              ...(a.destination ? { destination: a.destination } : {}),
              ...(typeof a.freight === "number" ? { freight: String(a.freight) } : {}),
              ...(a.freight_ccy ? { freightCcy: a.freight_ccy } : {}),
              ...(a.notes ? { notes: a.notes } : {}),
            },
            submit: {
              method: "POST",
              path: "/api/shipments",
              body: {
                consignment_no: a.consignment_no,
                direction: a.direction || "IN_TO_TH",
                mode: a.mode || "air",
                origin: a.origin,
                destination: a.destination,
                freight_amount: a.freight,
                freight_currency: a.freight_ccy || "THB",
                notes: a.notes,
              },
            },
          };
          dispatchVisualFill(payload);
          return;
        }

        case "create_invoice": {
          const payload: GhostPayload = {
            route: "/invoice/new",
            headline: `Invoice बना रहा हूँ${a.invoice_no ? ` — ${a.invoice_no}` : ""}`,
            values: {
              ...(a.invoice_no ? { invoiceNo: a.invoice_no } : {}),
              ...(a.party_name ? { partyName: a.party_name } : {}),
              ...(typeof a.amount === "number" ? { amount: String(a.amount) } : {}),
              ...(a.currency ? { currency: a.currency } : {}),
              ...(a.description ? { description: a.description } : {}),
              ...(a.notes ? { notes: a.notes } : {}),
            },
            submit: {
              method: "POST",
              path: "/api/invoices",
              body: {
                invoice_no: a.invoice_no,
                party_name: a.party_name,
                amount: a.amount,
                currency: a.currency || "INR",
                description: a.description,
                notes: a.notes,
              },
            },
          };
          dispatchVisualFill(payload);
          return;
        }

        case "update_ledger": {
          const body = {
            party_name: a.party_name,
            debit: a.debit || 0,
            credit: a.credit || 0,
            description: a.description || "",
          };
          await jsonRequest("POST", "/api/ledger", body);
          showToast("Ledger entry posted");
          return;
        }

        case "carrier_update": {
          // Look up the shipment by consignment_no first.
          const shipments = (await jsonRequest("GET", "/api/shipments")) as Array<{
            id: string;
            consignment_no?: string;
          }>;
          const ship = _findShipment(shipments, a.consignment_no);
          if (!ship) {
            const near = _closestShipments(shipments, a.consignment_no, 3);
            const hint = near.length
              ? ` Did you mean: ${near.map((s) => s.consignment_no || s.id).join(", ")}?`
              : "";
            throw new Error(`Shipment "${a.consignment_no}" not found.${hint}`);
          }
          await jsonRequest("PATCH", `/api/shipments/${ship.id}`, {
            status: a.status,
            notes: a.notes,
          });
          showToast(`Shipment ${ship.consignment_no || ship.id} updated`);
          return;
        }

        case "add_bag": {
          const shipments = (await jsonRequest("GET", "/api/shipments")) as {
            id: string;
            consignment_no?: string;
          }[];
          const ship = _findShipment(shipments, a.shipment_ref);
          if (!ship) {
            const near = _closestShipments(shipments, a.shipment_ref, 3);
            const hint = near.length
              ? ` Try: ${near.map((s) => s.consignment_no || s.id).join(", ")}.`
              : "";
            throw new Error(`Shipment "${a.shipment_ref}" not found.${hint}`);
          }
          // Remote requires shipment_id in the body AND in the path — send
          // both so either wiring succeeds.
          await jsonRequest("POST", `/api/shipments/${ship.id}/bags`, {
            shipment_id: ship.id,
            weight_kg: a.weight_kg,
            notes: a.notes,
          });
          showToast(`Bag added to ${ship.consignment_no || ship.id}`);
          return;
        }
      }
    },
    [router, showCursor, showToast, insets.bottom, dispatchVisualFill],
  );

  // Which action types skip the confirmation popup and use visual fill?
  const VISUAL_FILL_ACTIONS = React.useMemo(
    () => new Set(["create_party", "create_item", "create_shipment", "create_invoice"]),
    [],
  );

  const run = useCallback(
    async (a: GhostAction) => {
      if (READ_ACTIONS.includes(a.action) || VISUAL_FILL_ACTIONS.has(a.action)) {
        // Read-only + visual-fill actions execute immediately — the form
        // itself collects the final confirmation.
        await execute(a).catch((e) => showToast((e as Error).message, "err"));
        return;
      }
      setPending(a);
    },
    [execute, showToast, VISUAL_FILL_ACTIONS],
  );

  const parseAndRun = useCallback(
    async (aiReply: string) => {
      // Extract every ```json``` fenced block; process only the first one for now.
      const match = aiReply.match(/```json\s*([\s\S]*?)```/);
      if (!match) return false;
      // Claude occasionally streams multi-line JSON (pretty-printed across
      // chunks). Squash structural whitespace outside string literals so
      // stray CR/LF/TAB never trips JSON.parse.
      const raw = _sanitizeJsonBlock(match[1].trim());
      try {
        const obj = JSON.parse(raw);
        if (!obj || typeof obj !== "object" || !("action" in obj)) return false;
        await run(obj as GhostAction);
        return true;
      } catch {
        return false;
      }
    },
    [run],
  );

  const confirm = useCallback(async () => {
    if (!pending) return;
    setBusy(true);
    try {
      // Small ghost-cursor pantomime BEFORE we submit so the user sees the AI "type".
      showCursor(
        [
          { x: SCREEN_W * 0.3, y: SCREEN_H * 0.35 },
          { x: SCREEN_W * 0.55, y: SCREEN_H * 0.5 },
          { x: SCREEN_W * 0.5, y: SCREEN_H * 0.75 },
        ],
        1600,
      );
      await new Promise((r) => setTimeout(r, 600));
      await execute(pending);
      setPending(null);
    } catch (e) {
      showToast((e as Error).message, "err");
    } finally {
      setBusy(false);
    }
  }, [pending, execute, showCursor, showToast]);

  const api = useMemo<GhostUserApi>(
    () => ({
      parseAndRun,
      run,
      hintCursor: (x, y) => showCursor([{ x, y }]),
      beginFill: (p) => setFillState({ p, stage: "typing" }),
      progressFill: (field) => setFillState((s) => (s ? { ...s, currentField: field } : s)),
      readyFill: (p) => setFillState({ p, stage: "ready" }),
    }),
    [parseAndRun, run, showCursor],
  );

  const submitFilled = useCallback(async () => {
    if (!fillState || fillState.stage !== "ready") return;
    setFillState((s) => (s ? { ...s, stage: "saving" } : s));
    try {
      const token = getAuthTokenSync();
      const res = await fetch(`${API_BASE}${fillState.p.submit.path}`, {
        method: fillState.p.submit.method,
        headers: {
          "Content-Type": "application/json",
          "X-Entry-Source": "ai",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: fillState.p.submit.body ? JSON.stringify(fillState.p.submit.body) : undefined,
      });
      if (!res.ok) {
        let msg = `HTTP ${res.status}`;
        try {
          const j = (await res.json()) as { detail?: string };
          msg = j.detail || msg;
        } catch {
          /* ignore */
        }
        throw new Error(msg);
      }
      showToast("Sir, save कर दिया ✓");
      setFillState(null);
      router.back();
    } catch (e) {
      showToast((e as Error).message, "err");
      setFillState((s) => (s ? { ...s, stage: "ready" } : s));
    }
  }, [fillState, router, showToast]);

  const cancelFilled = useCallback(() => {
    setGhostPayload(null);
    setFillState(null);
    router.back();
  }, [router]);

  return (
    <Ctx.Provider value={api}>
      {children}
      <GhostCursor visible={cursorVisible} trail={cursorTrail} />
      <ConfirmModal
        action={pending}
        onCancel={() => setPending(null)}
        onConfirm={confirm}
        busy={busy}
      />
      <GhostFillBanner
        state={fillState}
        onSubmit={submitFilled}
        onCancel={cancelFilled}
      />
      {toast ? (
        <View pointerEvents="none" style={[styles.toastWrap, { top: insets.top + 12 }]}>
          <View style={[styles.toast, toast.kind === "err" && styles.toastErr]}>
            <Ionicons
              name={toast.kind === "err" ? "alert-circle" : "checkmark-circle"}
              size={16}
              color={toast.kind === "err" ? colors.danger : colors.lime}
            />
            <Text style={styles.toastText} numberOfLines={2}>
              {toast.message}
            </Text>
          </View>
        </View>
      ) : null}
    </Ctx.Provider>
  );
}

/**
 * Persistent bottom banner shown while Ghost-Fill is typing a form.
 * Two stages: "typing" (progress) and "ready" (Hindi confirmation with
 * Save / Cancel buttons).
 */
function GhostFillBanner({
  state,
  onSubmit,
  onCancel,
}: {
  state: null | { p: GhostPayload; stage: "typing" | "ready" | "saving"; currentField?: string };
  onSubmit: () => void;
  onCancel: () => void;
}) {
  const insets = useSafeAreaInsets();
  if (!state) return null;
  const isReady = state.stage === "ready";
  const isSaving = state.stage === "saving";
  return (
    <View pointerEvents="box-none" style={[styles.bannerWrap, { bottom: insets.bottom + 12 }]}>
      <View style={styles.banner}>
        <View style={styles.bannerLeft}>
          <View style={[styles.bannerDot, isReady ? styles.bannerDotReady : null]} />
          <View style={{ flex: 1 }}>
            <Text style={styles.bannerTitle}>{state.p.headline}</Text>
            <Text style={styles.bannerSub}>
              {isSaving
                ? "Saving…"
                : isReady
                ? "किशन सर, save करूँ?"
                : `Typing… ${state.currentField ? `(${state.currentField})` : ""}`}
            </Text>
          </View>
        </View>
        {isReady || isSaving ? (
          <View style={styles.bannerActions}>
            <Pressable
              onPress={onCancel}
              disabled={isSaving}
              style={styles.bannerCancel}
              testID="ghost-fill-cancel"
            >
              <Text style={styles.bannerCancelText}>रद्द</Text>
            </Pressable>
            <Pressable
              onPress={onSubmit}
              disabled={isSaving}
              style={[styles.bannerSave, isSaving && { opacity: 0.55 }]}
              testID="ghost-fill-save"
            >
              {isSaving ? (
                <ActivityIndicator color="#000" />
              ) : (
                <>
                  <Ionicons name="checkmark" size={16} color="#000" />
                  <Text style={styles.bannerSaveText}>Save</Text>
                </>
              )}
            </Pressable>
          </View>
        ) : (
          <ActivityIndicator color={colors.lime} />
        )}
      </View>
    </View>
  );
}

function ConfirmModal({
  action,
  onCancel,
  onConfirm,
  busy,
}: {
  action: GhostAction | null;
  onCancel: () => void;
  onConfirm: () => void;
  busy: boolean;
}) {
  const insets = useSafeAreaInsets();
  if (!action) return null;
  const details = actionDetails(action);
  return (
    <Modal visible transparent animationType="fade" onRequestClose={onCancel}>
      <Pressable style={styles.backdrop} onPress={busy ? undefined : onCancel}>
        <Pressable style={styles.card} onPress={(e) => e.stopPropagation()}>
          <View style={styles.cardHead}>
            <View style={styles.cardIcon}>
              <Ionicons name="sparkles" size={16} color={colors.lime} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.cardTitle}>Wingman wants to act</Text>
              <Text style={styles.cardHeadline}>{actionHeadline(action)}</Text>
            </View>
          </View>
          <ScrollView contentContainerStyle={{ padding: spacing.md }} style={styles.cardBody}>
            {details.map(([k, v], i) => (
              <View key={i} style={styles.detailRow}>
                <Text style={styles.detailKey}>{k}</Text>
                <Text style={styles.detailVal}>{v}</Text>
              </View>
            ))}
            <Text style={styles.disclaimer}>
              Sir, kindly confirm — Wingman will execute this on your behalf.
            </Text>
          </ScrollView>
          <View style={[styles.cardFoot, { paddingBottom: insets.bottom + 8 }]}>
            <Pressable onPress={onCancel} disabled={busy} style={[styles.btn, styles.btnGhost]}>
              <Text style={styles.btnGhostText}>Cancel</Text>
            </Pressable>
            <Pressable
              onPress={onConfirm}
              disabled={busy}
              style={[styles.btn, styles.btnPrimary, busy && { opacity: 0.6 }]}
              testID="ghost-confirm"
            >
              {busy ? <ActivityIndicator color="#000" /> : <Text style={styles.btnPrimaryText}>Confirm</Text>}
            </Pressable>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

export function useGhostUser(): GhostUserApi {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useGhostUser must be used inside <GhostUserProvider>");
  return ctx;
}

/** Replace CR/LF/TAB that sit BETWEEN structural JSON tokens with a single
 * space. Skips characters inside "double-quoted" strings so intentional
 * escaped whitespace inside string values is preserved. */
function _sanitizeJsonBlock(raw: string): string {
  let out = "";
  let inString = false;
  let escape = false;
  for (const ch of raw) {
    if (inString) {
      out += ch;
      if (escape) escape = false;
      else if (ch === "\\") escape = true;
      else if (ch === '"') inString = false;
      continue;
    }
    if (ch === '"') {
      inString = true;
      out += ch;
      continue;
    }
    if (ch === "\n" || ch === "\r" || ch === "\t") {
      out += " ";
    } else {
      out += ch;
    }
  }
  return out;
}

/**
 * Normalise a consignment-number-ish string for fuzzy matching.
 * Real IDs look like "SE/26-27/035" but the AI often produces variants
 * like "CN-S/01", "SE 26-27 35", or "se2627035". We strip everything but
 * alphanumerics and lower-case so all of those collapse to `se2627035`
 * (or similar) for comparison.
 */
function _norm(s: string | undefined | null): string {
  return String(s || "").replace(/[^a-z0-9]/gi, "").toLowerCase();
}

type ShipmentLike = { id: string; consignment_no?: string };

/**
 * Try to match a shipment by (in order):
 *   1. Exact id
 *   2. Exact consignment_no (case-insensitive)
 *   3. Normalised consignment_no equality
 *   4. Normalised prefix or suffix match — e.g. "035" resolves to
 *      "SE/26-27/035" because the numeric tail matches.
 */
function _findShipment(shipments: ShipmentLike[], ref: string): ShipmentLike | undefined {
  if (!ref) return undefined;
  const refN = _norm(ref);
  const refLower = ref.toLowerCase();
  const byId = shipments.find((s) => s.id === ref);
  if (byId) return byId;
  const byCn = shipments.find((s) => (s.consignment_no || "").toLowerCase() === refLower);
  if (byCn) return byCn;
  const byNorm = shipments.find((s) => _norm(s.consignment_no) === refN);
  if (byNorm) return byNorm;
  if (refN.length >= 3) {
    const bySuffix = shipments.find((s) => {
      const n = _norm(s.consignment_no);
      return n.endsWith(refN) || n.startsWith(refN);
    });
    if (bySuffix) return bySuffix;
  }
  return undefined;
}

/**
 * Return the top-N shipments whose consignment_no shares the longest
 * common prefix (or contains the numeric tail) with `ref`. Used to build
 * a "did you mean X, Y, Z?" hint when the AI supplies a bad ID.
 */
function _closestShipments(shipments: ShipmentLike[], ref: string, n: number): ShipmentLike[] {
  const refN = _norm(ref);
  if (!refN) return shipments.slice(0, n);
  const scored = shipments.map((s) => {
    const sN = _norm(s.consignment_no);
    let score = 0;
    for (let i = 0; i < Math.min(refN.length, sN.length); i++) {
      if (refN[i] === sN[i]) score++;
      else break;
    }
    const tail = refN.match(/\d+$/)?.[0] || "";
    if (tail && sN.includes(tail)) score += tail.length;
    return { s, score };
  });
  scored.sort((a, b) => b.score - a.score);
  return scored.filter((x) => x.score > 0).slice(0, n).map((x) => x.s);
}


const styles = StyleSheet.create({
  cursorDot: {
    position: "absolute",
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.lime,
    shadowColor: colors.lime,
    shadowOpacity: 1,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 0 },
    elevation: 10,
  },
  cursorHalo: {
    position: "absolute",
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "rgba(0, 209, 255, 0.20)",
    borderColor: colors.lime,
    borderWidth: 1,
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.7)",
    justifyContent: "center",
    alignItems: "center",
    padding: spacing.lg,
  },
  card: {
    width: "100%",
    maxWidth: 400,
    backgroundColor: "#0b0b0b",
    borderRadius: radii.xl,
    borderColor: colors.lime,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: "hidden",
  },
  cardHead: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    padding: spacing.md,
    borderBottomColor: colors.border,
    borderBottomWidth: StyleSheet.hairlineWidth,
    backgroundColor: "rgba(0, 209, 255, 0.05)",
  },
  cardIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.limeGlow,
    alignItems: "center",
    justifyContent: "center",
  },
  cardTitle: {
    color: colors.textDim,
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 0.8,
    textTransform: "uppercase",
  },
  cardHeadline: { color: colors.text, fontSize: 15, fontWeight: "800", marginTop: 2 },
  cardBody: { maxHeight: 300 },
  detailRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 6,
    borderBottomColor: colors.border,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  detailKey: { color: colors.textMuted, fontSize: 12, fontWeight: "700" },
  detailVal: { color: colors.text, fontSize: 13, fontWeight: "600", maxWidth: "60%", textAlign: "right" },
  disclaimer: { color: colors.textDim, fontSize: 11, marginTop: 12, fontStyle: "italic" },
  cardFoot: {
    flexDirection: "row",
    gap: 8,
    padding: spacing.md,
    borderTopColor: colors.border,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  btn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: radii.pill,
    alignItems: "center",
    justifyContent: "center",
  },
  btnGhost: {
    borderColor: colors.border,
    borderWidth: StyleSheet.hairlineWidth,
    backgroundColor: "transparent",
  },
  btnGhostText: { color: colors.textMuted, fontWeight: "700", fontSize: 13 },
  btnPrimary: { backgroundColor: colors.lime },
  btnPrimaryText: { color: "#000", fontWeight: "800", fontSize: 14 },
  toastWrap: {
    position: "absolute",
    left: 0,
    right: 0,
    alignItems: "center",
    zIndex: 10000,
  },
  toast: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: radii.pill,
    backgroundColor: "rgba(15,15,15,0.95)",
    borderColor: colors.lime,
    borderWidth: StyleSheet.hairlineWidth,
    maxWidth: SCREEN_W - 40,
  },
  toastErr: { borderColor: colors.danger },
  toastText: { color: colors.text, fontSize: 13, fontWeight: "600" },
  bannerWrap: {
    position: "absolute",
    left: 12,
    right: 12,
    zIndex: 9999,
  },
  banner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 12,
    borderRadius: radii.xl,
    backgroundColor: "rgba(15,15,20,0.95)",
    borderColor: colors.lime,
    borderWidth: StyleSheet.hairlineWidth,
    shadowColor: colors.lime,
    shadowOpacity: 0.35,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 8 },
    elevation: 12,
  },
  bannerLeft: { flexDirection: "row", alignItems: "center", gap: 10, flex: 1 },
  bannerDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.lime,
    shadowColor: colors.lime,
    shadowOpacity: 0.9,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 0 },
  },
  bannerDotReady: { backgroundColor: colors.ok, shadowColor: colors.ok },
  bannerTitle: { color: colors.text, fontSize: 13, fontWeight: "800" },
  bannerSub: { color: colors.textMuted, fontSize: 11, marginTop: 1 },
  bannerActions: { flexDirection: "row", gap: 8 },
  bannerCancel: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: radii.pill,
    borderColor: colors.borderStrong,
    borderWidth: StyleSheet.hairlineWidth,
  },
  bannerCancelText: { color: colors.textMuted, fontSize: 12, fontWeight: "700" },
  bannerSave: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: radii.pill,
    backgroundColor: colors.lime,
  },
  bannerSaveText: { color: "#000", fontSize: 12, fontWeight: "800" },
});
