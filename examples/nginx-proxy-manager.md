# Nginx Proxy Manager

## Setup

1. Add a new Proxy Host
2. Configure:
   - **Domain**: `register.example.com`
   - **Scheme**: `http`
   - **Forward Hostname/IP**: `riddix-invite-portal` (or the container IP)
   - **Forward Port**: `3000`
3. Under the **SSL** tab, request a Let's Encrypt certificate
4. Enable **Force SSL** and **HTTP/2 Support**

## Custom Nginx Configuration (Advanced tab)

```nginx
proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
proxy_set_header X-Real-IP $remote_addr;
proxy_set_header X-Forwarded-Proto $scheme;
proxy_set_header Host $host;

client_max_body_size 1m;
```
