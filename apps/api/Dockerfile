# syntax=docker/dockerfile:1

# --- Étape 1 : dépendances (toutes, y compris de développement, pour compiler) ---
FROM node:22-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY tsconfig.json tsconfig.build.json ./
COPY scripts ./scripts
COPY src ./src
RUN npm run build

# --- Étape 2 : dépendances de production uniquement ---
FROM node:22-alpine AS prod-deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --omit=dev

# --- Étape 3 : image finale, minimale et non-root ---
FROM node:22-alpine
ENV NODE_ENV=production
WORKDIR /app
COPY --from=prod-deps /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist
COPY package.json ./
# L'utilisateur « node » (uid 1000) est fourni par l'image : aucun besoin de root à l'exécution.
USER node
EXPOSE 3000
# La sonde Docker ne teste que le processus (liveness) : voir routes/health.ts.
HEALTHCHECK --interval=15s --timeout=3s --start-period=10s --retries=3 \
	CMD wget -qO- http://127.0.0.1:3000/health/live || exit 1
CMD ["node", "dist/server.js"]
