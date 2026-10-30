# 🚀 Load Balancing with Docker & NGINX

A high-availability static web application setup demonstrating how to spin up multiple containerized Node.js application instances using **Docker** and distribute traffic across them using **NGINX** as a reverse proxy and load balancer.

---

## 📌 Table of Contents

- [Overview & Architecture](#-overview--architecture)
- [Prerequisites & Installation](#-prerequisites--installation)
  - [1. Installing Docker](#1-installing-docker)
  - [2. Installing NGINX](#2-installing-nginx)
- [Project Structure](#-project-structure)
- [Configuration Files](#-configuration-files)
  - [Application Server (`server.js`)](#application-server-serverjs)
  - [Dockerfile (`Dockerfile`)](#dockerfile-dockerfile)
  - [Docker Compose (`docker-compose.yaml`)](#docker-compose-docker-composeyaml)
  - [NGINX Configuration (`nginx.conf`)](#nginx-configuration-nginxconf)
- [Step-by-Step Setup Guide](#-step-by-step-setup-guide)
  - [Step 1: Build & Start Container Replicas](#step-1-build--start-container-replicas)
  - [Step 2: Configure & Start NGINX](#step-2-configure--start-nginx)
  - [Step 3: Test Load Balancing](#step-3-test-load-balancing)
- [Load Balancing Algorithms](#-load-balancing-algorithms)
- [Troubleshooting & Useful Commands](#-troubleshooting--useful-commands)

---

## 🏗 Overview & Architecture

When traffic increases, running a single web server instance can lead to bottlenecks and single points of failure. This setup demonstrates:
1. **Container Replicas**: Running 3 isolated Node.js instances (`app1`, `app2`, and `app3`) using Docker Compose, each bound to a unique local host port (`3001`, `3002`, `3003`).
2. **Reverse Proxy & Load Balancer**: NGINX receives incoming user requests and routes them to the replica cluster using the `least_conn` strategy (or round-robin).
3. **Traceability**: Each application instance identifies itself via an environment variable (`APP_NAME`), allowing you to observe live request distribution across container logs.

```
                         +-----------------------------------+
                         |      Client / Browser Request     |
                         |        http://localhost:80        |
                         +-----------------+-----------------+
                                           |
                                           v
                             +---------------------------+
                             |       NGINX Proxy         |
                             |   Upstream Load Balancer  |
                             +-------------+-------------+
                                           |
            +------------------------------+------------------------------+
            | (least_conn)                 | (least_conn)                 | (least_conn)
            v                              v                              v
+-----------------------+      +-----------------------+      +-----------------------+
| Docker Container: App1|      | Docker Container: App2|      | Docker Container: App3|
| Port: 3001 (Internal) |      | Port: 3002 (Internal) |      | Port: 3003 (Internal) |
| APP_NAME=APP1         |      | APP_NAME=APP2         |      | APP_NAME=APP3         |
+-----------------------+      +-----------------------+      +-----------------------+
```

---

## 🛠 Prerequisites & Installation

### 1. Installing Docker

Docker allows you to package and run the application in isolated containers.

#### macOS:
- Download and install **Docker Desktop** from [docker.com](https://www.docker.com/products/docker-desktop/), or install via Homebrew:
  ```bash
  brew install --cask docker
  ```

#### Ubuntu / Debian Linux:
```bash
# Update package index and install required dependencies
sudo apt-get update
sudo apt-get install -y ca-certificates curl gnupg

# Add Docker's official GPG key
sudo install -m 0755 -d /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg
sudo chmod a+r /etc/apt/keyrings/docker.gpg

# Set up repository
echo \
  "deb [arch="$(dpkg --print-architecture)" signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu \
  "$(. /etc/os-release && echo "$VERSION_CODENAME")" stable" | \
  sudo tee /etc/apt/sources.list.d/docker.list > /dev/null

# Install Docker Engine and Docker Compose
sudo apt-get update
sudo apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
```

#### Windows:
- Download and install **Docker Desktop for Windows** from [docker.com](https://www.docker.com/products/docker-desktop/). Ensure WSL 2 backend is enabled.

> Verify installation:
> ```bash
> docker --version
> docker compose version
> ```

---

### 2. Installing NGINX

NGINX acts as the reverse proxy that balances traffic to your backend containers.

#### macOS:
```bash
brew install nginx
```

#### Ubuntu / Debian Linux:
```bash
sudo apt update
sudo apt install nginx -y
```

#### Windows:
- Download the Windows binary from [nginx.org/en/download.html](https://nginx.org/en/download.html) and extract it to a directory (e.g. `C:\nginx`), or use Chocolatey:
  ```powershell
  choco install nginx
  ```

> Verify installation:
> ```bash
> nginx -v
> ```

---

## 📁 Project Structure

```text
.
├── Dockerfile              # Docker image build instructions
├── docker-compose.yaml     # Service definitions for multiple app instances
├── index.html              # Frontend page displaying photos & content
├── package.json            # Node.js dependencies (Express)
├── pictures/               # Static image assets
│   ├── IMG_0666.JPG
│   ├── IMG_0668.JPG
│   ├── IMG_0669.JPG
│   └── smallotta.JPG
├── server.js               # Express web server with replica identification
└── nginx.conf              # Example NGINX load balancer configuration
```

---

## ⚙️ Configuration Files

### Application Server (`server.js`)
Serves the static `index.html` file and the `pictures/` directory, logging which instance processed the request.

```javascript
const express = require('express');
const path = require('path');
const app = express();
const port = 3000;

const replicaApp = process.env.APP_NAME || 'DefaultApp';

// Serve static images directory
app.use('/pictures', express.static(path.join(__dirname, 'pictures')));

// Main route
app.use('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
    console.log(`Request served by ${replicaApp}`);
});

app.listen(port, () => {
    console.log(`${replicaApp} is listening on port: ${port}`);
});
```

---

### Dockerfile (`Dockerfile`)
Packages the Node.js application and all its dependencies into an immutable image.

```dockerfile
FROM node:18-alpine

WORKDIR /app

COPY package*.json ./
RUN npm install --production

COPY server.js ./
COPY index.html ./
COPY pictures ./pictures

EXPOSE 3000

CMD ["node", "server.js"]
```

---

### Docker Compose (`docker-compose.yaml`)
Spins up three distinct application containers with unique replica names and mapped host ports.

```yaml
version: '3.8'

services:
  app1:
    build: .
    environment:
      - APP_NAME=APP1
    ports:
      - "3001:3000"
    restart: unless-stopped

  app2:
    build: .
    environment:
      - APP_NAME=APP2
    ports:
      - "3002:3000"
    restart: unless-stopped

  app3:
    build: .
    environment:
      - APP_NAME=APP3
    ports:
      - "3003:3000"
    restart: unless-stopped
```

---

### NGINX Configuration (`nginx.conf`)

> [!NOTE]
> All sensitive parameters (private keys, certificates, external IPs, or domains) are kept as generic placeholders. Replace paths and server names according to your environment.

#### Option A: HTTP Load Balancing (Standard Port 80)
```nginx
worker_processes 1;

events {
    worker_connections 1024;
}

http {
    include mime.types;
    default_type application/octet-stream;

    # Define the backend application pool
    upstream nodejs_cluster {
        # Load balancing algorithm: least connections
        least_conn;

        # Node.js app replica instances
        server 127.0.0.1:3001;
        server 127.0.0.1:3002;
        server 127.0.0.1:3003;
    }

    server {
        listen 80;
        server_name localhost;

        location / {
            proxy_pass http://nodejs_cluster;

            # Forward client information to the backend
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
        }
    }
}
```

#### Option B: HTTPS Load Balancing with SSL (Port 443)
```nginx
worker_processes 1;

events {
    worker_connections 1024;
}

http {
    include mime.types;

    upstream nodejs_cluster {
        least_conn;
        server 127.0.0.1:3001;
        server 127.0.0.1:3002;
        server 127.0.0.1:3003;
    }

    server {
        listen 443 ssl;
        server_name localhost;

        # SSL Configuration (Replace with your actual certificate paths)
        ssl_certificate     /path/to/ssl/certificate.crt;
        ssl_certificate_key /path/to/ssl/private_key.key;

        ssl_protocols TLSv1.2 TLSv1.3;
        ssl_ciphers HIGH:!aNULL:!MD5;

        location / {
            proxy_pass http://nodejs_cluster;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
        }
    }
}
```

---

## 🚀 Step-by-Step Setup Guide

### Step 1: Build & Start Container Replicas

1. Make sure Docker is running on your machine.
2. In the project root directory, run:
   ```bash
   docker compose up -d --build
   ```
3. Verify that all 3 instances are running:
   ```bash
   docker compose ps
   ```
   You should see `app1`, `app2`, and `app3` with ports `3001`, `3002`, and `3003` active.

---

### Step 2: Configure & Start NGINX

1. Locate your NGINX configuration directory:
   - **macOS (Homebrew)**: `/opt/homebrew/etc/nginx/nginx.conf` (Apple Silicon) or `/usr/local/etc/nginx/nginx.conf` (Intel)
   - **Linux**: `/etc/nginx/nginx.conf` or `/etc/nginx/conf.d/load-balancer.conf`
   - **Windows**: `C:\nginx\conf\nginx.conf`

2. Apply the configuration above to your `nginx.conf`.

3. Test configuration syntax:
   ```bash
   nginx -t
   ```

4. Start or reload NGINX:
   ```bash
   # If starting for the first time
   nginx

   # If NGINX is already running, reload configuration
   nginx -s reload
   ```

---

### Step 3: Test Load Balancing

1. In one terminal, tail the logs of all container replicas:
   ```bash
   docker compose logs -f
   ```

2. Open your web browser and navigate to:
   ```text
   http://localhost/
   ```
   *(or `https://localhost` if using the SSL configuration)*

3. Refresh the page several times or send test requests via `curl`:
   ```bash
   for i in {1..10}; do curl -s -o /dev/null http://localhost/ ; done
   ```

4. Check your terminal logs! You will see requests being distributed across the replicas:
   ```text
   app1-1  | Request served by APP1
   app2-1  | Request served by APP2
   app3-1  | Request served by APP3
   app1-1  | Request served by APP1
   ```

---

## ⚖️ Load Balancing Algorithms in NGINX

You can customize the upstream load balancing strategy inside `upstream nodejs_cluster`:

| Strategy | Directive | How it works |
| :--- | :--- | :--- |
| **Round Robin** *(Default)* | *(Omit directive)* | Requests are distributed evenly in chronological order across servers. |
| **Least Connections** | `least_conn;` | Directs traffic to the server with the lowest number of active client connections. |
| **IP Hash** | `ip_hash;` | Routes requests from the same client IP to the same replica (maintains session persistence). |
| **Weighted** | `server 127.0.0.1:3001 weight=3;` | Allocates proportional traffic weight based on server capacity. |

---

## 🧹 Troubleshooting & Useful Commands

- **Stop all application containers:**
  ```bash
  docker compose down
  ```
- **Rebuild containers after code modifications:**
  ```bash
  docker compose up -d --build
  ```
- **Stop NGINX:**
  ```bash
  nginx -s stop
  ```
- **Check port conflicts:**
  ```bash
  # Check if port 80, 443, 3001, 3002, or 3003 are already occupied
  lsof -i :80
  lsof -i :3001
  ```
