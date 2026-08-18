// src/data.js — demo data (HTML 2.0 se port; structure wahi)
export const RATE_IN = { goldSellGm: 11899, usd: 88.24, thb: 2.547 };

export const PARTIES = [
  { id: 'lalit', name: 'Lalit', type: 'parent', books: ['k'], flag: '🇹🇭', city: 'Bangkok · Pratunam' },
  { id: 'somchai', name: 'Somchai', type: 'end', parent: 'Lalit', books: ['k'], flag: '🇹🇭', city: 'Bangkok · Chatuchak' },
  { id: 'nok', name: 'Nok', type: 'end', parent: 'Lalit', books: ['k'], flag: '🇹🇭', city: 'Bangkok · Bobae' },
  { id: 'preecha', name: 'Preecha', type: 'direct', books: ['k', 'p'], flag: '🇹🇭', city: 'Chiang Mai' },
  { id: 'meena', name: 'Meena Traders', type: 'direct', books: ['k', 'p'], flag: '🇮🇳', city: 'Delhi · Chandni Chowk' },
  { id: 'kl-my', name: 'KL Fabrics', type: 'direct', books: ['p'], flag: '🇲🇾', city: 'Kuala Lumpur' },
  { id: 'ramesh', name: 'Ramesh', type: 'carrier', books: ['k'], flag: '🇮🇳', city: 'Kolkata base' },
  { id: 'vijay', name: 'Vijay', type: 'carrier', books: ['k'], flag: '🇮🇳', city: 'Delhi base' },
];

// + = unse LENA hai, − = unko DENA hai
export const LEDG = {
  lalit: [
    { d: '2026-08-18', label: '฿ aaya · Kasikorn', thb: 5000, inr: 0 },
    { d: '2026-08-18', label: 'Convert · rate 2.55', thb: -5000, inr: 12750 },
    { d: '2026-08-18', label: 'INR cash diya', thb: 0, inr: -12750 },
    { d: '2026-08-12', label: 'Freight · 34 kg × ฿160', thb: 5440, inr: 0 },
    { d: '2026-08-10', label: '฿ cash diya (BKK)', thb: -8000, inr: 0 },
  ],
  somchai: [
    { d: '2026-08-18', label: 'Freight · 26 kg × ฿160', thb: 4160, inr: 0 },
  ],
  nok: [{ d: '2026-08-09', label: 'Convert · 2.54', thb: 0, inr: 23368 }],
  preecha: [{ d: '2026-08-15', label: 'Freight · 41 kg × ฿170', thb: 13940, inr: 0 }],
  meena: [], 'kl-my': [], ramesh: [{ d: '2026-08-18', label: 'Carrying · 52 kg', thb: 0, inr: 10400 }], vijay: [],
};

export const TRIPS = [
  { id: 't1', carrier: 'Ramesh', al: 'TG', flight: 'TG 324', dir: 'DEL → BKK', st: 'transit', now: 'CCU halt · shaam ki flight' },
  { id: 't2', carrier: 'Vijay', al: 'AI', flight: 'AI 332', dir: 'DEL → BKK', st: 'kal', now: 'Bags allot ho rahe' },
  { id: 't3', carrier: 'Suresh', al: 'FD', flight: 'FD 121', dir: 'BKK → DEL', st: 'wapsi', now: 'Landed DEL · saamaan saath' },
];

export const VAULT_HOLD = {
  samaan: { gm: 740, avgBuyGm: 11480, locs: { Delhi: 340, Bangkok: 400 } },
  somany: { usd: 12500, avgBuyRate: 87.1, locs: { Delhi: 4500, Bangkok: 8000 } },
  thb: { amt: 86000, avgBuyRate: 2.51, locs: { Bangkok: 86000 } },
};

export const BAG_LOC = { delhi: 5, kolkata: 3, bangkok: 2, transit: 1 };

export function partyBal(id) {
  let thb = 0, inr = 0;
  (LEDG[id] || []).forEach((e) => { thb += e.thb; inr += e.inr; });
  return { thb, inr };
}
export function vaultTotal() {
  const V = VAULT_HOLD, R = RATE_IN;
  const g = V.samaan.gm * R.goldSellGm, u = V.somany.usd * R.usd, t = V.thb.amt * R.thb;
  const cost = V.samaan.gm * V.samaan.avgBuyGm + V.somany.usd * V.somany.avgBuyRate + V.thb.amt * V.thb.avgBuyRate;
  return { total: g + u + t, pl: g + u + t - cost };
}
export const fI = (n) => '₹' + Math.round(Math.abs(n)).toLocaleString('en-IN');
export const fT = (n) => '฿' + Math.round(Math.abs(n)).toLocaleString('en-IN');
