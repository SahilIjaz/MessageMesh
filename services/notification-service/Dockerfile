FROM node:18-alpine

WORKDIR /app

COPY package.json package-lock.json ./
COPY shared ./shared
COPY services/notification-service ./services/notification-service

RUN npm ci --omit=dev

RUN mv services/notification-service/* . && rm -rf services

EXPOSE 3005

HEALTHCHECK --interval=10s --timeout=5s --start-period=30s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3005/health', (r) => {if (r.statusCode !== 200) throw new Error(r.statusCode)})"

CMD ["node", "src/index.js"]
