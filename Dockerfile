FROM node:22-alpine
WORKDIR /app

# Install all dependencies required for the build (including dev dependencies)
COPY package*.json ./
COPY prisma ./prisma/
RUN npm ci --include=dev

# Copy application source
COPY . .

# Generate Prisma Client and compile Next.js production build
RUN npx prisma generate
RUN npm run build

# Set production environment for runtime
ENV NODE_ENV=production
ENV PORT=3000

EXPOSE 3000

CMD ["npm", "start"]
