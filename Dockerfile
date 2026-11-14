FROM node:24.22.1-bookworm-slim AS build
WORKDIR /app
RUN npm install -g pnpm@11.25.0
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN pnpm install --frozen-lockfile
COPY . .
# Build-only placeholders, not runtime credentials. Dynamic routes never query this DB during build.
RUN DATABASE_URL=postgresql://build:unused@127.0.0.1:5432/build PAYLOAD_SECRET=build-only-unused-placeholder APP_ENV=preview pnpm build

FROM node:24.22.1-bookworm-slim AS runtime
WORKDIR /app
ENV NODE_ENV=production
COPY --from=build --chown=node:node /app /app
USER node
EXPOSE 3000
CMD ["node", "node_modules/next/dist/bin/next", "start", "--hostname", "0.0.0.0"]
