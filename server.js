const express = require('express');
const axios = require('axios');
const path = require('path');
const { fileURLToPath } = require('url');

// Create __dirname equivalent for ES modules
const __dirname = path.dirname(fileURLToPath(import.meta.url));

const app = express();
const PORT = 3000;

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

// Catch-all route for ID-based routing (must be last)
app.use((req, res, next) => {
    // If the request is for a file (has extension), let it 404
    if (path.extname(req.path)) {
        return next();
    }
    // Otherwise, serve index.html
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}`);
});