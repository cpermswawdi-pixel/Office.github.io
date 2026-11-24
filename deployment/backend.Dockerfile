FROM node:22-bookworm-slim

WORKDIR /app

COPY package.json package-lock.json ./
COPY backend/package.json ./backend/package.json
COPY frontend/package.json ./frontend/package.json
RUN npm ci --workspace backend --include-workspace-root=false

COPY backend ./backend
RUN apt-get update \
    && apt-get install -y --no-install-recommends fonts-noto-core \
    && rm -rf /var/lib/apt/lists/* \
    && DATABASE_URL="mysql://wms_app:placeholder@mysql:3306/wms" \
       SHADOW_DATABASE_URL="mysql://wms_app:placeholder@mysql:3306/wms_shadow" \
       npm run prisma:generate --workspace backend \
    && mkdir -p /app/backend/uploads \
    && chown -R node:node /app/backend/uploads

ENV NODE_ENV=production
ENV PORT=4000
ENV PDF_FONT_PATH=/usr/share/fonts/truetype/noto/NotoSansThai-Regular.ttf

WORKDIR /app/backend
USER node

EXPOSE 4000

CMD ["node", "server.js"]
