FROM postgres:16-alpine

RUN apk add --no-cache dcron

COPY backup.sh /usr/local/bin/backup.sh
RUN chmod +x /usr/local/bin/backup.sh

# Daily at 2am — adjust to taste
RUN echo "0 2 * * * /usr/local/bin/backup.sh >> /var/log/backup.log 2>&1" \
    | crontab -

CMD ["crond", "-f", "-l", "2"]