# ==============================================================================
# API Gateway — Nginx + module ngx_http_auth_jwt_module
#
# Image nen da co san module xac thuc JWT (khong tu build lai de giam thoi gian
# trien khai). File nginx.conf.template duoc render bang envsubst khoi container.
# ==============================================================================
FROM ghcr.io/max-lt/nginx-jwt-module:latest

# Render nginx.conf.template -> /etc/nginx/nginx.conf khi container khoi dong.
# NGINX_ENVSUBST_OUTPUT_DIR tro thang vao /etc/nginx de ghi de file mac dinh.
ENV NGINX_ENVSUBST_OUTPUT_DIR=/etc/nginx \
    NGINX_ENVSUBST_TEMPLATE_DIR=/etc/nginx/templates \
    NGINX_ENVSUBST_TEMPLATE_SUFFIX=.template

COPY templates/nginx.conf.template /etc/nginx/templates/nginx.conf.template

# Xoa config mac dinh cua nginx (khong dung den, va khong duoc load).
RUN rm -f /etc/nginx/conf.d/default.conf

EXPOSE 8080

CMD ["nginx", "-g", "daemon off;"]
