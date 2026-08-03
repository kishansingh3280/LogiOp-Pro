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
  carryRateCurrency: "INR" | "THB";
  booksSharedUntil: string | null;
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
    ownerPartyId: string | null;
    notes: string | null;
    shipDate: string;
    shippingRatePerKg: number | null;
    shippingCurrency: "INR" | "THB";
    shippingChargeTotal: number | null;
    shippingInvoicedAt: string | null;
    shippingLedgerEntryId: string | null;
    bags: Array<{
      id: string;
      bagNumber: string;
      weightKg: number | null;
      status: string;
      description: string | null;
      contents: string | null;
      customerId: string | null;
      deliveryNotes: string | null;
      shippingCharge: number | null;
      warehouseId: string | null;
      arrivedAt: string | null;
      deliveredAt: string | null;
      items: Array<{
        id: string;
        name: string;
        quantity: number;
        unit: string;
        catalogItemId: string | null;
      }>;
    }>;
  }>;
  catalogUnits: Array<{
    id: string;
    name: string;
    isActive: boolean;
  }>;
  catalogItems: Array<{
    id: string;
    name: string;
    description: string | null;
    unit: string;
    defaultRate: number | null;
    purchaseRate: number | null;
    saleRate: number | null;
    currency: "INR" | "THB";
    isActive: boolean;
  }>;
  invoices: Array<{
    id: string;
    number: string;
    partyId: string;
    shipmentId: string | null;
    status: "SENT" | "PAID" | "DRAFT" | "CANCELLED";
    amount: number;
    subtotal: number;
    currency: "INR" | "THB";
    description: string | null;
    notes: string | null;
    issueDate: string;
    dueDate: string | null;
    paidAt: string | null;
    ledgerEntryId: string | null;
    lines: Array<{
      id: string;
      description: string;
      quantity: number;
      unit: string;
      unitPrice: number;
      amount: number;
      sortOrder: number;
      catalogItemId: string | null;
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
    carryRatePerKg: 200,
    carryRateCurrency: "INR",
    booksSharedUntil: null,
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
    carryRateCurrency: "INR",
    booksSharedUntil: null,
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
    carryRateCurrency: "INR",
    booksSharedUntil: null,
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
    carryRateCurrency: "INR",
    booksSharedUntil: null,
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
    carryRatePerKg: 85,
    carryRateCurrency: "THB",
    booksSharedUntil: null,
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
    carryRateCurrency: "INR",
    booksSharedUntil: null,
    isActive: true,
  };

  const catalogUnits: DemoState["catalogUnits"] = [
    { id: "u_pcs", name: "pcs", isActive: true },
    { id: "u_meter", name: "meter", isActive: true },
    { id: "u_yard", name: "yard", isActive: true },
    { id: "u_liter", name: "liter", isActive: true },
    { id: "u_kg", name: "kg", isActive: true },
    { id: "u_pair", name: "pair", isActive: true },
    { id: "u_set", name: "set", isActive: true },
    { id: "u_box", name: "box", isActive: true },
  ];
  const catalogItems: DemoState["catalogItems"] = [
    {
      id: "ci_gift",
      name: "Gift boxes",
      description: null,
      unit: "pcs",
      defaultRate: 120,
      purchaseRate: 80,
      saleRate: 120,
      currency: "INR",
      isActive: true,
    },
    {
      id: "ci_scarf",
      name: "Scarves",
      description: null,
      unit: "pcs",
      defaultRate: 250,
      purchaseRate: 150,
      saleRate: 250,
      currency: "INR",
      isActive: true,
    },
    {
      id: "ci_mixed",
      name: "Mixed goods",
      description: null,
      unit: "pcs",
      defaultRate: 90,
      purchaseRate: 55,
      saleRate: 90,
      currency: "INR",
      isActive: true,
    },
  ];
  const catalogByName = Object.fromEntries(
    catalogItems.map((c) => [c.name, c.id])
  );

  const bags = Array.from({ length: 25 }, (_, i) => ({
    id: `bag_${String(i + 1).padStart(3, "0")}`,
    bagNumber: String(i + 1).padStart(3, "0"),
    weightKg: i < 5 ? 20 + i * 5 : i < 10 ? 8 : null,
    status: i < 5 ? "IN_TRANSIT" : "CREATED",
    description: i < 3 ? "Sample goods" : null,
    contents: null,
    customerId: i < 3 ? "p_buyer" : i < 5 ? "p_siam" : null,
    deliveryNotes: null,
    shippingCharge: i < 5 ? (20 + i * 5) * 200 : null,
    warehouseId: "wh_delhi",
    arrivedAt: null,
    deliveredAt: null,
    items:
      i < 3
        ? [
            {
              id: `bi_${i}_1`,
              name: "Gift boxes",
              unit: "pcs", quantity: 10 + i,
              catalogItemId: catalogByName["Gift boxes"],
            },
            {
              id: `bi_${i}_2`,
              name: "Scarves",
              unit: "pcs", quantity: 5,
              catalogItemId: catalogByName["Scarves"],
            },
          ]
        : i < 5
          ? [
              {
                id: `bi_${i}_1`,
                name: "Mixed goods",
                unit: "pcs", quantity: 1,
                catalogItemId: catalogByName["Mixed goods"],
              },
            ]
          : [],
  }));

  const entryAdvance: DemoEntry = {
    id: "le_advance",
    partyId: "p_rajesh",
    direction: "YOU_GAVE",
    amount: 50000,
    currency: "INR",
    description: "Credit advance against goods (demo)",
    entryDate: new Date().toISOString(),
    fxRate: null,
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
        ownerPartyId: "p_rajesh",
        notes: "Demo shipment — 25 bags Delhi → Bangkok",
        shipDate: new Date().toISOString(),
        shippingRatePerKg: 200,
        shippingCurrency: "INR",
        shippingChargeTotal: 30000,
        shippingInvoicedAt: new Date().toISOString(),
        shippingLedgerEntryId: null,
        bags,
      },
    ],
    invoices: [
      {
        id: "inv_demo",
        number: "INV-LOT-DEMO-001",
        partyId: "p_rajesh",
        shipmentId: "ship_demo",
        status: "DRAFT",
        amount: 38070,
        subtotal: 38070,
        currency: "INR",
        description: "Shipping charges for lot LOT-DEMO-001",
        notes: null,
        issueDate: new Date().toISOString(),
        dueDate: null,
        paidAt: null,
        ledgerEntryId: null,
        lines: [
          {
            id: "il_demo_ship",
            description: "Shipping charges · Lot LOT-DEMO-001 · 200/kg × 150 kg",
            quantity: 1,
            unit: "lot",
            unitPrice: 30000,
            amount: 30000,
            sortOrder: 0,
            catalogItemId: null,
          },
          {
            id: "il_demo_gift",
            description: "Goods shipped · Gift boxes",
            quantity: 33,
            unit: "pcs",
            unitPrice: 120,
            amount: 3960,
            sortOrder: 1,
            catalogItemId: "ci_gift",
          },
          {
            id: "il_demo_scarf",
            description: "Goods shipped · Scarves",
            quantity: 15,
            unit: "pcs",
            unitPrice: 250,
            amount: 3750,
            sortOrder: 2,
            catalogItemId: "ci_scarf",
          },
          {
            id: "il_demo_mixed",
            description: "Goods shipped · Mixed goods",
            quantity: 2,
            unit: "pcs",
            unitPrice: 90,
            amount: 180,
            sortOrder: 3,
            catalogItemId: "ci_mixed",
          },
        ],
      },
    ],
    catalogUnits,
    catalogItems,
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

function upsertCatalogItem(opts: {
  name: string;
  unit?: string;
  defaultRate?: number | null;
  purchaseRate?: number | null;
  saleRate?: number | null;
  currency?: "INR" | "THB";
  description?: string | null;
}): DemoState["catalogItems"][0] {
  const name = opts.name.trim();
  const existing = state.catalogItems.find((c) => c.name === name);
  if (existing) {
    existing.isActive = true;
    if (opts.description !== undefined) existing.description = opts.description;
    if (opts.unit != null) existing.unit = opts.unit;
    if (opts.defaultRate !== undefined) existing.defaultRate = opts.defaultRate;
    if (opts.purchaseRate !== undefined)
      existing.purchaseRate = opts.purchaseRate;
    if (opts.saleRate !== undefined) existing.saleRate = opts.saleRate;
    if (opts.currency != null) existing.currency = opts.currency;
    return existing;
  }
  const item: DemoState["catalogItems"][0] = {
    id: id("ci"),
    name,
    description: opts.description ?? null,
    unit: opts.unit || "pcs",
    defaultRate: opts.defaultRate ?? opts.saleRate ?? null,
    purchaseRate: opts.purchaseRate ?? null,
    saleRate: opts.saleRate ?? null,
    currency: opts.currency || "INR",
    isActive: true,
  };
  state.catalogItems.push(item);
  return item;
}

function lineAmount(qty: number, price: number) {
  return Math.round(qty * price * 100) / 100;
}

function enrichInvoice(inv: DemoState["invoices"][0]) {
  const shipment = inv.shipmentId
    ? state.shipments.find((s) => s.id === inv.shipmentId)
    : null;
  return {
    ...inv,
    party: partyMap()[inv.partyId] || null,
    shipment: shipment
      ? { id: shipment.id, lotNumber: shipment.lotNumber }
      : null,
    lines: [...inv.lines].sort((a, b) => a.sortOrder - b.sortOrder),
  };
}

function enrichInvoiceDetail(inv: DemoState["invoices"][0]) {
  const shipment = inv.shipmentId
    ? state.shipments.find((s) => s.id === inv.shipmentId)
    : null;
  return {
    ...inv,
    party: partyMap()[inv.partyId] || null,
    shipment: shipment || null,
    lines: [...inv.lines]
      .sort((a, b) => a.sortOrder - b.sortOrder)
      .map((l) => ({
        ...l,
        catalogItem: l.catalogItemId
          ? state.catalogItems.find((c) => c.id === l.catalogItemId) || null
          : null,
      })),
  };
}

export async function demoHandle(method: string, path: string, body?: unknown): Promise<unknown> {
  const url = new URL(path, "http://demo.local");
  const p = url.pathname;
  const q = url.searchParams;

  // Catalog items
  if (method === "GET" && p === "/api/units") {
    return state.catalogUnits.filter((u) => u.isActive).sort((a, b) => a.name.localeCompare(b.name));
  }
  if (method === "POST" && p === "/api/units") {
    const b = body as Record<string, unknown>;
    const name = String(b.name || "").trim().toLowerCase();
    if (!name) throw Object.assign(new Error("Unit name required"), { status: 400 });
    const existing = state.catalogUnits.find((u) => u.name === name);
    if (existing) {
      existing.isActive = true;
      return existing;
    }
    const unit = { id: id("u"), name, isActive: true };
    state.catalogUnits.push(unit);
    return unit;
  }
  const unitMatch = p.match(/^\/api\/units\/([^/]+)$/);
  if (method === "DELETE" && unitMatch) {
    const unit = state.catalogUnits.find((u) => u.id === unitMatch[1]);
    if (!unit) throw Object.assign(new Error("Not found"), { status: 404 });
    unit.isActive = false;
    return { ok: true };
  }

  if (method === "GET" && p === "/api/items") {
    return state.catalogItems
      .filter((c) => c.isActive)
      .sort((a, b) => a.name.localeCompare(b.name));
  }
  if (method === "POST" && p === "/api/items") {
    const b = body as Record<string, unknown>;
    const name = String(b.name || "").trim();
    if (!name) throw Object.assign(new Error("Name required"), { status: 400 });
    const existing = state.catalogItems.find((c) => c.name === name);
    if (existing) {
      existing.isActive = true;
      if (b.description !== undefined)
        existing.description = (b.description as string) || null;
      if (b.unit != null) existing.unit = String(b.unit);
      if (b.defaultRate !== undefined) {
        existing.defaultRate =
          b.defaultRate != null ? Number(b.defaultRate) : null;
      }
      if (b.purchaseRate !== undefined) {
        existing.purchaseRate =
          b.purchaseRate != null ? Number(b.purchaseRate) : null;
      }
      if (b.saleRate !== undefined) {
        existing.saleRate = b.saleRate != null ? Number(b.saleRate) : null;
      }
      if (b.currency != null)
        existing.currency = b.currency as "INR" | "THB";
      return existing;
    }
    const item: DemoState["catalogItems"][0] = {
      id: id("ci"),
      name,
      description: (b.description as string) || null,
      unit: (b.unit as string) || "pcs",
      defaultRate: b.defaultRate != null ? Number(b.defaultRate) : null,
      purchaseRate: b.purchaseRate != null ? Number(b.purchaseRate) : null,
      saleRate: b.saleRate != null ? Number(b.saleRate) : null,
      currency: (b.currency as "INR" | "THB") || "INR",
      isActive: true,
    };
    state.catalogItems.push(item);
    return item;
  }
  const itemMatch = p.match(/^\/api\/items\/([^/]+)$/);
  if (method === "PATCH" && itemMatch) {
    const item = state.catalogItems.find((c) => c.id === itemMatch[1]);
    if (!item) throw Object.assign(new Error("Not found"), { status: 404 });
    const b = (body || {}) as Record<string, unknown>;
    if (b.name != null) item.name = String(b.name).trim();
    if (b.description !== undefined)
      item.description = (b.description as string) || null;
    if (b.unit != null) item.unit = String(b.unit);
    if (b.defaultRate !== undefined) {
      item.defaultRate = b.defaultRate != null ? Number(b.defaultRate) : null;
    }
    if (b.purchaseRate !== undefined) {
      item.purchaseRate =
        b.purchaseRate != null ? Number(b.purchaseRate) : null;
    }
    if (b.saleRate !== undefined) {
      item.saleRate = b.saleRate != null ? Number(b.saleRate) : null;
    }
    if (b.currency != null) item.currency = b.currency as "INR" | "THB";
    if (b.isActive != null) item.isActive = Boolean(b.isActive);
    return item;
  }
  if (method === "DELETE" && itemMatch) {
    const item = state.catalogItems.find((c) => c.id === itemMatch[1]);
    if (!item) throw Object.assign(new Error("Not found"), { status: 404 });
    item.isActive = false;
    return { ok: true };
  }

  // Invoices
  if (method === "GET" && p === "/api/invoices") {
    const status = q.get("status");
    const partyId = q.get("partyId");
    return state.invoices
      .filter((inv) => (!status || inv.status === status) && (!partyId || inv.partyId === partyId))
      .sort((a, b) => b.issueDate.localeCompare(a.issueDate))
      .map(enrichInvoice);
  }
  if (method === "POST" && p === "/api/invoices") {
    const b = body as Record<string, unknown>;
    if (!b.partyId)
      throw Object.assign(new Error("Customer required"), { status: 400 });
    const rawLines = (Array.isArray(b.lines) ? b.lines : []) as Array<
      Record<string, unknown>
    >;
    if (rawLines.length === 0)
      throw Object.assign(new Error("Add at least one line"), { status: 400 });

    const currency = (b.currency as "INR" | "THB") || "INR";
    const prepared = rawLines.map((l, i) => {
      const quantity = Number(l.quantity) || 0;
      const unitPrice = Number(l.unitPrice) || 0;
      return {
        id: id("il"),
        catalogItemId: (l.catalogItemId as string) || null,
        description: String(l.description || "Item").trim(),
        quantity,
        unit: (l.unit as string) || "pcs",
        unitPrice,
        amount: lineAmount(quantity, unitPrice),
        sortOrder: i,
      };
    });
    const subtotal = prepared.reduce((s, l) => s + l.amount, 0);
    const amount = subtotal;
    const status =
      (b.status as DemoState["invoices"][0]["status"]) || "DRAFT";
    const number =
      (b.number as string) ||
      `INV-${new Date().toISOString().slice(0, 10).replace(/-/g, "")}-${Math.floor(
        Math.random() * 9000 + 1000
      )}`;

    for (const l of prepared) {
      if (!l.description) continue;
      const existing = state.catalogItems.find((c) => c.name === l.description);
      if (!existing) {
        const created = upsertCatalogItem({
          name: l.description,
          unit: l.unit,
          defaultRate: l.unitPrice,
          currency,
        });
        l.catalogItemId = created.id;
      } else if (!l.catalogItemId) {
        l.catalogItemId = existing.id;
      }
    }

    let ledgerEntryId: string | null = null;
    if (status === "SENT" || status === "PAID") {
      const ledger: DemoEntry = {
        id: id("le"),
        partyId: String(b.partyId),
        direction: "YOU_GAVE",
        amount,
        currency,
        description: `Invoice ${number}${b.description ? ` · ${b.description}` : ""}`,
        entryDate: (b.issueDate as string) || new Date().toISOString(),
        fxRate: null,
        fxAmount: null,
        fxCurrency: null,
        isAutoSynced: true,
        attachments: [],
      };
      state.entries.unshift(ledger);
      ledgerEntryId = ledger.id;
    }

    const inv: DemoState["invoices"][0] = {
      id: id("inv"),
      number,
      partyId: String(b.partyId),
      shipmentId: (b.shipmentId as string) || null,
      status,
      currency,
      subtotal,
      amount,
      description: (b.description as string) || null,
      notes: (b.notes as string) || null,
      issueDate: (b.issueDate as string) || new Date().toISOString(),
      dueDate: (b.dueDate as string) || null,
      paidAt: status === "PAID" ? new Date().toISOString() : null,
      ledgerEntryId,
      lines: prepared,
    };
    state.invoices.unshift(inv);
    return enrichInvoiceDetail(inv);
  }

  const invMatch = p.match(/^\/api\/invoices\/([^/]+)$/);
  if (method === "GET" && invMatch) {
    const inv = state.invoices.find((x) => x.id === invMatch[1]);
    if (!inv) throw Object.assign(new Error("Not found"), { status: 404 });
    return enrichInvoiceDetail(inv);
  }
  if (method === "PATCH" && invMatch) {
    const inv = state.invoices.find((x) => x.id === invMatch[1]);
    if (!inv) throw Object.assign(new Error("Not found"), { status: 404 });
    const b = (body || {}) as Record<string, unknown>;
    const nextStatus =
      (b.status as DemoState["invoices"][0]["status"]) || inv.status;

    if (
      Array.isArray(b.lines) &&
      inv.status !== "PAID" &&
      inv.status !== "CANCELLED"
    ) {
      for (const row of b.lines as Array<{
        id: string;
        unitPrice?: number;
        quantity?: number;
      }>) {
        const line = inv.lines.find((l) => l.id === row.id);
        if (!line) continue;
        if (row.unitPrice != null) line.unitPrice = Number(row.unitPrice) || 0;
        if (row.quantity != null) line.quantity = Number(row.quantity) || 0;
        line.amount = lineAmount(line.quantity, line.unitPrice);
      }
      inv.subtotal = inv.lines.reduce((s, l) => s + l.amount, 0);
      inv.amount = Math.round(inv.subtotal * 100) / 100;
      inv.subtotal = inv.amount;
    }

    if (nextStatus === "SENT" && inv.status === "DRAFT" && !inv.ledgerEntryId) {
      const ledger: DemoEntry = {
        id: id("le"),
        partyId: inv.partyId,
        direction: "YOU_GAVE",
        amount: inv.amount,
        currency: inv.currency,
        description: `Invoice ${inv.number}${
          inv.description ? ` · ${inv.description}` : ""
        }`,
        entryDate: inv.issueDate || new Date().toISOString(),
        fxRate: null,
        fxAmount: null,
        fxCurrency: null,
        isAutoSynced: true,
        attachments: [],
      };
      state.entries.unshift(ledger);
      inv.ledgerEntryId = ledger.id;
      if (inv.shipmentId) {
        const ship = state.shipments.find((s) => s.id === inv.shipmentId);
        if (ship) ship.shippingLedgerEntryId = ledger.id;
      }
    }

    if (nextStatus === "PAID" && inv.status !== "PAID") {
      const ledger: DemoEntry = {
        id: id("le"),
        partyId: inv.partyId,
        direction: "YOU_GOT",
        amount: inv.amount,
        currency: inv.currency,
        description: `Payment received · Invoice ${inv.number}`,
        entryDate: new Date().toISOString(),
        fxRate: null,
        fxAmount: null,
        fxCurrency: null,
        isAutoSynced: true,
        attachments: [],
      };
      state.entries.unshift(ledger);
    }

    if (b.status != null)
      inv.status = b.status as DemoState["invoices"][0]["status"];
    if (b.notes !== undefined) inv.notes = (b.notes as string) || null;
    if (b.description !== undefined)
      inv.description = (b.description as string) || null;
    if (b.dueDate !== undefined) inv.dueDate = (b.dueDate as string) || null;
    if (nextStatus === "PAID" && !inv.paidAt) {
      inv.paidAt = new Date().toISOString();
    } else if (nextStatus !== "PAID" && b.status != null) {
      inv.paidAt = null;
    }
    return enrichInvoiceDetail(inv);
  }
  if (method === "DELETE" && invMatch) {
    const inv = state.invoices.find((x) => x.id === invMatch[1]);
    if (!inv) throw Object.assign(new Error("Not found"), { status: 404 });
    inv.status = "CANCELLED";
    return { ok: true };
  }

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

    const monthKeys: string[] = [];
    const now = new Date();
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      monthKeys.push(key);
    }
    const buckets = new Map(
      monthKeys.map((key) => {
        const [y, m] = key.split("-").map(Number);
        const label = new Date(y, m - 1, 1).toLocaleString("en", {
          month: "short",
        });
        return [
          key,
          { key, label, revenue: 0, cost: 0, profit: 0, cumulative: 0 },
        ];
      })
    );
    const catalogById = Object.fromEntries(
      state.catalogItems.map((c) => [c.id, c])
    );
    for (const inv of state.invoices) {
      if (inv.status === "CANCELLED" || inv.currency !== "INR") continue;
      const d = new Date(inv.issueDate);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      const bucket = buckets.get(key);
      if (!bucket) continue;
      for (const line of inv.lines) {
        bucket.revenue += line.amount;
        const cat = line.catalogItemId
          ? catalogById[line.catalogItemId]
          : null;
        if (cat?.purchaseRate != null && cat.purchaseRate > 0) {
          bucket.cost += cat.purchaseRate * line.quantity;
        }
      }
    }
    let running = 0;
    const pnlSeries = monthKeys.map((key) => {
      const m = buckets.get(key)!;
      m.profit = Math.round((m.revenue - m.cost) * 100) / 100;
      running += m.profit;
      m.cumulative = Math.round(running * 100) / 100;
      m.revenue = Math.round(m.revenue * 100) / 100;
      m.cost = Math.round(m.cost * 100) / 100;
      return m;
    });
    const pnlSummary = {
      revenue: pnlSeries.reduce((s, m) => s + m.revenue, 0),
      cost: pnlSeries.reduce((s, m) => s + m.cost, 0),
      profit: pnlSeries.reduce((s, m) => s + m.profit, 0),
      currency: "INR" as const,
    };

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
      pnlSeries,
      pnlSummary,
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
      quoteMode: "INR_PER_THB",
      defaultCurrency: (b.defaultCurrency as "INR" | "THB") || "INR",
      carryRatePerKg: b.carryRatePerKg != null ? Number(b.carryRatePerKg) : null,
      carryRateCurrency: (b.carryRateCurrency as "INR" | "THB") || "INR",
      booksSharedUntil: (b.booksSharedUntil as string) || null,
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
  if (method === "PATCH" && ledgerMatch) {
    const entry = state.entries.find((e) => e.id === ledgerMatch[1]);
    if (!entry) throw Object.assign(new Error("Not found"), { status: 404 });
    const b = (body || {}) as Record<string, unknown>;
    if (b.direction != null) entry.direction = b.direction as "YOU_GAVE" | "YOU_GOT";
    if (b.amount != null) entry.amount = Number(b.amount);
    if (b.currency != null) entry.currency = b.currency as "INR" | "THB";
    if (b.description !== undefined) entry.description = (b.description as string) || null;
    if (b.entryDate != null) entry.entryDate = String(b.entryDate);
    if (b.fxRate !== undefined) {
      entry.fxRate = b.fxRate != null ? Number(b.fxRate) : null;
    }
    if (b.fxAmount !== undefined) {
      entry.fxAmount = b.fxAmount != null ? Number(b.fxAmount) : null;
    }
    if (b.fxCurrency !== undefined) {
      entry.fxCurrency = (b.fxCurrency as "INR" | "THB") || null;
    }
    return { ...entry, party: partyMap()[entry.partyId] };
  }
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
    const parties = partyMap();
    return state.shipments.map((s) => ({
      ...s,
      originWarehouse: wh[s.originWarehouseId] || null,
      destWarehouse: wh[s.destWarehouseId] || null,
      ownerParty: s.ownerPartyId ? parties[s.ownerPartyId] || null : null,
      invoices: state.invoices.filter((inv) => inv.shipmentId === s.id),
      bags: s.bags.map((b) => enrichBag(b, s)),
      _count: { bags: s.bags.length },
    }));
  }

  if (method === "POST" && p === "/api/shipments") {
    const b = body as Record<string, unknown>;
    const count = Number(b.bagCount) || 0;
    const details = (Array.isArray(b.bags) ? b.bags : []) as Array<
      Record<string, unknown>
    >;
    const ownerPartyId =
      (b.ownerPartyId as string) ||
      (b.defaultCustomerId as string) ||
      null;
    const shippingRatePerKg =
      b.shippingRatePerKg != null ? Number(b.shippingRatePerKg) : null;
    const shippingCurrency = (b.shippingCurrency as "INR" | "THB") || "INR";
    const bags = Array.from({ length: count }, (_, i) => {
      const d = details[i] || {};
      const weightKg = d.weightKg != null ? Number(d.weightKg) : null;
      let shippingCharge =
        d.shippingCharge != null ? Number(d.shippingCharge) : null;
      if (
        shippingCharge == null &&
        shippingRatePerKg != null &&
        weightKg != null &&
        weightKg > 0
      ) {
        shippingCharge = shippingRatePerKg * weightKg;
      }
      const rawItems = Array.isArray(d.items)
        ? (d.items as Array<{ name?: string; quantity?: number; unit?: string }>)
        : [];
      return {
        id: id("bag"),
        bagNumber: String(d.bagNumber || String(i + 1).padStart(3, "0")),
        weightKg,
        status: "CREATED",
        description: (d.description as string) || null,
        contents: null,
        customerId: (d.customerId as string) || null,
        deliveryNotes: null,
        shippingCharge,
        warehouseId: (b.originWarehouseId as string) || null,
        arrivedAt: null,
        deliveredAt: null,
        items: rawItems
          .filter((it) => it.name?.trim())
          .map((it) => ({
            id: id("bi"),
            name: String(it.name).trim(),
            quantity: Math.max(0.01, Number(it.quantity) || 1),
            unit: String(it.unit || "pcs").toLowerCase(),
            catalogItemId: null as string | null,
          })),
      };
    });
    const totalWeight = bags.reduce((s, x) => s + (x.weightKg || 0), 0);
    const shippingChargeTotal =
      b.shippingChargeTotal != null
        ? Number(b.shippingChargeTotal)
        : bags.reduce((s, x) => s + (x.shippingCharge || 0), 0) || null;

    const ship = {
      id: id("ship"),
      lotNumber: String(b.lotNumber),
      batchNumber: (b.batchNumber as string) || null,
      direction: String(b.direction || "IN_TO_TH"),
      originWarehouseId: String(b.originWarehouseId || ""),
      destWarehouseId: String(b.destWarehouseId || ""),
      ownerPartyId,
      notes: (b.notes as string) || null,
      shipDate: (b.shipDate as string) || new Date().toISOString(),
      shippingRatePerKg,
      shippingCurrency,
      shippingChargeTotal,
      shippingInvoicedAt: null as string | null,
      shippingLedgerEntryId: null as string | null,
      bags,
    };

    if (
      b.createInvoice === true &&
      ownerPartyId &&
      shippingChargeTotal != null &&
      shippingChargeTotal > 0
    ) {
      const invNumber = `INV-${ship.lotNumber}`;

      const itemNames = new Map<
        string,
        { name: string; qty: number; unit: string }
      >();
      for (const bag of bags) {
        for (const it of bag.items) {
          const name = it.name.trim();
          if (!name) continue;
          const unit = (it.unit || "pcs").toLowerCase();
          const key = `${name}||${unit}`;
          const prev = itemNames.get(key);
          itemNames.set(key, {
            name,
            unit,
            qty: (prev?.qty || 0) + it.quantity,
          });
        }
      }
      const catalogIds = new Map<string, string>();
      const catalogRates = new Map<string, number>();
      for (const { name, unit } of itemNames.values()) {
        const cat = upsertCatalogItem({
          name,
          unit,
          currency: shippingCurrency,
        });
        catalogIds.set(name, cat.id);
        catalogRates.set(name, cat.saleRate ?? cat.defaultRate ?? 0);
      }
      for (const bag of bags) {
        for (const it of bag.items) {
          const cid = catalogIds.get(it.name.trim());
          if (cid) it.catalogItemId = cid;
        }
      }

      const lines: DemoState["invoices"][0]["lines"] = [
        {
          id: id("il"),
          catalogItemId: null,
          description: `Shipping charges · Lot ${ship.lotNumber}${
            shippingRatePerKg != null
              ? ` · ${shippingRatePerKg}/kg × ${totalWeight || "?"} kg`
              : ""
          }`,
          quantity: 1,
          unit: "lot",
          unitPrice: shippingChargeTotal,
          amount: shippingChargeTotal,
          sortOrder: 0,
        },
      ];
      let sort = 1;
      let goodsTotal = 0;
      for (const { name, qty, unit } of itemNames.values()) {
        const unitPrice = catalogRates.get(name) || 0;
        const amount = Math.round(qty * unitPrice * 100) / 100;
        goodsTotal += amount;
        lines.push({
          id: id("il"),
          catalogItemId: catalogIds.get(name) || null,
          description: `Goods shipped · ${name}`,
          quantity: qty,
          unit,
          unitPrice,
          amount,
          sortOrder: sort++,
        });
      }

      const invoiceTotal =
        Math.round((shippingChargeTotal + goodsTotal) * 100) / 100;

      const inv: DemoState["invoices"][0] = {
        id: id("inv"),
        number: invNumber,
        partyId: ownerPartyId,
        shipmentId: ship.id,
        status: "DRAFT",
        amount: invoiceTotal,
        subtotal: invoiceTotal,
        currency: shippingCurrency,
        description: `Shipping charges for lot ${ship.lotNumber}`,
        notes: null,
        issueDate: ship.shipDate,
        dueDate: null,
        paidAt: null,
        ledgerEntryId: null,
        lines,
      };
      state.invoices.unshift(inv);
      ship.shippingInvoicedAt = new Date().toISOString();
    }

    state.shipments.unshift(ship);
    const wh = warehouseMap();
    const parties = partyMap();
    return {
      ...ship,
      originWarehouse: wh[ship.originWarehouseId] || null,
      destWarehouse: wh[ship.destWarehouseId] || null,
      ownerParty: ship.ownerPartyId ? parties[ship.ownerPartyId] || null : null,
      invoices: state.invoices.filter((inv) => inv.shipmentId === ship.id),
      bags: ship.bags,
    };
  }

  const shipMatch = p.match(/^\/api\/shipments\/([^/]+)$/);
  if (method === "GET" && shipMatch) {
    const s = state.shipments.find((x) => x.id === shipMatch[1]);
    if (!s) throw Object.assign(new Error("Not found"), { status: 404 });
    const wh = warehouseMap();
    const parties = partyMap();
    return {
      ...s,
      originWarehouse: wh[s.originWarehouseId] || null,
      destWarehouse: wh[s.destWarehouseId] || null,
      ownerParty: s.ownerPartyId ? parties[s.ownerPartyId] || null : null,
      invoices: state.invoices.filter((inv) => inv.shipmentId === s.id),
      bags: s.bags
        .map((b) => enrichBag(b, s))
        .sort((a, b) => a.bagNumber.localeCompare(b.bagNumber)),
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
      deliveryNotes: null,
      shippingCharge: null,
      warehouseId: s.originWarehouseId,
      arrivedAt: null,
      deliveredAt: null,
      items: [],
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
