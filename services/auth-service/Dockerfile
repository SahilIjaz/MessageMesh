FROM node:18-alpine
WORKDIR /app
COPY . .
RUN npm install --omit=dev
EXPOSE 3001
CMD ["node", "services/auth-service/src/index.js"]
