FROM node:18-alpine

WORKDIR /app

COPY package.json package-lock.json ./
COPY shared ./shared
COPY services/message-service ./services/message-service

RUN npm ci --omit=dev

RUN mv services/message-service/* . && rm -rf services

EXPOSE 3003

HEALTHCHECK --interval=30s --timeout=5s --start-period=30s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3003/health', (res) => {if (res.statusCode !== 200) throw new Error(res.statusCode)})"

CMD ["node", "src/index.js"]
