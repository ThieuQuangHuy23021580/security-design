# ==============================================================================
# User Service — Node.js + Express.js
# ==============================================================================
FROM node:22-alpine

WORKDIR /app

# Cai dependencies truoc de tan dung cache layer cua Docker.
COPY package*.json ./
RUN npm install --omit=dev && npm cache clean --force

COPY src ./src

# Chay bang user khong phai root (an toan hon).
USER node

EXPOSE 3001

CMD ["node", "src/index.js"]
