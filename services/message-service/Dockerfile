FROM node:18-alpine
WORKDIR /app
COPY . .
RUN npm install --omit=dev
EXPOSE 3003
CMD ["node", "services/message-service/src/index.js"]
