FROM node:20-alpine AS build

WORKDIR /app

# Copy root and subpackage files
COPY package*.json ./
COPY frontend/package*.json ./frontend/
COPY backend/package*.json ./backend/

# Install dependencies
RUN npm install
RUN cd frontend && npm install
RUN cd backend && npm install

# Copy source code and build frontend
COPY . .
RUN cd frontend && npm run build

# Production run stage
FROM node:20-alpine AS production

WORKDIR /app

COPY --from=build /app/backend ./backend
COPY --from=build /app/frontend/dist ./frontend/dist
COPY --from=build /app/package*.json ./

WORKDIR /app/backend

EXPOSE 5000

ENV PORT=5000
ENV NODE_ENV=production

CMD ["node", "server.js"]
