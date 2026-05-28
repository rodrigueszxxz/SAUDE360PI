# syntax=docker/dockerfile:1

# ── Estágio de desenvolvimento ────────────────────────────────────────────────
FROM node:20-alpine AS development

WORKDIR /app

# Instala dependências de sistema necessárias
RUN apk add --no-cache \
    python3 \
    make \
    g++

# Copia manifesto de dependências primeiro (para cache de camadas)
COPY package*.json ./

# Instala dependências (inclui devDeps para hot-reload)
RUN npm ci --ignore-scripts

# Copia código fonte
COPY . .

EXPOSE 3002

# Hot-reload com node --watch
CMD ["node", "--watch", "app.js"]

# ── Estágio de produção ───────────────────────────────────────────────────────
FROM node:20-alpine AS production

WORKDIR /app

RUN apk add --no-cache \
    python3 \
    make \
    g++ \
    tini

# Usuário não-root por segurança
RUN addgroup -g 1001 -S nodejs && \
    adduser  -S nodejs -u 1001

COPY package*.json ./

# Apenas dependências de produção
RUN npm ci --omit=dev --ignore-scripts && \
    npm cache clean --force

COPY --chown=nodejs:nodejs . .

USER nodejs

EXPOSE 3002

# Usa tini como PID 1 para signal handling correto
ENTRYPOINT ["/sbin/tini", "--"]
CMD ["node", "app.js"]
