ARG NODE_VERSION=22.16.0
FROM node:${NODE_VERSION}-bookworm-slim AS base

WORKDIR /workspace
ENV NODE_ENV=development

RUN apt-get update && \
    apt-get install -y --no-install-recommends dumb-init && \
    rm -rf /var/lib/apt/lists/*

COPY entrypoint.sh /usr/local/bin/app-entrypoint
RUN chmod +x /usr/local/bin/app-entrypoint && \
    sed -i 's/\r$//' /usr/local/bin/app-entrypoint

FROM base AS backend-deps
WORKDIR /workspace/backend
COPY backend/package*.json ./
RUN npm ci

FROM backend-deps AS backend
WORKDIR /workspace/backend
COPY backend .
ENV APP_DIR=/workspace/backend
EXPOSE 3000
ENTRYPOINT ["/usr/bin/dumb-init", "--", "app-entrypoint"]
CMD ["node", "server.js"]

FROM base AS frontend-deps
WORKDIR /workspace/frontend
COPY frontend/package*.json ./
RUN npm ci

FROM frontend-deps AS frontend
WORKDIR /workspace/frontend
COPY frontend .
ENV APP_DIR=/workspace/frontend
EXPOSE 4200
ENTRYPOINT ["/usr/bin/dumb-init", "--", "app-entrypoint"]
CMD ["npm", "run", "start", "--", "--host", "0.0.0.0", "--port", "4200"]