FROM node:slim

WORKDIR /app

COPY package*.json ./
COPY server.js ./
COPY public/ ./public/

# Install dependencies
RUN npm install

# Expose app port
EXPOSE 3000

# Run the app
CMD ["node", "server.js"]
