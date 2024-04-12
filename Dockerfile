FROM node:20.9.0-alpine

RUN mkdir -p user/home/service
WORKDIR /user/home/service 

COPY package*.json ./
RUN npm ci --only=production

COPY . .

ENV HOST 0.0.0.0
ENV PORT 3000
EXPOSE 3000

CMD ["npm", "start"]
