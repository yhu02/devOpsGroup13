# Stage 1: Build the application
FROM node:20-alpine AS builder
WORKDIR /usr/src/app

# Copy package files and install dependencies
COPY package*.json ./
RUN npm install

# Copy the rest of the source code and build the project
COPY . .
RUN npm run build

# Stage 2: Create the production image
FROM node:20-alpine
WORKDIR /usr/src/app

# Install only production dependencies
COPY package*.json ./
RUN npm install --production

# Copy the compiled output from the builder stage
COPY --from=builder /usr/src/app/dist ./dist

# Expose the port that your application listens on (Vite default preview port)
EXPOSE 5173

# Start the application using the preview script
CMD [ "npm", "run", "preview" ]
