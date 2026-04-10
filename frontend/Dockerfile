# Stage 1: Build
FROM mirror.gcr.io/library/node:20-alpine AS builder

WORKDIR /app

# Copy package files first for better layer caching
COPY package*.json ./

# Install dependencies (this layer is cached if package*.json doesn't change)
RUN --mount=type=cache,target=/root/.npm npm install

# Copy source code
COPY . .

# Build the app (skip TypeScript checking for faster builds in development)
# Use npm run build for production (includes tsc), npm run build:fast for development
RUN npm run build

# Stage 2: Serve with Nginx
FROM mirror.gcr.io/library/nginx:alpine

# Copy custom nginx config
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Copy built files from builder
COPY --from=builder /app/dist /usr/share/nginx/html

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]

