require('dotenv').config();
const express = require('express');
const http = require('http');
const os = require('os');
const path = require('path');
const crypto = require('crypto');
const { spawn } = require('child_process');
const QRCode = require('qrcode');
const Razorpay = require('razorpay');
const localtunnel = require('localtunnel');
const { WebSocketServer, WebSocket } = require('ws');

const app = express();
const server = http.createServer(app);
const wss = new WebSocketServer({ noServer: true });

// Active developer sessions: sessionId -> session object
const activeSessions = new Map();
// Pending HTTP requests awaiting relay response: requestId -> { req, res, timeout }
const pendingRelayRequests = new Map();

const PORT = process.env.PORT || 4050;

// Initialize Razorpay Gateway
const isRazorpayConfigured = Boolean(
  process.env.RAZORPAY_KEY_ID &&
  process.env.RAZORPAY_KEY_SECRET &&
  !process.env.RAZORPAY_KEY_ID.includes('YourKeyIdHere') &&
  !process.env.RAZORPAY_KEY_SECRET.includes('YourKeySecretHere')
);

let razorpayInstance = null;
if (isRazorpayConfigured) {
  try {
    razorpayInstance = new Razorpay({
      key_id: process.env.RAZORPAY_KEY_ID,
      key_secret: process.env.RAZORPAY_KEY_SECRET
    });
    console.log('[Razorpay] Gateway initialized with Key ID:', process.env.RAZORPAY_KEY_ID);
  } catch (err) {
    console.error('[Razorpay] Initialization error:', err.message);
  }
} else {
  console.log('[Razorpay] Running in Sandbox / Test Mode. Add real keys to .env to enable live checkout.');
}

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public'), {
  etag: false,
  maxAge: 0,
  setHeaders: (res, path) => {
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
  }
}));

// Legal & Policy Direct URLs (Redirect to client modal hash)
app.get('/terms', (req, res) => res.redirect('/#terms'));
app.get('/privacy', (req, res) => res.redirect('/#privacy'));
app.get('/refund', (req, res) => res.redirect('/#refund'));
app.get('/contact', (req, res) => res.redirect('/#contact'));

// WebSocket Upgrade Handler for In-Browser Relay
server.on('upgrade', (request, socket, head) => {
  const host = request.headers.host || 'localhost';
  const parsedUrl = new URL(request.url, `http://${host}`);

  if (parsedUrl.pathname === '/api/relay-ws') {
    wss.handleUpgrade(request, socket, head, (ws) => {
      wss.emit('connection', ws, request);
    });
  } else {
    socket.destroy();
  }
});

// WebSocket Connection from Developer's Browser Tab
wss.on('connection', (ws, req) => {
  const host = req.headers.host || 'localhost';
  const parsedUrl = new URL(req.url, `http://${host}`);
  const sessionId = parsedUrl.searchParams.get('sessionId') || 'default';
  const targetPort = parseInt(parsedUrl.searchParams.get('targetPort'), 10) || 3000;

  console.log(`[Relay WS] Developer browser connected for session [${sessionId}] targeting localhost:${targetPort}`);

  let session = activeSessions.get(sessionId);
  if (!session) {
    session = {
      id: sessionId,
      active: true,
      targetPort: targetPort,
      ws: ws,
      terminalCommand: `bore local ${targetPort} --to bore.pub`,
      terminalCommandAlt: `npx -y localtunnel --port ${targetPort}`
    };
    activeSessions.set(sessionId, session);
  } else {
    session.ws = ws;
    session.targetPort = targetPort;
  }

  ws.on('message', (message) => {
    try {
      const data = JSON.parse(message.toString());
      if (data.type === 'HTTP_RESPONSE') {
        const pending = pendingRelayRequests.get(data.requestId);
        if (pending) {
          clearTimeout(pending.timeout);
          pendingRelayRequests.delete(data.requestId);

          pending.res.status(data.status || 200);

          if (data.headers) {
            Object.entries(data.headers).forEach(([k, v]) => {
              const lower = k.toLowerCase();
              if (!['content-encoding', 'transfer-encoding', 'connection', 'content-length'].includes(lower)) {
                try { pending.res.setHeader(k, v); } catch (e) {}
              }
            });
          }

          let responseBody = data.body || '';

          // If HTML response, inject <base href="/live/sessionId/"> so relative scripts/styles load properly
          const contentType = pending.res.getHeader('content-type') || '';
          if (typeof responseBody === 'string' && contentType.includes('text/html')) {
            const baseTag = `<base href="/live/${sessionId}/">`;
            if (responseBody.includes('<head>')) {
              responseBody = responseBody.replace('<head>', `<head>${baseTag}`);
            } else if (responseBody.includes('<html>')) {
              responseBody = responseBody.replace('<html>', `<html><head>${baseTag}</head>`);
            } else {
              responseBody = `${baseTag}${responseBody}`;
            }
          }

          if (data.isBase64 && responseBody) {
            pending.res.send(Buffer.from(responseBody, 'base64'));
          } else {
            pending.res.send(responseBody);
          }
        }
      }
    } catch (e) {
      console.error('[Relay WS] Error processing message from developer:', e);
    }
  });

  ws.on('close', () => {
    console.log(`[Relay WS] Developer browser tab disconnected for session [${sessionId}]`);
    if (session && session.ws === ws) {
      session.ws = null;
    }
  });
});

// Public Live Tunnel Gateway: Access localhost through developer's browser relay
app.all('/live/:sessionId*', (req, res) => {
  const sessionId = req.params.sessionId;
  const session = activeSessions.get(sessionId);

  if (!session || !session.active) {
    return res.status(404).send(`
      <!DOCTYPE html>
      <html>
      <head><title>Session Ended - TunnelSnap</title><meta name="viewport" content="width=device-width, initial-scale=1"></head>
      <body style="font-family: system-ui, -apple-system, sans-serif; background: #0f172a; color: #f8fafc; display: flex; align-items: center; justify-content: center; min-height: 100vh; margin: 0; text-align: center; padding: 20px;">
        <div style="background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.1); border-radius: 16px; padding: 40px; max-width: 480px; box-shadow: 0 20px 40px rgba(0,0,0,0.5);">
          <h2 style="color: #e11d48; margin-top: 0;">Session Completed or Inactive</h2>
          <p style="color: #94a3b8; font-size: 0.95rem; line-height: 1.6;">This developer preview session has timed out or was closed.</p>
          <a href="/" style="display: inline-block; margin-top: 16px; background: #e11d48; color: #fff; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: 600;">Launch New Tunnel &rarr;</a>
        </div>
      </body>
      </html>
    `);
  }

  // If Browser Relay is actively connected via WebSocket
  if (session.ws && session.ws.readyState === WebSocket.OPEN) {
    const requestId = crypto.randomUUID();
    const timeout = setTimeout(() => {
      pendingRelayRequests.delete(requestId);
      if (!res.headersSent) {
        res.status(504).send(`
          <!DOCTYPE html>
          <html>
          <head><title>Gateway Timeout - TunnelSnap</title><meta name="viewport" content="width=device-width, initial-scale=1"></head>
          <body style="font-family: system-ui, sans-serif; padding: 40px; text-align: center; background: #0f172a; color: #fff;">
            <h2 style="color: #f59e0b;">504 Gateway Timeout</h2>
            <p style="color: #94a3b8;">The developer's browser tab is open, but did not receive a response from <strong>localhost:${session.targetPort}</strong> in time.</p>
            <p style="color: #cbd5e1;">Make sure the developer's local dev server is currently running on port ${session.targetPort}.</p>
          </body>
          </html>
        `);
      }
    }, 15000);

    pendingRelayRequests.set(requestId, { req, res, timeout });

    const prefix = `/live/${sessionId}`;
    let subUrl = req.originalUrl;
    if (subUrl.startsWith(prefix)) {
      subUrl = subUrl.substring(prefix.length) || '/';
    }

    addAccessLog({
      clientIp: req.ip || 'Remote Tester',
      device: req.headers['user-agent']?.includes('Mobile') ? 'Mobile Phone' : 'Remote Tester',
      deviceType: 'remote',
      target: session.url,
      action: `${req.method} ${subUrl}`
    });

    session.ws.send(JSON.stringify({
      type: 'HTTP_REQUEST',
      requestId,
      method: req.method,
      url: subUrl,
      headers: req.headers,
      body: req.body
    }));
  } else {
    // Waiting for Developer Connection
    res.status(503).send(`
      <!DOCTYPE html>
      <html>
      <head><title>Connecting to Developer - TunnelSnap</title><meta name="viewport" content="width=device-width, initial-scale=1"></head>
      <body style="font-family: system-ui, -apple-system, sans-serif; background: #0f172a; color: #f8fafc; display: flex; align-items: center; justify-content: center; min-height: 100vh; margin: 0; text-align: center; padding: 20px;">
        <div style="background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.1); border-radius: 16px; padding: 40px; max-width: 480px; box-shadow: 0 20px 40px rgba(0,0,0,0.5);">
          <div style="display: inline-block; width: 14px; height: 14px; border-radius: 50%; background: #f59e0b; margin-bottom: 12px; box-shadow: 0 0 12px #f59e0b;"></div>
          <h2 style="color: #f8fafc; margin-top: 0;">Waiting for Developer to Connect</h2>
          <p style="color: #94a3b8; font-size: 0.95rem; line-height: 1.6;">
            The tunnel session is allocated, but the developer's laptop hasn't connected yet.<br><br>
            <strong>If you are the developer:</strong><br>
            &bull; Keep your <strong>tunnelsnap.pixorva.com</strong> browser tab open (Browser Relay)<br>
            &bull; OR run: <code>${session.terminalCommand}</code>
          </p>
        </div>
      </body>
      </html>
    `);
  }
});

// In-memory access logs
const accessLogs = [];
const MAX_LOGS = 60;

function addAccessLog(logEntry) {
  accessLogs.unshift({
    id: Date.now() + Math.random().toString(36).substring(2, 7),
    timestamp: new Date().toISOString(),
    ...logEntry
  });
  if (accessLogs.length > MAX_LOGS) {
    accessLogs.pop();
  }
}

// Global Time-Limited Tunnel Session State
let activeSession = {
  active: false,
  url: null,
  provider: 'TunnelSnap Direct',
  targetPort: 3000,
  durationMinutes: 5,
  startedAt: null,
  expiresAt: null,
  timerId: null,
  process: null
};

// Terminate active tunnel session
function stopActiveSession(reason = 'expired') {
  if (!activeSession.active) return;

  if (activeSession.timerId) {
    clearTimeout(activeSession.timerId);
    activeSession.timerId = null;
  }

  if (activeSession.process) {
    try {
      activeSession.process.kill('SIGTERM');
      setTimeout(() => {
        if (activeSession.process) {
          try { activeSession.process.kill('SIGKILL'); } catch (e) {}
        }
      }, 1000);
    } catch (e) {
      console.error('Error killing tunnel process', e);
    }
    activeSession.process = null;
  }

  const prevUrl = activeSession.url;
  activeSession.active = false;
  activeSession.url = null;

  addAccessLog({
    clientIp: 'Host Machine',
    device: 'TunnelSnap Controller',
    deviceType: 'system',
    target: prevUrl || 'Tunnel',
    action: reason === 'expired' ? 'Session Expired (Access Closed)' : 'Access Revoked by Developer'
  });

  console.log(`[TunnelSnap] Session ended (${reason}). Access revoked.`);
}

// Start Global Tunnel with Automatic Fallback (Bore primary, Localtunnel secondary)
function tryBoreTunnel(targetPort) {
  return new Promise((resolve, reject) => {
    let resolved = false;
    let proc;

    try {
      proc = spawn('bore', ['local', `${targetPort}`, '--to', 'bore.pub']);
    } catch (err) {
      return reject(err);
    }

    const timer = setTimeout(() => {
      if (!resolved) {
        resolved = true;
        try { proc.kill(); } catch (e) {}
        reject(new Error('Timed out waiting for bore edge server'));
      }
    }, 8000);

    const onData = (data) => {
      const output = data.toString();
      const match = output.match(/listening at bore\.pub:(\d+)/);
      if (match && !resolved) {
        resolved = true;
        clearTimeout(timer);
        const remotePort = match[1];
        resolve({
          url: `http://bore.pub:${remotePort}`,
          provider: 'TunnelSnap Global Edge (Bore)',
          process: proc
        });
      }
    };

    proc.stdout.on('data', onData);
    proc.stderr.on('data', onData);

    proc.on('error', (err) => {
      if (!resolved) {
        resolved = true;
        clearTimeout(timer);
        reject(err);
      }
    });

    proc.on('close', (code) => {
      if (!resolved) {
        resolved = true;
        clearTimeout(timer);
        reject(new Error(`Bore process exited with code ${code}`));
      } else {
        if (activeSession.active) {
          stopActiveSession('process_closed');
        }
      }
    });
  });
}

function tryLocalTunnel(targetPort) {
  return new Promise((resolve, reject) => {
    let resolved = false;
    const timer = setTimeout(() => {
      if (!resolved) {
        resolved = true;
        reject(new Error('Timed out establishing fallback tunnel connection'));
      }
    }, 15000);

    localtunnel({ port: targetPort }, (err, tunnel) => {
      if (err) {
        if (!resolved) {
          resolved = true;
          clearTimeout(timer);
          return reject(err);
        }
      }
      if (!resolved) {
        resolved = true;
        clearTimeout(timer);
        resolve({
          url: tunnel.url,
          provider: 'TunnelSnap Global Edge (Direct)',
          process: {
            kill: () => {
              try { tunnel.close(); } catch (e) {}
            }
          }
        });
      }
    });
  });
}

async function startTunnel(targetPort) {
  try {
    return await tryBoreTunnel(targetPort);
  } catch (boreErr) {
    console.warn('[TunnelSnap] Bore unavailable or failed (' + boreErr.message + '), engaging fallback tunnel...');
    try {
      return await tryLocalTunnel(targetPort);
    } catch (fallbackErr) {
      throw new Error(`Unable to establish tunnel: ${boreErr.message}. Fallback: ${fallbackErr.message}`);
    }
  }
}


// REST API: Network info (for local offline fallback)
app.get('/api/network-info', (req, res) => {
  const nets = os.networkInterfaces();
  let primaryIp = '127.0.0.1';

  for (const name of Object.keys(nets)) {
    for (const net of nets[name]) {
      if (net.family === 'IPv4' && !net.internal) {
        primaryIp = net.address;
        break;
      }
    }
  }

  res.json({
    hostname: os.hostname(),
    primaryIp,
    appPort: PORT
  });
});

// REST API: QR Code Generator
app.get('/api/qr', async (req, res) => {
  try {
    const text = req.query.text;
    if (!text) return res.status(400).json({ error: 'Missing text parameter' });

    const type = req.query.type || 'svg';
    const dark = req.query.dark || '#0f172a';
    const light = req.query.light || '#ffffff';

    if (type === 'svg') {
      const svg = await QRCode.toString(text, {
        type: 'svg',
        margin: 2,
        color: { dark, light }
      });
      res.type('image/svg+xml').send(svg);
    } else {
      const dataUrl = await QRCode.toDataURL(text, {
        margin: 2,
        width: 400,
        color: { dark, light }
      });
      res.json({ dataUrl });
    }
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// REST API: Check health of target port
app.get('/api/check-health', (req, res) => {
  const port = parseInt(req.query.port, 10) || 3000;
  const clientReq = http.request({
    host: '127.0.0.1',
    port: port,
    path: '/',
    method: 'GET',
    timeout: 2000
  }, (clientRes) => {
    res.json({
      alive: true,
      statusCode: clientRes.statusCode,
      target: `http://localhost:${port}`
    });
    clientRes.resume();
  });

  clientReq.on('timeout', () => {
    clientReq.destroy();
    res.json({ alive: false, message: 'Timed out connecting to localhost' });
  });

  clientReq.on('error', () => {
    res.json({ alive: false, message: `No service responding on localhost:${port}` });
  });

  clientReq.end();
});

// REST API: Get current Tunnel Session Status
app.get('/api/tunnel/status', (req, res) => {
  const now = Date.now();
  let remainingSeconds = 0;

  if (activeSession.active && activeSession.expiresAt) {
    remainingSeconds = Math.max(0, Math.round((activeSession.expiresAt - now) / 1000));
    if (remainingSeconds <= 0) {
      stopActiveSession('expired');
    }
  }

  res.json({
    active: activeSession.active,
    url: activeSession.url,
    provider: activeSession.provider,
    targetPort: activeSession.targetPort,
    durationMinutes: activeSession.durationMinutes,
    startedAt: activeSession.startedAt,
    expiresAt: activeSession.expiresAt,
    remainingSeconds: remainingSeconds
  });
});

// REST API: Start Global Time-Limited Tunnel Session (Dual Mode: Browser Relay + Terminal Command)
app.post('/api/tunnel/start', async (req, res) => {
  const targetPort = parseInt(req.body.targetPort, 10) || 3000;
  const durationMinutes = Math.min(180, Math.max(1, parseInt(req.body.durationMinutes, 10) || 5));
  const planName = req.body.planName || (durationMinutes === 5 ? '5-Min Free Pass' : `${durationMinutes}-Min Paid Pass`);

  const sessionId = `snap_${Math.random().toString(36).substring(2, 8)}`;
  const now = Date.now();
  const expiresAt = now + durationMinutes * 60 * 1000;

  const protocol = req.headers['x-forwarded-proto'] || (req.secure ? 'https' : 'http');
  const host = req.headers.host || 'tunnelsnap.pixorva.com';
  const liveUrl = `${protocol}://${host}/live/${sessionId}`;

  const sessionObj = {
    id: sessionId,
    active: true,
    url: liveUrl,
    provider: 'TunnelSnap Dual Relay',
    targetPort: targetPort,
    durationMinutes: durationMinutes,
    startedAt: now,
    expiresAt: expiresAt,
    ws: null,
    terminalCommand: `bore local ${targetPort} --to bore.pub`,
    terminalCommandAlt: `npx -y localtunnel --port ${targetPort}`,
    timerId: setTimeout(() => {
      stopActiveSession('expired');
      activeSessions.delete(sessionId);
    }, durationMinutes * 60 * 1000)
  };

  activeSessions.set(sessionId, sessionObj);
  activeSession = sessionObj;

  addAccessLog({
    clientIp: req.ip || 'Developer',
    device: `TunnelSnap (${planName})`,
    deviceType: 'global',
    target: liveUrl,
    action: `Allocated tunnel for ${durationMinutes} min`
  });

  res.json({
    success: true,
    sessionId: sessionId,
    url: liveUrl,
    provider: 'TunnelSnap Dual Relay',
    targetPort: targetPort,
    durationMinutes: durationMinutes,
    expiresAt: expiresAt,
    remainingSeconds: durationMinutes * 60,
    terminalCommand: `bore local ${targetPort} --to bore.pub`,
    terminalCommandAlt: `npx -y localtunnel --port ${targetPort}`
  });
});

// REST API: Extend Active Session (+ minutes)
app.post('/api/tunnel/extend', (req, res) => {
  if (!activeSession.active) {
    return res.status(400).json({ error: 'No active tunnel session to extend' });
  }

  const addMinutes = parseInt(req.body.addMinutes, 10) || 5;
  const now = Date.now();
  const currentRemaining = Math.max(0, activeSession.expiresAt - now);
  const newDuration = activeSession.durationMinutes + addMinutes;

  if (newDuration > 180) {
    return res.status(400).json({ error: 'Maximum session limit is 3 hours (180 minutes)' });
  }

  const newExpiresAt = now + currentRemaining + addMinutes * 60 * 1000;

  clearTimeout(activeSession.timerId);
  activeSession.expiresAt = newExpiresAt;
  activeSession.durationMinutes = newDuration;
  activeSession.timerId = setTimeout(() => {
    stopActiveSession('expired');
  }, newExpiresAt - now);

  const remainingSeconds = Math.round((newExpiresAt - now) / 1000);

  addAccessLog({
    clientIp: 'Host Machine',
    device: 'Time Extension',
    deviceType: 'system',
    target: activeSession.url,
    action: `Added +${addMinutes} min (${Math.round(remainingSeconds / 60)} min remaining)`
  });

  res.json({
    success: true,
    expiresAt: newExpiresAt,
    remainingSeconds: remainingSeconds
  });
});

// REST API: Stop Tunnel Session Manually
app.post('/api/tunnel/stop', (req, res) => {
  if (activeSession.active) {
    stopActiveSession('manual_stop');
    res.json({ success: true, message: 'Session stopped and access revoked' });
  } else {
    res.json({ success: true, message: 'No active session' });
  }
});

// REST API: Access logs
app.get('/api/access-logs', (req, res) => {
  res.json({ logs: accessLogs });
});

// ==========================================================================
// Razorpay Payment Gateway Integration
// ==========================================================================

// Get payment gateway configuration & status
app.get('/api/payment/config', (req, res) => {
  res.json({
    keyId: process.env.RAZORPAY_KEY_ID || '',
    isConfigured: isRazorpayConfigured,
    currency: 'INR'
  });
});

// Create Razorpay Order
app.post('/api/payment/create-order', async (req, res) => {
  try {
    const amountInInr = parseFloat(req.body.amount) || 10;
    const planMinutes = parseInt(req.body.planMinutes, 10) || 15;
    const planName = req.body.planName || `${planMinutes}-Min Pass`;
    const amountInPaise = Math.round(amountInInr * 100);

    if (isRazorpayConfigured && razorpayInstance) {
      const order = await razorpayInstance.orders.create({
        amount: amountInPaise,
        currency: 'INR',
        receipt: `rcpt_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        notes: {
          planMinutes: String(planMinutes),
          planName: planName
        }
      });

      res.json({
        success: true,
        orderId: order.id,
        amount: order.amount,
        currency: order.currency,
        keyId: process.env.RAZORPAY_KEY_ID,
        isConfigured: true
      });
    } else {
      // Sandbox / Test fallback mode
      const mockOrderId = `order_mock_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
      res.json({
        success: true,
        orderId: mockOrderId,
        amount: amountInPaise,
        currency: 'INR',
        keyId: process.env.RAZORPAY_KEY_ID || 'rzp_test_placeholder',
        isConfigured: false,
        message: 'Sandbox mode active. Insert real RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET into .env for live gateway.'
      });
    }
  } catch (err) {
    console.error('[Razorpay] Order creation error:', err);
    res.status(500).json({ error: err.message || 'Failed to create Razorpay order' });
  }
});

// Verify Razorpay Payment & Execute Action (Start or Extend)
app.post('/api/payment/verify', async (req, res) => {
  try {
    const {
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
      planMinutes = 15,
      planName = 'Paid Pass',
      targetPort = 3000,
      actionType = 'start' // 'start' | 'extend'
    } = req.body;

    // Verify HMAC signature if live credentials are configured
    if (isRazorpayConfigured && process.env.RAZORPAY_KEY_SECRET) {
      const expectedSignature = crypto
        .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
        .update(`${razorpay_order_id}|${razorpay_payment_id}`)
        .digest('hex');

      if (expectedSignature !== razorpay_signature) {
        return res.status(400).json({ success: false, error: 'Payment signature verification failed' });
      }
    }

    // Execute requested action upon payment verification
    if (actionType === 'extend') {
      if (!activeSession.active) {
        return res.status(400).json({ error: 'No active session to extend' });
      }
      const addMinutes = parseInt(planMinutes, 10) || 15;
      const now = Date.now();
      const currentRemaining = Math.max(0, activeSession.expiresAt - now);
      const newDuration = Math.min(180, activeSession.durationMinutes + addMinutes);
      const newExpiresAt = now + currentRemaining + addMinutes * 60 * 1000;

      clearTimeout(activeSession.timerId);
      activeSession.expiresAt = newExpiresAt;
      activeSession.durationMinutes = newDuration;
      activeSession.timerId = setTimeout(() => {
        stopActiveSession('expired');
      }, newExpiresAt - now);

      const remainingSeconds = Math.round((newExpiresAt - now) / 1000);

      addAccessLog({
        clientIp: 'Razorpay Gateway',
        device: `Paid Extension (${razorpay_payment_id || 'verified'})`,
        deviceType: 'payment',
        target: activeSession.url,
        action: `Paid extension +${addMinutes} min verified`
      });

      return res.json({
        success: true,
        actionType: 'extend',
        expiresAt: newExpiresAt,
        remainingSeconds: remainingSeconds,
        message: `Payment verified! Added +${addMinutes} minutes.`
      });
    } else {
      // Start a new tunnel session
      const duration = parseInt(planMinutes, 10) || 15;
      const port = parseInt(targetPort, 10) || 3000;

      const sessionId = `snap_${Math.random().toString(36).substring(2, 8)}`;
      const now = Date.now();
      const expiresAt = now + duration * 60 * 1000;

      const protocol = req.headers['x-forwarded-proto'] || (req.secure ? 'https' : 'http');
      const host = req.headers.host || 'tunnelsnap.pixorva.com';
      const liveUrl = `${protocol}://${host}/live/${sessionId}`;

      const sessionObj = {
        id: sessionId,
        active: true,
        url: liveUrl,
        provider: 'TunnelSnap Dual Relay',
        targetPort: port,
        durationMinutes: duration,
        startedAt: now,
        expiresAt: expiresAt,
        ws: null,
        terminalCommand: `bore local ${port} --to bore.pub`,
        terminalCommandAlt: `npx -y localtunnel --port ${port}`,
        timerId: setTimeout(() => {
          stopActiveSession('expired');
          activeSessions.delete(sessionId);
        }, duration * 60 * 1000)
      };

      activeSessions.set(sessionId, sessionObj);
      activeSession = sessionObj;

      addAccessLog({
        clientIp: 'Razorpay Gateway',
        device: `Paid Launch (${razorpay_payment_id || 'verified'})`,
        deviceType: 'payment',
        target: liveUrl,
        action: `Live tunnel activated for ${duration} min`
      });

      return res.json({
        success: true,
        actionType: 'start',
        sessionId: sessionId,
        url: liveUrl,
        provider: 'TunnelSnap Dual Relay',
        targetPort: port,
        durationMinutes: duration,
        expiresAt: expiresAt,
        remainingSeconds: duration * 60,
        terminalCommand: `bore local ${port} --to bore.pub`,
        terminalCommandAlt: `npx -y localtunnel --port ${port}`,
        message: `Payment verified! ${duration}-minute tunnel launched.`
      });
    }
  } catch (err) {
    console.error('[Razorpay] Verification execution error:', err);
    res.status(500).json({ success: false, error: err.message || 'Payment processing failed' });
  }
});

// Start host server
server.listen(PORT, '0.0.0.0', () => {
  console.log('\n======================================================');
  console.log('TUNNELSNAP (formerly LocalBridge) IS RUNNING');
  console.log('======================================================');
  console.log(`Developer Dashboard:  http://localhost:${PORT}`);
  console.log('======================================================\n');
});
