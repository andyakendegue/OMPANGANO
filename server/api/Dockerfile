# Contexte de build : racine du dépôt (voir docker-compose.yml)
FROM node:25-alpine
WORKDIR /app
RUN apk add --no-cache poppler-utils unzip
COPY server/package.json server/package-lock.json ./server/
RUN cd server && npm ci --omit=dev && npm i --no-save tsx
COPY server ./server
COPY shared ./shared
COPY packages/noyau/src ./packages/noyau/src
COPY contenu/exemples ./contenu/exemples
COPY src/types ./src/types
RUN chmod -R a+rX /app   # les fichiers copiés depuis un Mac peuvent être en 600
WORKDIR /app/server
ENV NODE_ENV=production
USER node
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=3s CMD wget -qO- http://127.0.0.1:3000/health || exit 1
CMD ["npx", "tsx", "api/src/main.ts"]
