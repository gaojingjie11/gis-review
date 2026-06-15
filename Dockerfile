# Stage 1: Build Frontend assets
FROM node:20-alpine AS builder

WORKDIR /app

# Cache npm install: only rerun if package.json changes
COPY package*.json ./
RUN npm install

COPY . .
RUN npm run build

# Stage 2: Production Server
FROM node:20-alpine

WORKDIR /app

# Cache production dependencies install
COPY package*.json ./
RUN npm install --only=production

# Copy built frontend assets from builder stage
COPY --from=builder /app/dist ./dist

# Copy backend files
COPY server.js db.js ./

EXPOSE 5000

CMD ["node", "server.js"]
