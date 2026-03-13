# SWAG (Secure Web Application Gateway)

## Setup

Create a new proxy configuration file at `config/nginx/proxy-confs/register.subdomain.conf`:

```nginx
server {
    listen 443 ssl http2;
    listen [::]:443 ssl http2;

    server_name register.*;

    include /config/nginx/ssl.conf;

    client_max_body_size 1m;

    location / {
        include /config/nginx/proxy.conf;
        include /config/nginx/resolver.conf;
        set $upstream_app matrix-synapse-panel;
        set $upstream_port 3000;
        set $upstream_proto http;
        proxy_pass $upstream_proto://$upstream_app:$upstream_port;
    }
}
```

Make sure the `matrix-synapse-panel` container is on the same Docker network as SWAG.
