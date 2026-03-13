FROM postgres:16-alpine

# supercronic is a container-friendly cron (no setpgid issues)
ENV SUPERCRONIC_VERSION=0.2.33
ENV SUPERCRONIC_URL=https://github.com/aptible/supercronic/releases/download/v${SUPERCRONIC_VERSION}/supercronic-linux-amd64
ENV SUPERCRONIC=/usr/local/bin/supercronic

RUN apk add --no-cache curl && \
    curl -fsSL "$SUPERCRONIC_URL" -o "$SUPERCRONIC" && \
    chmod +x "$SUPERCRONIC"

COPY backup.sh /usr/local/bin/backup.sh
RUN chmod +x /usr/local/bin/backup.sh

# Daily at 2am — adjust to taste
RUN echo "0 2 * * * /usr/local/bin/backup.sh" > /etc/crontab

CMD ["/usr/local/bin/supercronic", "/etc/crontab"]