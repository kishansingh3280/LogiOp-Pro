/**
 * Hindi Message Formatter for Papa's WhatsApp interface (Multi-Company Phase 1).
 *
 * Converts technical logistics terms to simple Hindi (Roman script) so
 * Papa (B Singh) can read status updates without needing to parse English
 * jargon. Later phases wire this into an actual WhatsApp bridge — for now
 * it's a pure utility module.
 *
 * Usage:
 *   import { formatHindi, translateTerm, formatPapaWhatsApp } from "@/src/utils/hindiFormatter";
 *   formatHindi("shipment_created", { carrier: "Rakesh", destination: "Bangkok" });
 *   // → "Maal Rakesh ke saath nikal gaya, Bangkok ja raha hai"
 */

const TEMPLATES = {
  // ---- Shipment messages ----
  shipment_created: ({ carrier, destination }) =>
    `Maal ${carrier || "carrier"} ke saath nikal gaya, ${destination || "destination"} ja raha hai`,
  shipment_delivered: ({ carrier, destination }) =>
    `Maal pahunch gaya ${destination || ""} — ${carrier || "carrier"} ne deliver kiya`,
  shipment_in_transit: ({ carrier }) =>
    `Maal raaste mein hai, ${carrier || "carrier"} le ja raha hai`,

  // ---- Ledger messages ----
  ledger_entry_created: ({ amount, currency, party }) =>
    `₹${amount || "0"} ${currency || ""} ka hisaab likh diya hai — ${party || "party"}`,
  payment_received: ({ amount, party }) =>
    `${party || "Party"} se ₹${amount || "0"} mila`,
  payment_sent: ({ amount, party }) =>
    `${party || "Party"} ko ₹${amount || "0"} bheja`,

  // ---- Bag messages ----
  bag_assigned: ({ bag_number, carrier, weight }) =>
    `Bag #${bag_number || ""} (${weight || "?"}kg) ${carrier || "carrier"} ko de diya`,
  bag_delivered: ({ bag_number, destination }) =>
    `Bag #${bag_number || ""} ${destination || ""} pahunch gaya`,

  // ---- General ----
  status_update: ({ item, status }) =>
    `${item || "Item"} ka status: ${status || "updated"}`,
  error: ({ message }) =>
    `Kuch gadbad ho gayi: ${message || "unknown error"}`,

  // ---- Dashboard ----
  pending_deliveries: ({ count }) =>
    `${count || "0"} delivery pending hai`,
  today_summary: ({ shipments, payments }) =>
    `Aaj: ${shipments || "0"} maal bheja, ₹${payments || "0"} ka len-den hua`,
};

// Simple term translations
const TERM_MAP = {
  "Shipment created": "Maal register ho gaya",
  "Shipment delivered": "Maal pahunch gaya",
  "In transit": "Raaste mein hai",
  "Payment received": "Paisa mila",
  "Payment sent": "Paisa bheja",
  "Bag assigned": "Bag de diya",
  Pending: "Pending hai",
  Delivered: "Pahunch gaya",
  Invoice: "Bill",
  Ledger: "Hisaab",
  Shipment: "Maal",
  Carrier: "Carrier bhai",
  Warehouse: "Godown",
  Customer: "Customer",
  Items: "Saman",
  Gold: "Saman", // Privacy code word
  Currency: "Paisa",
  Settings: "Setting",
  Dashboard: "Home",
};

/**
 * Format a message using a template
 * @param {string} templateKey - Key from TEMPLATES
 * @param {object} params - Parameters to fill in the template
 * @returns {string} Formatted Hindi message
 */
export function formatHindi(templateKey, params = {}) {
  const template = TEMPLATES[templateKey];
  if (!template) {
    // eslint-disable-next-line no-console
    console.warn(`[hindiFormatter] Unknown template: ${templateKey}`);
    return params.fallback || templateKey;
  }
  return template(params);
}

/**
 * Translate a single English term to Hindi
 * @param {string} term - English term
 * @returns {string} Hindi translation or original term
 */
export function translateTerm(term) {
  return TERM_MAP[term] || term;
}

/**
 * Format a WhatsApp message for Papa (B Singh)
 * Always short, simple Hindi, max 3-4 lines
 * @param {string} templateKey
 * @param {object} params
 * @returns {string} Ready-to-send WhatsApp message
 */
export function formatPapaWhatsApp(templateKey, params = {}) {
  const message = formatHindi(templateKey, params);
  if (params.withGreeting) {
    return `🙏 Papa ji,\n${message}`;
  }
  return message;
}

export default { formatHindi, translateTerm, formatPapaWhatsApp, TEMPLATES, TERM_MAP };
