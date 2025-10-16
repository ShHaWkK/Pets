# Build and serve React client
FROM node:18-alpine AS builder
WORKDIR /app/client
COPY client/package*.json ./
RUN npm ci
COPY client ./
RUN npm run build

FROM node:18-alpine AS runner
WORKDIR /app
RUN npm i -g serve@14.2.1
COPY --from=builder /app/client/build ./build
EXPOSE 3000
CMD ["serve","-s","build","-l","3000"]