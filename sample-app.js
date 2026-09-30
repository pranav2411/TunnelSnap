// Sample target app running on localhost:3000 to demonstrate sharing
const http = require('http');

const PORT = 3000;

const server = http.createServer((req, res) => {
  res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
  res.end(`
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Sample Localhost App (:3000)</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      background: #0f172a;
      color: #f8fafc;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      min-height: 100vh;
      margin: 0;
      padding: 20px;
      text-align: center;
      box-sizing: border-box;
    }
    .card {
      background: #1e293b;
      border: 1px solid #334155;
      padding: 32px;
      border-radius: 20px;
      max-width: 480px;
      width: 100%;
      box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.5);
    }
    .badge {
      display: inline-block;
      background: rgba(16, 185, 129, 0.2);
      color: #34d399;
      border: 1px solid rgba(16, 185, 129, 0.4);
      padding: 4px 12px;
      border-radius: 9999px;
      font-size: 0.85rem;
      font-weight: 600;
      margin-bottom: 16px;
    }
    h1 {
      margin: 0 0 10px;
      font-size: 1.8rem;
    }
    p {
      color: #94a3b8;
      font-size: 0.95rem;
      margin-bottom: 24px;
      line-height: 1.5;
    }
    .counter-box {
      background: #0f172a;
      border-radius: 12px;
      padding: 20px;
      margin-bottom: 20px;
    }
    .count {
      font-size: 3rem;
      font-weight: 800;
      color: #38bdf8;
    }
    button {
      background: #38bdf8;
      color: #0f172a;
      border: none;
      padding: 12px 24px;
      font-size: 1rem;
      font-weight: 700;
      border-radius: 8px;
      cursor: pointer;
      transition: transform 0.1s;
    }
    button:active {
      transform: scale(0.96);
    }
  </style>
</head>
<body>
  <div class="card">
    <div class="badge">Connected Successfully!</div>
    <h1>Hello from Localhost!</h1>
    <p>This is a test application running on your host laptop (port 3000), now accessible from your phone or another laptop over Wi-Fi!</p>
    
    <div class="counter-box">
      <div class="count" id="count">0</div>
      <div style="color: #64748b; font-size: 0.85rem; margin-top: 4px;">Tap counter to test responsiveness</div>
    </div>
    <button onclick="document.getElementById('count').textContent = ++cnt;">Tap to Count</button>
  </div>
  <script>
    let cnt = 0;
  </script>
</body>
</html>
  `);
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`[Sample App] Running on http://localhost:${PORT}`);
});
