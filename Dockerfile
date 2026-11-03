FROM node:26-trixie

WORKDIR /opt/cxserver
COPY . ./
RUN npm install
