# Use Node.js 20 base image on Alpine Linux for a lightweight, secure container
FROM node:20-alpine

# Set the working directory inside the container
WORKDIR /app

# Install libc6-compat which is required by some native Node.js modules
RUN apk add --no-cache libc6-compat

# Copy package files first to leverage Docker's caching mechanism
COPY package*.json ./

# Install dependencies inside the container
RUN npm install

# Copy the rest of the application files
COPY . .

# Expose port 3000 to allow traffic to the Next.js server
EXPOSE 3000

# Run the Next.js development server
CMD ["npm", "run", "dev"]
