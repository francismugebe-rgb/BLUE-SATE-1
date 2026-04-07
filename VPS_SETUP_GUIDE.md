# VPS Deployment Guide: Multi-App Setup (Port 3000)

To fix the `NET::ERR_CERT_COMMON_NAME_INVALID` error and run your 4 apps on one VPS, follow these steps.

## 1. Nginx Multi-App Configuration
Nginx acts as a "Traffic Controller". It listens on port 80/443 and sends traffic to your apps based on the domain name.

Create a new config file on your VPS:
`sudo nano /etc/nginx/sites-available/multi-apps`

Paste this (adjusting your other domain names and ports):

```nginx
# --- APP 1: Heart Connect (Port 3000) ---
server {
    listen 80;
    server_name heart.styni.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}

# --- APP 2: Another App (Port 3001) ---
server {
    listen 80;
    server_name app2.styni.com;

    location / {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}

# --- APP 3: Another App (Port 3002) ---
server {
    listen 80;
    server_name app3.styni.com;

    location / {
        proxy_pass http://localhost:3002;
        # ... same proxy settings as above ...
    }
}

# --- APP 4: Another App (Port 3003) ---
server {
    listen 80;
    server_name app4.styni.com;

    location / {
        proxy_pass http://localhost:3003;
        # ... same proxy settings as above ...
    }
}
```

## 2. Activate the Config
```bash
sudo ln -s /etc/nginx/sites-available/multi-apps /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

## 3. FIX THE SSL ERROR (Crucial)
The `ERR_CERT_COMMON_NAME_INVALID` happens because you don't have a certificate for `heart.styni.com`. Run this command to get free SSL for **all** your domains at once:

```bash
sudo apt install certbot python3-certbot-nginx
sudo certbot --nginx -d heart.styni.com -d app2.styni.com -d app3.styni.com -d app4.styni.com
```

**When asked:**
- Enter your email.
- Agree to terms.
- **Select "2: Redirect"** to automatically force all traffic to HTTPS.

## 4. Keep Apps Running (PM2)
Use PM2 to ensure your apps stay alive if the VPS restarts:
```bash
# In Heart Connect folder
pm2 start server.js --name "heart-connect"

# In other app folders
PORT=3001 pm2 start server.js --name "app-2"
PORT=3002 pm2 start server.js --name "app-3"
PORT=3003 pm2 start server.js --name "app-4"

# Save the list
pm2 save
pm2 startup
```

This setup will make `heart.styni.com` live on port 3000, fix the SSL error, and allow your other 3 apps to run on the same VPS.
