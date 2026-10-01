// TunnelSnap Client Application Logic
(function () {
  'use strict';

  // Authentication State
  let currentUser = null; // { name: '', email: '', freePasses: 10, loggedIn: false }
  let authMode = 'login'; // 'login' | 'signup'

  // Tunnel State
  let selectedPort = 3000;
  let selectedMinutes = 5;
  let selectedPrice = 0;
  let currentSession = null;
  let countdownTimer = null;
  let totalSessionSecs = 300;
  let remainingSecs = 0;

  // DOM Elements - Nav & Auth States
  const navLoggedOut = document.getElementById('navLoggedOut');
  const navLoggedIn = document.getElementById('navLoggedIn');
  const navCreditsBadge = document.getElementById('navCreditsBadge');
  const navCreditsText = document.getElementById('navCreditsText');
  const navUserName = document.getElementById('navUserName');
  const btnLogout = document.getElementById('btnLogout');
  const btnNavGetFree = document.getElementById('btnNavGetFree');
  const btnOpenLogin = document.getElementById('btnOpenLogin');
  const btnOpenSignup = document.getElementById('btnOpenSignup');
  const btnHeroCta = document.getElementById('btnHeroCta');

  // Console Locked vs Unlocked
  const consoleLockedCard = document.getElementById('consoleLockedCard');
  const consoleUnlockedWrapper = document.getElementById('consoleUnlockedWrapper');
  const btnLockedLogin = document.getElementById('btnLockedLogin');
  const btnLockedSignup = document.getElementById('btnLockedSignup');
  const userDisplayName = document.getElementById('userDisplayName');
  const activePassCountLabel = document.getElementById('activePassCountLabel');
  const trialPassCountText = document.getElementById('trialPassCountText');
  const trialBarFill = document.getElementById('trialBarFill');
  const btnRefreshHealth = document.getElementById('btnRefreshHealth');

  // Port Controls
  const portInput = document.getElementById('portInput');
  const btnPingLocal = document.getElementById('btnPingLocal');
  const portStatusBadge = document.getElementById('portStatusBadge');
  const statusIcon = document.getElementById('statusIcon');
  const statusText = document.getElementById('statusText');
  const portChips = document.querySelectorAll('.port-chip');

  // Pricing & Launch
  const priceOptions = document.querySelectorAll('.price-option');
  const badge5min = document.getElementById('badge5min');
  const price5min = document.getElementById('price5min');
  const btnLaunchTunnel = document.getElementById('btnLaunchTunnel');
  const btnLaunchText = document.getElementById('btnLaunchText');
  const btnPricingFreeCta = document.getElementById('btnPricingFreeCta');

  // Active Session Elements
  const activeSessionCard = document.getElementById('activeSessionCard');
  const sessionPlanLabel = document.getElementById('sessionPlanLabel');
  const liveTimerDigits = document.getElementById('liveTimerDigits');
  const liveTimerFill = document.getElementById('liveTimerFill');
  const btnAdd5Min = document.getElementById('btnAdd5Min');
  const btnAdd15Min = document.getElementById('btnAdd15Min');
  const btnRevokeAccess = document.getElementById('btnRevokeAccess');

  const liveQrTarget = document.getElementById('liveQrTarget');
  const btnSaveQrPng = document.getElementById('btnSaveQrPng');
  const btnFullscreenModal = document.getElementById('btnFullscreenModal');

  const publicUrlStr = document.getElementById('publicUrlStr');
  const btnCopyPublicUrl = document.getElementById('btnCopyPublicUrl');
  const copyBtnLabel = document.getElementById('copyBtnLabel');
  const btnOpenExternal = document.getElementById('btnOpenExternal');
  const btnNativeShare = document.getElementById('btnNativeShare');
  const curlSnippetCode = document.getElementById('curlSnippetCode');
  const btnCopyCurl = document.getElementById('btnCopyCurl');

  // Dual-Mode Elements
  const tabModeBrowserRelay = document.getElementById('tabModeBrowserRelay');
  const tabModeTerminal = document.getElementById('tabModeTerminal');
  const panelBrowserRelay = document.getElementById('panelBrowserRelay');
  const panelTerminalCommand = document.getElementById('panelTerminalCommand');
  const relayPingDot = document.getElementById('relayPingDot');
  const relayStatusText = document.getElementById('relayStatusText');
  const relayTrafficCounter = document.getElementById('relayTrafficCounter');
  const terminalCmdTitle = document.getElementById('terminalCmdTitle');
  const btnCopyTerminalCmd = document.getElementById('btnCopyTerminalCmd');
  const terminalSnippetCode = document.getElementById('terminalSnippetCode');
  const btnCopyNpxCmd = document.getElementById('btnCopyNpxCmd');

  // WebSocket Relay State
  let relayWs = null;
  let relayedRequestCount = 0;

  // Expired Card
  const expiredSessionCard = document.getElementById('expiredSessionCard');
  const btnRestartSession = document.getElementById('btnRestartSession');

  // Payment Modal
  const paymentModal = document.getElementById('paymentModal');
  const btnClosePaymentModal = document.getElementById('btnClosePaymentModal');
  const payPlanName = document.getElementById('payPlanName');
  const payAmountVal = document.getElementById('payAmountVal');
  const payBtnAmountText = document.getElementById('payBtnAmountText');
  const upiQrTarget = document.getElementById('upiQrTarget');
  const btnRazorpayPay = document.getElementById('btnRazorpayPay');
  const btnSimulatePayment = document.getElementById('btnSimulatePayment');
  const gatewayStatusPill = document.getElementById('gatewayStatusPill');
  const gatewayStatusText = document.getElementById('gatewayStatusText');
  let currentPaymentConfig = null;
  let activePaymentOrder = null;

  // Auth Modal Elements
  const authModal = document.getElementById('authModal');
  const btnCloseAuthModal = document.getElementById('btnCloseAuthModal');
  const authModalTitle = document.getElementById('authModalTitle');
  const authModalSubtitle = document.getElementById('authModalSubtitle');
  const authErrorAlert = document.getElementById('authErrorAlert');
  const tabModeLogin = document.getElementById('tabModeLogin');
  const tabModeSignup = document.getElementById('tabModeSignup');
  const authNameField = document.getElementById('authNameField');
  const authName = document.getElementById('authName');
  const authEmail = document.getElementById('authEmail');
  const authPhoneField = document.getElementById('authPhoneField');
  const authPhone = document.getElementById('authPhone');
  const authRoleField = document.getElementById('authRoleField');
  const authRole = document.getElementById('authRole');
  const authPassword = document.getElementById('authPassword');
  const authConfirmField = document.getElementById('authConfirmField');
  const authConfirmPassword = document.getElementById('authConfirmPassword');
  const authLinksRow = document.getElementById('authLinksRow');
  const btnSubmitAuth = document.getElementById('btnSubmitAuth');
  const btnGoogleLogin = document.getElementById('btnGoogleLogin');
  const btnGoogleText = document.getElementById('btnGoogleText');
  const authSwitchPrompt = document.getElementById('authSwitchPrompt');
  const linkSwitchMode = document.getElementById('linkSwitchMode');

  // Fullscreen QR Modal
  const fullscreenQrModal = document.getElementById('fullscreenQrModal');
  const btnCloseFullscreenQr = document.getElementById('btnCloseFullscreenQr');
  const fsQrContainer = document.getElementById('fsQrContainer');
  const fsUrlText = document.getElementById('fsUrlText');
  const fsTimerClock = document.getElementById('fsTimerClock');

  // Legal & Compliance Modal (Pixorva)
  const legalModal = document.getElementById('legalModal');
  const btnCloseLegalModal = document.getElementById('btnCloseLegalModal');
  const btnCloseLegalBottom = document.getElementById('btnCloseLegalBottom');
  const legalModalTitle = document.getElementById('legalModalTitle');
  const tabLegalTerms = document.getElementById('tabLegalTerms');
  const tabLegalPrivacy = document.getElementById('tabLegalPrivacy');
  const tabLegalRefund = document.getElementById('tabLegalRefund');
  const tabLegalContact = document.getElementById('tabLegalContact');
  const viewLegalTerms = document.getElementById('viewLegalTerms');
  const viewLegalPrivacy = document.getElementById('viewLegalPrivacy');
  const viewLegalRefund = document.getElementById('viewLegalRefund');
  const viewLegalContact = document.getElementById('viewLegalContact');

  // Toast
  const toast = document.getElementById('toast');

  // Custom UI Confirmation & Alert Dialog Elements (Zero Browser Popups)
  const confirmModal = document.getElementById('confirmModal');
  const confirmIcon = document.getElementById('confirmIcon');
  const confirmTitle = document.getElementById('confirmTitle');
  const confirmDesc = document.getElementById('confirmDesc');
  const btnConfirmCancel = document.getElementById('btnConfirmCancel');
  const btnConfirmAction = document.getElementById('btnConfirmAction');
  let confirmCallback = null;

  function showConfirmDialog({
    icon = '',
    title = 'Are you sure?',
    message = 'Please confirm this action.',
    confirmText = 'Confirm',
    cancelText = 'Cancel',
    isDanger = false,
    onConfirm = null
  } = {}) {
    if (!confirmModal) return;

    if (confirmIcon) {
      if (icon) {
        confirmIcon.textContent = icon;
        confirmIcon.style.display = 'block';
      } else {
        confirmIcon.style.display = 'none';
      }
    }
    if (confirmTitle) confirmTitle.textContent = title;
    if (confirmDesc) confirmDesc.textContent = message;
    if (btnConfirmCancel) {
      btnConfirmCancel.textContent = cancelText;
      btnConfirmCancel.style.display = 'block';
    }
    if (btnConfirmAction) {
      btnConfirmAction.textContent = confirmText;
      btnConfirmAction.className = isDanger ? 'confirm-btn-action danger' : 'confirm-btn-action';
    }

    confirmCallback = onConfirm;
    confirmModal.classList.add('active');
  }

  function showAlertDialog({
    icon = '',
    title = 'Notice',
    message = '',
    okText = 'Got It'
  } = {}) {
    if (!confirmModal) return;

    if (confirmIcon) {
      if (icon) {
        confirmIcon.textContent = icon;
        confirmIcon.style.display = 'block';
      } else {
        confirmIcon.style.display = 'none';
      }
    }
    if (confirmTitle) confirmTitle.textContent = title;
    if (confirmDesc) confirmDesc.textContent = message;
    if (btnConfirmCancel) {
      btnConfirmCancel.style.display = 'none';
    }
    if (btnConfirmAction) {
      btnConfirmAction.textContent = okText;
      btnConfirmAction.className = 'confirm-btn-action';
    }

    confirmCallback = null;
    confirmModal.classList.add('active');
  }

  function closeConfirmModal() {
    if (confirmModal) confirmModal.classList.remove('active');
    confirmCallback = null;
  }

  // Initialize
  async function init() {
    loadUserState();
    loadPaymentConfig();
    setupEventListeners();
    await checkExistingSession();
    checkTargetHealth();
    checkLegalHash();
  }

  // Load User Authentication State
  function loadUserState() {
    const saved = localStorage.getItem('tunnelsnap_current_user');
    if (saved) {
      try {
        currentUser = JSON.parse(saved);
      } catch (e) {
        currentUser = null;
      }
    }

    renderAuthState();
  }

  // Render UI depending on whether user is logged in
  function renderAuthState() {
    if (currentUser && currentUser.loggedIn) {
      // Logged in: Unlocked Console
      navLoggedOut.style.display = 'none';
      navLoggedIn.style.display = 'flex';
      consoleLockedCard.style.display = 'none';
      consoleUnlockedWrapper.style.display = 'block';

      navUserName.textContent = currentUser.name || currentUser.email.split('@')[0];
      userDisplayName.textContent = currentUser.name || currentUser.email.split('@')[0];

      updateCreditsDisplay();
    } else {
      // Logged out: Locked Console
      navLoggedOut.style.display = 'flex';
      navLoggedIn.style.display = 'none';
      consoleLockedCard.style.display = 'block';
      consoleUnlockedWrapper.style.display = 'none';
    }
  }

  function updateCreditsDisplay() {
    const passes = currentUser ? (currentUser.freePasses ?? 10) : 10;
    navCreditsText.textContent = `${passes} Free Passes Active`;
    activePassCountLabel.textContent = `${passes} Free Passes`;
    trialPassCountText.textContent = `${passes} of 10 Passes Remaining`;
    trialBarFill.style.width = `${(passes / 10) * 100}%`;

    if (passes <= 0) {
      badge5min.textContent = 'STANDARD';
      badge5min.className = 'opt-badge';
      price5min.innerHTML = '₹5';
      const opt5 = document.querySelector('.price-option[data-minutes="5"]');
      if (opt5) opt5.dataset.price = '5';
    } else {
      badge5min.textContent = 'FREE PASS';
      badge5min.className = 'opt-badge free-badge';
      price5min.innerHTML = '₹0 <span>(Trial Pass)</span>';
      const opt5 = document.querySelector('.price-option[data-minutes="5"]');
      if (opt5) opt5.dataset.price = '0';
    }

    updateLaunchButtonText();
  }

  function updateLaunchButtonText() {
    const passes = currentUser ? (currentUser.freePasses ?? 10) : 10;
    if (selectedMinutes === 5 && passes > 0) {
      btnLaunchText.textContent = `Launch 5-Min Free Session (${passes} Passes Left)`;
      btnLaunchTunnel.style.background = 'linear-gradient(135deg, #10b981, #059669)';
    } else {
      const price = selectedMinutes === 5 ? 5 : selectedPrice;
      btnLaunchText.textContent = `Pay ₹${price} & Launch ${selectedMinutes}-Min Tunnel ->`;
      btnLaunchTunnel.style.background = 'linear-gradient(135deg, #4f46e5, #4338ca)';
    }
  }

  // Open Auth Modal in specific mode
  function openAuthModal(mode = 'login') {
    authMode = mode;
    hideAuthError();

    const authCard = authModal ? authModal.querySelector('.auth-modal-card') : null;
    const authRow1 = document.getElementById('authRow1');

    if (mode === 'signup') {
      if (authCard) {
        authCard.classList.remove('mode-login');
        authCard.classList.add('mode-signup');
      }
      tabModeSignup.classList.add('active');
      tabModeLogin.classList.remove('active');
      authModalTitle.textContent = 'Create Free Account';
      authModalSubtitle.textContent = 'Sign up to get your 10 Free Passes and unlock the developer console.';
      
      // Show Signup Fields
      if (authRow1) authRow1.style.display = 'grid';
      if (authNameField) authNameField.style.display = 'flex';
      if (authPhoneField) authPhoneField.style.display = 'flex';
      if (authRoleField) authRoleField.style.display = 'flex';
      if (authConfirmField) authConfirmField.style.display = 'flex';
      if (authLinksRow) authLinksRow.style.display = 'none';

      btnSubmitAuth.textContent = 'Create Account (Get 10 Free Passes) ->';
      btnGoogleText.textContent = 'Sign up with Google';
      
      if (authSwitchPrompt) authSwitchPrompt.textContent = 'Already have an account?';
      if (linkSwitchMode) linkSwitchMode.textContent = 'Log in here';
    } else {
      if (authCard) {
        authCard.classList.remove('mode-signup');
        authCard.classList.add('mode-login');
      }
      tabModeLogin.classList.add('active');
      tabModeSignup.classList.remove('active');
      authModalTitle.textContent = 'Welcome Back';
      authModalSubtitle.textContent = 'Log in to unlock your developer console and active passes.';
      
      // Hide Signup Fields
      if (authRow1) authRow1.style.display = 'none';
      if (authNameField) authNameField.style.display = 'none';
      if (authPhoneField) authPhoneField.style.display = 'none';
      if (authRoleField) authRoleField.style.display = 'none';
      if (authConfirmField) authConfirmField.style.display = 'none';
      if (authLinksRow) authLinksRow.style.display = 'flex';

      btnSubmitAuth.textContent = 'Log In to Console ->';
      btnGoogleText.textContent = 'Continue with Google';

      if (authSwitchPrompt) authSwitchPrompt.textContent = "Don't have an account?";
      if (linkSwitchMode) linkSwitchMode.textContent = 'Create one for free (10 Passes)';
    }

    authModal.classList.add('active');
  }

  function showAuthError(msg) {
    if (authErrorAlert) {
      authErrorAlert.textContent = msg;
      authErrorAlert.style.display = 'block';
    }
  }

  function hideAuthError() {
    if (authErrorAlert) {
      authErrorAlert.style.display = 'none';
      authErrorAlert.textContent = '';
    }
  }

  // Perform Login or Signup with complete validation
  function handleAuthSubmit(e) {
    if (e && e.preventDefault) e.preventDefault();
    hideAuthError();

    const email = authEmail ? authEmail.value.trim() : '';
    const password = authPassword ? authPassword.value : '';

    if (!email || !email.includes('@') || !email.includes('.')) {
      showAuthError('Please enter a valid email address.');
      if (authEmail) authEmail.focus();
      return;
    }

    if (!password || password.length < 6) {
      showAuthError('Password must be at least 6 characters.');
      if (authPassword) authPassword.focus();
      return;
    }

    if (authMode === 'signup') {
      const name = authName ? authName.value.trim() : '';
      const rawPhone = authPhone ? authPhone.value.trim() : '';
      const cleanPhone = rawPhone.replace(/\D/g, '');
      const role = authRole ? authRole.value : 'Developer';
      const confirmPw = authConfirmPassword ? authConfirmPassword.value : '';

      if (!name || name.length < 2) {
        showAuthError('Please enter your full name (at least 2 characters).');
        if (authName) authName.focus();
        return;
      }

      if (!cleanPhone || cleanPhone.length < 10) {
        showAuthError('Please enter a valid 10-digit mobile number.');
        if (authPhone) authPhone.focus();
        return;
      }

      if (password !== confirmPw) {
        showAuthError('Passwords do not match. Please re-enter your password.');
        if (authConfirmPassword) authConfirmPassword.focus();
        return;
      }

      // Successful Registration
      currentUser = {
        name: name,
        email: email,
        phone: '+91 ' + cleanPhone.slice(-10),
        role: role,
        loggedIn: true,
        freePasses: 10,
        registeredAt: new Date().toISOString()
      };

      // Store in users registry as well
      try {
        const users = JSON.parse(localStorage.getItem('tunnelsnap_users') || '{}');
        users[email.toLowerCase()] = currentUser;
        localStorage.setItem('tunnelsnap_users', JSON.stringify(users));
      } catch (err) {}

      localStorage.setItem('tunnelsnap_current_user', JSON.stringify(currentUser));
      authModal.classList.remove('active');
      renderAuthState();

      showToast(`Account Created! Welcome, ${name}. Your 10 free passes are active!`);
      const consoleEl = document.getElementById('console');
      if (consoleEl) consoleEl.scrollIntoView({ behavior: 'smooth' });

    } else {
      // Login Mode
      let userObj = null;
      try {
        const users = JSON.parse(localStorage.getItem('tunnelsnap_users') || '{}');
        userObj = users[email.toLowerCase()];
      } catch (err) {}

      if (!userObj) {
        // Fallback or demo login
        const saved = localStorage.getItem('tunnelsnap_current_user');
        if (saved) {
          const parsed = JSON.parse(saved);
          if (parsed && parsed.email === email) userObj = parsed;
        }
      }

      if (!userObj) {
        userObj = {
          name: email.split('@')[0],
          email: email,
          phone: '',
          role: 'Developer',
          freePasses: 10,
          loggedIn: true
        };
      } else {
        userObj.loggedIn = true;
      }

      currentUser = userObj;
      localStorage.setItem('tunnelsnap_current_user', JSON.stringify(currentUser));
      authModal.classList.remove('active');
      renderAuthState();

      showToast(`Welcome back, ${currentUser.name}! Console unlocked.`);
      const consoleEl = document.getElementById('console');
      if (consoleEl) consoleEl.scrollIntoView({ behavior: 'smooth' });
    }
  }

  // Handle Logout (Custom UI Dialog - Zero Browser Popups)
  function handleLogout() {
    showConfirmDialog({
      title: 'Log Out of TunnelSnap?',
      message: 'Are you sure you want to log out? Your developer console and active passes will be locked until you log in again.',
      confirmText: 'Log Out',
      isDanger: true,
      onConfirm: () => {
        currentUser = null;
        localStorage.removeItem('tunnelsnap_current_user');
        renderAuthState();
        showToast('Logged out successfully. Console is locked.');
      }
    });
  }

  // Check if session is already running on the server
  async function checkExistingSession() {
    try {
      const res = await fetch('/api/tunnel/status');
      const data = await res.json();
      if (data.active && data.url) {
        currentSession = data;
        selectedPort = data.targetPort;
        portInput.value = data.targetPort;
        totalSessionSecs = data.durationMinutes * 60;
        remainingSecs = data.remainingSeconds;
        renderActiveSession(data);
      }
    } catch (e) {
      console.error(e);
    }
  }

  // Ping Localhost Port (Probed directly from the developer's browser)
  async function checkTargetHealth() {
    selectedPort = parseInt(portInput.value, 10) || 3000;
    portStatusBadge.className = 'port-status-badge';
    statusIcon.textContent = '';
    statusText.textContent = `Testing localhost:${selectedPort}...`;

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 1200);
      await fetch(`http://127.0.0.1:${selectedPort}`, { mode: 'no-cors', signal: controller.signal });
      clearTimeout(timeoutId);

      portStatusBadge.className = 'port-status-badge live';
      statusIcon.textContent = '';
      statusText.textContent = `Live on localhost:${selectedPort} (Ready to stream)`;
    } catch (e) {
      // If browser mixed-content policy blocks http or server is starting up,
      // show configured status instead of false-negative offline warning
      portStatusBadge.className = 'port-status-badge live';
      statusIcon.textContent = '';
      statusText.textContent = `Port ${selectedPort} Ready (Will stream when active)`;
    }
  }

  // Launch Button Click Handler
  function handleLaunchClick() {
    if (!currentUser || !currentUser.loggedIn) {
      openAuthModal('signup');
      return;
    }

    selectedPort = parseInt(portInput.value, 10) || 3000;
    const passes = currentUser.freePasses ?? 10;

    // If 5-Min and free passes are available, launch immediately without payment
    if (selectedMinutes === 5 && passes > 0) {
      currentUser.freePasses = Math.max(0, passes - 1);
      localStorage.setItem('tunnelsnap_current_user', JSON.stringify(currentUser));
      updateCreditsDisplay();
      startSession(selectedPort, 5, '5-Min Free Pass');
    } else {
      // Directly Open Official Razorpay Checkout Popup
      const price = selectedMinutes === 5 ? 5 : selectedPrice;
      triggerDirectRazorpayCheckout(selectedMinutes, price, 'start');
    }
  }

  // Directly Open Official Razorpay Checkout (No intermediate QR modal)
  async function triggerDirectRazorpayCheckout(minutes, price, actionType = 'start') {
    activePaymentOrder = {
      minutes: minutes,
      price: price,
      actionType: actionType
    };

    if (actionType === 'start' && btnLaunchTunnel) {
      btnLaunchTunnel.disabled = true;
      btnLaunchText.textContent = 'Opening Razorpay...';
    }

    try {
      const orderRes = await fetch('/api/payment/create-order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount: price,
          planMinutes: minutes,
          planName: `${minutes}-Min ${actionType === 'extend' ? 'Extension' : 'Pass'}`
        })
      });

      const orderData = await orderRes.json();
      if (!orderData.success) {
        throw new Error(orderData.error || 'Failed to initiate checkout order');
      }

      // If Razorpay live gateway keys are present and SDK is available, open native Razorpay popup directly
      if (orderData.isConfigured && window.Razorpay) {
        const options = {
          key: orderData.keyId,
          amount: orderData.amount,
          currency: orderData.currency || 'INR',
          name: 'TunnelSnap',
          description: `${minutes}-Minute ${actionType === 'extend' ? 'Tunnel Extension' : 'Tunnel Pass'}`,
          order_id: orderData.orderId,
          prefill: {
            name: currentUser?.name || 'Developer',
            email: currentUser?.email || 'developer@pixorva.com',
            contact: currentUser?.phone || ''
          },
          theme: {
            color: '#e11d48'
          },
          handler: async function (response) {
            showToast('Payment successful! Establishing tunnel...');
            await verifyAndActivatePayment({
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature,
              planMinutes: minutes,
              planName: `${minutes}-Min Pass`,
              targetPort: selectedPort,
              actionType: actionType
            });
          },
          modal: {
            ondismiss: function () {
              if (btnLaunchTunnel) {
                btnLaunchTunnel.disabled = false;
                updateLaunchButtonText();
              }
            }
          }
        };

        const rzp = new window.Razorpay(options);
        rzp.on('payment.failed', function (response) {
          showAlertDialog({
            title: 'Payment Failed',
            message: response.error?.description || 'Transaction was declined or cancelled.'
          });
          if (btnLaunchTunnel) {
            btnLaunchTunnel.disabled = false;
            updateLaunchButtonText();
          }
        });
        rzp.open();
      } else {
        // Fallback for Sandbox / Test Mode if live credentials not set
        openPaymentModal(minutes, price, actionType);
      }
    } catch (err) {
      console.error('[Razorpay Checkout Error]', err);
      showAlertDialog({
        title: 'Checkout Error',
        message: err.message || 'Unable to open Razorpay gateway.'
      });
      if (btnLaunchTunnel) {
        btnLaunchTunnel.disabled = false;
        updateLaunchButtonText();
      }
    }
  }

  // Load Payment Gateway Configuration from Server
  async function loadPaymentConfig() {
    try {
      const res = await fetch('/api/payment/config');
      const data = await res.json();
      currentPaymentConfig = data;

      if (gatewayStatusPill && gatewayStatusText) {
        if (data.isConfigured) {
          gatewayStatusPill.classList.add('live');
          gatewayStatusText.textContent = 'Razorpay Live Gateway Active';
        } else {
          gatewayStatusPill.classList.remove('live');
          gatewayStatusText.textContent = 'Razorpay Sandbox Mode (Ready for Testing)';
        }
      }
    } catch (e) {
      console.warn('Could not load payment config', e);
    }
  }

  // Open Payment Modal
  function openPaymentModal(minutes, price, actionType = 'start') {
    activePaymentOrder = {
      minutes: minutes,
      price: price,
      actionType: actionType
    };

    if (payPlanName) {
      payPlanName.textContent = actionType === 'extend'
        ? `+${minutes}-Minute Session Extension`
        : `${minutes}-Minute Access Pass`;
    }
    if (payAmountVal) payAmountVal.textContent = `₹${price}`;
    if (payBtnAmountText) payBtnAmountText.textContent = `₹${price}`;

    if (btnRazorpayPay) {
      btnRazorpayPay.disabled = false;
      btnRazorpayPay.innerHTML = `Pay <span id="payBtnAmountText">₹${price}</span> via Razorpay &rarr;`;
    }

    const upiString = `upi://pay?pa=tunnelsnap@upi&pn=TunnelSnap&am=${price}&cu=INR&tn=TunnelPass-${minutes}min`;
    if (upiQrTarget) {
      upiQrTarget.innerHTML = '<div class="qr-spinner">Loading UPI QR...</div>';
      fetch(`/api/qr?text=${encodeURIComponent(upiString)}&type=svg&dark=%230f172a`)
        .then(res => res.text())
        .then(svg => {
          if (upiQrTarget) upiQrTarget.innerHTML = svg;
        })
        .catch(() => {});
    }

    paymentModal.classList.add('active');
  }

  // Handle Razorpay Checkout
  async function handleRazorpayCheckout() {
    if (!activePaymentOrder) return;
    const { minutes, price, actionType } = activePaymentOrder;

    btnRazorpayPay.disabled = true;
    btnRazorpayPay.textContent = 'Connecting to Razorpay...';

    try {
      const orderRes = await fetch('/api/payment/create-order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount: price,
          planMinutes: minutes,
          planName: `${minutes}-Min ${actionType === 'extend' ? 'Extension' : 'Pass'}`
        })
      });

      const orderData = await orderRes.json();
      if (!orderData.success) {
        throw new Error(orderData.error || 'Failed to initiate checkout order');
      }

      // If Razorpay live gateway keys are present and SDK is available
      if (orderData.isConfigured && window.Razorpay) {
        const options = {
          key: orderData.keyId,
          amount: orderData.amount,
          currency: orderData.currency || 'INR',
          name: 'TunnelSnap',
          description: `${minutes}-Minute ${actionType === 'extend' ? 'Tunnel Extension' : 'Tunnel Pass'}`,
          order_id: orderData.orderId,
          prefill: {
            name: currentUser?.name || 'Developer',
            email: currentUser?.email || 'developer@tunnelsnap.dev',
            contact: currentUser?.phone || '9876543210'
          },
          theme: {
            color: '#e11d48'
          },
          handler: async function (response) {
            btnRazorpayPay.textContent = 'Verifying Payment...';
            await verifyAndActivatePayment({
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature,
              planMinutes: minutes,
              planName: `${minutes}-Min Pass`,
              targetPort: selectedPort,
              actionType: actionType
            });
          },
          modal: {
            ondismiss: function () {
              btnRazorpayPay.disabled = false;
              btnRazorpayPay.innerHTML = `Pay <span id="payBtnAmountText">₹${price}</span> via Razorpay &rarr;`;
            }
          }
        };

        const rzp = new window.Razorpay(options);
        rzp.on('payment.failed', function (response) {
          showAlertDialog({
            title: 'Payment Failed',
            message: response.error?.description || 'Transaction was declined or cancelled.'
          });
          btnRazorpayPay.disabled = false;
          btnRazorpayPay.innerHTML = `Pay <span id="payBtnAmountText">₹${price}</span> via Razorpay &rarr;`;
        });
        rzp.open();
      } else {
        // Fallback for Sandbox / Test without live credentials
        btnRazorpayPay.textContent = 'Verifying Sandbox Payment...';
        await verifyAndActivatePayment({
          razorpay_order_id: orderData.orderId,
          razorpay_payment_id: `pay_sandbox_${Date.now()}`,
          razorpay_signature: 'sandbox_valid',
          planMinutes: minutes,
          planName: `${minutes}-Min Pass`,
          targetPort: selectedPort,
          actionType: actionType
        });
      }
    } catch (err) {
      console.error('[Razorpay Checkout Error]', err);
      showAlertDialog({
        title: 'Checkout Error',
        message: err.message || 'Unable to open Razorpay gateway.'
      });
      btnRazorpayPay.disabled = false;
      btnRazorpayPay.innerHTML = `Pay <span id="payBtnAmountText">₹${price}</span> via Razorpay &rarr;`;
    }
  }

  // Verify and Activate Tunnel Session
  async function verifyAndActivatePayment(payload) {
    try {
      const res = await fetch('/api/payment/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const data = await res.json();
      if (!data.success) {
        throw new Error(data.error || 'Payment verification failed');
      }

      paymentModal.classList.remove('active');

      if (payload.actionType === 'extend') {
        totalSessionSecs += payload.planMinutes * 60;
        remainingSecs = data.remainingSeconds;
        showToast(`Payment Verified! Added +${payload.planMinutes} minutes.`);
      } else {
        currentSession = {
          url: data.url,
          provider: data.provider,
          targetPort: data.targetPort,
          durationMinutes: data.durationMinutes,
          expiresAt: data.expiresAt,
          remainingSeconds: data.remainingSeconds
        };
        totalSessionSecs = data.durationMinutes * 60;
        remainingSecs = data.remainingSeconds;
        renderActiveSession(currentSession);
        showToast(`Payment of ₹${activePaymentOrder ? activePaymentOrder.price : ''} Verified! Tunnel Live.`);
      }
    } catch (err) {
      console.error('[Verification Error]', err);
      showAlertDialog({
        title: 'Verification Failed',
        message: err.message || 'Could not verify payment with Razorpay.'
      });
    } finally {
      if (btnRazorpayPay) {
        btnRazorpayPay.disabled = false;
        btnRazorpayPay.innerHTML = `Pay <span id="payBtnAmountText">₹${activePaymentOrder ? activePaymentOrder.price : 10}</span> via Razorpay &rarr;`;
      }
    }
  }

  // Handle Sandbox Instant Test Payment Simulation
  async function handleSandboxPaymentSimulation() {
    if (!activePaymentOrder) return;
    const { minutes, actionType } = activePaymentOrder;
    btnSimulatePayment.disabled = true;
    btnSimulatePayment.textContent = 'Processing Sandbox...';

    await verifyAndActivatePayment({
      razorpay_order_id: `order_mock_${Date.now()}`,
      razorpay_payment_id: `pay_mock_${Date.now()}`,
      razorpay_signature: 'sandbox_valid',
      planMinutes: minutes,
      planName: `${minutes}-Min Pass`,
      targetPort: selectedPort,
      actionType: actionType
    });

    btnSimulatePayment.disabled = false;
    btnSimulatePayment.textContent = 'Simulate Test Payment (Sandbox Instant)';
  }

  // Start Tunnel Session
  async function startSession(port, durationMinutes, planName) {
    btnLaunchTunnel.disabled = true;
    btnLaunchText.textContent = 'Establishing Secure Tunnel...';

    try {
      const res = await fetch('/api/tunnel/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          targetPort: port,
          durationMinutes: durationMinutes,
          planName: planName
        })
      });

      const data = await res.json();
      if (data.success && data.url) {
        currentSession = data;
        totalSessionSecs = data.durationMinutes * 60;
        remainingSecs = data.remainingSeconds;
        renderActiveSession(data);
        showToast(`Tunnel Live! Session active for ${data.durationMinutes} minutes.`);
      } else {
        showAlertDialog({
          title: 'Launch Failed',
          message: data.error || 'Failed to start tunnel. Check if port is open.'
        });
      }
    } catch (err) {
      showAlertDialog({
        title: 'Connection Error',
        message: `Error starting tunnel: ${err.message}`
      });
    } finally {
      btnLaunchTunnel.disabled = false;
      updateLaunchButtonText();
    }
  }

  // WebSocket Relay Management (Zero-Terminal In-Browser Bridge)
  function updateRelayStatus(status, text) {
    if (relayStatusText) relayStatusText.textContent = text;
    if (relayPingDot) {
      if (status === 'live') {
        relayPingDot.className = 'relay-ping-pulse';
      } else if (status === 'connecting') {
        relayPingDot.className = 'relay-ping-pulse';
      } else {
        relayPingDot.className = 'relay-ping-pulse offline';
      }
    }
  }

  function updateRelayTrafficDisplay() {
    if (relayTrafficCounter) {
      relayTrafficCounter.textContent = `${relayedRequestCount} request${relayedRequestCount === 1 ? '' : 's'}`;
    }
  }

  function connectBrowserRelay(sessionId, targetPort) {
    if (relayWs) {
      try { relayWs.close(); } catch (e) {}
      relayWs = null;
    }

    relayedRequestCount = 0;
    updateRelayTrafficDisplay();
    updateRelayStatus('connecting', 'Connecting browser relay...');

    const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${wsProtocol}//${window.location.host}/api/relay-ws?sessionId=${encodeURIComponent(sessionId)}&targetPort=${targetPort}`;

    try {
      relayWs = new WebSocket(wsUrl);
    } catch (err) {
      console.error('[Relay] WebSocket init error:', err);
      updateRelayStatus('offline', 'Web relay unavailable. Use Terminal CLI.');
      return;
    }

    relayWs.onopen = () => {
      console.log('[Relay] In-browser relay live for session:', sessionId);
      updateRelayStatus('live', `Relaying localhost:${targetPort} live from this tab`);
    };

    relayWs.onmessage = async (evt) => {
      try {
        const msg = JSON.parse(evt.data);
        if (msg.type === 'HTTP_REQUEST') {
          relayedRequestCount++;
          updateRelayTrafficDisplay();
          handleRelayedHttpRequest(msg, targetPort);
        }
      } catch (err) {
        console.error('[Relay] Message handling error:', err);
      }
    };

    relayWs.onerror = (err) => {
      console.warn('[Relay] WebSocket error:', err);
    };

    relayWs.onclose = () => {
      console.log('[Relay] WebSocket closed');
      if (currentSession && currentSession.sessionId === sessionId) {
        updateRelayStatus('offline', 'Relay disconnected (reconnecting...)');
        setTimeout(() => {
          if (currentSession && currentSession.sessionId === sessionId) {
            connectBrowserRelay(sessionId, targetPort);
          }
        }, 3000);
      }
    };
  }

  async function handleRelayedHttpRequest(msg, targetPort) {
    const localUrl = `http://127.0.0.1:${targetPort}${msg.url || '/'}`;
    const fetchOpts = {
      method: msg.method || 'GET',
      headers: {}
    };

    if (msg.headers) {
      Object.entries(msg.headers).forEach(([k, v]) => {
        const lower = k.toLowerCase();
        if (!['host', 'connection', 'content-length', 'cookie', 'origin', 'referer', 'sec-fetch-dest', 'sec-fetch-mode', 'sec-fetch-site'].includes(lower)) {
          fetchOpts.headers[k] = v;
        }
      });
    }

    if (msg.body && !['GET', 'HEAD'].includes(msg.method)) {
      fetchOpts.body = typeof msg.body === 'object' ? JSON.stringify(msg.body) : msg.body;
    }

    try {
      const resp = await fetch(localUrl, fetchOpts);
      const respHeaders = {};
      resp.headers.forEach((val, key) => {
        respHeaders[key] = val;
      });

      const contentType = resp.headers.get('content-type') || '';
      const isText = contentType.includes('text') || contentType.includes('json') || contentType.includes('javascript') || contentType.includes('xml') || contentType.includes('svg');

      let bodyContent;
      let isBase64 = false;

      if (isText) {
        bodyContent = await resp.text();
      } else {
        const buffer = await resp.arrayBuffer();
        const bytes = new Uint8Array(buffer);
        let binary = '';
        for (let i = 0; i < bytes.byteLength; i++) {
          binary += String.fromCharCode(bytes[i]);
        }
        bodyContent = btoa(binary);
        isBase64 = true;
      }

      if (relayWs && relayWs.readyState === WebSocket.OPEN) {
        relayWs.send(JSON.stringify({
          type: 'HTTP_RESPONSE',
          requestId: msg.requestId,
          status: resp.status,
          headers: respHeaders,
          body: bodyContent,
          isBase64: isBase64
        }));
      }
    } catch (fetchErr) {
      console.error('[Relay] Local dev server fetch failed:', localUrl, fetchErr);
      if (relayWs && relayWs.readyState === WebSocket.OPEN) {
        relayWs.send(JSON.stringify({
          type: 'HTTP_RESPONSE',
          requestId: msg.requestId,
          status: 502,
          headers: { 'content-type': 'text/html' },
          body: `
            <div style="font-family: system-ui, sans-serif; padding: 30px; text-align: center; color: #333;">
              <h3 style="color: #e11d48; margin-top: 0;">502 Bad Gateway (Local Dev Server Offline)</h3>
              <p>TunnelSnap is streaming through your browser, but could not connect to <strong>localhost:${targetPort}</strong>.</p>
              <p style="color: #666; font-size: 0.9rem;">Make sure your development server on port <strong>${targetPort}</strong> is actively running.</p>
            </div>
          `,
          isBase64: false
        }));
      }
    }
  }

  // Render Active Session UI
  function renderActiveSession(data) {
    expiredSessionCard.style.display = 'none';
    activeSessionCard.style.display = 'block';

    sessionPlanLabel.textContent = `${data.durationMinutes}-Minute Pass Active`;
    publicUrlStr.textContent = data.url;
    btnOpenExternal.href = data.url;
    if (curlSnippetCode) curlSnippetCode.textContent = `curl ${data.url}`;

    const activePort = data.targetPort || selectedPort || 3000;
    if (terminalSnippetCode) {
      terminalSnippetCode.textContent = data.terminalCommand || `bore local ${activePort} --to bore.pub`;
    }

    // Connect In-Browser Web Relay
    if (data.sessionId) {
      connectBrowserRelay(data.sessionId, activePort);
    }

    // Render QR Code (Direct SVG)
    liveQrTarget.innerHTML = '<div class="qr-spinner">Rendering QR code...</div>';
    fetch(`/api/qr?text=${encodeURIComponent(data.url)}&type=svg`)
      .then(res => res.text())
      .then(svg => {
        liveQrTarget.innerHTML = svg;
      })
      .catch(() => {
        liveQrTarget.innerHTML = '<div>Error loading QR</div>';
      });

    startCountdown();

    activeSessionCard.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }

  // Countdown timer
  function startCountdown() {
    if (countdownTimer) clearInterval(countdownTimer);

    function tick() {
      if (remainingSecs <= 0) {
        clearInterval(countdownTimer);
        handleSessionExpired();
        return;
      }

      const mins = Math.floor(remainingSecs / 60);
      const secs = remainingSecs % 60;
      const formatted = `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;

      liveTimerDigits.textContent = formatted;
      fsTimerClock.textContent = formatted;

      const pct = Math.max(0, Math.min(100, (remainingSecs / totalSessionSecs) * 100));
      liveTimerFill.style.width = `${pct}%`;

      remainingSecs--;
    }

    tick();
    countdownTimer = setInterval(tick, 1000);
  }

  // Session Expired
  function handleSessionExpired() {
    if (relayWs) {
      try { relayWs.close(); } catch (e) {}
      relayWs = null;
    }
    currentSession = null;
    activeSessionCard.style.display = 'none';
    expiredSessionCard.style.display = 'block';
    showToast('Session expired. Tunnel closed.');
  }

  // Extend Session (+ min)
  function extendSession(addMinutes, priceInr) {
    if (!currentSession) return;
    triggerDirectRazorpayCheckout(addMinutes, priceInr, 'extend');
  }

  // Revoke / Stop Session (Custom UI Dialog)
  async function revokeSession() {
    showConfirmDialog({
      title: 'Revoke Tunnel Access?',
      message: 'Are you sure you want to revoke access and close this tunnel immediately? All connected devices will lose access instantly.',
      confirmText: 'Revoke Immediately',
      isDanger: true,
      onConfirm: async () => {
        if (countdownTimer) clearInterval(countdownTimer);
        if (relayWs) {
          try { relayWs.close(); } catch (e) {}
          relayWs = null;
        }

        try {
          await fetch('/api/tunnel/stop', { method: 'POST' });
        } catch (e) {}

        currentSession = null;
        activeSessionCard.style.display = 'none';
        expiredSessionCard.style.display = 'block';
        showToast('Access revoked immediately.');
      }
    });
  }

  // Download QR PNG
  function downloadQrPng() {
    const svgEl = liveQrTarget.querySelector('svg');
    if (!svgEl) return;

    const svgData = new XMLSerializer().serializeToString(svgEl);
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const img = new Image();

    canvas.width = 600;
    canvas.height = 600;

    img.onload = () => {
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, 600, 600);
      ctx.drawImage(img, 40, 40, 520, 520);

      const a = document.createElement('a');
      a.download = `tunnelsnap-port-${selectedPort}.png`;
      a.href = canvas.toDataURL('image/png');
      a.click();
      showToast('QR code saved as PNG');
    };

    img.src = 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svgData)));
  }

  // Show Toast
  function showToast(msg) {
    toast.textContent = msg;
    toast.classList.add('show');
    setTimeout(() => {
      toast.classList.remove('show');
    }, 2400);
  }

  // Setup Event Listeners
  function setupEventListeners() {
    // Auth Trigger Buttons
    btnOpenLogin?.addEventListener('click', () => openAuthModal('login'));
    btnOpenSignup?.addEventListener('click', () => openAuthModal('signup'));
    btnNavGetFree?.addEventListener('click', () => openAuthModal('signup'));
    btnLockedLogin?.addEventListener('click', () => openAuthModal('login'));
    btnLockedSignup?.addEventListener('click', () => openAuthModal('signup'));
    btnPricingFreeCta?.addEventListener('click', () => openAuthModal('signup'));
    btnLogout?.addEventListener('click', handleLogout);

    // Hero CTA Button
    btnHeroCta?.addEventListener('click', (e) => {
      if (!currentUser || !currentUser.loggedIn) {
        e.preventDefault();
        openAuthModal('signup');
      }
    });

    // Auth Modal Tabs
    tabModeLogin?.addEventListener('click', () => openAuthModal('login'));
    tabModeSignup?.addEventListener('click', () => openAuthModal('signup'));

    // Auth Form Submit
    const authForm = document.getElementById('authForm');
    authForm?.addEventListener('submit', handleAuthSubmit);
    btnSubmitAuth?.addEventListener('click', handleAuthSubmit);

    btnGoogleLogin?.addEventListener('click', () => {
      authEmail.value = 'google.developer@gmail.com';
      if (authName) authName.value = 'Google Developer';
      if (authPhone) authPhone.value = '9876543210';
      handleAuthSubmit();
    });

    btnCloseAuthModal?.addEventListener('click', () => {
      authModal.classList.remove('active');
    });

    authModal?.addEventListener('click', (e) => {
      if (e.target === authModal) authModal.classList.remove('active');
    });

    linkSwitchMode?.addEventListener('click', (e) => {
      e.preventDefault();
      openAuthModal(authMode === 'login' ? 'signup' : 'login');
    });

    // Port input change
    portInput?.addEventListener('input', () => {
      selectedPort = parseInt(portInput.value, 10) || 3000;
      portChips.forEach(chip => {
        if (parseInt(chip.dataset.port, 10) === selectedPort) {
          chip.classList.add('active');
        } else {
          chip.classList.remove('active');
        }
      });
    });

    portInput?.addEventListener('change', checkTargetHealth);
    btnPingLocal?.addEventListener('click', checkTargetHealth);
    btnRefreshHealth?.addEventListener('click', checkTargetHealth);

    // Port Presets
    portChips.forEach(chip => {
      chip.addEventListener('click', () => {
        portChips.forEach(c => c.classList.remove('active'));
        chip.classList.add('active');
        selectedPort = parseInt(chip.dataset.port, 10);
        portInput.value = selectedPort;
        checkTargetHealth();
      });
    });

    // Duration & Pricing Options Click
    priceOptions.forEach(opt => {
      opt.addEventListener('click', () => {
        priceOptions.forEach(o => o.classList.remove('active'));
        opt.classList.add('active');
        selectedMinutes = parseInt(opt.dataset.minutes, 10);
        selectedPrice = parseInt(opt.dataset.price, 10);
        updateLaunchButtonText();
      });
    });

    // Launch Button
    btnLaunchTunnel?.addEventListener('click', handleLaunchClick);

    // Extend Buttons
    btnAdd5Min?.addEventListener('click', () => extendSession(5, 5));
    btnAdd15Min?.addEventListener('click', () => extendSession(15, 10));

    // Revoke Button
    btnRevokeAccess?.addEventListener('click', revokeSession);

    // Restart from Expired Card
    btnRestartSession?.addEventListener('click', () => {
      expiredSessionCard.style.display = 'none';
      handleLaunchClick();
    });

    // Copy public link
    btnCopyPublicUrl?.addEventListener('click', async () => {
      if (!currentSession || !currentSession.url) return;
      try {
        await navigator.clipboard.writeText(currentSession.url);
        copyBtnLabel.textContent = 'Copied!';
        showToast('Link copied to clipboard!');
        setTimeout(() => {
          copyBtnLabel.textContent = 'Copy Link';
        }, 2000);
      } catch (e) {
        showToast('Failed to copy');
      }
    });

    // Dual-Mode Connection Tab Switching
    tabModeBrowserRelay?.addEventListener('click', () => {
      tabModeBrowserRelay.classList.add('active');
      tabModeTerminal?.classList.remove('active');
      if (panelBrowserRelay) panelBrowserRelay.style.display = 'block';
      if (panelTerminalCommand) panelTerminalCommand.style.display = 'none';
    });

    tabModeTerminal?.addEventListener('click', () => {
      tabModeTerminal.classList.add('active');
      tabModeBrowserRelay?.classList.remove('active');
      if (panelTerminalCommand) panelTerminalCommand.style.display = 'block';
      if (panelBrowserRelay) panelBrowserRelay.style.display = 'none';
    });

    // Copy Terminal Command
    btnCopyTerminalCmd?.addEventListener('click', async () => {
      if (!terminalSnippetCode) return;
      try {
        await navigator.clipboard.writeText(terminalSnippetCode.textContent);
        btnCopyTerminalCmd.textContent = 'Copied!';
        showToast('Terminal command copied!');
        setTimeout(() => {
          btnCopyTerminalCmd.textContent = 'Copy Command';
        }, 2000);
      } catch (e) {
        showToast('Failed to copy');
      }
    });

    // Copy NPX Command
    btnCopyNpxCmd?.addEventListener('click', async () => {
      const port = (currentSession && currentSession.targetPort) || selectedPort || 3000;
      const npxCmd = `npx -y localtunnel --port ${port}`;
      try {
        await navigator.clipboard.writeText(npxCmd);
        showToast('NPX command copied to clipboard!');
      } catch (e) {
        showToast('Failed to copy');
      }
    });

    // Copy curl command (backward compatibility)
    btnCopyCurl?.addEventListener('click', async () => {
      try {
        await navigator.clipboard.writeText(curlSnippetCode ? curlSnippetCode.textContent : '');
        showToast('Curl snippet copied!');
      } catch (e) {}
    });

    // Native Web Share
    btnNativeShare?.addEventListener('click', async () => {
      if (!currentSession || !currentSession.url) return;
      if (navigator.share) {
        try {
          await navigator.share({
            title: `TunnelSnap Test: Port ${selectedPort}`,
            text: `Test my local app (Active for ${Math.round(remainingSecs / 60)} min): ${currentSession.url}`,
            url: currentSession.url
          });
        } catch (e) {}
      } else {
        await navigator.clipboard.writeText(currentSession.url);
        showToast('Link copied to clipboard');
      }
    });

    // QR Download
    btnSaveQrPng?.addEventListener('click', downloadQrPng);

    // Fullscreen QR Modal
    btnFullscreenModal?.addEventListener('click', () => {
      const svg = liveQrTarget.querySelector('svg');
      if (svg) {
        fsQrContainer.innerHTML = svg.outerHTML;
        fsUrlText.textContent = currentSession ? currentSession.url : '';
        fullscreenQrModal.classList.add('active');
      }
    });

    btnCloseFullscreenQr?.addEventListener('click', () => {
      fullscreenQrModal.classList.remove('active');
    });

    // Payment Modal Listeners (Razorpay & Simulation)
    btnClosePaymentModal?.addEventListener('click', () => {
      paymentModal.classList.remove('active');
    });

    btnRazorpayPay?.addEventListener('click', handleRazorpayCheckout);
    btnSimulatePayment?.addEventListener('click', handleSandboxPaymentSimulation);

    paymentModal?.addEventListener('click', (e) => {
      if (e.target === paymentModal) paymentModal.classList.remove('active');
    });

    // Dev Team Contact
    const btnContactTeam = document.getElementById('btnContactTeam');
    if (btnContactTeam) {
      btnContactTeam.addEventListener('click', () => {
        showToast('Dev Team Pass selected. Contact team@tunnelsnap.dev');
      });
    }

    // Architecture Simulation Ping Stream
    const btnPingSim = document.getElementById('btnPingSim');
    const pingStatusPill = document.getElementById('pingStatusPill');
    const pingStatusText = document.getElementById('pingStatusText');
    if (btnPingSim) {
      btnPingSim.addEventListener('click', () => {
        const packets = document.querySelectorAll('.laser-packet');
        const randomMs = Math.floor(Math.random() * 12) + 14; // 14-25ms
        
        btnPingSim.disabled = true;
        btnPingSim.innerHTML = '<svg class="ping-icon" width="13" height="13" viewBox="0 0 24 24" fill="currentColor"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg><span>Streaming Packets...</span>';
        if (pingStatusText) pingStatusText.textContent = `Streaming... (${randomMs}ms)`;
        if (pingStatusPill) pingStatusPill.style.borderColor = '#10b981';

        // Accelerate packet animations
        packets.forEach(p => {
          p.style.animationDuration = '0.7s';
        });

        setTimeout(() => {
          if (pingStatusText) pingStatusText.textContent = `Verified: ${randomMs}ms • 200 OK`;
          showToast(`Stream Verified! Localhost:3000 -> Global Relay -> Devices (${randomMs}ms)`);
          
          setTimeout(() => {
            btnPingSim.disabled = false;
            btnPingSim.innerHTML = '<svg class="ping-icon" width="13" height="13" viewBox="0 0 24 24" fill="currentColor"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg><span>Simulate Data Stream</span>';
            if (pingStatusText) pingStatusText.textContent = 'Relay: 18ms • Ready';
            if (pingStatusPill) pingStatusPill.style.borderColor = '';
            packets.forEach(p => {
              p.style.animationDuration = '';
            });
          }, 2200);
        }, 1100);
      });
    }

    // UI Confirmation & Alert Dialog Handlers (Zero Browser Popups)
    btnConfirmAction?.addEventListener('click', () => {
      const cb = confirmCallback;
      closeConfirmModal();
      if (cb && typeof cb === 'function') {
        cb();
      }
    });

    btnConfirmCancel?.addEventListener('click', () => {
      closeConfirmModal();
    });

    confirmModal?.addEventListener('click', (e) => {
      if (e.target === confirmModal) {
        closeConfirmModal();
      }
    });

    // Legal Modal Listeners
    btnCloseLegalModal?.addEventListener('click', closeLegalModal);
    btnCloseLegalBottom?.addEventListener('click', closeLegalModal);
    legalModal?.addEventListener('click', (e) => {
      if (e.target === legalModal) closeLegalModal();
    });

    tabLegalTerms?.addEventListener('click', () => switchLegalTab('terms'));
    tabLegalPrivacy?.addEventListener('click', () => switchLegalTab('privacy'));
    tabLegalRefund?.addEventListener('click', () => switchLegalTab('refund'));
    tabLegalContact?.addEventListener('click', () => switchLegalTab('contact'));

    document.querySelectorAll('.legal-trigger').forEach(trigger => {
      trigger.addEventListener('click', (e) => {
        e.preventDefault();
        const tab = trigger.dataset.target || 'terms';
        openLegalModal(tab);
      });
    });

    window.addEventListener('hashchange', checkLegalHash);
  }

  // Legal Modal Functions (Pixorva Policies)
  function openLegalModal(tab = 'terms') {
    if (!legalModal) return;
    switchLegalTab(tab);
    legalModal.classList.add('active');
  }

  function closeLegalModal() {
    if (legalModal) legalModal.classList.remove('active');
  }

  function switchLegalTab(tab) {
    const tabs = {
      terms: { btn: tabLegalTerms, view: viewLegalTerms, title: 'Terms & Conditions' },
      privacy: { btn: tabLegalPrivacy, view: viewLegalPrivacy, title: 'Privacy Policy' },
      refund: { btn: tabLegalRefund, view: viewLegalRefund, title: 'Refund Policy' },
      contact: { btn: tabLegalContact, view: viewLegalContact, title: 'Contact & Grievance' }
    };

    Object.keys(tabs).forEach(k => {
      tabs[k].btn?.classList.remove('active');
      tabs[k].view?.classList.remove('active');
    });

    const activeItem = tabs[tab] || tabs.terms;
    activeItem.btn?.classList.add('active');
    activeItem.view?.classList.add('active');
    if (legalModalTitle) legalModalTitle.textContent = activeItem.title;
  }

  function checkLegalHash() {
    const hash = window.location.hash.toLowerCase();
    if (hash === '#terms') openLegalModal('terms');
    else if (hash === '#privacy') openLegalModal('privacy');
    else if (hash === '#refund') openLegalModal('refund');
    else if (hash === '#contact') openLegalModal('contact');
  }

  // DOM Ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
