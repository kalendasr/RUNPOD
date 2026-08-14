# Production image for a Hermes-generated SaaS app.
# Multi-stage: build with full devDependencies (including Prisma codegen),
# ship only the Next.js standalone server output plus the generated Prisma
# client — see docs/deployment-strategy.md.
#
# DATABASE_URL, SESSION_SECRET, STRIPE_SECRET_KEY are NOT baked into the
# image; they must be supplied at `docker run` time via --env-file, kept
# separate from development credentials (docs/security-model.md).

FROM node:22-alpine AS builder
WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm install
COPY . .
RUN npx prisma generate
RUN npm run build

FROM node:22-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder /app/node_modules/@prisma ./node_modules/@prisma
COPY --from=builder /app/prisma ./prisma

EXPOSE 3000
CMD ["node", "server.js"]
