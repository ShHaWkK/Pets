# Node API server
FROM node:18-alpine
WORKDIR /app/server
COPY server/package*.json ./
RUN npm ci --only=production
COPY server ./
EXPOSE 3001
ENV NODE_ENV=production
CMD ["npm","start"]