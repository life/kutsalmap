FROM php:8.2-apache

# Gerekli PHP eklentilerini kur (Eğer ileride Postgres istersen diye pdo_pgsql hazır kalsın)
RUN apt-get update && apt-get install -y libpq-dev \
    && docker-php-ext-install pdo pdo_pgsql

# Apache mod_rewrite'ı etkinleştir
RUN a2enmod rewrite

# Proje dosyalarını kopyala
COPY . /var/www/html/

# Yazma izinlerini ayarla (data.json için kritik)
RUN chown -R www-data:www-data /var/www/html/ \
    && chmod -R 755 /var/www/html/

# Portu belirle
EXPOSE 80
