FROM node:18-alpine

WORKDIR /app

# Install dependencies
COPY package.json package-lock.json ./
RUN npm ci --only=production

# Copy application
COPY src ./src
COPY knexfile.js .

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=40s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3002/health', (res) => {if (res.statusCode !== 200) throw new Error(res.statusCode)})"

EXPOSE 3002

CMD ["node", "src/index.js"]
