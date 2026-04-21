FROM node:18-alpine
WORKDIR /app
COPY . .
RUN npm install --omit=dev
EXPOSE 3005
CMD ["node", "services/notification-service/src/index.js"]
