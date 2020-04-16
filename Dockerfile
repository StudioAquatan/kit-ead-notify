FROM node:12.14.0-alpine AS build
ENV NODE_ENV=development
WORKDIR /app

RUN apk -U upgrade && apk add \
  git \
  yarn \
  && rm -rf /var/cache/apk/*

COPY package.json yarn.lock /app/

RUN yarn --pure-lockfile \
  && yarn cache clean
COPY . /app/
RUN yarn run build

FROM node:12.14.0-alpine AS production
LABEL maintainer="f0reachARR" description="KIT Notification Bot for Discord"
ENV NODE_ENV=production
ENV TZ=Asia/Tokyo
WORKDIR /app

COPY --from=build /app/bin /app/bin
COPY --from=build /app/node_modules /app/node_modules
COPY --from=build /app/package.json /app/package.json

VOLUME [ "/app/config" ]
CMD npm start