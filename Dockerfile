FROM node:18-bullseye

WORKDIR /opt/cxserver
COPY . ./
RUN npm install
