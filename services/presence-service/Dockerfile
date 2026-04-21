FROM node:18-alpine

WORKDIR /app

COPY package.json package-lock.json ./
COPY shared ./shared
COPY services/presence-service ./services/presence-service

RUN npm ci --omit=dev

RUN mv services/presence-service/* . && rm -rf services

EXPOSE 3004

HEALTHCHECK --interval=30s --timeout=5s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3004/health', (r) => {if (r.statusCode !== 200) throw new Error(r.statusCode)})"

CMD ["node", "src/index.js"]
