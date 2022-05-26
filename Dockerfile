FROM node:14-bullseye

WORKDIR /opt/cxserver
COPY . ./
RUN npm install
