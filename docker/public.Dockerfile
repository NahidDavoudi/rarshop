FROM nginx:1.27-alpine

COPY docker/nginx-public.conf /etc/nginx/conf.d/default.conf

COPY public/index.html public/login.html public/admin.html /usr/share/nginx/html/
COPY public/assets/ /usr/share/nginx/html/assets/

EXPOSE 80