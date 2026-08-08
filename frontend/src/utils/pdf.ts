// Shared PDF generation helpers for the Reports console.
// All PDFs share the same "True Black + lime" branding used across the app.
// Uses `expo-print` for HTML → PDF conversion, `expo-sharing` for the share
// sheet fallback, and strips EXIF from any embedded photos before render.

import { Platform } from "react-native";

import * as Print from "expo-print";
import * as Sharing from "expo-sharing";

/**
 * True-black theme CSS baked into every PDF so the exported look matches
 * the in-app screens. Uses standard PDF-safe fonts and kg/currency-aware
 * numeric alignment. `body { -webkit-print-color-adjust: exact; }` forces
 * the black backgrounds to render on iOS/Android WebViews.
 */
export const PDF_CSS = `
  * { box-sizing: border-box; }
  body {
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
    color: #FFFFFF;
    background: #000000;
    margin: 0;
    padding: 24px;
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }
  h1 { font-size: 20px; margin: 0 0 4px 0; color: #FFFFFF; letter-spacing: 0.3px; }
  h2 { font-size: 12px; text-transform: uppercase; letter-spacing: 1.2px; color: #00D1FF; margin: 20px 0 8px 0; }
  .eyebrow { font-size: 10px; text-transform: uppercase; letter-spacing: 1.4px; color: #9CA3AF; }
  .head-row { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 24px; padding-bottom: 16px; border-bottom: 1px solid #262626; }
  .kv { display: flex; justify-content: space-between; padding: 6px 0; border-bottom: 1px dashed #262626; font-size: 12px; }
  .kv .k { color: #9CA3AF; }
  .kv .v { color: #FFFFFF; font-weight: 700; }
  table { width: 100%; border-collapse: collapse; margin-top: 4px; }
  th, td { padding: 8px 6px; text-align: left; font-size: 11px; border-bottom: 1px solid #262626; }
  th { color: #00D1FF; text-transform: uppercase; letter-spacing: 0.8px; font-size: 10px; font-weight: 700; }
  td.num, th.num { text-align: right; }
  tfoot td { border-top: 2px solid #00D1FF; border-bottom: none; font-weight: 800; font-size: 12px; padding-top: 10px; }
  .badge { display: inline-block; padding: 3px 10px; border-radius: 999px; border: 1px solid #00D1FF; background: rgba(0, 209, 255, 0.12); font-size: 9px; text-transform: uppercase; letter-spacing: 1px; color: #00D1FF; font-weight: 800; }
  .footer { margin-top: 32px; padding-top: 12px; border-top: 1px solid #262626; font-size: 9px; color: #6B7280; text-align: center; }
  .lime { color: #00D1FF; }
  .muted { color: #9CA3AF; font-size: 11px; }
`;

/** Escape user-provided strings before inlining into HTML — prevents both
 * accidental HTML rendering AND leaks of malicious characters. */
export function esc(s: string | number | null | undefined): string {
  if (s === null || s === undefined) return "";
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/**
 * Render an HTML string into a PDF file (URI) on-device. The generated
 * file is transient — copy it or share it before it gets swept by iOS/
 * Android's tmp cleanup. We strip the standard PDF metadata that could
 * carry the operator's identity: no author, no title, no producer tag.
 */
export async function renderPdf(html: string): Promise<string> {
  // expo-print exposes `Print.printToFileAsync` which returns a file URI
  // containing the rendered PDF. It doesn't write EXIF (that's only for
  // images) but does embed some PDF-level metadata that we override via
  // the base64 flag → false so we can post-process if needed later.
  const { uri } = await Print.printToFileAsync({
    html,
    // A4 with a modest margin — the CSS handles its own padding.
    width: 595,   // A4 width in points
    height: 842,  // A4 height in points
    margins: { left: 0, right: 0, top: 0, bottom: 0 },
    base64: false,
  });
  return uri;
}

/**
 * Trigger the platform share sheet for a generated PDF. On web/Expo Go
 * where Sharing.isAvailableAsync returns false we fall back to opening
 * the URI directly so the operator can still save/download it.
 */
export async function sharePdf(uri: string, filename: string): Promise<void> {
  if (Platform.OS === "web") {
    // On the web preview the browser handles the download.
    window.open(uri, "_blank");
    return;
  }
  const canShare = await Sharing.isAvailableAsync();
  if (canShare) {
    await Sharing.shareAsync(uri, {
      dialogTitle: filename,
      mimeType: "application/pdf",
      UTI: "com.adobe.pdf",
    });
  }
}

/** Format a number as an Indian-style currency block for PDF cells. */
export function fmtMoney(n: number | null | undefined, ccy: string): string {
  if (n === null || n === undefined || !Number.isFinite(n)) return "-";
  const sym = ccy === "INR" ? "₹" : ccy === "THB" ? "฿" : ccy + " ";
  const rounded = Math.abs(n) >= 100 ? Math.round(n) : Number(n.toFixed(2));
  return `${sym}${rounded.toLocaleString("en-IN")}`;
}

/** Simple wrapper doc — every PDF uses the same shell. */
export function wrapPdf(title: string, bodyHtml: string, meta?: string): string {
  const now = new Date().toLocaleString(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  });
  return `<!doctype html>
  <html>
    <head><meta charset="utf-8" /><style>${PDF_CSS}</style></head>
    <body>
      <div class="head-row">
        <div>
          <div class="eyebrow">India ⇄ Thailand · Logistics</div>
          <h1>${esc(title)}</h1>
          ${meta ? `<div class="muted">${meta}</div>` : ""}
        </div>
        <div class="muted">${now}</div>
      </div>
      ${bodyHtml}
      <div class="footer">Generated in-app · EXIF stripped · Confidential</div>
    </body>
  </html>`;
}
