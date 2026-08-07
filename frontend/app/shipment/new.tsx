import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { apiGet, apiPost, apiPut } from "@/src/api/client";
import { useApi } from "@/src/api/hooks";
import type { Currency, Direction, Party, Shipment, ShipmentMode } from "@/src/api/types";
import { useRates as useBullionRates } from "@/src/bullion/rates";
import { ItemPicker } from "@/src/components/item-picker";
import { toast } from "@/src/components/toast";
import { colors, radii, spacing } from "@/src/theme";
import { syncShipmentLedger } from "@/src/utils/shipment-ledger-sync";
import {
  fetchWarehouseQueue,
  type WarehouseQueueBag,
} from "@/src/utils/warehouse-queue";

const DIRECTIONS: { key: Direction; label: string }[] = [
  { key: "IN_TO_TH", label: "IN → TH" },
  { key: "TH_TO_IN", label: "TH → IN" },
];
const MODES: ShipmentMode[] = ["air", "sea", "land", "hand_carry"];

export default function NewShipmentScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ editId?: string; fromInvoice?: string }>();
  const editId = params.editId || null;
  const fromInvoiceId = params.fromInvoice || null;
  const isEdit = !!editId;
  const parties = useApi<Party[]>("/api/parties");

  const [consignmentNo, setConsignmentNo] = useState("");
  const [direction, setDirection] = useState<Direction>("IN_TO_TH");
  const [mode, setMode] = useState<ShipmentMode>("air");
  const [origin, setOrigin] = useState("");
  const [destination, setDestination] = useState("");
  const [freight, setFreight] = useState("");
  const [freightCcy, setFreightCcy] = useState<Currency>("THB");
  const [forexRate, setForexRate] = useState("");
  const [carrierId, setCarrierId] = useState<string | null>(null);
  const [notes, setNotes] = useState("");
  const [busy, setBusy] = useState(false);
  const [pickCarrier, setPickCarrier] = useState(false);

  // Per-bag rows: each bag can be assigned to a different customer AND
  // can hold multiple line-items (each with its own qty + unit). This
  // replaces the old top-level "Party / Client" field so multi-customer
  // consignments can be booked in one shot.
  interface BagItemRow {
    item_id: string;
    name: string;
    quantity: string;
    unit: string;
  }
  interface BagRow {
    bag_no: string;         // display only (auto-numbered)
    weight_kg: string;
    end_customer_id: string | null;   // Recipient — who physically receives the bag
    bill_to_party_id: string | null;  // Bill-to — whose ledger is charged for freight
    items: BagItemRow[];
  }
  const [bags, setBags] = useState<BagRow[]>([
    { bag_no: "BAG-001", weight_kg: "", end_customer_id: null, bill_to_party_id: null, items: [] },
  ]);
  const [pickBagIdx, setPickBagIdx] = useState<number | null>(null);
  const [pickBillToIdx, setPickBillToIdx] = useState<number | null>(null);
  const [pickItemBagIdx, setPickItemBagIdx] = useState<number | null>(null);

  // Invoice-driven items: when the shipment form is opened from an invoice,
  // its items become a "pool" the operator distributes across bags. Each
  // entry tracks the target qty (from the invoice) so we can show progress
  // and stop the user from allocating more than what's on the invoice.
  interface InvoiceLine {
    item_id: string | null;
    name: string;
    unit: string;
    quantity: number;    // target — how many pcs/kg/etc. are on the invoice
  }
  const [invoiceLines, setInvoiceLines] = useState<InvoiceLine[]>([]);
  // Which invoice line is being distributed right now — null means the
  // distribution sheet is closed. The sheet asks "how many to which bag?".
  const [distributeIdx, setDistributeIdx] = useState<number | null>(null);
  const [distributeQty, setDistributeQty] = useState("");
  const [distributeBagIdx, setDistributeBagIdx] = useState<number | null>(null);

  const customers = useMemo(
    () => (parties.data || []).filter((p) => p.role === "customer"),
    [parties.data],
  );
  const carriers = useMemo(
    () => (parties.data || []).filter((p) => p.role === "carrier" || p.role === "vendor"),
    [parties.data],
  );

  const currentCarrier = (parties.data || []).find((p) => p.id === carrierId);
  const totalBagWeight = useMemo(
    () => bags.reduce((s, b) => s + (parseFloat(b.weight_kg) || 0), 0),
    [bags],
  );

  // ---- Auto freight calculation ----------------------------------------
  // For each bag: convert the Bill-to party's `default_charge` (per-kg)
  // into the shipment's freight currency (using forex_rate when needed),
  // multiply by bag weight, and sum. `freightManuallyEdited` lets the user
  // override the auto value; a subtle "Use auto" chip below the input
  // lets them get back on the rails.
  const [freightManuallyEdited, setFreightManuallyEdited] = useState(false);
  const partyMap = useMemo(() => {
    const map = new Map<string, Party>();
    (parties.data || []).forEach((p) => map.set(p.id, p));
    return map;
  }, [parties.data]);

  const convertRateToFreightCcy = (
    rate: number,
    rateCcy: Currency,
    fx: number,
  ): number => {
    if (!rate || rate <= 0) return 0;
    if (rateCcy === freightCcy) return rate;
    // forex rate is INR per THB (as labelled in the form).
    if (!fx || fx <= 0) return 0;
    if (rateCcy === "INR" && freightCcy === "THB") return rate / fx;
    if (rateCcy === "THB" && freightCcy === "INR") return rate * fx;
    return 0;
  };

  // Per-bag freight breakdown (kept as an array so the UI can show
  // "12 kg × 145 THB/kg = 1,740 THB" beside each bag row).
  const bagFreightBreakdown = useMemo(() => {
    const fx = parseFloat(forexRate) || 0;
    return bags.map((b) => {
      const weight = parseFloat(b.weight_kg) || 0;
      const party = b.bill_to_party_id ? partyMap.get(b.bill_to_party_id) : undefined;
      const rawRate = party?.default_charge || 0;
      const rateCcy = (party?.default_charge_currency as Currency) || "INR";
      const rateInFreightCcy = convertRateToFreightCcy(rawRate, rateCcy, fx);
      const amount = Math.round(weight * rateInFreightCcy * 100) / 100;
      return {
        weight,
        rawRate,
        rateCcy,
        rateInFreightCcy,
        amount,
        hasRate: rawRate > 0 && (rateCcy === freightCcy || (fx > 0)),
        partyName: party?.name || null,
      };
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bags, partyMap, freightCcy, forexRate]);

  const autoFreight = useMemo(
    () => bagFreightBreakdown.reduce((s, b) => s + (b.amount || 0), 0),
    [bagFreightBreakdown],
  );
  const autoFreightStr = autoFreight > 0
    ? String(Math.round(autoFreight * 100) / 100)
    : "";

  // Sync `freight` input to the auto value whenever the user hasn't
  // explicitly overridden it. Also runs on freightCcy / bag changes.
  useEffect(() => {
    if (freightManuallyEdited) return;
    if (autoFreightStr === freight) return;
    setFreight(autoFreightStr);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoFreightStr, freightManuallyEdited]);

  // ---- Auto carrier-pay calculation ------------------------------------
  // For hand-carry shipments, the global Bullion "Hand-carry rate (INR/kg)"
  // is applied to the total bag weight to produce a proposed carrier
  // payout. The value stays fully editable — a "Use auto" chip appears
  // whenever the user overrides so they can snap back to the computed
  // amount. Non-hand-carry modes fall back to a manual entry (rate = 0).
  const bullionRates = useBullionRates();
  const [carrierPay, setCarrierPay] = useState("");
  const [carrierPayManuallyEdited, setCarrierPayManuallyEdited] = useState(false);

  const carrierRatePerKgINR = mode === "hand_carry"
    ? Number(bullionRates.data.hand_carry_rate_inr_per_kg) || 0
    : 0;
  const autoCarrierPayINR = carrierId
    ? Math.round(carrierRatePerKgINR * totalBagWeight * 100) / 100
    : 0;
  const autoCarrierPayStr = autoCarrierPayINR > 0 ? String(autoCarrierPayINR) : "";

  useEffect(() => {
    if (carrierPayManuallyEdited) return;
    if (autoCarrierPayStr === carrierPay) return;
    setCarrierPay(autoCarrierPayStr);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoCarrierPayStr, carrierPayManuallyEdited]);

  // ---- Live margin (Freight - Carrier Pay, in freight currency) --------
  // Carrier pay is stored in INR; freight can be INR or THB. Convert the
  // carrier side into the freight currency using `forex_rate` before
  // subtracting so the profit reflects a single-currency P&L.
  const marginBreakdown = useMemo(() => {
    const freightNum = Number(freight) || 0;
    const carrierINR = Number(carrierPay) || 0;
    const fx = Number(forexRate) || 0;
    let carrierInFreightCcy = carrierINR;
    if (freightCcy === "THB") {
      // freight in THB, carrier in INR → THB = INR / fx (fx = INR/THB)
      carrierInFreightCcy = fx > 0 ? carrierINR / fx : 0;
    }
    const margin = freightNum - carrierInFreightCcy;
    return {
      freight: freightNum,
      carrierINR,
      carrierInFreightCcy: Math.round(carrierInFreightCcy * 100) / 100,
      margin: Math.round(margin * 100) / 100,
      hasFx: freightCcy === "INR" || fx > 0,
    };
  }, [freight, carrierPay, forexRate, freightCcy]);

  // Bag-row mutators
  const addBag = () => {
    setBags((prev) => [
      ...prev,
      {
        bag_no: `BAG-${String(prev.length + 1).padStart(3, "0")}`,
        weight_kg: "",
        end_customer_id: null,
        bill_to_party_id: null,
        items: [],
      },
    ]);
  };
  const removeBag = (idx: number) => {
    setBags((prev) => {
      if (prev.length <= 1) return prev;
      const next = prev.slice(0, idx).concat(prev.slice(idx + 1));
      return next.map((b, i) => ({ ...b, bag_no: `BAG-${String(i + 1).padStart(3, "0")}` }));
    });
  };
  const patchBag = (idx: number, patch: Partial<BagRow>) => {
    setBags((prev) => prev.map((b, i) => (i === idx ? { ...b, ...patch } : b)));
  };

  // ---- Warehouse FIFO queue --------------------------------------------
  // Bags currently sitting under other pending shipments are surfaced
  // here so the operator can pull the oldest lots first (FIFO). Picking
  // a bag copies its weight / items / customer into a new row on this
  // shipment; on save, the bag is re-assigned to the current shipment
  // via PUT so the source lot is emptied. Only shown in edit mode where
  // we already have a real shipment_id to reassign into.
  const [warehouseQueue, setWarehouseQueue] = useState<WarehouseQueueBag[]>([]);
  const [showWarehouseQueue, setShowWarehouseQueue] = useState(false);
  const [warehouseLoading, setWarehouseLoading] = useState(false);
  // Bags we've claimed during this session — persisted to backend on
  // save so we can move them from their source shipment.
  const [claimedBagIds, setClaimedBagIds] = useState<{ bagId: string; sourceShipmentId: string }[]>([]);

  const loadWarehouseQueue = async () => {
    setWarehouseLoading(true);
    try {
      const q = await fetchWarehouseQueue(editId);
      // Filter out bags we've already claimed this session
      const claimedSet = new Set(claimedBagIds.map((c) => c.bagId));
      setWarehouseQueue(q.filter((b) => !claimedSet.has(b.id)));
      setShowWarehouseQueue(true);
    } catch (e) {
      toast.error(`Failed to load warehouse queue: ${(e as Error).message}`);
    } finally {
      setWarehouseLoading(false);
    }
  };

  const claimFromWarehouse = (wb: WarehouseQueueBag) => {
    // Materialize the bag as a new row on the current shipment.
    setBags((prev) => {
      const nextNo = `BAG-${String(prev.length + 1).padStart(3, "0")}`;
      const items = (wb.items || []).map((it) => ({
        item_id: (it as unknown as { item_id?: string }).item_id || "",
        name: (it.name || it.description || "item"),
        quantity: String(it.quantity ?? "1"),
        unit: it.unit || "pcs",
      }));
      return [
        ...prev,
        {
          bag_no: nextNo,
          weight_kg: String(wb.weight_kg || ""),
          end_customer_id: wb.end_customer_id || null,
          bill_to_party_id: wb.bill_to_party_id || null,
          items,
        },
      ];
    });
    setClaimedBagIds((prev) => [
      ...prev,
      { bagId: wb.id, sourceShipmentId: wb.from_shipment_id },
    ]);
    setWarehouseQueue((prev) => prev.filter((b) => b.id !== wb.id));
    toast.success(`${wb.bag_no} pulled from ${wb.from_consignment_no}`);
  };

  const addItemToBag = (idx: number, item: { id: string; name: string; unit: string }) => {
    setBags((prev) => prev.map((b, i) =>
      i === idx
        ? { ...b, items: [...b.items, { item_id: item.id, name: item.name, quantity: "1", unit: item.unit || "pcs" }] }
        : b,
    ));
  };
  const removeItemFromBag = (bagIdx: number, itemIdx: number) => {
    setBags((prev) => prev.map((b, i) =>
      i === bagIdx ? { ...b, items: b.items.filter((_, j) => j !== itemIdx) } : b,
    ));
  };
  const patchItemInBag = (bagIdx: number, itemIdx: number, patch: Partial<BagItemRow>) => {
    setBags((prev) => prev.map((b, i) =>
      i === bagIdx
        ? { ...b, items: b.items.map((it, j) => (j === itemIdx ? { ...it, ...patch } : it)) }
        : b,
    ));
  };

  // ---- Invoice-item distribution helpers -------------------------------
  // For each invoice line, sum up how many pcs/units have already been
  // dropped into bags. Matching is by item_id when the invoice line is
  // linked to the catalog; otherwise by (name, unit) so custom lines with
  // no catalog link still track properly.
  const invoiceAllocations = useMemo(() => {
    return invoiceLines.map((line) => {
      let allocated = 0;
      const matches: { bagIdx: number; itemIdx: number; qty: number }[] = [];
      bags.forEach((b, bIdx) => {
        b.items.forEach((it, iIdx) => {
          const sameById = line.item_id && it.item_id && line.item_id === it.item_id;
          const sameByName =
            !line.item_id &&
            !it.item_id &&
            it.name.trim().toLowerCase() === line.name.trim().toLowerCase() &&
            (it.unit || "pcs") === (line.unit || "pcs");
          if (sameById || sameByName) {
            const q = Number(it.quantity) || 0;
            allocated += q;
            matches.push({ bagIdx: bIdx, itemIdx: iIdx, qty: q });
          }
        });
      });
      const remaining = Math.max(0, line.quantity - allocated);
      const pct = line.quantity > 0 ? Math.min(100, (allocated / line.quantity) * 100) : 0;
      return { allocated, remaining, pct, matches };
    });
  }, [invoiceLines, bags]);

  // Push (or top-up) an invoice line into a specific bag. If the same
  // catalog item already exists in the target bag, increment its qty
  // instead of adding a duplicate row.
  const distributeInvoiceLine = (lineIdx: number, bagIdx: number, qty: number) => {
    if (!Number.isFinite(qty) || qty <= 0) {
      toast.warn("Enter a positive quantity");
      return;
    }
    const line = invoiceLines[lineIdx];
    const alloc = invoiceAllocations[lineIdx];
    if (!line || !alloc) return;
    if (qty > alloc.remaining + 0.0001) {
      toast.warn(
        `Only ${alloc.remaining} ${line.unit} of ${line.name} left to distribute`,
      );
      return;
    }
    setBags((prev) => prev.map((b, i) => {
      if (i !== bagIdx) return b;
      // Look for an existing row for the same line in this bag.
      const existingIdx = b.items.findIndex((it) => {
        if (line.item_id && it.item_id) return it.item_id === line.item_id;
        return (
          !line.item_id &&
          !it.item_id &&
          it.name.trim().toLowerCase() === line.name.trim().toLowerCase() &&
          (it.unit || "pcs") === (line.unit || "pcs")
        );
      });
      if (existingIdx >= 0) {
        const nextItems = b.items.slice();
        const cur = Number(nextItems[existingIdx].quantity) || 0;
        nextItems[existingIdx] = {
          ...nextItems[existingIdx],
          quantity: String(cur + qty),
        };
        return { ...b, items: nextItems };
      }
      return {
        ...b,
        items: [
          ...b.items,
          {
            item_id: line.item_id || "",
            name: line.name,
            quantity: String(qty),
            unit: line.unit || "pcs",
          },
        ],
      };
    }));
    toast.success(`${qty} ${line.unit} → ${bags[bagIdx]?.bag_no || "bag"}`);
  };

  // Prefill fields when in edit mode. Loads once when the screen mounts.
  useEffect(() => {
    if (editId) return; // handled by dedicated edit effect below
    if (!fromInvoiceId) return;
    let cancelled = false;
    (async () => {
      try {
        // No single-invoice GET on the remote backend, so pull the list
        // and pluck the one we need.
        const list = await apiGet<{
          id: string;
          number: string;
          party_id?: string | null;
          currency?: string;
          total?: number;
          notes?: string;
          items?: {
            description?: string;
            quantity?: number;
            unit?: string;
            rate?: number;
            item_id?: string | null;
          }[];
        }[]>("/api/invoices");
        const inv = list.find((x) => x.id === fromInvoiceId);
        if (!inv || cancelled) return;
        setConsignmentNo(inv.number || "");
        setFreight(String(inv.total ?? ""));
        setFreightManuallyEdited(true);
        setFreightCcy(((inv.currency as Currency) || "THB"));
        if (inv.notes) setNotes(inv.notes);
        // Seed a single bag pre-filled with the invoice's party as the
        // primary bill-to so per-bag ledger fan-out works out of the box.
        if (inv.party_id) {
          setBags((prev) => prev.map((b, i) => (i === 0 ? { ...b, bill_to_party_id: inv.party_id || null } : b)));
        }
        // Materialize invoice items as the distribution pool.
        const seededLines: InvoiceLine[] = (inv.items || [])
          .filter((it) => (it.description || "").trim().length > 0)
          .map((it) => ({
            item_id: it.item_id || null,
            name: (it.description || "").trim(),
            unit: it.unit || "pcs",
            quantity: Number(it.quantity) || 0,
          }));
        setInvoiceLines(seededLines);
        toast.info(
          seededLines.length
            ? `Prefilled ${inv.number} — ${seededLines.length} item${seededLines.length === 1 ? "" : "s"} ready to distribute`
            : `Prefilled from invoice ${inv.number}`,
        );
      } catch (e) {
        console.warn("Invoice prefill failed:", (e as Error).message);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [fromInvoiceId, editId]);

  // Prefill fields when in edit mode. Loads once when the screen mounts.
  useEffect(() => {
    if (!editId) return;
    let cancelled = false;
    (async () => {
      try {
        const s = await apiGet<Shipment>(`/api/shipments/${editId}`);
        if (cancelled) return;
        setConsignmentNo(s.consignment_no || "");
        setDirection((s.direction as Direction) || "IN_TO_TH");
        setMode((s.mode as ShipmentMode) || "air");
        setOrigin(s.origin || "");
        setDestination(s.destination || "");
        setFreight(String(s.freight ?? ""));
        // Preserve the saved freight verbatim on edit. Users can hit
        // "Use auto" if they want to recompute from bag rates.
        setFreightManuallyEdited(true);
        setFreightCcy((s.freight_currency as Currency) || "THB");
        setForexRate(String(s.forex_rate ?? ""));
        setCarrierId(s.carrier_party_id || null);
        // Hydrate carrier pay. If backend stored per_kg, materialize the
        // total; otherwise use the flat value. Mark as manually edited so
        // we don't clobber the saved amount on mount.
        {
          const cc = Number(s.carrier_charge) || 0;
          const materialized = s.carrier_charge_type === "per_kg"
            ? Math.round(cc * (Number(s.weight_kg) || 0) * 100) / 100
            : cc;
          setCarrierPay(materialized > 0 ? String(materialized) : "");
          setCarrierPayManuallyEdited(true);
        }
        setNotes(s.notes || "");
        // Load existing bags into the per-bag editor.
        try {
          const rawBags = await apiGet<{ id: string; bag_no: string; weight_kg: number; end_customer_id: string | null; bill_to_party_id?: string | null; items?: { item_id: string; name: string; quantity: number; unit: string }[] }[]>(
            `/api/shipments/${editId}/bags`,
          );
          if (!cancelled && Array.isArray(rawBags) && rawBags.length > 0) {
            setBags(
              rawBags.map((b, i) => ({
                bag_no: b.bag_no || `BAG-${String(i + 1).padStart(3, "0")}`,
                weight_kg: String(b.weight_kg ?? ""),
                end_customer_id: b.end_customer_id || null,
                bill_to_party_id: b.bill_to_party_id || s.party_id || null,
                items: (b.items || []).map((it) => ({
                  item_id: it.item_id,
                  name: it.name,
                  quantity: String(it.quantity ?? ""),
                  unit: it.unit || "pcs",
                })),
              })),
            );
          }
        } catch {
          // best effort — leave the default single-row placeholder
        }
      } catch (e) {
        toast.error(`Failed to load: ${(e as Error).message}`);
      }
    })();
    return () => { cancelled = true; };
  }, [editId]);

  const submit = async () => {
    if (!consignmentNo.trim()) {
      toast.warn("Consignment number is required");
      return;
    }
    // Every bag must be assigned to a Bill-to party (that's whose ledger
    // is charged for freight + carrier fees). Recipient is optional (may
    // be entered later).
    const firstBillTo = bags.find((b) => !!b.bill_to_party_id);
    if (!firstBillTo) {
      toast.warn("Assign each bag a Party (Bill-to)");
      return;
    }
    setBusy(true);
    try {
      // Shipment's primary `party_id` = the first bag's Bill-to. This is
      // whose ledger will be charged for freight & carrier fees.
      const primaryPartyId = firstBillTo.bill_to_party_id!;
      const totalBags = bags.length;
      const totalWeightKg = bags.reduce((s, b) => s + (parseFloat(b.weight_kg) || 0), 0);
      const shipmentPayload = {
        consignment_no: consignmentNo.trim(),
        party_id: primaryPartyId,
        direction,
        mode,
        origin,
        destination,
        bag_count: totalBags,
        weight_kg: totalWeightKg,
        freight: Number(freight) || 0,
        freight_currency: freightCcy,
        forex_rate: Number(forexRate) || 0,
        carrier_party_id: carrierId,
        // Carrier pay is stored as a flat INR total so the ledger entry
        // (in `shipment-ledger-sync`) matches the "You Pay Carrier" value
        // the user actually saw and confirmed.
        carrier_charge: Number(carrierPay) || 0,
        carrier_charge_type: "flat",
        carrier_currency: "INR",
        status: "pending",
        dispatch_date: new Date().toISOString().slice(0, 10),
        notes,
      };
      const saved = isEdit
        ? await apiPut<Shipment>(`/api/shipments/${editId}`, shipmentPayload)
        : await apiPost<Shipment>("/api/shipments", shipmentPayload);
      if ((saved as { queued?: boolean }).queued) {
        toast.info(`Queued • ${consignmentNo.trim()} will sync when online`);
        router.back();
        return;
      }

      // Once the shipment exists, sync bag-level details. The backend
      // auto-creates N empty bags on shipment create/update; we PUT each
      // one with its customer + weight so the ledger + FIFO planner have
      // per-bag data.
      //
      // ADDITIONALLY: if the operator has claimed bags from the
      // Warehouse queue (bags belonging to other pending shipments), we
      // first move each one to this shipment by PUTting `shipment_id`.
      // Then when we fetch live bags they'll include the newly moved
      // rows and the customer/weight sync below will hit them.
      const targetShipmentId = (saved as { id?: string }).id || editId || "";
      const sourceShipmentIds = new Set<string>();
      if (targetShipmentId && claimedBagIds.length > 0) {
        for (const c of claimedBagIds) {
          if (c.sourceShipmentId === targetShipmentId) continue;
          try {
            await apiPut(`/api/bags/${c.bagId}`, { shipment_id: targetShipmentId });
            sourceShipmentIds.add(c.sourceShipmentId);
          } catch (e) {
            console.warn(
              `Warehouse claim failed for bag ${c.bagId}:`,
              (e as Error).message,
            );
          }
        }
      }

      let liveBags: { id: string }[] = [];
      try {
        liveBags = await apiGet<{ id: string; bag_no: string }[]>(
          `/api/shipments/${saved.id}/bags`,
        );
      } catch {
        liveBags = [];
      }
      const bagUpdates = liveBags.slice(0, bags.length).map((lb, i) => {
        const row = bags[i];
        return apiPut(`/api/bags/${lb.id}`, {
          end_customer_id: row.end_customer_id,
          bill_to_party_id: row.bill_to_party_id,
          weight_kg: parseFloat(row.weight_kg) || 0,
          items: row.items.map((it) => ({
            item_id: it.item_id,
            name: it.name,
            quantity: parseFloat(it.quantity) || 0,
            unit: it.unit,
          })),
        }).catch((e) => {
          console.warn(`Bag ${i + 1} update failed:`, (e as Error).message);
        });
      });
      await Promise.all(bagUpdates);

      // Freight + carrier ledger re-sync: the backend only creates ledger
      // entries on shipment POST (once) and against a single global
      // `party_id`. It never re-syncs on PUT and can't split freight per
      // bill-to. Do the fan-out client-side using the *fresh* shipment
      // record from the backend (so carrier_charge / type / currency /
      // dispatch_date / forex_rate stay accurate).
      const savedShipment = saved as Shipment & { id?: string };
      const shipmentIdForSync = savedShipment.id || editId || "";
      if (shipmentIdForSync) {
        try {
          await syncShipmentLedger(
            {
              id: shipmentIdForSync,
              consignment_no: savedShipment.consignment_no || consignmentNo.trim(),
              origin: savedShipment.origin || origin,
              destination: savedShipment.destination || destination,
              freight: Number(savedShipment.freight ?? freight) || 0,
              freight_currency: (savedShipment.freight_currency || freightCcy) as string,
              carrier_party_id: savedShipment.carrier_party_id ?? carrierId,
              // The frontend now materializes carrier pay as a flat INR
              // total on submit. Use the fresh backend value so the ledger
              // entry mirrors exactly what was persisted.
              carrier_charge: Number(savedShipment.carrier_charge ?? carrierPay) || 0,
              carrier_charge_type: (savedShipment.carrier_charge_type || "flat") as string,
              carrier_currency: (savedShipment.carrier_currency || "INR") as string,
              dispatch_date: savedShipment.dispatch_date || shipmentPayload.dispatch_date,
              weight_kg: Number(savedShipment.weight_kg) || totalWeightKg,
            },
            bags.map((b) => ({
              bag_no: b.bag_no,
              bill_to_party_id: b.bill_to_party_id,
              weight_kg: parseFloat(b.weight_kg) || 0,
            })),
          );
        } catch (e) {
          console.warn("Ledger fan-out failed:", (e as Error).message);
        }
      }

      // If we pulled bags out of other pending lots, re-sync their
      // ledgers too so the freight fan-out reflects the new (smaller)
      // total weight on the source. Fire-and-forget — a failure here
      // doesn't invalidate our own save.
      if (sourceShipmentIds.size > 0) {
        void (async () => {
          for (const srcId of sourceShipmentIds) {
            try {
              const src = await apiGet<Shipment>(`/api/shipments/${srcId}`);
              const srcBags = await apiGet<{ id: string; bag_no: string; weight_kg: number; bill_to_party_id?: string | null }[]>(
                `/api/shipments/${srcId}/bags`,
              );
              await syncShipmentLedger(
                {
                  id: srcId,
                  consignment_no: src.consignment_no,
                  origin: src.origin,
                  destination: src.destination,
                  freight: Number(src.freight) || 0,
                  freight_currency: (src.freight_currency || "THB") as string,
                  carrier_party_id: src.carrier_party_id,
                  carrier_charge: Number(src.carrier_charge) || 0,
                  carrier_charge_type: (src.carrier_charge_type || "flat") as string,
                  carrier_currency: (src.carrier_currency || "INR") as string,
                  dispatch_date: src.dispatch_date,
                  weight_kg: Number(src.weight_kg) || 0,
                },
                (srcBags || []).map((b) => ({
                  bag_no: b.bag_no,
                  bill_to_party_id: b.bill_to_party_id || null,
                  weight_kg: b.weight_kg,
                })),
              );
            } catch (e) {
              console.warn(
                `Source ledger re-sync failed for ${srcId}:`,
                (e as Error).message,
              );
            }
          }
        })();
      }

      toast.success(
        isEdit
          ? `Shipment ${consignmentNo.trim()} updated · ${totalBags} bag${totalBags === 1 ? "" : "s"}`
          : `Shipment ${consignmentNo.trim()} saved · ${totalBags} bag${totalBags === 1 ? "" : "s"}`,
      );
      router.back();
    } catch (e) {
      toast.error(`Save failed: ${(e as Error).message}`);
    } finally {
      setBusy(false);
    }
  };

  return (
    <SafeAreaView edges={["top"]} style={styles.safe}>
      <View style={styles.headBar}>
        <TouchableOpacity onPress={() => router.back()} style={styles.iconBtn}>
          <Ionicons name="close" size={22} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.headTitle}>{isEdit ? "Edit shipment" : "New shipment"}</Text>
        <TouchableOpacity onPress={submit} disabled={busy} style={styles.saveBtn} testID="save-shipment-btn">
          <Text style={styles.saveText}>{busy ? "Saving…" : "Save"}</Text>
        </TouchableOpacity>
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={{ flex: 1 }}
      >
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          <Field label="Consignment #">
            <TextInput
              style={styles.input}
              placeholder="CN-1006"
              placeholderTextColor={colors.textDim}
              value={consignmentNo}
              onChangeText={setConsignmentNo}
              autoCapitalize="characters"
              testID="input-consignment"
            />
          </Field>

          <Field label="Direction">
            <SegRow options={DIRECTIONS.map((d) => ({ key: d.key, label: d.label }))} value={direction} onChange={(v) => setDirection(v as Direction)} />
          </Field>

          <Field label="Mode">
            <SegRow
              options={MODES.map((m) => ({ key: m, label: m.replace("_", " ") }))}
              value={mode}
              onChange={(v) => setMode(v as ShipmentMode)}
            />
          </Field>

          <View style={styles.row2}>
            <View style={{ flex: 1 }}>
              <Field label="Origin">
                <TextInput style={styles.input} placeholder="Kolkata" placeholderTextColor={colors.textDim} value={origin} onChangeText={setOrigin} />
              </Field>
            </View>
            <View style={{ width: 12 }} />
            <View style={{ flex: 1 }}>
              <Field label="Destination">
                <TextInput style={styles.input} placeholder="Bangkok" placeholderTextColor={colors.textDim} value={destination} onChangeText={setDestination} />
              </Field>
            </View>
          </View>

          {/* Bag details — each bag independently assigned to a customer */}
          <Field label={`Bag details · ${bags.length} bag${bags.length === 1 ? "" : "s"} · ${totalBagWeight ? totalBagWeight.toFixed(1) : "0"} kg total`}>
            {/* Invoice-driven distribution panel — surfaces the invoice's
                line items so the operator can allocate qty into bags one
                chunk at a time (e.g. 30 pcs into BAG-001, 70 into BAG-002).
                Only visible when we came from an invoice + we found items. */}
            {invoiceLines.length > 0 ? (
              <View style={styles.invPoolBox}>
                <View style={styles.invPoolHead}>
                  <Ionicons name="receipt-outline" size={14} color={colors.lime} />
                  <Text style={styles.invPoolTitle}>Invoice items to distribute</Text>
                </View>
                <Text style={styles.invPoolHint}>
                  Tap an item to allocate a quantity into a specific bag.
                </Text>
                {invoiceLines.map((line, lIdx) => {
                  const alloc = invoiceAllocations[lIdx];
                  const done = alloc.remaining <= 0.0001;
                  return (
                    <View key={lIdx} style={styles.invLineRow}>
                      <View style={{ flex: 1 }}>
                        <View style={styles.invLineTop}>
                          <Text style={styles.invLineName} numberOfLines={1}>
                            {line.name}
                          </Text>
                          <Text
                            style={[
                              styles.invLineCount,
                              done ? styles.invLineCountDone : null,
                            ]}
                          >
                            {alloc.allocated} / {line.quantity} {line.unit}
                          </Text>
                        </View>
                        <View style={styles.invProgressTrack}>
                          <View
                            style={[
                              styles.invProgressFill,
                              { width: `${alloc.pct}%` },
                              done ? styles.invProgressFillDone : null,
                            ]}
                          />
                        </View>
                      </View>
                      <TouchableOpacity
                        onPress={() => {
                          setDistributeIdx(lIdx);
                          setDistributeQty(String(Math.max(0, alloc.remaining)));
                          setDistributeBagIdx(
                            bags.length > 0 ? bags.length - 1 : 0,
                          );
                        }}
                        disabled={done}
                        style={[
                          styles.invAllocBtn,
                          done && styles.invAllocBtnDone,
                        ]}
                        testID={`inv-line-alloc-${lIdx}`}
                      >
                        <Ionicons
                          name={done ? "checkmark" : "add"}
                          size={16}
                          color={done ? colors.textDim : colors.bg}
                        />
                      </TouchableOpacity>
                    </View>
                  );
                })}
              </View>
            ) : null}

            {/* Warehouse FIFO queue affordance — surfaces older pending
                bags across other shipments so they can be pulled into
                this lot first. Only worth surfacing on edit (need a real
                shipment_id to move bags into) and only if there's
                something waiting. */}
            {isEdit ? (
              <TouchableOpacity
                style={styles.warehouseBtn}
                onPress={loadWarehouseQueue}
                disabled={warehouseLoading}
                testID="open-warehouse-queue"
              >
                <Ionicons name="cube-outline" size={14} color={colors.lime} />
                <Text style={styles.warehouseBtnText}>
                  {warehouseLoading
                    ? "Loading warehouse…"
                    : "🏬 Pull from warehouse (FIFO)"}
                </Text>
              </TouchableOpacity>
            ) : null}
            <View style={{ gap: 10, marginTop: isEdit ? 10 : 0 }}>
              {bags.map((b, idx) => {
                const cust = (parties.data || []).find((p) => p.id === b.end_customer_id);
                const billTo = (parties.data || []).find((p) => p.id === b.bill_to_party_id);
                const bagCalc = bagFreightBreakdown[idx];
                return (
                  <View key={idx} style={styles.bagCard}>
                    <View style={styles.bagCardHead}>
                      <Text style={styles.bagCardNo}>{b.bag_no}</Text>
                      {bags.length > 1 ? (
                        <TouchableOpacity onPress={() => removeBag(idx)} testID={`remove-bag-${idx}`}>
                          <Ionicons name="trash-outline" size={16} color={colors.danger} />
                        </TouchableOpacity>
                      ) : null}
                    </View>
                    <View style={styles.row2}>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.bagFieldLbl}>Weight (kg)</Text>
                        <TextInput
                          style={styles.input}
                          keyboardType="decimal-pad"
                          value={b.weight_kg}
                          onChangeText={(t) => patchBag(idx, { weight_kg: t })}
                          placeholder="0"
                          placeholderTextColor={colors.textDim}
                          testID={`bag-weight-${idx}`}
                        />
                      </View>
                    </View>

                    <View style={{ marginTop: 8 }}>
                      <Text style={styles.bagFieldLbl}>Party (Bill-to)</Text>
                      <TouchableOpacity
                        style={styles.selectBtn}
                        onPress={() => setPickBillToIdx(idx)}
                        testID={`bag-billto-${idx}`}
                      >
                        <View style={{ flex: 1 }}>
                          <Text style={[styles.selectText, !billTo && styles.selectPh]} numberOfLines={1}>
                            {billTo?.name || "Choose the bill-to party"}
                          </Text>
                          {billTo ? (
                            (billTo.default_charge || 0) > 0 ? (
                              <Text style={styles.rateChip}>
                                {billTo.default_charge}{" "}
                                {billTo.default_charge_currency || billTo.default_currency}/kg
                              </Text>
                            ) : (
                              <Text style={styles.rateChipMissing}>No default rate set</Text>
                            )
                          ) : null}
                        </View>
                        <Ionicons name="chevron-down" size={14} color={colors.textDim} />
                      </TouchableOpacity>
                    </View>

                    {bagCalc && bagCalc.amount > 0 ? (
                      <View style={styles.bagCalcRow}>
                        <Ionicons name="calculator-outline" size={12} color={colors.lime} />
                        <Text style={styles.bagCalcText}>
                          {bagCalc.weight} kg × {Math.round(bagCalc.rateInFreightCcy * 100) / 100}{" "}
                          {freightCcy}/kg = {bagCalc.amount} {freightCcy}
                        </Text>
                      </View>
                    ) : bagCalc && bagCalc.weight > 0 && bagCalc.rawRate > 0 && !bagCalc.hasRate ? (
                      <View style={styles.bagCalcRow}>
                        <Ionicons name="warning-outline" size={12} color={colors.warn || colors.danger} />
                        <Text style={styles.bagCalcWarn}>
                          Set a forex rate to auto-calc across currencies
                        </Text>
                      </View>
                    ) : null}

                    <View style={{ marginTop: 8 }}>
                      <Text style={styles.bagFieldLbl}>End Customer (Recipient)</Text>
                      <TouchableOpacity
                        style={styles.selectBtn}
                        onPress={() => setPickBagIdx(idx)}
                        testID={`bag-party-${idx}`}
                      >
                        <Text style={[styles.selectText, !cust && styles.selectPh]} numberOfLines={1}>
                          {cust?.name || "Choose the recipient"}
                        </Text>
                        <Ionicons name="chevron-down" size={14} color={colors.textDim} />
                      </TouchableOpacity>
                    </View>

                    {/* Item lines inside this bag */}
                    <Text style={styles.bagFieldLbl}>Items in this bag</Text>
                    {b.items.length === 0 ? (
                      <Text style={styles.noItems}>No items yet — add contents below.</Text>
                    ) : (
                      b.items.map((it, iIdx) => (
                        <View key={iIdx} style={styles.itemLine}>
                          <View style={{ flex: 1 }}>
                            <Text style={styles.itemName} numberOfLines={1}>{it.name}</Text>
                            <View style={styles.itemMetaRow}>
                              <TextInput
                                style={styles.qtyInput}
                                keyboardType="decimal-pad"
                                value={it.quantity}
                                onChangeText={(t) => patchItemInBag(idx, iIdx, { quantity: t })}
                                placeholder="0"
                                placeholderTextColor={colors.textDim}
                                testID={`item-qty-${idx}-${iIdx}`}
                              />
                              <Text style={styles.itemUnit}>{it.unit}</Text>
                            </View>
                          </View>
                          <TouchableOpacity onPress={() => removeItemFromBag(idx, iIdx)}>
                            <Ionicons name="close-circle" size={18} color={colors.textDim} />
                          </TouchableOpacity>
                        </View>
                      ))
                    )}
                    <TouchableOpacity
                      style={styles.addItemBtn}
                      onPress={() => setPickItemBagIdx(idx)}
                      testID={`add-item-${idx}`}
                    >
                      <Ionicons name="add-circle-outline" size={14} color={colors.lime} />
                      <Text style={styles.addItemTxt}>Add item</Text>
                    </TouchableOpacity>
                  </View>
                );
              })}
              <TouchableOpacity style={styles.addBagBtn} onPress={addBag} testID="add-bag-btn">
                <Ionicons name="add" size={16} color={colors.lime} />
                <Text style={styles.addBagText}>Add another bag</Text>
              </TouchableOpacity>
            </View>
          </Field>

          <View style={styles.row2}>
            <View style={{ flex: 1 }}>
              <Field label="Freight">
                <TextInput
                  style={styles.input}
                  keyboardType="decimal-pad"
                  value={freight}
                  onChangeText={(t) => {
                    setFreight(t);
                    setFreightManuallyEdited(true);
                  }}
                  placeholder="0"
                  placeholderTextColor={colors.textDim}
                  testID="input-freight"
                />
                {autoFreight > 0 ? (
                  freightManuallyEdited ? (
                    <TouchableOpacity
                      onPress={() => {
                        setFreightManuallyEdited(false);
                        setFreight(autoFreightStr);
                      }}
                      style={styles.autoResetBtn}
                      testID="reset-auto-freight"
                    >
                      <Ionicons name="refresh" size={12} color={colors.lime} />
                      <Text style={styles.autoResetText}>
                        Use auto: {autoFreightStr} {freightCcy}
                      </Text>
                    </TouchableOpacity>
                  ) : (
                    <View style={styles.autoOkRow}>
                      <Ionicons name="flash" size={11} color={colors.lime} />
                      <Text style={styles.autoOkText}>
                        Auto · from {bags.length} bag{bags.length === 1 ? "" : "s"}
                      </Text>
                    </View>
                  )
                ) : null}
              </Field>
            </View>
            <View style={{ width: 12 }} />
            <View style={{ flex: 1 }}>
              <Field label="Currency">
                <SegRow
                  options={[
                    { key: "INR", label: "INR" },
                    { key: "THB", label: "THB" },
                  ]}
                  value={freightCcy}
                  onChange={(v) => setFreightCcy(v as Currency)}
                />
              </Field>
            </View>
          </View>

          <Field label="Forex rate (INR per THB)">
            <TextInput style={styles.input} keyboardType="decimal-pad" value={forexRate} onChangeText={setForexRate} placeholder="2.65" placeholderTextColor={colors.textDim} />
          </Field>

          <Field label="Carrier (optional)">
            <TouchableOpacity style={styles.selectBtn} onPress={() => setPickCarrier(true)}>
              <View style={{ flex: 1 }}>
                <Text style={[styles.selectText, !currentCarrier && styles.selectPh]}>
                  {currentCarrier?.name || "Choose carrier"}
                </Text>
                {currentCarrier && mode === "hand_carry" && carrierRatePerKgINR > 0 ? (
                  <Text style={styles.rateChip}>
                    {carrierRatePerKgINR} INR/kg · from Bullion settings
                  </Text>
                ) : currentCarrier && mode !== "hand_carry" ? (
                  <Text style={styles.rateChipMissing}>
                    Auto rate applies to Hand-Carry mode only
                  </Text>
                ) : null}
              </View>
              <Ionicons name="chevron-down" size={16} color={colors.textDim} />
            </TouchableOpacity>
          </Field>

          {carrierId ? (
            <Field label="You Pay Carrier (INR)">
              <TextInput
                style={styles.input}
                keyboardType="decimal-pad"
                value={carrierPay}
                onChangeText={(t) => {
                  setCarrierPay(t);
                  setCarrierPayManuallyEdited(true);
                }}
                placeholder="0"
                placeholderTextColor={colors.textDim}
                testID="input-carrier-pay"
              />
              {autoCarrierPayINR > 0 ? (
                carrierPayManuallyEdited ? (
                  <TouchableOpacity
                    onPress={() => {
                      setCarrierPayManuallyEdited(false);
                      setCarrierPay(autoCarrierPayStr);
                    }}
                    style={styles.autoResetBtn}
                    testID="reset-auto-carrier"
                  >
                    <Ionicons name="refresh" size={12} color={colors.lime} />
                    <Text style={styles.autoResetText}>
                      Use auto: {autoCarrierPayStr} INR ({totalBagWeight} kg × {carrierRatePerKgINR})
                    </Text>
                  </TouchableOpacity>
                ) : (
                  <View style={styles.autoOkRow}>
                    <Ionicons name="flash" size={11} color={colors.lime} />
                    <Text style={styles.autoOkText}>
                      Auto · {totalBagWeight} kg × {carrierRatePerKgINR} INR/kg
                    </Text>
                  </View>
                )
              ) : mode === "hand_carry" && totalBagWeight === 0 ? (
                <Text style={styles.rateChipMissing}>
                  Add bag weights to auto-calc.
                </Text>
              ) : null}
            </Field>
          ) : null}

          {(marginBreakdown.freight > 0 || marginBreakdown.carrierINR > 0) ? (
            <View
              style={[
                styles.marginCard,
                marginBreakdown.margin >= 0 ? styles.marginProfit : styles.marginLoss,
              ]}
              testID="margin-card"
            >
              <View style={styles.marginRow}>
                <Text style={styles.marginLbl}>Freight income</Text>
                <Text style={styles.marginVal}>
                  {marginBreakdown.freight.toFixed(2)} {freightCcy}
                </Text>
              </View>
              <View style={styles.marginRow}>
                <Text style={styles.marginLbl}>Carrier pay</Text>
                <Text style={styles.marginVal}>
                  −{marginBreakdown.carrierInFreightCcy.toFixed(2)} {freightCcy}
                  {freightCcy !== "INR" && marginBreakdown.carrierINR > 0 ? (
                    <Text style={styles.marginNote}> ({marginBreakdown.carrierINR} INR)</Text>
                  ) : null}
                </Text>
              </View>
              <View style={styles.marginDivider} />
              <View style={styles.marginRow}>
                <Text style={styles.marginLblBold}>Your margin</Text>
                <Text
                  style={[
                    styles.marginTotal,
                    { color: marginBreakdown.margin >= 0 ? colors.lime : colors.danger },
                  ]}
                >
                  {marginBreakdown.margin >= 0 ? "+" : ""}
                  {marginBreakdown.margin.toFixed(2)} {freightCcy}
                </Text>
              </View>
              {!marginBreakdown.hasFx && freightCcy === "THB" ? (
                <Text style={styles.marginWarn}>
                  Enter forex rate above for accurate cross-currency margin.
                </Text>
              ) : null}
            </View>
          ) : null}

          <Field label="Notes">
            <TextInput
              style={[styles.input, styles.multiline]}
              placeholder="Handling instructions…"
              placeholderTextColor={colors.textDim}
              value={notes}
              onChangeText={setNotes}
              multiline
            />
          </Field>

          <View style={{ height: 40 }} />
        </ScrollView>
      </KeyboardAvoidingView>

      {pickBagIdx !== null && (
        <PartyPicker
          list={customers.length ? customers : (parties.data || [])}
          onClose={() => setPickBagIdx(null)}
          onPick={(p) => {
            patchBag(pickBagIdx, { end_customer_id: p.id });
            setPickBagIdx(null);
          }}
          title={`Bag ${(bags[pickBagIdx]?.bag_no) || ""} — recipient`}
        />
      )}

      {pickBillToIdx !== null && (
        <PartyPicker
          list={(parties.data || []).filter((p) => p.role === "customer" || p.role === "vendor" || p.role === "other")}
          onClose={() => setPickBillToIdx(null)}
          onPick={(p) => {
            patchBag(pickBillToIdx, { bill_to_party_id: p.id });
            setPickBillToIdx(null);
          }}
          title={`Bag ${(bags[pickBillToIdx]?.bag_no) || ""} — bill-to party`}
        />
      )}

      <ItemPicker
        visible={pickItemBagIdx !== null}
        onClose={() => setPickItemBagIdx(null)}
        onPick={(item) => {
          if (pickItemBagIdx !== null) {
            addItemToBag(pickItemBagIdx, item);
          }
        }}
        title={pickItemBagIdx !== null ? `Add item to ${bags[pickItemBagIdx]?.bag_no}` : "Choose item"}
      />

      {/* Invoice-item distribution sheet — asks how many of this item and
          into which bag, then does the split. */}
      {distributeIdx !== null && invoiceLines[distributeIdx] ? (
        <Pressable
          style={styles.sheetBackdrop}
          onPress={() => setDistributeIdx(null)}
        >
          <Pressable
            style={styles.sheet}
            onPress={(e) => e.stopPropagation()}
            testID="distribute-sheet"
          >
            <View style={styles.sheetHandle} />
            <Text style={styles.sheetTitle}>
              Allocate {invoiceLines[distributeIdx].name}
            </Text>
            <Text style={styles.distributeSub}>
              {invoiceAllocations[distributeIdx].remaining} {invoiceLines[distributeIdx].unit} left · already in {invoiceAllocations[distributeIdx].matches.length} bag{invoiceAllocations[distributeIdx].matches.length === 1 ? "" : "s"}
            </Text>

            <Text style={styles.distributeLbl}>Quantity</Text>
            <View style={styles.distributeQtyRow}>
              <TextInput
                style={styles.distributeQtyInput}
                keyboardType="decimal-pad"
                value={distributeQty}
                onChangeText={setDistributeQty}
                placeholder="0"
                placeholderTextColor={colors.textDim}
                testID="distribute-qty-input"
              />
              <Text style={styles.distributeUnit}>{invoiceLines[distributeIdx].unit}</Text>
              <TouchableOpacity
                style={styles.distributeMaxBtn}
                onPress={() => setDistributeQty(String(invoiceAllocations[distributeIdx].remaining))}
              >
                <Text style={styles.distributeMaxTxt}>Max</Text>
              </TouchableOpacity>
            </View>

            <Text style={styles.distributeLbl}>Into bag</Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.distributeBagsRow}
            >
              {bags.map((b, bi) => {
                const active = distributeBagIdx === bi;
                return (
                  <TouchableOpacity
                    key={bi}
                    style={[styles.distributeBagChip, active && styles.distributeBagChipActive]}
                    onPress={() => setDistributeBagIdx(bi)}
                    testID={`distribute-bag-${bi}`}
                  >
                    <Text style={[styles.distributeBagChipTxt, active && styles.distributeBagChipTxtActive]}>
                      {b.bag_no}
                    </Text>
                    {b.weight_kg ? (
                      <Text style={[styles.distributeBagChipMeta, active && styles.distributeBagChipMetaActive]}>
                        {b.weight_kg} kg
                      </Text>
                    ) : null}
                  </TouchableOpacity>
                );
              })}
              <TouchableOpacity
                style={styles.distributeAddBag}
                onPress={() => {
                  addBag();
                  setDistributeBagIdx(bags.length); // new index after add
                }}
                testID="distribute-new-bag"
              >
                <Ionicons name="add-circle-outline" size={16} color={colors.lime} />
                <Text style={styles.distributeAddBagTxt}>New bag</Text>
              </TouchableOpacity>
            </ScrollView>

            <View style={styles.distributeActions}>
              <TouchableOpacity
                style={styles.distributeCancel}
                onPress={() => setDistributeIdx(null)}
              >
                <Text style={styles.distributeCancelTxt}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.distributeConfirm}
                onPress={() => {
                  const q = parseFloat(distributeQty);
                  if (distributeBagIdx === null) {
                    toast.warn("Choose a bag first");
                    return;
                  }
                  distributeInvoiceLine(distributeIdx, distributeBagIdx, q);
                  // If there's still remaining after this allocation, keep
                  // the sheet open so the operator can chain 30+70 without
                  // reopening. Otherwise close.
                  const nextRemaining =
                    invoiceAllocations[distributeIdx].remaining - q;
                  if (nextRemaining > 0.0001) {
                    setDistributeQty(String(Math.max(0, nextRemaining)));
                  } else {
                    setDistributeIdx(null);
                  }
                }}
                testID="distribute-confirm"
              >
                <Text style={styles.distributeConfirmTxt}>Allocate</Text>
              </TouchableOpacity>
            </View>
          </Pressable>
        </Pressable>
      ) : null}
      {pickCarrier && (
        <PartyPicker
          list={carriers.length ? carriers : (parties.data || [])}
          onClose={() => setPickCarrier(false)}
          onPick={(p) => {
            setCarrierId(p.id);
            setPickCarrier(false);
          }}
          title="Choose carrier"
        />
      )}

      {showWarehouseQueue && (
        <Pressable
          style={styles.sheetBackdrop}
          onPress={() => setShowWarehouseQueue(false)}
        >
          <Pressable
            style={styles.sheet}
            onPress={(e) => e.stopPropagation()}
            testID="warehouse-queue-sheet"
          >
            <View style={styles.sheetHandle} />
            <Text style={styles.sheetTitle}>Warehouse queue · FIFO</Text>
            <Text style={styles.warehouseHint}>
              Bags waiting under other pending shipments — oldest first.
              Tap to pull one into this shipment; it moves off the source
              lot on save and both ledgers re-sync automatically.
            </Text>
            {warehouseQueue.length === 0 ? (
              <Text style={styles.emptyPicker}>Nothing waiting — the warehouse is clear.</Text>
            ) : (
              <ScrollView style={{ maxHeight: 480 }} keyboardShouldPersistTaps="handled">
                {warehouseQueue.map((wb, i) => {
                  // Highlight lot changes with a soft header so the FIFO
                  // sequence is visually clear.
                  const prev = i > 0 ? warehouseQueue[i - 1] : null;
                  const isNewLot = !prev || prev.from_shipment_id !== wb.from_shipment_id;
                  const itemSummary = (wb.items || [])
                    .slice(0, 2)
                    .map((it) => {
                      const label = (it as unknown as { name?: string }).name
                        || it.description
                        || "item";
                      return `${label}${it.quantity ? ` ×${it.quantity}` : ""}`;
                    })
                    .join(", ");
                  const cust = (parties.data || []).find(
                    (p) => p.id === wb.end_customer_id,
                  );
                  return (
                    <View key={wb.id}>
                      {isNewLot ? (
                        <View style={styles.warehouseLotHead}>
                          <Ionicons name="calendar-outline" size={12} color={colors.textDim} />
                          <Text style={styles.warehouseLotTxt}>
                            {wb.from_consignment_no} · {wb.from_dispatch_date || "no date"}
                          </Text>
                        </View>
                      ) : null}
                      <TouchableOpacity
                        style={styles.warehouseRow}
                        onPress={() => claimFromWarehouse(wb)}
                        testID={`warehouse-claim-${wb.id}`}
                      >
                        <View style={{ flex: 1 }}>
                          <Text style={styles.warehouseBag}>
                            {wb.bag_no} · {wb.weight_kg} kg
                          </Text>
                          <Text style={styles.warehouseMeta} numberOfLines={1}>
                            {cust?.name ? `${cust.name}` : "no customer"}
                            {itemSummary ? ` · ${itemSummary}` : ""}
                          </Text>
                        </View>
                        <Ionicons name="arrow-forward-circle" size={20} color={colors.lime} />
                      </TouchableOpacity>
                    </View>
                  );
                })}
              </ScrollView>
            )}
            <TouchableOpacity
              style={styles.sheetCancel}
              onPress={() => setShowWarehouseQueue(false)}
            >
              <Text style={styles.sheetCancelText}>Done</Text>
            </TouchableOpacity>
          </Pressable>
        </Pressable>
      )}
    </SafeAreaView>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      {children}
    </View>
  );
}

function SegRow<T extends string>({
  options,
  value,
  onChange,
}: {
  options: { key: T; label: string }[];
  value: T;
  onChange: (v: T) => void;
}) {
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.segRow}>
      {options.map((o) => {
        const active = value === o.key;
        return (
          <TouchableOpacity
            key={o.key}
            onPress={() => onChange(o.key)}
            style={[styles.seg, active && styles.segActive]}
            testID={`seg-${o.key}`}
          >
            <Text style={[styles.segText, active && styles.segTextActive]}>{o.label}</Text>
          </TouchableOpacity>
        );
      })}
    </ScrollView>
  );
}

function PartyPicker({
  list,
  onClose,
  onPick,
  title,
}: {
  list: Party[];
  onClose: () => void;
  onPick: (p: Party) => void;
  title: string;
}) {
  return (
    <Pressable style={styles.sheetBackdrop} onPress={onClose}>
      <Pressable style={styles.sheet} onPress={(e) => e.stopPropagation()}>
        <View style={styles.sheetHandle} />
        <Text style={styles.sheetTitle}>{title}</Text>
        <ScrollView style={{ maxHeight: 420 }}>
          {list.length === 0 ? (
            <Text style={styles.emptyPicker}>No parties yet. Create one from the Parties tab.</Text>
          ) : (
            list.map((p) => (
              <TouchableOpacity key={p.id} style={styles.sheetItem} onPress={() => onPick(p)}>
                <View>
                  <Text style={styles.sheetItemName}>{p.name}</Text>
                  <Text style={styles.sheetItemMeta}>{p.role} · {p.country}</Text>
                </View>
                <Ionicons name="chevron-forward" size={18} color={colors.textDim} />
              </TouchableOpacity>
            ))
          )}
        </ScrollView>
        <TouchableOpacity style={styles.sheetCancel} onPress={onClose}>
          <Text style={styles.sheetCancelText}>Cancel</Text>
        </TouchableOpacity>
      </Pressable>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  headBar: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: spacing.sm,
    paddingTop: spacing.sm,
    paddingBottom: spacing.sm,
    gap: 4,
    borderBottomColor: colors.border,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  iconBtn: { padding: 8 },
  headTitle: { flex: 1, color: colors.text, fontSize: 16, fontWeight: "800" },
  saveBtn: { backgroundColor: colors.lime, paddingHorizontal: 14, paddingVertical: 8, borderRadius: radii.pill },
  saveText: { color: colors.bg, fontWeight: "800", fontSize: 13 },
  content: { padding: spacing.lg },
  field: { marginBottom: spacing.md },
  label: { color: colors.textMuted, fontSize: 12, textTransform: "uppercase", letterSpacing: 0.6, marginBottom: 6 },
  input: {
    backgroundColor: colors.surface,
    borderRadius: radii.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    paddingHorizontal: 14,
    paddingVertical: 12,
    color: colors.text,
    fontSize: 15,
  },
  multiline: { minHeight: 80, textAlignVertical: "top" },
  bagCard: {
    backgroundColor: colors.chipBg,
    borderRadius: radii.md,
    borderColor: colors.border,
    borderWidth: StyleSheet.hairlineWidth,
    padding: spacing.md,
    gap: 8,
  },
  bagCardHead: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  bagCardNo: {
    color: colors.lime,
    fontSize: 12,
    fontWeight: "900",
    letterSpacing: 0.6,
  },
  bagFieldLbl: {
    color: colors.textDim,
    fontSize: 10,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  addBagBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 10,
    borderRadius: radii.md,
    borderColor: colors.lime,
    borderWidth: StyleSheet.hairlineWidth,
    borderStyle: "dashed",
    backgroundColor: colors.chipBg,
  },
  addBagText: {
    color: colors.lime,
    fontSize: 13,
    fontWeight: "800",
  },
  noItems: { color: colors.textDim, fontSize: 12, fontStyle: "italic", marginBottom: 6 },
  itemLine: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingVertical: 6,
    borderTopColor: colors.border,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  itemName: { color: colors.text, fontSize: 13, fontWeight: "700" },
  itemMetaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 3,
  },
  qtyInput: {
    backgroundColor: colors.surface,
    borderColor: colors.border, borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 6, paddingHorizontal: 8, paddingVertical: 4,
    color: colors.text, fontSize: 12, minWidth: 60,
  },
  itemUnit: { color: colors.textDim, fontSize: 11, fontWeight: "700", textTransform: "uppercase" },
  addItemBtn: {
    flexDirection: "row", alignItems: "center", gap: 6,
    alignSelf: "flex-start",
    paddingHorizontal: 10, paddingVertical: 6,
    borderRadius: radii.pill,
    backgroundColor: colors.surface,
    borderColor: colors.border, borderWidth: StyleSheet.hairlineWidth,
    marginTop: 6,
  },
  addItemTxt: { color: colors.lime, fontSize: 11, fontWeight: "700" },
  row2: { flexDirection: "row" },
  segRow: { gap: 8, paddingVertical: 2 },
  seg: {
    paddingHorizontal: 14,
    height: 36,
    borderRadius: radii.pill,
    backgroundColor: colors.chipBg,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  segActive: { backgroundColor: colors.lime, borderColor: colors.lime },
  segText: { color: colors.textMuted, fontSize: 12, fontWeight: "700", textTransform: "capitalize" },
  segTextActive: { color: colors.bg },
  selectBtn: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: colors.surface,
    borderRadius: radii.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    paddingHorizontal: 14,
    paddingVertical: 14,
  },
  selectText: { color: colors.text, fontSize: 15 },
  selectPh: { color: colors.textDim },
  sheetBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.7)",
    justifyContent: "flex-end",
  },
  sheet: {
    backgroundColor: colors.surfaceAlt,
    padding: spacing.lg,
    borderTopLeftRadius: radii.xl,
    borderTopRightRadius: radii.xl,
    borderColor: colors.border,
    borderWidth: StyleSheet.hairlineWidth,
  },
  sheetHandle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.border,
    alignSelf: "center",
    marginBottom: spacing.md,
  },
  sheetTitle: { color: colors.text, fontSize: 16, fontWeight: "800", marginBottom: spacing.md },
  sheetItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 12,
    borderTopColor: colors.border,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  sheetItemName: { color: colors.text, fontSize: 15, fontWeight: "600" },
  sheetItemMeta: { color: colors.textDim, fontSize: 12, marginTop: 2, textTransform: "capitalize" },
  emptyPicker: { color: colors.textDim, textAlign: "center", padding: spacing.lg, fontSize: 13 },
  sheetCancel: {
    marginTop: spacing.md,
    paddingVertical: 12,
    alignItems: "center",
    borderRadius: radii.pill,
    backgroundColor: colors.chipBg,
  },
  sheetCancelText: { color: colors.text, fontWeight: "700" },
  // ---- Auto-freight helpers ----
  rateChip: {
    color: colors.lime,
    fontSize: 11,
    fontWeight: "800",
    marginTop: 2,
    letterSpacing: 0.3,
  },
  rateChipMissing: {
    color: colors.textDim,
    fontSize: 11,
    fontStyle: "italic",
    marginTop: 2,
  },
  bagCalcRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 4,
    paddingTop: 2,
  },
  bagCalcText: {
    color: colors.lime,
    fontSize: 11,
    fontWeight: "700",
  },
  bagCalcWarn: {
    color: colors.textDim,
    fontSize: 11,
    fontStyle: "italic",
  },
  autoResetBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    alignSelf: "flex-start",
    paddingHorizontal: 8,
    paddingVertical: 5,
    marginTop: 6,
    borderRadius: radii.pill,
    borderColor: colors.lime,
    borderWidth: StyleSheet.hairlineWidth,
    backgroundColor: colors.chipBg,
  },
  autoResetText: {
    color: colors.lime,
    fontSize: 11,
    fontWeight: "800",
  },
  autoOkRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginTop: 6,
  },
  autoOkText: {
    color: colors.lime,
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 0.4,
  },
  // ---- Live Margin card ----
  marginCard: {
    borderRadius: radii.md,
    borderWidth: StyleSheet.hairlineWidth,
    padding: spacing.md,
    marginBottom: spacing.md,
    backgroundColor: colors.chipBg,
  },
  marginProfit: { borderColor: colors.lime },
  marginLoss: { borderColor: colors.danger },
  marginRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 3,
  },
  marginLbl: { color: colors.textDim, fontSize: 12, fontWeight: "600" },
  marginLblBold: {
    color: colors.text,
    fontSize: 13,
    fontWeight: "800",
    textTransform: "uppercase",
    letterSpacing: 0.4,
  },
  marginVal: { color: colors.text, fontSize: 13, fontWeight: "700" },
  marginNote: { color: colors.textDim, fontSize: 10, fontWeight: "500" },
  marginDivider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: colors.border,
    marginVertical: 6,
  },
  marginTotal: {
    fontSize: 16,
    fontWeight: "900",
    letterSpacing: 0.3,
  },
  marginWarn: {
    color: colors.textDim,
    fontSize: 11,
    marginTop: 6,
    fontStyle: "italic",
  },
  // ---- Warehouse FIFO queue ----
  warehouseBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 10,
    borderRadius: radii.md,
    borderColor: colors.lime,
    borderStyle: "dashed",
    borderWidth: StyleSheet.hairlineWidth,
    backgroundColor: colors.limeGlow,
    marginBottom: 4,
  },
  warehouseBtnText: {
    color: colors.lime,
    fontSize: 12,
    fontWeight: "800",
    letterSpacing: 0.3,
  },
  warehouseHint: {
    color: colors.textDim,
    fontSize: 12,
    lineHeight: 16,
    marginBottom: spacing.md,
  },
  warehouseLotHead: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 4,
    paddingVertical: 6,
    marginTop: 6,
    borderTopColor: colors.border,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  warehouseLotTxt: {
    color: colors.textDim,
    fontSize: 10,
    fontWeight: "800",
    textTransform: "uppercase",
    letterSpacing: 0.4,
  },
  warehouseRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 10,
    paddingHorizontal: 4,
    gap: 12,
  },
  warehouseBag: {
    color: colors.text,
    fontSize: 14,
    fontWeight: "700",
  },
  warehouseMeta: {
    color: colors.textDim,
    fontSize: 12,
    marginTop: 2,
  },
  // Invoice-driven item distribution UI
  invPoolBox: {
    backgroundColor: colors.limeGlow,
    borderRadius: radii.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.lime,
    padding: 12,
    marginBottom: 12,
  },
  invPoolHead: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 4,
  },
  invPoolTitle: {
    color: colors.lime,
    fontSize: 12,
    fontWeight: "800",
    letterSpacing: 0.5,
    textTransform: "uppercase",
  },
  invPoolHint: {
    color: colors.textMuted,
    fontSize: 11,
    marginBottom: 10,
  },
  invLineRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 8,
    borderTopColor: colors.border,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  invLineTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 4,
  },
  invLineName: {
    flex: 1,
    color: colors.text,
    fontSize: 13,
    fontWeight: "700",
  },
  invLineCount: {
    color: colors.textMuted,
    fontSize: 11,
    fontWeight: "700",
  },
  invLineCountDone: {
    color: colors.lime,
  },
  invProgressTrack: {
    height: 4,
    backgroundColor: colors.chipBg,
    borderRadius: 2,
    overflow: "hidden",
  },
  invProgressFill: {
    height: "100%",
    backgroundColor: colors.textMuted,
    borderRadius: 2,
  },
  invProgressFillDone: {
    backgroundColor: colors.lime,
  },
  invAllocBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.lime,
    alignItems: "center",
    justifyContent: "center",
  },
  invAllocBtnDone: {
    backgroundColor: colors.chipBg,
  },
  // Distribution sheet
  distributeSub: {
    color: colors.textDim,
    fontSize: 12,
    marginBottom: 14,
  },
  distributeLbl: {
    color: colors.textMuted,
    fontSize: 11,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 6,
    marginTop: 12,
  },
  distributeQtyRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  distributeQtyInput: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: radii.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    paddingHorizontal: 14,
    paddingVertical: 12,
    color: colors.text,
    fontSize: 18,
    fontWeight: "700",
  },
  distributeUnit: {
    color: colors.textMuted,
    fontSize: 13,
    fontWeight: "700",
  },
  distributeMaxBtn: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: radii.pill,
    backgroundColor: colors.chipBg,
    borderColor: colors.lime,
    borderWidth: StyleSheet.hairlineWidth,
  },
  distributeMaxTxt: {
    color: colors.lime,
    fontSize: 12,
    fontWeight: "800",
  },
  distributeBagsRow: {
    flexDirection: "row",
    gap: 8,
    paddingRight: 12,
  },
  distributeBagChip: {
    minWidth: 72,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: radii.md,
    backgroundColor: colors.chipBg,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    alignItems: "center",
  },
  distributeBagChipActive: {
    backgroundColor: colors.lime,
    borderColor: colors.lime,
  },
  distributeBagChipTxt: {
    color: colors.text,
    fontSize: 12,
    fontWeight: "800",
  },
  distributeBagChipTxtActive: {
    color: colors.bg,
  },
  distributeBagChipMeta: {
    color: colors.textDim,
    fontSize: 10,
    marginTop: 2,
  },
  distributeBagChipMetaActive: {
    color: colors.bg,
  },
  distributeAddBag: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: radii.md,
    borderStyle: "dashed",
    borderWidth: 1,
    borderColor: colors.lime,
  },
  distributeAddBagTxt: {
    color: colors.lime,
    fontSize: 12,
    fontWeight: "700",
  },
  distributeActions: {
    flexDirection: "row",
    gap: 8,
    marginTop: 16,
  },
  distributeCancel: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: radii.pill,
    backgroundColor: colors.chipBg,
    alignItems: "center",
  },
  distributeCancelTxt: {
    color: colors.text,
    fontSize: 13,
    fontWeight: "700",
  },
  distributeConfirm: {
    flex: 2,
    paddingVertical: 12,
    borderRadius: radii.pill,
    backgroundColor: colors.lime,
    alignItems: "center",
  },
  distributeConfirmTxt: {
    color: colors.bg,
    fontSize: 13,
    fontWeight: "800",
  },
});
