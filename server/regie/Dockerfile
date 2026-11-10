FROM php:8.3-apache
RUN apt-get update && apt-get install -y --no-install-recommends libicu-dev libpq-dev libzip-dev libpng-dev libxml2-dev unzip curl cron \
 && docker-php-ext-install intl pgsql pdo_pgsql zip gd opcache xml \
 && a2enmod rewrite headers \
 && rm -rf /var/lib/apt/lists/*
# Version à vérifier sur https://www.revive-adserver.com/download/ avant le premier build
ARG REVIVE_VERSION=6.0.6
RUN curl -fsSL "https://download.revive-adserver.com/revive-adserver-${REVIVE_VERSION}.tar.gz" | tar xz --strip-components=1 -C /var/www/html \
 && chown -R www-data:www-data /var/www/html/var /var/www/html/plugins /var/www/html/www/admin/plugins /var/www/html/www/images
# Maintenance horaire exigée par Revive (statistiques, plafonds, fin de campagnes)
RUN echo '0 * * * * www-data php /var/www/html/scripts/maintenance/maintenance.php ${REVIVE_HOST:-pub.essaka.engineering} >> /var/log/revive-maintenance.log 2>&1' > /etc/cron.d/revive && chmod 0644 /etc/cron.d/revive
CMD ["bash", "-c", "cron && apache2-foreground"]
