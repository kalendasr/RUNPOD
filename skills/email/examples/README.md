```ts
import { emailProvider } from "@/lib/email";

await emailProvider.send({
  to: customer.email,
  subject: `Quotation #${quotation.number}`,
  body: "Your quotation is attached.",
});
```
