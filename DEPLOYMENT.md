# 🚀 Excellentia Arts Fiesta 2026 - Production Deployment Guide

This project is configured and ready for production deployment on any Node.js or containerized cloud hosting platform.

---

## ⚙️ Production Configuration Summary

1. **Dynamic Port & Host Binding**:
   - `PORT`: `process.env.PORT || 3000`
   - `HOST`: `0.0.0.0` (required for containerized environments and cloud routing)
2. **Dynamic Domain & WebSocket Configuration**:
   - In all client scripts (`app.js`, `live-studio.js`, `camera-transmitter.js`), WebSockets automatically resolve to the deployed domain and protocol:
     ```javascript
     const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
     const wsUrl = `${protocol}//${window.location.host}`;
     ```
   - Supports **HTTPS / WSS** SSL encryption automatically with zero manual configuration.
3. **Production Entry Point**:
   - `npm start` -> `node server.js`
   - `node` engine: `>=18.0.0`

---

## 🌐 Instant Live Public URL

- **Live URL**: `https://excellentia-arts-fiesta-2026.loca.lt`

---

## ☁️ Deployment Options

### Option 1: Render (Recommended - Free Web Service with WebSockets)
1. Push this project folder to a GitHub/GitLab repository.
2. Go to [Render Dashboard](https://dashboard.render.com/) -> **New Web Service**.
3. Select the repository.
4. Render automatically detects `render.yaml` or use:
   - **Environment**: `Node`
   - **Build Command**: `npm install`
   - **Start Command**: `node server.js`
5. Click **Deploy**.

---

### Option 2: Railway.app (1-Click Deployment)
1. Install Railway CLI or connect via GitHub:
   ```bash
   npx railway up
   ```
2. Railway will automatically detect `railway.json` and deploy with persistent WebSocket support.

---

### Option 3: Fly.io (Global Edge Hosting)
1. Deploy using the included `fly.toml`:
   ```bash
   fly launch
   fly deploy
   ```

---

### Option 4: Docker / Google Cloud Run / AWS / DigitalOcean
1. Build the production Docker image using the included `Dockerfile`:
   ```bash
   docker build -t excellentia-arts-fiesta-2026 .
   ```
2. Run the container:
   ```bash
   docker run -p 3000:3000 -e PORT=3000 excellentia-arts-fiesta-2026
   ```

---

## 🔑 Default Administrator & Camera Controller Access

| Role | Username / Email | Password | Access Portal |
| :--- | :--- | :--- | :--- |
| **Camera Controller** | `e26camera` | `e26cam` | **Camera & Production Suite** (Field Camera & Vision Mixer) |
| **Administrator** | `e26@gmail.com` | `e26msoe` | **Admin Control Room** (Full Fiesta Management) |
