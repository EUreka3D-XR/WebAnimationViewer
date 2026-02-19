import express from 'express';
import axios from 'axios';
import path from 'path';
import { fileURLToPath } from 'url';
import process from 'process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;
const PROVIDER_URL = process.env.PROVIDER_URL || "https://3dwebviewer.eureka3dxr.fedcloud.eu/3dmlab/";
const DEFAULT_ALLOWED_OEMBED_HOSTS = [
  "3dwebviewer.eureka3dxr.fedcloud.eu",
  "3dwebviewer-demo.eureka3dxr.fedcloud.eu",
  "eureka3d.eu",
  "localhost",
];
const ALLOWED_OEMBED_HOSTS = (process.env.ALLOWED_OEMBED_HOSTS || DEFAULT_ALLOWED_OEMBED_HOSTS.join(","))
  .split(",")
  .map((host) => host.trim().toLowerCase())
  .filter(Boolean);

app.use(express.static('public'));

app.get('/proxy', async (req, res) => {
    const targetUrl = req.query.url;
    if (!targetUrl) {
        return res.status(400).send('Missing URL parameter');
    }

    try {
        const response = await axios.get(targetUrl, {
            responseType: 'arraybuffer',
            headers: {
                'User-Agent': 'Mozilla/5.0'
            }
        });

        res.set('Content-Type', response.headers['content-type']);
        res.send(response.data);
    } catch (error) {
        console.error('Proxy error:', error.message);
        res.status(500).send('Failed to fetch resource');
    }
});

const ALLOWED_VIEWER_HOSTS = new Set(ALLOWED_OEMBED_HOSTS);

function isAllowedOembedUrl(raw) {
  try {
    const u = new URL(raw);
    return (
      (u.protocol === "https:" || u.protocol === "http:") &&
      ALLOWED_VIEWER_HOSTS.has(u.hostname)
    );
  } catch {
    return false;
  }
}

function handleOembed(req, res) {
  const viewerUrl = req.query.url;
  const format = (req.query.format || "json").toLowerCase();

  if (format !== "json") {
    return res.status(400).json({ error: "Only format=json is supported." });
  }
  if (!viewerUrl || typeof viewerUrl !== "string") {
    return res.status(400).json({ error: "Missing required query parameter: url" });
  }
  if (!isAllowedOembedUrl(viewerUrl)) {
    return res.status(400).json({ error: "Invalid or not allowed url." });
  }

  const payload = {
    type: "rich",
    version: "1.0",
    provider_name: "EUreka3D",
    provider_url: PROVIDER_URL,
    html: `<iframe frameborder="0" title="" src="${viewerUrl}" height="100%" width="100%" allow="fullscreen;"></iframe>`,
    width: 1024,
    height: 800,
  };

  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.status(200).send(JSON.stringify(payload));
}

app.get("/3dmlab/oembed", handleOembed);

app.get("/3dmlab/*rest", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));  
});

app.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}`);
});