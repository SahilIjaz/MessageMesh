FROM node:18-alpine
WORKDIR /app
COPY . .
RUN npm install --omit=dev
EXPOSE 3002
CMD ["node", "services/user-service/src/index.js"]
