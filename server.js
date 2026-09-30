require('dotenv').config();
const express = require('express');
const http = require('http');
const os = require('os');
const path = require('path');
const crypto = require('crypto');
const { spawn } = require('child_process');
const QRCode = require('qrcode');
const Razorpay = require('razorpay');

const app = express();
const server = http.createServer(app);

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

// Start Global Tunnel via Bore (100% Reliable, Zero 403, Instant Connect)
function startTunnel(targetPort) {
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
        reject(new Error('Timed out establishing secure tunnel connection'));
      }
    }, 10000);

    const onData = (data) => {
      const output = data.toString();
      const match = output.match(/listening at bore\.pub:(\d+)/);
      if (match && !resolved) {
        resolved = true;
        clearTimeout(timer);
        const remotePort = match[1];
        resolve({
          url: `http://bore.pub:${remotePort}`,
          provider: 'TunnelSnap Global Edge',
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
        reject(new Error(`Tunnel process closed with code ${code}`));
      } else {
        if (activeSession.active) {
          stopActiveSession('process_closed');
        }
      }
    });
  });
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

// REST API: Start Global Time-Limited Tunnel Session
app.post('/api/tunnel/start', async (req, res) => {
  const targetPort = parseInt(req.body.targetPort, 10) || 3000;
  // Maximum allowed duration: 180 minutes (3 hours)
  const durationMinutes = Math.min(180, Math.max(1, parseInt(req.body.durationMinutes, 10) || 5));
  const planName = req.body.planName || (durationMinutes === 5 ? '5-Min Free Pass' : `${durationMinutes}-Min Paid Pass`);

  if (activeSession.active) {
    stopActiveSession('restarted');
  }

  try {
    const tunnelResult = await startTunnel(targetPort);

    const now = Date.now();
    const expiresAt = now + durationMinutes * 60 * 1000;

    activeSession = {
      active: true,
      url: tunnelResult.url,
      provider: tunnelResult.provider,
      targetPort: targetPort,
      durationMinutes: durationMinutes,
      startedAt: now,
      expiresAt: expiresAt,
      process: tunnelResult.process || null,
      timerId: setTimeout(() => {
        stopActiveSession('expired');
      }, durationMinutes * 60 * 1000)
    };

    addAccessLog({
      clientIp: 'Global Web',
      device: `TunnelSnap (${planName})`,
      deviceType: 'global',
      target: tunnelResult.url,
      action: `Live for ${durationMinutes} minutes`
    });

    res.json({
      success: true,
      url: tunnelResult.url,
      provider: tunnelResult.provider,
      targetPort: targetPort,
      durationMinutes: durationMinutes,
      expiresAt: expiresAt,
      remainingSeconds: durationMinutes * 60
    });
  } catch (err) {
    console.error('Failed to start tunnel:', err);
    res.status(500).json({ error: `Could not start tunnel: ${err.message}` });
  }
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

      if (activeSession.active) {
        stopActiveSession('restarted');
      }

      const tunnelResult = await startTunnel(port);
      const now = Date.now();
      const expiresAt = now + duration * 60 * 1000;

      activeSession = {
        active: true,
        url: tunnelResult.url,
        provider: tunnelResult.provider,
        targetPort: port,
        durationMinutes: duration,
        startedAt: now,
        expiresAt: expiresAt,
        process: tunnelResult.process || null,
        timerId: setTimeout(() => {
          stopActiveSession('expired');
        }, duration * 60 * 1000)
      };

      addAccessLog({
        clientIp: 'Razorpay Gateway',
        device: `Paid Launch (${razorpay_payment_id || 'verified'})`,
        deviceType: 'payment',
        target: tunnelResult.url,
        action: `Live tunnel activated for ${duration} min`
      });

      return res.json({
        success: true,
        actionType: 'start',
        url: tunnelResult.url,
        provider: tunnelResult.provider,
        targetPort: port,
        durationMinutes: duration,
        expiresAt: expiresAt,
        remainingSeconds: duration * 60,
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
