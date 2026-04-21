FROM node:18-alpine
WORKDIR /app
COPY . .
RUN npm install --omit=dev
EXPOSE 3001
HEALTHCHECK --interval=30s --timeout=5s --start-period=40s --retries=3 CMD node -e "require('http').get('http://localhost:3001/health', (r) => {if (r.statusCode !== 200) throw new Error(r.statusCode)})"
CMD ["node", "services/auth-service/src/index.js"]
