FROM node:22-slim

# Build from apps/vibe-tutor:
# docker build -f render-backend/Dockerfile -t vibe-tutor-api .
WORKDIR /app/render-backend

COPY render-backend/package-server.json ./package.json
RUN npm install --omit=dev

COPY render-backend/server.mjs render-backend/core.mjs render-backend/cloud.mjs ./
COPY privacy-policy.json /app/privacy-policy.json

ENV PORT=8080
EXPOSE 8080

CMD ["node", "server.mjs"]
