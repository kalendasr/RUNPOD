import { PDFDocument, StandardFonts, rgb } from "pdf-lib";

export interface QuotationLineItem {
  description: string;
  quantity: number;
  unitPrice: number;
}

export interface QuotationParty {
  name: string;
  address?: string;
}

export interface QuotationInput {
  quotationNumber: string;
  issuedTo: QuotationParty;
  issuedBy: QuotationParty;
  lineItems: QuotationLineItem[];
  currencySymbol?: string;
  notes?: string;
}

export interface Quotation extends QuotationInput {
  subtotal: number;
}

function formatMoney(amount: number, symbol: string): string {
  return `${symbol}${amount.toFixed(2)}`;
}

export function quotationSubtotal(lineItems: QuotationLineItem[]): number {
  return lineItems.reduce((total, item) => total + item.quantity * item.unitPrice, 0);
}

/**
 * Generates a one-page PDF quotation — the roadmap's own worked example
 * (§3: "generate PDF quotations" for a construction-quotes SaaS). Kept
 * deliberately simple (one page, no tax/discount logic, no letterhead
 * image) — a real project layers styling on top via the design-system
 * skill once one exists, not by complicating this function.
 */
export async function generateQuotationPdf(input: QuotationInput): Promise<Uint8Array> {
  const symbol = input.currencySymbol ?? "$";
  const subtotal = quotationSubtotal(input.lineItems);

  const doc = await PDFDocument.create();
  const page = doc.addPage([595, 842]); // A4
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const bold = await doc.embedFont(StandardFonts.HelveticaBold);

  let y = 800;
  const left = 50;
  const lineHeight = 18;

  const draw = (text: string, opts: { x?: number; size?: number; f?: typeof font } = {}) => {
    page.drawText(text, { x: opts.x ?? left, y, size: opts.size ?? 11, font: opts.f ?? font, color: rgb(0, 0, 0) });
    y -= lineHeight;
  };

  draw(`Quotation #${input.quotationNumber}`, { size: 20, f: bold });
  y -= 8;

  draw(`From: ${input.issuedBy.name}`, { f: bold });
  if (input.issuedBy.address) draw(input.issuedBy.address);
  y -= 8;

  draw(`To: ${input.issuedTo.name}`, { f: bold });
  if (input.issuedTo.address) draw(input.issuedTo.address);
  y -= 16;

  draw("Description", { f: bold });
  page.drawText("Qty", { x: 350, y: y + lineHeight, size: 11, font: bold });
  page.drawText("Unit price", { x: 410, y: y + lineHeight, size: 11, font: bold });
  page.drawText("Amount", { x: 500, y: y + lineHeight, size: 11, font: bold });
  y -= 4;
  page.drawLine({ start: { x: left, y }, end: { x: 545, y }, thickness: 1, color: rgb(0.7, 0.7, 0.7) });
  y -= 14;

  for (const item of input.lineItems) {
    const amount = item.quantity * item.unitPrice;
    page.drawText(item.description, { x: left, y, size: 11, font });
    page.drawText(String(item.quantity), { x: 350, y, size: 11, font });
    page.drawText(formatMoney(item.unitPrice, symbol), { x: 410, y, size: 11, font });
    page.drawText(formatMoney(amount, symbol), { x: 500, y, size: 11, font });
    y -= lineHeight;
  }

  y -= 8;
  page.drawLine({ start: { x: left, y }, end: { x: 545, y }, thickness: 1, color: rgb(0.7, 0.7, 0.7) });
  y -= 20;
  draw(`Subtotal: ${formatMoney(subtotal, symbol)}`, { x: 400, f: bold });

  if (input.notes) {
    y -= 20;
    draw("Notes:", { f: bold });
    draw(input.notes, { size: 10 });
  }

  return doc.save();
}
