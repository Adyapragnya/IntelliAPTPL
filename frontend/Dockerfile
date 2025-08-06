# Stage 1: Build the React application
FROM node:20-alpine AS build

WORKDIR /app

# Copy package.json and package-lock.json to install dependencies
COPY package.json ./

# Install project dependencies
RUN npm install --legacy-peer-deps

# Copy the rest of the application source code into the container
COPY . .

# Build the React application
RUN npm run build

# Stage 2: Serve the application using Nginx
FROM nginx:alpine

# Remove the default Nginx index.html
RUN rm -rf /usr/share/nginx/html/*

# Copy the build output from the previous stage
COPY --from=build /app/dist /usr/share/nginx/html

# Expose port 80 to allow external access
EXPOSE 80

# Start Nginx
CMD ["nginx", "-g", "daemon off;"]
