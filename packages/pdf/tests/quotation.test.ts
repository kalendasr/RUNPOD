import { describe, expect, it } from "vitest";
import { PDFDocument } from "pdf-lib";
import { generateQuotationPdf, quotationSubtotal, type QuotationInput } from "../src/quotation.js";

const sample: QuotationInput = {
  quotationNumber: "Q-1001",
  issuedBy: { name: "Alpha Construction Co.", address: "1 Builder St" },
  issuedTo: { name: "Acme Homes", address: "2 Client Ave" },
  lineItems: [
    { description: "Foundation work", quantity: 1, unitPrice: 5000 },
    { description: "Framing lumber", quantity: 200, unitPrice: 12.5 },
  ],
  notes: "Valid for 30 days.",
};

describe("quotationSubtotal", () => {
  it("sums quantity * unitPrice across line items", () => {
    expect(quotationSubtotal(sample.lineItems)).toBe(5000 + 200 * 12.5);
  });

  it("returns 0 for no line items", () => {
    expect(quotationSubtotal([])).toBe(0);
  });
});

describe("generateQuotationPdf", () => {
  it("produces valid, loadable PDF bytes", async () => {
    const bytes = await generateQuotationPdf(sample);

    // A real structural check, not just "did it throw" — reload it with
    // the same library that wrote it and assert on the actual document.
    const reloaded = await PDFDocument.load(bytes);
    expect(reloaded.getPageCount()).toBe(1);

    const magic = Buffer.from(bytes.slice(0, 5)).toString("ascii");
    expect(magic).toBe("%PDF-");
  });

  it("still produces a valid PDF with no notes and a single line item", async () => {
    const bytes = await generateQuotationPdf({
      quotationNumber: "Q-1002",
      issuedBy: { name: "Alpha Construction Co." },
      issuedTo: { name: "Acme Homes" },
      lineItems: [{ description: "Consultation", quantity: 1, unitPrice: 100 }],
    });
    const reloaded = await PDFDocument.load(bytes);
    expect(reloaded.getPageCount()).toBe(1);
  });
});
