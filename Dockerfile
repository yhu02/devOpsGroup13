# Stage 1: Build the frontend
FROM node:20-alpine AS frontend-builder
WORKDIR /usr/src/app/frontend

# Copy package files and install dependencies
COPY frontend/package*.json ./
RUN npm install

# Copy the rest of the source code and build the frontend
COPY frontend ./
RUN npm run build

# Stage 2: Build the backend
FROM node:20-alpine AS backend-builder
WORKDIR /usr/src/app/backend

# Copy package files and install dependencies
COPY backend/package*.json ./
RUN npm install

# Copy the backend source code
COPY backend ./

# Stage 3: Create the production image
FROM node:20-alpine
WORKDIR /usr/src/app

# Install only production dependencies for the backend
COPY backend/package*.json ./backend/
RUN cd backend && npm install --production

# Copy built frontend and backend from previous stages
COPY --from=frontend-builder /usr/src/app/frontend/dist ./frontend/dist
COPY --from=backend-builder /usr/src/app/backend ./backend

# Expose backend API port
EXPOSE 3000

WORKDIR /usr/src/app/backend

# Start the backend server
CMD ["npm", "run", "start"]
