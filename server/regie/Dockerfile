# Étape 1 : sources de Revive (le site de téléchargement officiel refuse les robots : on prend l'étiquette GitHub et on installe les dépendances avec Composer)
FROM composer:2 AS src
ARG REVIVE_VERSION=6.0.8
WORKDIR /app
RUN apk add --no-cache curl tar \
 && curl -fsSL "https://github.com/revive-adserver/revive-adserver/archive/refs/tags/v${REVIVE_VERSION}.tar.gz" | tar xz --strip-components=1 -C /app \
 && composer install --no-dev --no-interaction --ignore-platform-reqs --optimize-autoloader

# Étape 2 : PHP + Apache
FROM php:8.3-apache
RUN apt-get update && apt-get install -y --no-install-recommends libicu-dev libpq-dev libzip-dev libpng-dev libxml2-dev unzip curl cron \
 && docker-php-ext-install intl pgsql pdo_pgsql zip gd opcache xml \
 && a2enmod rewrite headers \
 && rm -rf /var/lib/apt/lists/*
COPY --from=src /app /var/www/html
RUN chown -R www-data:www-data /var/www/html/var /var/www/html/plugins /var/www/html/www/admin/plugins /var/www/html/www/images \
 && echo '0 * * * * www-data php /var/www/html/scripts/maintenance/maintenance.php ${REVIVE_HOST:-pub.essaka.engineering} >> /var/log/revive-maintenance.log 2>&1' > /etc/cron.d/revive && chmod 0644 /etc/cron.d/revive
CMD ["bash", "-c", "cron && apache2-foreground"]
