# Production Dockerfile for Slack Interview App

FROM node:20-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci

# Copy application code
COPY . .

# Expose ports
EXPOSE 3033 8000

# Start the application
CMD ["npm", "run", "dev-ts"]
