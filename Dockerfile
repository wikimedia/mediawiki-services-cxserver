FROM node:16-bullseye

WORKDIR /opt/cxserver
COPY . ./
RUN npm install
