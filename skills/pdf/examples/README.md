A route handler in a generated SaaS project:

```ts
import { generateQuotationPdf } from "@hermes/pdf";

export async function GET(req: Request, { params }: { params: { id: string } }) {
  const quotation = await prisma.quotation.findUniqueOrThrow({ where: { id: params.id }, include: { lineItems: true } });
  const pdf = await generateQuotationPdf({
    quotationNumber: quotation.number,
    issuedBy: { name: "Your Company" },
    issuedTo: { name: quotation.customerName },
    lineItems: quotation.lineItems,
  });
  return new Response(pdf, { headers: { "content-type": "application/pdf" } });
}
```
