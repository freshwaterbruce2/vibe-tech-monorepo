FROM node:22-slim

WORKDIR /app

# Copy server-only package.json (no frontend deps)
COPY package-server.json ./package.json
RUN npm install --omit=dev

# Copy server code
COPY server.mjs ./

# Cloud Run uses PORT env variable (default 8080)
ENV PORT=8080
EXPOSE 8080

CMD ["node", "server.mjs"]
