FROM node:22-alpine

WORKDIR /app

RUN apk add --no-cache \
    python3 \
    openjdk17-jdk \
    g++

RUN addgroup -S sandbox && adduser -S sandbox -G sandbox

RUN mkdir -p /tmp/codecollab && \
    chown -R sandbox:sandbox /tmp/codecollab /tmp

COPY runner.js /app/runner.js

USER sandbox

CMD ["node", "/app/runner.js"]