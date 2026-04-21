FROM node:18-alpine
WORKDIR /app
COPY . .
RUN npm ci --omit=dev --workspace=services/message-service
EXPOSE 3003
HEALTHCHECK --interval=30s --timeout=5s --start-period=40s --retries=3 CMD node -e "require('http').get('http://localhost:3003/health', (r) => {if (r.statusCode !== 200) throw new Error(r.statusCode)})"
CMD ["node", "services/message-service/src/index.js"]
