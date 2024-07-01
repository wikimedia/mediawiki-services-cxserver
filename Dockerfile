FROM node:20-bullseye

WORKDIR /opt/cxserver
COPY . ./
RUN npm install
