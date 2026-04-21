FROM node:18-alpine

WORKDIR /app

COPY package.json package-lock.json ./
COPY shared ./shared
COPY services/api-gateway ./services/api-gateway

RUN npm ci --omit=dev

RUN mv services/api-gateway/* . && rm -rf services

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=3s --start-period=40s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3000/health', (res) => {if (res.statusCode !== 200) throw new Error(res.statusCode)})"

CMD ["node", "src/index.js"]
