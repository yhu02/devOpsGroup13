# Stage 1: Build the frontend
FROM node:20-alpine AS frontend-builder
WORKDIR /usr/src/app

# Copy the entire monorepo structure
COPY shared ./shared
COPY frontend ./frontend
COPY backend ./backend

# Change into the frontend directory and install/build
WORKDIR /usr/src/app/frontend
RUN npm install
RUN npm run build

# Stage 2: Build the backend
FROM node:20-alpine AS backend-builder
WORKDIR /usr/src/app

# Copy the shared folder and backend folder (needed for relative imports)
COPY shared ./shared
COPY backend ./backend

# Change into the backend directory, install dependencies, and build the backend
WORKDIR /usr/src/app/backend
RUN npm install
RUN npm run build

# Stage 3: Create the production image
FROM node:20-alpine
WORKDIR /usr/src/app

# Install only production dependencies for the backend
COPY backend/package*.json ./backend/
RUN cd backend && npm install --production

# Copy built assets from previous stages
# The frontend build output will be in /usr/src/app/frontend/dist
# The backend build output will be in /usr/src/app/backend/dist
COPY --from=frontend-builder /usr/src/app/frontend/dist ./frontend/dist
COPY --from=backend-builder /usr/src/app/backend/dist ./backend/dist

# Expose backend API port
EXPOSE 3000

WORKDIR /usr/src/app/backend

# Start the backend server
CMD ["npm", "run", "start"]