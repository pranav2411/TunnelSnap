# ⚡ TunnelSnap

> **Global Access for Your Local Apps** — Instant, time-limited tunnels for developers to test their locally hosted applications from anywhere, anytime on any mobile phone or remote computer.

---

## 🎨 Typography & Design

- **Font:** Styled using **Savage Rose** (`Savage Rose`, `Playfair Display`, `Red Rose` serif display stack) for all headings, titles, and branding.
- **Aesthetic:** Clean, airy SaaS design inspired by modern developer platforms, with subtle geometric branding and responsive cards.

---

## 🔄 How It Works (Step-by-Step)

1. **Step 01 — Run Your Local App**:
   - Start your server on your laptop (`npm run dev` on port 3000, 5173, etc.).
2. **Step 02 — Pick Duration & Pass**:
   - Select testing time (5m, 15m, 30m, 1h, 2h, up to 3h max).
   - Every account gets **10 Free Passes** (5 min each).
   - Once free passes are used, micro-rates start at just ₹5.
3. **Step 03 — Scan QR on Any Device**:
   - Point any mobile phone camera (iPhone or Android) at the screen to open the app over **Cellular 4G/5G or remote Wi-Fi**.
   - Or copy the direct link for other laptops anywhere in the world.
4. **Step 04 — Automatic Auto-Revoke**:
   - When the countdown timer hits zero, the tunnel automatically self-destructs and access is closed (strict maximum cap of 3 hours).

---

## 🔐 Auth & Console Access Gating

- **Locked Console:** The interactive console and testing passes are protected. Visitors must log in or create an account to access the developer console.
- **Create Account (Sign Up):** Tab in the auth dialog allowing new users to sign up and immediately activate their **10 Free Passes**.
- **Active Passes Display:** Active free passes (`🟢 10 Free Passes Active`) are dynamically displayed in the navbar and console only after logging in.
- **Log Out:** Easily log out anytime with the dedicated **"Log out"** button in the header, locking the console and securing your account.

---

## 💼 Pricing Model (INR ₹)

| Duration | Price | Details |
|---|---|---|
| **5 Minutes** | **FREE** | 10 Free Passes for every registered account |
| **5 Minutes** | **₹5** | After 10 free passes are exhausted |
| **15 Minutes** | **₹10** | **Most Popular** — Feature & user flow testing |
| **30 Minutes** | **₹25** | Team code review & QA testing |
| **1 Hour (60 Min)** | **₹45** | Client demo & stakeholder walkthrough |
| **2 Hours (120 Min)** | **₹80** | Extended debugging & cross-device QA |
| **3 Hours (180 Min - MAX)** | **₹110** | Full sprint review & pre-launch testing |

---

## 🏃 Quick Start

```bash
# Start the TunnelSnap Server
npm start
```
Open **[http://localhost:4050](http://localhost:4050)** in your browser.
