FROM node:18-alpine
WORKDIR /app
COPY . .
RUN npm ci --omit=dev --workspace=services/api-gateway
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=5s --start-period=40s --retries=3 CMD node -e "require('http').get('http://localhost:3000/health', (r) => {if (r.statusCode !== 200) throw new Error(r.statusCode)})"
CMD ["node", "services/api-gateway/src/index.js"]
