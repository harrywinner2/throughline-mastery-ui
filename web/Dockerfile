# Throughline web service — builds the client, runs the Express server.
FROM node:20-slim

WORKDIR /app

# Install deps first (better layer caching)
COPY package.json package-lock.json* ./
RUN npm install

# Copy source and build the client bundle
COPY . .
RUN npm run build

ENV NODE_ENV=production
ENV PORT=8080
EXPOSE 8080

# tsx runs the TS server directly; the client is served from dist/
CMD ["npm", "start"]
