/** Offline demo data so beginners can open the APK without a server. */

export type DemoParty = {
  id: string;
  name: string;
  type: string;
  phone: string | null;
  email: string | null;
  city: string | null;
  country: string | null;
  notes: string | null;
  exchangeRate: number | null;
  quoteMode: string;
  defaultCurrency: "INR" | "THB";
  carryRatePerKg: number | null;
  isActive: boolean;
};

export type DemoEntry = {
  id: string;
  partyId: string;
  direction: "YOU_GAVE" | "YOU_GOT";
  amount: number;
  currency: "INR" | "THB";
  description: string | null;
  entryDate: string;
  fxRate: number | null;
  fxAmount: number | null;
  fxCurrency: "INR" | "THB" | null;
  isAutoSynced: boolean;
  attachments: Array<{ id: string; fileName: string; filePath: string }>;
};

type DemoState = {
  parties: DemoParty[];
  entries: DemoEntry[];
  warehouses: Array<{
    id: string;
    name: string;
    city: string;
    country: string;
    address: string | null;
    isActive: boolean;
  }>;
  shipments: Array<{
    id: string;
    lotNumber: string;
    batchNumber: string | null;
    direction: string;
    originWarehouseId: string;
    destWarehouseId: string;
    notes: string | null;
    shipDate: string;
    bags: Array<{
      id: string;
      bagNumber: string;
      weightKg: number | null;
      status: string;
      description: string | null;
      contents: string | null;
      customerId: string | null;
      warehouseId: string | null;
      arrivedAt: string | null;
      deliveredAt: string | null;
    }>;
  }>;
  transports: Array<{
    id: string;
    mode: string;
    carrierId: string | null;
    carrierName: string | null;
    assignedDate: string;
    departureDate: string | null;
    arrivalDate: string | null;
    ratePerKg: number | null;
    totalWeightKg: number | null;
    currency: "INR" | "THB";
    trackingRef: string | null;
    notes: string | null;
    deliveredToCustomer: boolean;
    deliveredAt: string | null;
    bagIds: string[];
    ledgerEntryIds: string[];
  }>;
};

function id(prefix: string) {
  return `${prefix}_${Math.random().toString(36).slice(2, 10)}`;
}

function seed(): DemoState {
  const delhi = { id: "wh_delhi", name: "Delhi Warehouse", city: "Delhi", country: "India", address: null, isActive: true };
  const bkk = { id: "wh_bkk", name: "Bangkok Warehouse", city: "Bangkok", country: "Thailand", address: null, isActive: true };
  const kol = { id: "wh_kol", name: "Kolkata Warehouse", city: "Kolkata", country: "India", address: null, isActive: true };
  const jai = { id: "wh_jai", name: "Jaipur Warehouse", city: "Jaipur", country: "India", address: null, isActive: true };
  const mum = { id: "wh_mum", name: "Mumbai Warehouse", city: "Mumbai", country: "India", address: null, isActive: true };

  const rajesh: DemoParty = {
    id: "p_rajesh",
    name: "Rajesh Traders",
    type: "LOGISTIC_CUSTOMER",
    phone: "+91-9876543210",
    email: null,
    city: "Delhi",
    country: "India",
    notes: "Sends goods India → Thailand",
    exchangeRate: 2.45,
    quoteMode: "INR_PER_THB",
    defaultCurrency: "INR",
    carryRatePerKg: null,
    isActive: true,
  };
  const siam: DemoParty = {
    id: "p_siam",
    name: "Siam Gifts Co.",
    type: "LOGISTIC_CUSTOMER",
    phone: "+66-812345678",
    email: null,
    city: "Bangkok",
    country: "Thailand",
    notes: "Thai-side logistic customer",
    exchangeRate: 2.42,
    quoteMode: "INR_PER_THB",
    defaultCurrency: "THB",
    carryRatePerKg: null,
    isActive: true,
  };
  const buyer: DemoParty = {
    id: "p_buyer",
    name: "Bangkok Boutique (Buyer)",
    type: "BUYER",
    phone: "+66-899001122",
    email: null,
    city: "Bangkok",
    country: "Thailand",
    notes: "Buys our own products",
    exchangeRate: 2.5,
    quoteMode: "INR_PER_THB",
    defaultCurrency: "THB",
    carryRatePerKg: null,
    isActive: true,
  };
  const amit: DemoParty = {
    id: "p_amit",
    name: "Amit Sharma (Carrier)",
    type: "CARRIER",
    phone: "+91-9988776655",
    email: null,
    city: "Delhi",
    country: "India",
    notes: null,
    exchangeRate: null,
    quoteMode: "INR_PER_THB",
    defaultCurrency: "INR",
    carryRatePerKg: 200,
    isActive: true,
  };
  const airAgent: DemoParty = {
    id: "p_air",
    name: "Bangkok Air Agent",
    type: "TRANSPORTER",
    phone: null,
    email: null,
    city: "Bangkok",
    country: "Thailand",
    notes: "Air cargo company",
    exchangeRate: null,
    quoteMode: "INR_PER_THB",
    defaultCurrency: "THB",
    carryRatePerKg: null,
    isActive: true,
  };
  const uncle: DemoParty = {
    id: "p_uncle",
    name: "Uncle Ramesh",
    type: "INDIVIDUAL",
    phone: null,
    email: null,
    city: "Jaipur",
    country: "India",
    notes: "Personal ledger",
    exchangeRate: null,
    quoteMode: "INR_PER_THB",
    defaultCurrency: "INR",
    carryRatePerKg: null,
    isActive: true,
  };

  const bags = Array.from({ length: 25 }, (_, i) => ({
    id: `bag_${String(i + 1).padStart(3, "0")}`,
    bagNumber: String(i + 1).padStart(3, "0"),
    weightKg: i < 5 ? 20 + i * 5 : i < 10 ? 8 : null,
    status: i < 5 ? "IN_TRANSIT" : "CREATED",
    description: i < 3 ? "Sample goods" : null,
    contents: null,
    customerId: "p_rajesh",
    warehouseId: "wh_delhi",
    arrivedAt: null,
    deliveredAt: null,
  }));

  const entryAdvance: DemoEntry = {
    id: "le_advance",
    partyId: "p_rajesh",
    direction: "YOU_GAVE",
    amount: 50000,
    currency: "INR",
    description: "Credit advance against goods (demo)",
    entryDate: new Date().toISOString(),
    fxRate: 2.45,
    fxAmount: null,
    fxCurrency: null,
    isAutoSynced: false,
    attachments: [],
  };
  const entryThb: DemoEntry = {
    id: "le_thb",
    partyId: "p_siam",
    direction: "YOU_GOT",
    amount: 20000,
    currency: "THB",
    description: "THB received in Bangkok bank (demo)",
    entryDate: new Date().toISOString(),
    fxRate: 2.42,
    fxAmount: 48400,
    fxCurrency: "INR",
    isAutoSynced: false,
    attachments: [],
  };
  const entryCarry: DemoEntry = {
    id: "le_carry",
    partyId: "p_amit",
    direction: "YOU_GOT",
    amount: 30000,
    currency: "INR",
    description: "Transport payment (CARRIER) — 150 kg × 200 (demo)",
    entryDate: new Date().toISOString(),
    fxRate: null,
    fxAmount: null,
    fxCurrency: null,
    isAutoSynced: true,
    attachments: [],
  };

  return {
    parties: [rajesh, siam, buyer, amit, airAgent, uncle],
    entries: [entryAdvance, entryThb, entryCarry],
    warehouses: [delhi, kol, jai, mum, bkk],
    shipments: [
      {
        id: "ship_demo",
        lotNumber: "LOT-DEMO-001",
        batchNumber: "B-08",
        direction: "IN_TO_TH",
        originWarehouseId: delhi.id,
        destWarehouseId: bkk.id,
        notes: "Demo shipment — 25 bags Delhi → Bangkok",
        shipDate: new Date().toISOString(),
        bags,
      },
    ],
    transports: [
      {
        id: "tr_demo",
        mode: "CARRY_PERSON",
        carrierId: "p_amit",
        carrierName: null,
        assignedDate: new Date().toISOString(),
        departureDate: new Date().toISOString(),
        arrivalDate: null,
        ratePerKg: 200,
        totalWeightKg: 150,
        currency: "INR",
        trackingRef: null,
        notes: "Demo carry person assignment",
        deliveredToCustomer: false,
        deliveredAt: null,
        bagIds: bags.slice(0, 5).map((b) => b.id),
        ledgerEntryIds: ["le_carry"],
      },
    ],
  };
}

let state: DemoState = seed();

export function resetDemo() {
  state = seed();
}

function partyMap() {
  return Object.fromEntries(state.parties.map((p) => [p.id, p]));
}

function warehouseMap() {
  return Object.fromEntries(state.warehouses.map((w) => [w.id, w]));
}

function computeBalances() {
  const map = new Map<
    string,
    {
      partyId: string;
      name: string;
      type: string;
      exchangeRate: number | null;
      quoteMode: string;
      currency: "INR" | "THB";
      youGave: number;
      youGot: number;
    }
  >();

  for (const p of state.parties) {
    const key = `${p.id}:${p.defaultCurrency}`;
    map.set(key, {
      partyId: p.id,
      name: p.name,
      type: p.type,
      exchangeRate: p.exchangeRate,
      quoteMode: p.quoteMode,
      currency: p.defaultCurrency,
      youGave: 0,
      youGot: 0,
    });
  }

  for (const e of state.entries) {
    const p = partyMap()[e.partyId];
    if (!p) continue;
    const key = `${e.partyId}:${e.currency}`;
    let row = map.get(key);
    if (!row) {
      row = {
        partyId: e.partyId,
        name: p.name,
        type: p.type,
        exchangeRate: p.exchangeRate,
        quoteMode: p.quoteMode,
        currency: e.currency,
        youGave: 0,
        youGot: 0,
      };
      map.set(key, row);
    }
    if (e.direction === "YOU_GAVE") row.youGave += e.amount;
    else row.youGot += e.amount;
  }

  const balances = Array.from(map.values()).map((r) => {
    const balance = r.youGave - r.youGot;
    const abs = Math.abs(balance);
    const money = (n: number, c: string) =>
      `${c === "INR" ? "₹" : "฿"}${n.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    const label =
      abs < 0.005
        ? `Settled (${money(0, r.currency)})`
        : balance > 0
          ? `To receive ${money(abs, r.currency)}`
          : `To pay ${money(abs, r.currency)}`;
    return { ...r, balance, label };
  });

  const totals = {
    INR: { toReceive: 0, toPay: 0 },
    THB: { toReceive: 0, toPay: 0 },
  };
  for (const b of balances) {
    if (b.balance > 0) totals[b.currency].toReceive += b.balance;
    else if (b.balance < 0) totals[b.currency].toPay += Math.abs(b.balance);
  }
  return { balances, totals };
}

function enrichBag(bag: DemoState["shipments"][0]["bags"][0], shipment: DemoState["shipments"][0]) {
  const wh = warehouseMap();
  const parties = partyMap();
  const assignments = state.transports
    .filter((t) => t.bagIds.includes(bag.id))
    .map((t) => ({
      transportAssignment: {
        id: t.id,
        mode: t.mode,
        carrier: t.carrierId ? parties[t.carrierId] || null : null,
        carrierName: t.carrierName,
        assignedDate: t.assignedDate,
        arrivalDate: t.arrivalDate,
        deliveredToCustomer: t.deliveredToCustomer,
      },
    }));
  return {
    ...bag,
    shipment: {
      id: shipment.id,
      lotNumber: shipment.lotNumber,
      batchNumber: shipment.batchNumber,
      originWarehouse: wh[shipment.originWarehouseId] || null,
      destWarehouse: wh[shipment.destWarehouseId] || null,
    },
    customer: bag.customerId ? parties[bag.customerId] || null : null,
    warehouse: bag.warehouseId ? wh[bag.warehouseId] || null : null,
    transportAssignments: assignments,
  };
}

export async function demoHandle(method: string, path: string, body?: unknown): Promise<unknown> {
  const url = new URL(path, "http://demo.local");
  const p = url.pathname;
  const q = url.searchParams;

  // Dashboard
  if (method === "GET" && p === "/api/dashboard") {
    const statusCounts: Record<string, number> = {};
    const recentBags = [];
    let bagCount = 0;
    for (const s of state.shipments) {
      for (const b of s.bags) {
        bagCount++;
        statusCounts[b.status] = (statusCounts[b.status] || 0) + 1;
        recentBags.push(enrichBag(b, s));
      }
    }
    recentBags.sort((a, b) => b.bagNumber.localeCompare(a.bagNumber));
    const { totals } = computeBalances();
    return {
      statusCounts,
      recentBags: recentBags.slice(0, 15),
      partyCount: state.parties.length,
      shipmentCount: state.shipments.length,
      bagCount,
      totals,
      openAssignments: state.transports
        .filter((t) => !t.deliveredToCustomer)
        .map((t) => ({
          ...t,
          carrier: t.carrierId ? partyMap()[t.carrierId] : null,
          bags: t.bagIds.map((bid) => {
            for (const s of state.shipments) {
              const bag = s.bags.find((b) => b.id === bid);
              if (bag) return { bag: enrichBag(bag, s) };
            }
            return null;
          }).filter(Boolean),
        })),
      entryCount: state.entries.length,
    };
  }

  if (method === "GET" && p === "/api/parties") return state.parties;
  if (method === "POST" && p === "/api/parties") {
    const b = body as Record<string, unknown>;
    const party: DemoParty = {
      id: id("p"),
      name: String(b.name || "New party"),
      type: String(b.type || "OTHER"),
      phone: (b.phone as string) || null,
      email: (b.email as string) || null,
      city: (b.city as string) || null,
      country: (b.country as string) || null,
      notes: (b.notes as string) || null,
      exchangeRate: b.exchangeRate != null ? Number(b.exchangeRate) : null,
      quoteMode: String(b.quoteMode || "INR_PER_THB"),
      defaultCurrency: (b.defaultCurrency as "INR" | "THB") || "INR",
      carryRatePerKg: b.carryRatePerKg != null ? Number(b.carryRatePerKg) : null,
      isActive: true,
    };
    state.parties.push(party);
    return party;
  }

  const partyMatch = p.match(/^\/api\/parties\/([^/]+)$/);
  if (method === "GET" && partyMatch) {
    const party = state.parties.find((x) => x.id === partyMatch[1]);
    if (!party) throw Object.assign(new Error("Not found"), { status: 404 });
    return {
      ...party,
      ledgerEntries: state.entries
        .filter((e) => e.partyId === party.id)
        .sort((a, b) => b.entryDate.localeCompare(a.entryDate)),
    };
  }
  if (method === "PATCH" && partyMatch) {
    const party = state.parties.find((x) => x.id === partyMatch[1]);
    if (!party) throw Object.assign(new Error("Not found"), { status: 404 });
    Object.assign(party, body);
    return party;
  }

  if (method === "GET" && p === "/api/ledger/summary") return computeBalances();
  if (method === "GET" && p === "/api/ledger") {
    const partyId = q.get("partyId");
    return state.entries
      .filter((e) => !partyId || e.partyId === partyId)
      .map((e) => ({ ...e, party: partyMap()[e.partyId] }));
  }
  if (method === "POST" && p === "/api/ledger") {
    const b = body as Record<string, unknown>;
    const entry: DemoEntry = {
      id: id("le"),
      partyId: String(b.partyId),
      direction: b.direction as "YOU_GAVE" | "YOU_GOT",
      amount: Number(b.amount),
      currency: b.currency as "INR" | "THB",
      description: (b.description as string) || null,
      entryDate: (b.entryDate as string) || new Date().toISOString(),
      fxRate: b.fxRate != null ? Number(b.fxRate) : null,
      fxAmount: b.fxAmount != null ? Number(b.fxAmount) : null,
      fxCurrency: (b.fxCurrency as "INR" | "THB") || null,
      isAutoSynced: Boolean(b.isAutoSynced),
      attachments: [],
    };
    state.entries.unshift(entry);
    return { ...entry, party: partyMap()[entry.partyId] };
  }

  const ledgerMatch = p.match(/^\/api\/ledger\/([^/]+)$/);
  if (method === "DELETE" && ledgerMatch) {
    state.entries = state.entries.filter((e) => e.id !== ledgerMatch[1]);
    return { ok: true };
  }

  const attachMatch = p.match(/^\/api\/ledger\/([^/]+)\/attachments$/);
  if (method === "POST" && attachMatch) {
    const entry = state.entries.find((e) => e.id === attachMatch[1]);
    if (!entry) throw Object.assign(new Error("Not found"), { status: 404 });
    const att = {
      id: id("att"),
      fileName: "bill-demo.pdf",
      filePath: "#",
    };
    entry.attachments.push(att);
    return att;
  }

  if (method === "GET" && p === "/api/warehouses") return state.warehouses;
  if (method === "POST" && p === "/api/warehouses") {
    const b = body as Record<string, unknown>;
    const w = {
      id: id("wh"),
      name: String(b.name),
      city: String(b.city),
      country: String(b.country || "India"),
      address: (b.address as string) || null,
      isActive: true,
    };
    state.warehouses.push(w);
    return w;
  }

  if (method === "GET" && p === "/api/shipments") {
    const wh = warehouseMap();
    return state.shipments.map((s) => ({
      ...s,
      originWarehouse: wh[s.originWarehouseId] || null,
      destWarehouse: wh[s.destWarehouseId] || null,
      bags: s.bags.map((b) => enrichBag(b, s)),
      _count: { bags: s.bags.length },
    }));
  }

  if (method === "POST" && p === "/api/shipments") {
    const b = body as Record<string, unknown>;
    const count = Number(b.bagCount) || 0;
    const ship = {
      id: id("ship"),
      lotNumber: String(b.lotNumber),
      batchNumber: (b.batchNumber as string) || null,
      direction: String(b.direction || "IN_TO_TH"),
      originWarehouseId: String(b.originWarehouseId || ""),
      destWarehouseId: String(b.destWarehouseId || ""),
      notes: (b.notes as string) || null,
      shipDate: new Date().toISOString(),
      bags: Array.from({ length: count }, (_, i) => ({
        id: id("bag"),
        bagNumber: String(i + 1).padStart(3, "0"),
        weightKg: null,
        status: "CREATED",
        description: null,
        contents: null,
        customerId: (b.defaultCustomerId as string) || null,
        warehouseId: (b.originWarehouseId as string) || null,
        arrivedAt: null,
        deliveredAt: null,
      })),
    };
    state.shipments.unshift(ship);
    const wh = warehouseMap();
    return {
      ...ship,
      originWarehouse: wh[ship.originWarehouseId] || null,
      destWarehouse: wh[ship.destWarehouseId] || null,
      bags: ship.bags,
    };
  }

  const shipMatch = p.match(/^\/api\/shipments\/([^/]+)$/);
  if (method === "GET" && shipMatch) {
    const s = state.shipments.find((x) => x.id === shipMatch[1]);
    if (!s) throw Object.assign(new Error("Not found"), { status: 404 });
    const wh = warehouseMap();
    return {
      ...s,
      originWarehouse: wh[s.originWarehouseId] || null,
      destWarehouse: wh[s.destWarehouseId] || null,
      bags: s.bags.map((b) => enrichBag(b, s)).sort((a, b) => a.bagNumber.localeCompare(b.bagNumber)),
    };
  }

  const shipBagsMatch = p.match(/^\/api\/shipments\/([^/]+)\/bags$/);
  if (method === "POST" && shipBagsMatch) {
    const s = state.shipments.find((x) => x.id === shipBagsMatch[1]);
    if (!s) throw Object.assign(new Error("Not found"), { status: 404 });
    const b = body as Record<string, unknown>;
    const count = Number(b.count) || 1;
    const start = s.bags.length + 1;
    const created = Array.from({ length: count }, (_, i) => ({
      id: id("bag"),
      bagNumber: String(start + i).padStart(3, "0"),
      weightKg: null,
      status: "CREATED",
      description: null,
      contents: null,
      customerId: null,
      warehouseId: s.originWarehouseId,
      arrivedAt: null,
      deliveredAt: null,
    }));
    s.bags.push(...created);
    return created;
  }

  if (method === "GET" && p === "/api/bags") {
    const query = (q.get("q") || "").toLowerCase();
    const status = q.get("status");
    const all = [];
    for (const s of state.shipments) {
      for (const b of s.bags) {
        const enriched = enrichBag(b, s);
        if (status && b.status !== status) continue;
        if (
          query &&
          !(
            s.lotNumber.toLowerCase().includes(query) ||
            (s.batchNumber || "").toLowerCase().includes(query) ||
            b.bagNumber.includes(query)
          )
        )
          continue;
        all.push(enriched);
      }
    }
    return all;
  }

  const bagMatch = p.match(/^\/api\/bags\/([^/]+)$/);
  if (method === "PATCH" && bagMatch) {
    for (const s of state.shipments) {
      const bag = s.bags.find((b) => b.id === bagMatch[1]);
      if (bag) {
        Object.assign(bag, body);
        return enrichBag(bag, s);
      }
    }
    throw Object.assign(new Error("Not found"), { status: 404 });
  }

  if (method === "GET" && p === "/api/transport") {
    return state.transports.map((t) => ({
      ...t,
      carrier: t.carrierId ? partyMap()[t.carrierId] : null,
      bags: t.bagIds.map((bid) => {
        for (const s of state.shipments) {
          const bag = s.bags.find((b) => b.id === bid);
          if (bag) return { bag: enrichBag(bag, s) };
        }
        return null;
      }).filter(Boolean),
      ledgerEntries: state.entries.filter((e) => t.ledgerEntryIds.includes(e.id)),
    }));
  }

  if (method === "POST" && p === "/api/transport") {
    const b = body as Record<string, unknown>;
    const bagIds = (b.bagIds as string[]) || [];
    let totalWeight =
      b.totalWeightKg != null
        ? Number(b.totalWeightKg)
        : 0;
    if (!b.totalWeightKg) {
      for (const s of state.shipments) {
        for (const bag of s.bags) {
          if (bagIds.includes(bag.id)) totalWeight += bag.weightKg || 0;
        }
      }
    }
    const rate = b.ratePerKg != null ? Number(b.ratePerKg) : null;
    const payable = rate != null && totalWeight > 0 ? rate * totalWeight : null;
    const assignment = {
      id: id("tr"),
      mode: String(b.mode),
      carrierId: (b.carrierId as string) || null,
      carrierName: (b.carrierName as string) || null,
      assignedDate: (b.assignedDate as string) || new Date().toISOString(),
      departureDate: (b.departureDate as string) || null,
      arrivalDate: (b.arrivalDate as string) || null,
      ratePerKg: rate,
      totalWeightKg: totalWeight || null,
      currency: (b.currency as "INR" | "THB") || "INR",
      trackingRef: (b.trackingRef as string) || null,
      notes: (b.notes as string) || null,
      deliveredToCustomer: false,
      deliveredAt: null,
      bagIds,
      ledgerEntryIds: [] as string[],
    };

    const newStatus = b.markInTransit ? "IN_TRANSIT" : "ASSIGNED";
    for (const s of state.shipments) {
      for (const bag of s.bags) {
        if (bagIds.includes(bag.id)) bag.status = newStatus;
      }
    }

    let ledgerEntry = null;
    if (b.syncToLedger && payable && assignment.carrierId) {
      ledgerEntry = {
        id: id("le"),
        partyId: assignment.carrierId,
        direction: "YOU_GOT" as const,
        amount: payable,
        currency: assignment.currency,
        description: `Transport payment (${assignment.mode}) — ${totalWeight} kg × ${rate}`,
        entryDate: new Date().toISOString(),
        fxRate: null,
        fxAmount: null,
        fxCurrency: null,
        isAutoSynced: true,
        attachments: [],
      };
      state.entries.unshift(ledgerEntry);
      assignment.ledgerEntryIds.push(ledgerEntry.id);
    }

    state.transports.unshift(assignment);
    return {
      assignment: {
        ...assignment,
        carrier: assignment.carrierId ? partyMap()[assignment.carrierId] : null,
        bags: [],
      },
      ledgerEntry,
      suggestedPayable: payable,
      synced: Boolean(ledgerEntry),
    };
  }

  const trMatch = p.match(/^\/api\/transport\/([^/]+)$/);
  if (method === "PATCH" && trMatch) {
    const t = state.transports.find((x) => x.id === trMatch[1]);
    if (!t) throw Object.assign(new Error("Not found"), { status: 404 });
    const b = body as Record<string, unknown>;
    if (b.departureDate) t.departureDate = String(b.departureDate);
    if (b.arrivalDate) t.arrivalDate = String(b.arrivalDate);
    if (b.deliveredToCustomer) {
      t.deliveredToCustomer = true;
      t.deliveredAt = new Date().toISOString();
    }
    if (b.markBagsStatus) {
      for (const s of state.shipments) {
        for (const bag of s.bags) {
          if (t.bagIds.includes(bag.id)) {
            bag.status = String(b.markBagsStatus);
            if (b.markBagsStatus === "ARRIVED") bag.arrivedAt = new Date().toISOString();
            if (b.markBagsStatus === "DELIVERED") bag.deliveredAt = new Date().toISOString();
          }
        }
      }
    }
    let ledgerEntry = null;
    if (b.syncToLedger && !t.ledgerEntryIds.length && t.carrierId && t.ratePerKg && t.totalWeightKg) {
      const amount = t.ratePerKg * t.totalWeightKg;
      ledgerEntry = {
        id: id("le"),
        partyId: t.carrierId,
        direction: "YOU_GOT" as const,
        amount,
        currency: t.currency,
        description: `Transport payment (${t.mode}) — ${t.totalWeightKg} kg × ${t.ratePerKg}`,
        entryDate: new Date().toISOString(),
        fxRate: null,
        fxAmount: null,
        fxCurrency: null,
        isAutoSynced: true,
        attachments: [],
      };
      state.entries.unshift(ledgerEntry);
      t.ledgerEntryIds.push(ledgerEntry.id);
    }
    return {
      assignment: {
        ...t,
        carrier: t.carrierId ? partyMap()[t.carrierId] : null,
        bags: t.bagIds.map((bid) => {
          for (const s of state.shipments) {
            const bag = s.bags.find((bb) => bb.id === bid);
            if (bag) return { bag };
          }
          return null;
        }).filter(Boolean),
        ledgerEntries: state.entries.filter((e) => t.ledgerEntryIds.includes(e.id)),
      },
      ledgerEntry,
    };
  }

  throw Object.assign(new Error(`Demo route not implemented: ${method} ${p}`), { status: 404 });
}
