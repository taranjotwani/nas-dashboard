const express = require('express');
const path = require('path');
const axios = require('axios');

const app = express();
const PORT = process.env.PORT || 3000;

// Serve static files from the dist folder
const distPath = path.join(__dirname, 'dist');
app.use(express.static(distPath));

// Proxy endpoint for FileBrowser health check
app.get('/api/health/filebrowser', async (req, res) => {
  try {
    const response = await axios.get('http://192.168.1.87:1002/health', {
      timeout: 5000
    });
    res.status(response.status).json({
      status: 'ok',
      statusCode: response.status,
      data: response.data
    });
  } catch (error) {
    res.status(503).json({ 
      status: 'error',
      message: 'FileBrowser health check failed',
      error: error.message 
    });
  }
});

// Data service endpoint: fetch server IP and all active services status
app.get('/api/health/data', async (req, res) => {
  try {
    // Fetch server IP
    let serverIp = 'unknown';
    try {
      const ipResponse = await axios.get('https://api.ipify.org?format=json', {
        timeout: 5000
      });
      serverIp = ipResponse.data.ip;
    } catch (ipError) {
      console.error('Failed to fetch IP:', ipError.message);
    }

    // Define service base URLs and their health check endpoints
    const serviceUrls = {
      prowlarr: {
        base: 'http://192.168.1.87:9696',
        health: 'http://192.168.1.87:9696/api/v1/health?apikey=4487bb65566c4781bbbdbbb27932a9bd'
      },
      filebrowser: {
        base: 'http://192.168.1.87:1002',
        health: 'http://192.168.1.87:1002/health'
      },
      immich: {
        base: 'http://192.168.1.87:2283',
        health: 'http://192.168.1.87:2283/api/server/ping'
      },
      sabnzbd: {
        base: 'http://192.168.1.87:6789',
        health: 'http://192.168.1.87:6789/api?mode=queue&apikey=8ca263913f9a488fb9a42cfb310206de&output=json'
      },
      jellyfin: {
        base: 'http://192.168.1.87:8096',
        health: 'http://192.168.1.87:8096/health'
      }
    };

    // Fetch all services in parallel using health endpoints
    const serviceChecks = Object.entries(serviceUrls).map(([name, urls]) =>
      axios.get(urls.health, { timeout: 1000 })
        .then(response => ({
          name,
          url: urls.base,
          status: 'active',
          statusCode: response.status
        }))
        .catch(error => ({
          name,
          url: urls.base,
          status: 'inactive',
          error: error.message
        }))
    );

    const activeServices = await Promise.all(serviceChecks);

    // Build response
    const responseData = {
      serverIp,
      activeServices: activeServices.reduce((acc, service) => {
        acc[service.name] = {
          url: service.url,
          status: service.status,
          statusCode: service.statusCode || null,
          error: service.error || null
        };
        return acc;
      }, {})
    };

    res.status(200).json(responseData);
  } catch (error) {
    res.status(500).json({
      error: 'Failed to fetch data',
      message: error.message
    });
  }
});

// Simple GET webservice: send index.html from dist
app.get('/', (req, res) => {
  res.sendFile(path.join(distPath, 'index.html'));
});

// Fallback for client-side routing (but skip API routes)
app.use((req, res, next) => {
  // Don't serve index.html for API routes
  if (req.path.startsWith('/api/')) {
    return res.status(404).json({ error: 'Not found' });
  }
  res.sendFile(path.join(distPath, 'index.html'));
});

app.listen(PORT, () => {
  console.log(`Backend server running at http://localhost:${PORT}`);
});