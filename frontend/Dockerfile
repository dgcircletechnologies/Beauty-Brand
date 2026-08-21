FROM node:24-bookworm AS base

WORKDIR /app

COPY package*.json ./

FROM base AS development

RUN npm ci --omit=optional

COPY . .

EXPOSE 3000

CMD ["npm", "run", "dev"]

FROM base AS build

RUN npm ci --omit=optional

COPY . .

RUN npm run build
RUN npm prune --omit=dev

FROM node:24-bookworm-slim AS production

ENV NODE_ENV=production

WORKDIR /app

COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/package*.json ./
COPY --from=build /app/.next ./.next
COPY --from=build /app/public ./public
COPY --from=build /app/next.config.ts ./next.config.ts

EXPOSE 3000

CMD ["npm", "run", "start"]
