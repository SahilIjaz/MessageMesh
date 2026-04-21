FROM node:18-alpine

WORKDIR /app

# Copy root and all workspaces
COPY package.json package-lock.json ./
COPY shared ./shared
COPY services/auth-service ./services/auth-service

# Install all dependencies (root + all workspaces)
RUN npm ci --omit=dev

# Move service files to root for easier access
RUN mv services/auth-service/* . && rm -rf services

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=40s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3001/health', (res) => {if (res.statusCode !== 200) throw new Error(res.statusCode)})"

EXPOSE 3001

CMD ["node", "src/index.js"]
