A pricing page's "Subscribe" button calls a route handler that invokes
`createCheckoutSession({ priceId, successUrl, cancelUrl, customerEmail })`
and redirects the browser to the returned session's URL. See
`templates/saas/lib/billing.ts`'s doc comment for the required env var.
