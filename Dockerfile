FROM node:10-buster

WORKDIR /opt/cxserver
COPY . ./
RUN npm install