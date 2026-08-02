FROM node:22-bookworm-slim AS production

WORKDIR /app

COPY package*.json ./
RUN npm ci --omit=dev && npm cache clean --force

COPY --chown=node:node src ./src

ENV NODE_ENV=production
ENV PORT=8000

USER node
EXPOSE 8000

CMD ["npm", "start"]
