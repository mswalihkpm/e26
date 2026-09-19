# Production Dockerfile for Excellentia Arts Fiesta 2026
FROM node:20-alpine AS runner

WORKDIR /app

# Set production environment variables
ENV NODE_ENV=production
ENV PORT=3000

# Install dependencies
COPY package*.json ./
RUN npm install --omit=dev

# Copy application source code and assets
COPY . .

# Expose production port
EXPOSE 3000

# Start production server with WebSocket relay
CMD ["node", "server.js"]
