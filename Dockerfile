FROM node:22-alpine
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000

# Install dependencies
COPY package*.json ./
COPY prisma ./prisma/
RUN npm ci

# Copy application source
COPY . .

# Generate Prisma Client and compile Next.js production build
RUN npx prisma generate
RUN npm run build

EXPOSE 3000

CMD ["npm", "start"]
