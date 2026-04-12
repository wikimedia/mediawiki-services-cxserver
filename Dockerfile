FROM node:24-trixie

WORKDIR /opt/cxserver
COPY . ./
RUN npm install
