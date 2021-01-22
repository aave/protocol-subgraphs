FROM node:11

WORKDIR /app
ADD  ./package-lock.json ./package.json /app/
RUN npm ci

ADD ./ /app/
