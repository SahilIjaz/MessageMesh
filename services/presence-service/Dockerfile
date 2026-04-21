FROM node:18-alpine
WORKDIR /app
COPY . .
RUN npm install --omit=dev
EXPOSE 3004
CMD ["node", "services/presence-service/src/index.js"]
