FROM node:22-slim

WORKDIR /app

# Copy package definition and install production dependencies only
COPY package.json ./
RUN npm install --omit=dev

# Copy source code
COPY src/ ./src/

ENV PORT=8080
ENV NODE_ENV=production
EXPOSE 8080

CMD ["node", "src/server.mjs"]
