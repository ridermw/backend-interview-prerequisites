# Production Dockerfile for Slack Interview App

FROM node:20-alpine

WORKDIR /app

# Install build dependencies for native modules (sqlite3)
RUN apk add --no-cache python3 make g++

# Copy package files
COPY package*.json ./

# Install dependencies and rebuild native modules
RUN npm ci && npm rebuild

# Copy application code
COPY . .

# Expose ports
EXPOSE 3033 8000

# Start the application
CMD ["npm", "run", "dev-ts"]
