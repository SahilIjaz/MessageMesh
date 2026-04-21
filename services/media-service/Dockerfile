FROM node:18-alpine
WORKDIR /app
COPY . .
RUN npm install --omit=dev
EXPOSE 3006
CMD ["node", "services/media-service/src/index.js"]
