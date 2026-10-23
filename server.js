// server.js - Built purely with native Node.js (No npm dependencies required)
const http = require('http');
const fs = require('fs');
const path = require('path');
const https = require('https');

// Load local .env values without overwriting variables already supplied by the shell.
try {
  const envFile = fs.readFileSync(path.join(__dirname, '.env'), 'utf8');
  for (const line of envFile.split(/\r?\n/)) {
    const match = line.match(/^\s*(?:export\s+)?([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)?\s*$/);
    if (!match || Object.prototype.hasOwnProperty.call(process.env, match[1])) continue;
    let value = (match[2] || '').trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    } else {
      value = value.replace(/\s+#.*$/, '').trim();
    }
    process.env[match[1]] = value;
  }
} catch (err) {
  if (err.code !== 'ENOENT') throw err;
}

const PORT = process.env.PORT || 3000;
const API_KEY = process.env.CHATTERMATE_API_KEY;

const SYSTEM_PROMPT = "You are a hospital report assistant. Answer only from the report data given. Never invent numbers. If the data doesn't have the answer, say so. Money is in Taka (Tk). Keep answers short. You cannot change any data; refuse requests to edit or delete.";

// MIME types lookup for static assets
const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.svg': 'image/svg+xml'
};

// Helper: Make native HTTPS request (Promise based)
function httpsRequest(options, postData = null) {
  return new Promise((resolve, reject) => {
    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        resolve({ statusCode: res.statusCode, data });
      });
    });
    req.on('error', (err) => reject(err));
    if (postData) {
      req.write(postData);
    }
    req.end();
  });
}

// Helper: Call ChatterMate API
async function askChatterMate(question, reportData) {
  if (!API_KEY || API_KEY.trim() === '' || API_KEY.includes('your_key_here')) {
    throw new Error("ChatterMate API Key missing. Please set CHATTERMATE_API_KEY in your .env file.");
  }

  // 1. GET default model id
  const modelsRes = await httpsRequest({
    hostname: 'chattermate.ai',
    path: '/api/chat/models',
    method: 'GET',
    headers: {
      'X-API-Key': API_KEY,
      'Accept': 'application/json'
    }
  });

  if (modelsRes.statusCode !== 200) {
    throw new Error(`Failed to fetch models from ChatterMate (Status ${modelsRes.statusCode}): ${modelsRes.data}`);
  }

  const modelsJson = JSON.parse(modelsRes.data);
  const defaultModelId = modelsJson.default_model_id || (modelsJson.models && modelsJson.models[0]?.id) || 'gpt-4o';

  // 2. Stream generation via POST /api/chat/stream
  const requestBody = JSON.stringify({
    models: [defaultModelId],
    system_prompt: SYSTEM_PROMPT,
    prompt: `Report data: ${JSON.stringify(reportData)} Question: ${question}`
  });

  const streamRes = await httpsRequest({
    hostname: 'chattermate.ai',
    path: '/api/chat/stream',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-API-Key': API_KEY,
      'Content-Length': Buffer.byteLength(requestBody)
    }
  }, requestBody);

  if (streamRes.statusCode !== 200) {
    throw new Error(`ChatterMate API error (${streamRes.statusCode}): ${streamRes.data}`);
  }

  // 3. Parse Server-Sent Events (SSE)
  const lines = streamRes.data.split('\n');
  let answer = '';
  let isModelChunk = false;

  for (let line of lines) {
    line = line.trim();
    if (line.startsWith('event: model_chunk')) {
      isModelChunk = true;
    } else if (line.startsWith('event:') && !line.includes('model_chunk')) {
      isModelChunk = false;
    } else if (line.startsWith('data:') && isModelChunk) {
      const dataStr = line.replace(/^data:\s*/, '');
      try {
        const parsed = JSON.parse(dataStr);
        if (parsed.content) {
          answer += parsed.content;
        }
      } catch (e) {
        // If it's plain text rather than JSON
        answer += dataStr;
      }
    }
  }

  return answer.trim() || "No response generated. Please check your query or report data.";
}

// HTTP Server
const server = http.createServer(async (req, res) => {
  const parsedUrl = new URL(req.url, `http://${req.headers.host}`);
  const pathname = parsedUrl.pathname;

  // Route: POST /ask
  if (req.method === 'POST' && pathname === '/ask') {
    let body = '';
    req.on('data', chunk => { body += chunk; });
    req.on('end', async () => {
      res.setHeader('Content-Type', 'application/json; charset=utf-8');
      try {
        const payload = JSON.parse(body || '{}');
        const question = payload.question;
        const data = payload.data || {};

        if (!question) {
          res.statusCode = 400;
          return res.end(JSON.stringify({ error: "Question parameter is required." }));
        }

        const answer = await askChatterMate(question, data);
        res.statusCode = 200;
        return res.end(JSON.stringify({ answer }));
      } catch (err) {
        console.error("Error processing /ask:", err.message);
        res.statusCode = 500;
        return res.end(JSON.stringify({ 
          error: err.message || "Failed to communicate with ChatterMate."
        }));
      }
    });
    return;
  }

  // Static File Serving
  let filePath = path.join(__dirname, pathname === '/' ? 'index.html' : pathname);
  const ext = path.extname(filePath).toLowerCase();
  const contentType = MIME_TYPES[ext] || 'application/octet-stream';

  fs.readFile(filePath, (err, content) => {
    if (err) {
      if (err.code === 'ENOENT') {
        res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
        res.end('404 Not Found');
      } else {
        res.writeHead(500);
        res.end(`Server Error: ${err.code}`);
      }
    } else {
      res.writeHead(200, { 'Content-Type': contentType });
      res.end(content);
    }
  });
});

server.listen(PORT, () => {
  console.log(`====================================================`);
  console.log(`CarePoint Hospital Management System is running!`);
  console.log(`Server URL: http://localhost:${PORT}`);
  console.log(`API Key status: ${API_KEY ? 'Loaded from environment' : 'NOT FOUND! Check .env'}`);
  console.log(`====================================================`);
});