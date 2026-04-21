FROM node:18-alpine

WORKDIR /app

COPY package.json package-lock.json ./
COPY shared ./shared
COPY services/user-service ./services/user-service

RUN npm ci --omit=dev

RUN mv services/user-service/* . && rm -rf services

EXPOSE 3002

HEALTHCHECK --interval=30s --timeout=3s --start-period=40s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3002/health', (res) => {if (res.statusCode !== 200) throw new Error(res.statusCode)})"

CMD ["node", "src/index.js"]
