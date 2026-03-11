FROM nginx:alpine

ARG BASIC_AUTH_PASSWORD=changeme
RUN apk add --no-cache apache2-utils && \
    htpasswd -cb /etc/nginx/.htpasswd frc "$BASIC_AUTH_PASSWORD"

COPY . /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
