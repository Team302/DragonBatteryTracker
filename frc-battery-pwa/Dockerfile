FROM nginx:alpine

ARG BASIC_AUTH_PASSWORD=changeme
RUN apk add --no-cache apache2-utils gettext && \
    htpasswd -cb /etc/nginx/.htpasswd frc "$BASIC_AUTH_PASSWORD"

COPY . /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY docker-entrypoint.d/40-generate-config.sh /docker-entrypoint.d/40-generate-config.sh
RUN chmod +x /docker-entrypoint.d/40-generate-config.sh
EXPOSE 80
