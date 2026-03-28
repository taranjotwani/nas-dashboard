const express = require('express');
const path = require('path');
const axios = require('axios');
const { spawn } = require('child_process');
const fs = require('fs');
const sanitizeFilename = require('sanitize-filename');

const app = express();
const PORT = process.env.PORT || 3000;

const DEFAULT_MUSIC_DIR = process.env.MUSIC_DIR || 'E:/Music/Albums';
const YT_DLP_COMMAND = process.env.YT_DLP_COMMAND || 'yt-dlp';

function resolveMusicDirectory(targetDir) {
  if (process.platform === 'win32') {
    return targetDir;
  }

  const windowsDrivePathMatch = /^([a-zA-Z]):[\\/](.*)$/u.exec(targetDir);
  if (!windowsDrivePathMatch) {
    return targetDir;
  }

  const driveLetter = windowsDrivePathMatch[1].toLowerCase();
  const rest = windowsDrivePathMatch[2].replace(/\\/gu, '/');
  return path.join('/mnt', driveLetter, rest);
}

const MUSIC_DIR = resolveMusicDirectory(DEFAULT_MUSIC_DIR);

function createSafeBaseName(inputName) {
  const sanitized = sanitizeFilename((inputName || '').trim());
  return sanitized || `track-${Date.now()}`;
}

async function ensureUniqueFilePath(baseName) {
  let counter = 0;
  let outputPath = path.join(MUSIC_DIR, `${baseName}.mp3`);

  while (fs.existsSync(outputPath)) {
    counter += 1;
    outputPath = path.join(MUSIC_DIR, `${baseName}-${counter}.mp3`);
  }

  return outputPath;
}

async function ensureMusicDirectory() {
  await fs.promises.mkdir(MUSIC_DIR, { recursive: true });
}

function isYouTubeUrl(value) {
  try {
    const parsedUrl = new URL(value);
    const normalizedHost = parsedUrl.hostname.toLowerCase();
    const allowedHosts = new Set([
      'youtube.com',
      'www.youtube.com',
      'm.youtube.com',
      'music.youtube.com',
      'youtu.be',
      'www.youtu.be'
    ]);

    return (parsedUrl.protocol === 'http:' || parsedUrl.protocol === 'https:') && allowedHosts.has(normalizedHost);
  } catch {
    return false;
  }
}

function formatCommandError(stderr, fallbackMessage) {
  const lines = stderr
    .split(/\r?\n/u)
    .map((line) => line.trim())
    .filter(Boolean);

  return lines.at(-1) || fallbackMessage;
}

function runCommand(command, args) {
  return new Promise((resolve, reject) => {
    const childProcess = spawn(command, args, {
      windowsHide: true
    });
    let stdout = '';
    let stderr = '';

    childProcess.stdout.on('data', (chunk) => {
      stdout += chunk.toString();
    });

    childProcess.stderr.on('data', (chunk) => {
      stderr += chunk.toString();
    });

    childProcess.on('error', (error) => {
      if (error.code === 'ENOENT') {
        reject(new Error(`Command not found: ${command}. Install yt-dlp and ensure it is available on PATH.`));
        return;
      }

      reject(error);
    });

    childProcess.on('close', (code) => {
      if (code === 0) {
        resolve({ stdout, stderr });
        return;
      }

      reject(new Error(formatCommandError(stderr, `Command exited with code ${code}`)));
    });
  });
}

async function getYouTubeTitle(youtubeUrl) {
  const { stdout } = await runCommand(YT_DLP_COMMAND, [
    '--no-playlist',
    '--get-title',
    youtubeUrl
  ]);
  const lines = stdout
    .split(/\r?\n/u)
    .map((line) => line.trim())
    .filter(Boolean);

  return lines.at(-1) || '';
}

async function downloadYouTubeAudio(youtubeUrl, outputTemplate) {
  await runCommand(YT_DLP_COMMAND, [
    '--no-playlist',
    '--extract-audio',
    '--audio-format',
    'mp3',
    '--audio-quality',
    '0',
    '--output',
    outputTemplate,
    youtubeUrl
  ]);
}

app.use(express.json({ limit: '1mb' }));

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

// Convert YouTube video to MP3 and save it in the Music directory
app.post('/api/music/download', async (req, res) => {
  try {
    const { youtubeUrl, fileName } = req.body || {};
    console.log('Received download request for:', youtubeUrl);

    if (!youtubeUrl || !isYouTubeUrl(youtubeUrl)) {
      return res.status(400).json({
        error: 'Invalid youtubeUrl',
        message: 'Pass a valid YouTube URL in request body.'
      });
    }

    await ensureMusicDirectory();
    console.log('Ensured music directory exists at:', MUSIC_DIR);
    const videoTitle = await getYouTubeTitle(youtubeUrl);
    console.log('Fetched video info for:', videoTitle || 'unknown title');
    const requestedName = fileName || videoTitle;
    const safeBaseName = createSafeBaseName(requestedName);
    const outputPath = await ensureUniqueFilePath(safeBaseName);
    const outputTemplate = outputPath.replace(/\.mp3$/u, '.%(ext)s');

    await downloadYouTubeAudio(youtubeUrl, outputTemplate);

    if (!fs.existsSync(outputPath)) {
      throw new Error('yt-dlp finished without creating the expected MP3 file. Check that ffmpeg is installed and available to yt-dlp.');
    }

    res.status(201).json({
      status: 'ok',
      message: 'MP3 created successfully',
      title: videoTitle || path.basename(outputPath, '.mp3'),
      fileName: path.basename(outputPath),
      filePath: outputPath,
      outputDirectory: MUSIC_DIR
    });
  } catch (error) {
    console.log('Error during download:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to download YouTube audio as MP3',
      error: error.message
    });
  }
});

app.get('/api/music/config', async (req, res) => {
  try {
    await ensureMusicDirectory();
    res.json({
      outputDirectory: MUSIC_DIR,
      configuredDirectory: DEFAULT_MUSIC_DIR,
      platform: process.platform
    });
  } catch (error) {
    res.status(500).json({
      error: 'Failed to initialize music directory',
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