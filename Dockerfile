FROM mcr.microsoft.com/playwright:v1.61.1-noble
WORKDIR /app
ENV NODE_ENV=production
COPY package*.json ./
RUN npm ci --omit=dev
COPY server.js ./server.js
COPY public ./public
EXPOSE 3000
CMD ["npm", "start"]
