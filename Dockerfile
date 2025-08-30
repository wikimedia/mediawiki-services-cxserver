FROM node:22-trixie

WORKDIR /opt/cxserver
COPY . ./
RUN npm install
