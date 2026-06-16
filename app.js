const express = require('express');
const path = require('path');
const axios = require('axios');
const crypto = require('crypto');
const { spawn } = require('child_process');
const fs = require('fs');
const os = require('os');
const sanitizeFilename = require('sanitize-filename');
const { MongoClient } = require('mongodb');
const { LINK_INDEXES, createLinkDocument, updateLinkDocument } = require('./models/Link');

require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

const DEFAULT_MUSIC_DIR = process.env.MUSIC_DIR || 'E:/Music/Albums';
const YT_DLP_COMMAND = process.env.YT_DLP_COMMAND || 'yt-dlp';

// Service URLs
const PROWLARR_URL = 'http://192.168.1.87:9696';
const FILEBROWSER_URL = 'http://192.168.1.87:1002';
const IMMICH_URL = 'http://192.168.1.87:2283';
const SABNZBD_URL = 'http://192.168.1.87:6789';
const JELLYFIN_URL = 'http://192.168.1.87:8096';

// Service API keys
const PROWLARR_API_KEY = '4487bb65566c4781bbbdbbb27932a9bd';
const SABNZBD_API_KEY = '8ca263913f9a488fb9a42cfb310206de';

// MongoDB Atlas connection
const MONGO_URI = process.env.MONGO_URI;
const MONGO_DB_NAME = process.env.MONGO_DB_NAME || 'nas-dash';
const MONGO_LINKS_COLLECTION = process.env.MONGO_LINKS_COLLECTION || 'links';

if (!MONGO_URI) {
  console.error('MONGO_URI environment variable is not set. Set it in your .env file.');
  process.exit(1);
}

const mongoClient = new MongoClient(MONGO_URI);
let linksCollection;

async function connectToDatabase() {
  await mongoClient.connect();
  const db = mongoClient.db(MONGO_DB_NAME);
  linksCollection = db.collection(MONGO_LINKS_COLLECTION);

  // Ensure indexes defined in the schema exist
  for (const index of LINK_INDEXES) {
    await linksCollection.createIndex(index.key, index.options);
  }

  console.log(`Connected to MongoDB Atlas — database: ${MONGO_DB_NAME}, collection: ${MONGO_LINKS_COLLECTION}`);
}

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

async function readLinks() {
  return linksCollection.find({}, { projection: { _id: 0 } }).sort({ createdAt: 1 }).toArray();
}

async function insertLink(linkDoc) {
  await linksCollection.insertOne(linkDoc);
}

async function updateLink(id, updatedDoc) {
  const { id: _ignored, ...fields } = updatedDoc;
  await linksCollection.updateOne({ id }, { $set: fields });
}

async function deleteLink(id) {
  return linksCollection.deleteOne({ id });
}

function isValidHttpUrl(value) {
  try {
    const parsedUrl = new URL(value);
    return parsedUrl.protocol === 'http:' || parsedUrl.protocol === 'https:';
  } catch {
    return false;
  }
}

function normalizeLinkInput(input = {}) {
  const name = typeof input.name === 'string' ? input.name.trim() : '';
  const url = typeof input.url === 'string' ? input.url.trim() : '';

  if (!name) {
    return { error: 'Link name is required.' };
  }

  if (!url || !isValidHttpUrl(url)) {
    return { error: 'A valid http or https URL is required.' };
  }

  return {
    name,
    url
  };
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

async function ensureMp3FilePath(expectedOutputPath) {
  if (fs.existsSync(expectedOutputPath)) {
    return expectedOutputPath;
  }

  const outputDirectory = path.dirname(expectedOutputPath);
  const expectedBaseName = path.basename(expectedOutputPath, '.mp3');
  const downloadedFiles = await fs.promises.readdir(outputDirectory, { withFileTypes: true });
  const alternateFile = downloadedFiles.find((entry) => {
    if (!entry.isFile()) {
      return false;
    }

    return path.parse(entry.name).name === expectedBaseName;
  });

  if (!alternateFile) {
    throw new Error('yt-dlp finished without creating the expected audio file. Check that ffmpeg is installed and available to yt-dlp.');
  }

  const alternateOutputPath = path.join(outputDirectory, alternateFile.name);
  await fs.promises.rename(alternateOutputPath, expectedOutputPath);

  return expectedOutputPath;
}

app.use(express.json({ limit: '1mb' }));

// CPU usage sampling
function getCpuTotals() {
  return os.cpus().reduce(
    (acc, cpu) => {
      const times = cpu.times;
      acc.idle += times.idle;
      acc.total += times.idle + times.user + times.nice + times.sys + times.irq;
      return acc;
    },
    { idle: 0, total: 0 }
  );
}

let prevCpuTotals = getCpuTotals();

function getCpuUsagePercent() {
  const current = getCpuTotals();
  const idleDelta = current.idle - prevCpuTotals.idle;
  const totalDelta = current.total - prevCpuTotals.total;
  prevCpuTotals = current;
  if (totalDelta === 0) return 0;
  return Math.round(((totalDelta - idleDelta) / totalDelta) * 100);
}

// Serve static files from the dist folder
const distPath = path.join(__dirname, 'dist');
app.use(express.static(distPath));

app.get('/api/system/stats', (req, res) => {
  const totalMem = os.totalmem();
  const freeMem = os.freemem();
  const usedMem = totalMem - freeMem;
  res.status(200).json({
    cpu: getCpuUsagePercent(),
    memory: {
      usedBytes: usedMem,
      totalBytes: totalMem,
      usedPercent: Math.round((usedMem / totalMem) * 100)
    }
  });
});

app.get('/api/links', async (req, res) => {
  try {
    const links = await readLinks();
    res.status(200).json(links);
  } catch (error) {
    res.status(500).json({
      error: 'Failed to read links',
      message: error.message
    });
  }
});

app.post('/api/links', async (req, res) => {
  try {
    const normalizedLink = normalizeLinkInput(req.body);
    if (normalizedLink.error) {
      return res.status(400).json({ error: normalizedLink.error });
    }

    const newLink = createLinkDocument(crypto.randomUUID(), normalizedLink.name, normalizedLink.url);
    await insertLink(newLink);
    res.status(201).json(newLink);
  } catch (error) {
    res.status(500).json({
      error: 'Failed to save link',
      message: error.message
    });
  }
});

app.put('/api/links/:linkId', async (req, res) => {
  try {
    const normalizedLink = normalizeLinkInput(req.body);
    if (normalizedLink.error) {
      return res.status(400).json({ error: normalizedLink.error });
    }

    const existing = await linksCollection.findOne({ id: req.params.linkId }, { projection: { _id: 0 } });
    if (!existing) {
      return res.status(404).json({ error: 'Link not found' });
    }

    const updatedLink = updateLinkDocument(existing, normalizedLink.name, normalizedLink.url);
    await updateLink(req.params.linkId, updatedLink);
    res.status(200).json(updatedLink);
  } catch (error) {
    res.status(500).json({
      error: 'Failed to update link',
      message: error.message
    });
  }
});

app.delete('/api/links/:linkId', async (req, res) => {
  try {
    const result = await deleteLink(req.params.linkId);
    if (result.deletedCount === 0) {
      return res.status(404).json({ error: 'Link not found' });
    }

    res.status(204).send();
  } catch (error) {
    res.status(500).json({
      error: 'Failed to delete link',
      message: error.message
    });
  }
});

// Proxy endpoint for FileBrowser health check
app.get('/api/health/filebrowser', async (req, res) => {
  try {
    const response = await axios.get(`${FILEBROWSER_URL}/health`, {
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
        base: PROWLARR_URL,
        health: `${PROWLARR_URL}/api/v1/health?apikey=${PROWLARR_API_KEY}`
      },
      filebrowser: {
        base: FILEBROWSER_URL,
        health: `${FILEBROWSER_URL}/health`
      },
      immich: {
        base: IMMICH_URL,
        health: `${IMMICH_URL}/api/server/ping`
      },
      sabnzbd: {
        base: SABNZBD_URL,
        health: `${SABNZBD_URL}/api?mode=queue&apikey=${SABNZBD_API_KEY}&output=json`
      },
      jellyfin: {
        base: JELLYFIN_URL,
        health: `${JELLYFIN_URL}/health`
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
    const finalOutputPath = await ensureMp3FilePath(outputPath);

    if (!fs.existsSync(finalOutputPath)) {
      throw new Error('yt-dlp finished without creating the expected MP3 file. Check that ffmpeg is installed and available to yt-dlp.');
    }

    res.status(201).json({
      status: 'ok',
      message: 'MP3 created successfully',
      title: videoTitle || path.basename(finalOutputPath, '.mp3'),
      fileName: path.basename(finalOutputPath),
      filePath: finalOutputPath,
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

// GitHub Actions Runner control (Windows service)
const RUNNER_DIR = process.env.RUNNER_DIR || 'C:\\actions-runner';
const RUNNER_SERVICE_NAME = process.env.RUNNER_SERVICE_NAME || 'actions.runner.taranjotwani-nas-dashboard.nas-runner';

function runPowerShell(psCommand) {
  return new Promise((resolve, reject) => {
    const proc = spawn('powershell.exe', ['-NoProfile', '-NonInteractive', '-Command', psCommand]);
    let stdout = '';
    let stderr = '';
    proc.stdout.on('data', (chunk) => { stdout += chunk.toString(); });
    proc.stderr.on('data', (chunk) => { stderr += chunk.toString(); });
    proc.on('error', reject);
    proc.on('close', (code) => {
      if (code === 0) {
        resolve(stdout.trim());
      } else {
        reject(new Error(stderr.trim() || `powershell exited with code ${code}`));
      }
    });
  });
}

app.get('/api/runner/status', async (req, res) => {
  try {
    const output = await runPowerShell(
      `(Get-Service -Name '${RUNNER_SERVICE_NAME}').Status`
    );
    res.json({ running: output === 'Running', status: output });
  } catch (error) {
    res.status(500).json({ error: 'Failed to query runner status', message: error.message });
  }
});

app.post('/api/runner/start', async (req, res) => {
  try {
    await runPowerShell(`Start-Service -Name '${RUNNER_SERVICE_NAME}'`);
    res.json({ ok: true, message: 'Runner started' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to start runner', message: error.message });
  }
});

app.post('/api/runner/stop', async (req, res) => {
  try {
    await runPowerShell(`Stop-Service -Name '${RUNNER_SERVICE_NAME}'`);
    res.json({ ok: true, message: 'Runner stopped' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to stop runner', message: error.message });
  }
});

// Return last 100 lines of the most recent runner diagnostic log
app.get('/api/runner/logs', async (req, res) => {
  try {
    const diagDir = path.join(RUNNER_DIR, '_diag');
    const entries = await fs.promises.readdir(diagDir, { withFileTypes: true });
    const logFiles = entries
      .filter((e) => e.isFile() && e.name.startsWith('Runner_') && e.name.endsWith('.log'))
      .map((e) => e.name)
      .sort()
      .reverse();

    if (logFiles.length === 0) {
      return res.json({ lines: [], file: null });
    }

    const latestFile = logFiles[0];
    const content = await fs.promises.readFile(path.join(diagDir, latestFile), 'utf8');
    const lines = content.split(/\r?\n/).filter(Boolean).slice(-100);
    res.json({ lines, file: latestFile });
  } catch (error) {
    res.status(500).json({ error: 'Failed to read runner logs', message: error.message });
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

connectToDatabase()
  .then(() => {
    app.listen(PORT, () => {
      console.log(`Backend server running at http://localhost:${PORT}`);
    });
  })
  .catch((error) => {
    console.error('Failed to connect to MongoDB Atlas:', error.message);
    process.exit(1);
  });