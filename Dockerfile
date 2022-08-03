FROM node:16-slim

WORKDIR /opt/cxserver
COPY . ./
RUN npm install
