require('dotenv').config();
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const { v4: uuidv4 } = require('uuid');
const WebSocket = require('ws');
const crypto = require('crypto');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

const PORT = process.env.PORT || 5000;

// In-memory database (MVP - replace with PostgreSQL later)
let db = {
  users: [
    {
      id: "u1",
      name: "Rahul Sharma",
      mobile: "9876543210",
      pin: "1234",
      balance: 250000,
      role: "customer"
    },
    {
      id: "u2",
      name: "Priya Patel",
      mobile: "9876543211",
      pin: "5678",
      balance: 180000,
      role: "customer"
    }
  ],
  orders: [],
  rates: {
    gold_mcx: 98450,
    silver_mcx: 94500,
    gold_margin: 250,
    silver_margin: 180,
    spread: 15,
    premium: 50,
    gst: 3, // percentage
    gold_token: process.env.ALICEBLUE_GOLD_TOKEN || "466583",   // GOLD AUG 2026 FUT
    silver_token: process.env.ALICEBLUE_SILVER_TOKEN || "471725", // SILVER SEP 2026 FUT
    alice_connected: false,
    alice_client_id: process.env.ALICEBLUE_CLIENT_ID || "",
    alice_app_code: process.env.ALICEBLUE_APP_CODE || ""
  }
};

// Middleware
app.use(cors());
app.use(express.json());

// Helper: Price Engine
function calculateFinalPrice(mcxPrice, margin, spread, premium, gstPercent, type = 'BUY') {
  let base = mcxPrice + margin + premium;
  
  // Spread
  if (type === 'BUY') {
    base += spread;
  } else {
    base -= spread;
  }
  
  // GST
  const gstAmount = (base * gstPercent) / 100;
  const final = Math.round(base + gstAmount);
  
  return final;
}

// Update live prices (simulated Alice Blue feed)
let simulatorInterval = null;
function simulateAliceBlueFeed() {
  if (simulatorInterval) clearInterval(simulatorInterval);
  simulatorInterval = setInterval(() => {
    // Simulate realistic price movements
    const goldChange = Math.floor(Math.random() * 30) - 15;
    const silverChange = Math.floor(Math.random() * 20) - 10;
    
    db.rates.gold_mcx = Math.max(96000, Math.min(102000, db.rates.gold_mcx + goldChange));
    db.rates.silver_mcx = Math.max(92000, Math.min(98000, db.rates.silver_mcx + silverChange));
    
    // Broadcast live rates to all clients
    const liveRates = getLiveRates();
    io.emit('live_rates', liveRates);
    
    console.log(`[AliceBlue Sim] Gold: ₹${db.rates.gold_mcx} | Silver: ₹${db.rates.silver_mcx}`);
  }, 2500); // Update every 2.5 seconds
}

let aliceSession = null;
let aliceWS = null;
let isAliceWSConnected = false;
let aliceWsHeartbeatInterval = null;

// SHA256 helper
function sha256(data) {
  return crypto.createHash('sha256').update(data).digest('hex');
}

// Auto-fetch nearest expiry Gold/Silver FUTCOM tokens from Alice Blue instrument master
async function refreshInstrumentTokens() {
  return new Promise((resolve) => {
    const https = require('https');
    https.get('https://v2api.aliceblueonline.com/restpy/static/contract_master/MCX.csv', (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const lines = data.split('\n');
          const today = new Date();

          function findNearestToken(symbol) {
            const matches = lines
              .map(l => l.split(','))
              .filter(cols => cols[2] === symbol && cols[4] === 'FUTCOM')
              .map(cols => ({ token: cols[3], expiry: new Date(cols[10]) }))
              .filter(x => x.expiry >= today)
              .sort((a, b) => a.expiry - b.expiry);
            return matches.length ? matches[0].token : null;
          }

          const goldToken = findNearestToken('GOLD');
          const silverToken = findNearestToken('SILVER');

          if (goldToken) {
            db.rates.gold_token = goldToken;
            console.log(`[Tokens] Auto-updated GOLD token: ${goldToken}`);
          }
          if (silverToken) {
            db.rates.silver_token = silverToken;
            console.log(`[Tokens] Auto-updated SILVER token: ${silverToken}`);
          }
        } catch (err) {
          console.error('[Tokens] Failed to parse instrument CSV:', err.message);
        }
        resolve();
      });
    }).on('error', (err) => {
      console.error('[Tokens] Failed to fetch instrument master:', err.message);
      resolve(); // Don't block startup
    });
  });
}

// Connect to Alice Blue WebSocket
function connectAliceWebSocket() {
  if (!aliceSession) {
    console.log('[AliceBlue WS] Cannot connect: No active session');
    return;
  }
  
  const susertoken = sha256(sha256(aliceSession));
  const clientId = process.env.ALICEBLUE_CLIENT_ID || db.rates.alice_client_id;
  
  console.log(`[AliceBlue WS] Connecting to NorenWS... Session ID length: ${aliceSession.length}, Client ID: ${clientId}, susertoken prefix: ${susertoken.substring(0, 8)}`);
  
  if (aliceWS) {
    try {
      aliceWS.removeAllListeners();
      aliceWS.close();
    } catch(e){}
  }
  
  aliceWS = new WebSocket('wss://ws1.aliceblueonline.com/NorenWS/');
  
  aliceWS.on('open', () => {
    const authData = {
      susertoken: susertoken,
      t: 'c',
      actid: clientId + '_API',
      uid: clientId + '_API',
      source: 'API'
    };
    console.log('[AliceBlue WS] Socket opened. Sending auth packet:', JSON.stringify({ ...authData, susertoken: susertoken.substring(0, 8) + '...' }));
    aliceWS.send(JSON.stringify(authData));
  });
  
  aliceWS.on('message', (message) => {
    try {
      const data = JSON.parse(message.toString());
      console.log('[AliceBlue WS] Message received:', JSON.stringify(data));
      if (data.t === 'ck' && (data.s === 'OK' || data.stat === 'Ok')) {
        console.log('[AliceBlue WS] Authentication successful!');
        isAliceWSConnected = true;
        db.rates.alice_connected = true;
        
        io.emit('live_rates', getLiveRates());
        subscribeAliceInstruments();
        startAliceWSHeartbeat();
      } else if (data.t === 'tf' || data.t === 't' || data.t === 'tk') {
        const { tk, lp, bp1 } = data;
        // lp = last traded price (in tk/initial message)
        // bp1 = best bid price (in tf/tick feed updates)
        const priceStr = lp || bp1;
        if (priceStr && tk) {
          const price = parseFloat(priceStr);
          if (tk === db.rates.gold_token) {
            db.rates.gold_mcx = price;
            io.emit('live_rates', getLiveRates());
            console.log(`[AliceBlue Live] Gold: ₹${price} (${lp ? 'lp' : 'bp1'})`);
          } else if (tk === db.rates.silver_token) {
            db.rates.silver_mcx = price;
            io.emit('live_rates', getLiveRates());
            console.log(`[AliceBlue Live] Silver: ₹${price} (${lp ? 'lp' : 'bp1'})`);
          }
        }
      }
    } catch (err) {
      console.error('[AliceBlue WS] Error parsing message:', err);
    }
  });
  
  aliceWS.on('close', (code, reason) => {
    console.log(`[AliceBlue WS] Socket closed. Code: ${code} | Reason: ${reason ? reason.toString() : 'None'}`);
    isAliceWSConnected = false;
    db.rates.alice_connected = false;
    stopAliceWSHeartbeat();
    io.emit('live_rates', getLiveRates());
    
    // Auto-reconnect if live mode is enabled
    if (process.env.ALICEBLUE_SIMULATED !== 'true' && aliceSession) {
      console.log('[AliceBlue WS] Attempting reconnect in 5 seconds...');
      // Only reconnect on abnormal close (not intentional 1000 close)
      if (code !== 1000) {
        setTimeout(connectAliceWebSocket, 5000);
      }
    }
  });
  
  aliceWS.on('error', (err) => {
    console.error('[AliceBlue WS] Socket error:', err.message);
  });
}

function subscribeAliceInstruments() {
  if (!aliceWS || aliceWS.readyState !== WebSocket.OPEN || !isAliceWSConnected) return;
  
  const goldToken = db.rates.gold_token;
  const silverToken = db.rates.silver_token;
  
  console.log(`[AliceBlue WS] Subscribing to Gold (${goldToken}) and Silver (${silverToken}) MCX instruments...`);
  
  const subData = {
    t: 't',
    k: `MCX|${goldToken}#MCX|${silverToken}`
  };
  aliceWS.send(JSON.stringify(subData));
}

function startAliceWSHeartbeat() {
  stopAliceWSHeartbeat();
  aliceWsHeartbeatInterval = setInterval(() => {
    if (aliceWS && aliceWS.readyState === WebSocket.OPEN) {
      aliceWS.send(JSON.stringify({ t: 'h' }));
    }
  }, 10000);
}

function stopAliceWSHeartbeat() {
  if (aliceWsHeartbeatInterval) {
    clearInterval(aliceWsHeartbeatInterval);
    aliceWsHeartbeatInterval = null;
  }
}

function getLiveRates() {
  const { gold_mcx, silver_mcx, gold_margin, silver_margin, spread, premium, gst, gold_token, silver_token, alice_connected, alice_client_id } = db.rates;
  
  return {
    gold: {
      mcx: gold_mcx,
      buy: calculateFinalPrice(gold_mcx, gold_margin, spread, premium, gst, 'BUY'),
      sell: calculateFinalPrice(gold_mcx, gold_margin, spread, premium, gst, 'SELL'),
      margin: gold_margin,
      spread: spread,
      premium: premium
    },
    silver: {
      mcx: silver_mcx,
      buy: calculateFinalPrice(silver_mcx, silver_margin, spread, premium, gst, 'BUY'),
      sell: calculateFinalPrice(silver_mcx, silver_margin, spread, premium, gst, 'SELL'),
      margin: silver_margin,
      spread: spread,
      premium: premium
    },
    usd_inr: 83.45, // Static for MVP
    timestamp: new Date().toISOString(),
    alice_connected: alice_connected,
    gold_token: gold_token,
    silver_token: silver_token,
    alice_client_id: alice_client_id,
    alice_app_code: process.env.ALICEBLUE_APP_CODE || ""
  };
}

// ==================== API ROUTES ====================

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date() });
});

// Get live rates
app.get('/api/rates/live', (req, res) => {
  res.json(getLiveRates());
});

// Admin override rates
app.post('/api/rates/override', (req, res) => {
  const { gold_margin, silver_margin, spread, premium, gst, gold_token, silver_token } = req.body;
  
  if (gold_margin !== undefined) db.rates.gold_margin = parseFloat(gold_margin);
  if (silver_margin !== undefined) db.rates.silver_margin = parseFloat(silver_margin);
  if (spread !== undefined) db.rates.spread = parseFloat(spread);
  if (premium !== undefined) db.rates.premium = parseFloat(premium);
  if (gst !== undefined) db.rates.gst = parseFloat(gst);
  
  let tokensChanged = false;
  if (gold_token !== undefined && gold_token !== db.rates.gold_token) {
    db.rates.gold_token = gold_token;
    tokensChanged = true;
  }
  if (silver_token !== undefined && silver_token !== db.rates.silver_token) {
    db.rates.silver_token = silver_token;
    tokensChanged = true;
  }
  
  if (tokensChanged && isAliceWSConnected) {
    subscribeAliceInstruments();
  }
  
  const updatedRates = getLiveRates();
  io.emit('live_rates', updatedRates); // Push to all clients
  
  res.json({ success: true, rates: db.rates });
});

// Alice Blue Session Endpoint
app.post('/api/aliceblue/session', async (req, res) => {
  const { authCode, userId } = req.body;
  
  if (!authCode || !userId) {
    return res.status(400).json({ error: 'authCode and userId are required' });
  }
  
  const apiSecret = process.env.ALICEBLUE_API_SECRET;
  if (!apiSecret || apiSecret === 'YOUR_SECRET_KEY') {
    return res.status(500).json({ error: 'Alice Blue API Secret is not configured in backend .env' });
  }
  
  try {
    const checksumStr = userId + authCode + apiSecret;
    const checksum = sha256(checksumStr);
    
    console.log(`[AliceBlue Auth] Requesting session for user: ${userId}`);
    
    const apiRes = await fetch('https://a3.aliceblueonline.com/open-api/od/v1/vendor/getUserDetails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ checkSum: checksum })
    });
    
    const data = await apiRes.json();
    
    if (data.stat === 'Ok' && data.userSession) {
      console.log(`[AliceBlue Auth] Login successful for client: ${data.clientId}. Creating WebSocket Session...`);
      
      // Call createWsSess to authorize/activate the session for WebSocket usage
      try {
        const wsSessRes = await fetch('https://a3.aliceblueonline.com/open-api/od/v1/profile/createWsSess', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${data.userSession}`
          },
          body: JSON.stringify({
            source: 'API',
            userId: data.clientId
          })
        });
        
        const wsSessData = await wsSessRes.json();
        console.log('[AliceBlue Auth] createWsSess response:', wsSessData);
        
        if (wsSessData.status !== 'Ok') {
          console.error('[AliceBlue Auth] createWsSess failed:', wsSessData);
          return res.status(400).json({ error: 'Failed to authorize WebSocket session', details: wsSessData });
        }
      } catch (wsSessErr) {
        console.error('[AliceBlue Auth] createWsSess request exception:', wsSessErr);
        return res.status(500).json({ error: 'Exception during WebSocket session authorization' });
      }

      aliceSession = data.userSession;
      db.rates.alice_client_id = data.clientId;
      db.rates.alice_connected = true;
      
      if (process.env.ALICEBLUE_SIMULATED !== 'true') {
        if (simulatorInterval) {
          clearInterval(simulatorInterval);
          simulatorInterval = null;
          console.log('[AliceBlue Sim] Deactivated simulator in favor of live feed.');
        }
        connectAliceWebSocket();
      } else {
        console.log('[AliceBlue Auth] Session generated successfully in SIMULATION mode.');
      }
      
      res.json({
        success: true,
        clientId: data.clientId,
        message: 'Alice Blue session established successfully!'
      });
    } else {
      console.error('[AliceBlue Auth] Authentication failed response:', data);
      res.status(400).json({ error: 'Authentication failed', details: data });
    }
  } catch (err) {
    console.error('[AliceBlue Auth] Exception during session generation:', err);
    res.status(500).json({ error: 'Internal server error during Alice Blue login' });
  }
});

// Auth - Mock OTP Login
app.post('/api/auth/login', (req, res) => {
  const { mobile } = req.body;
  
  if (!mobile) return res.status(400).json({ error: 'Mobile required' });
  
  // Simulate OTP sent
  const otp = '123456'; // Hardcoded for MVP
  
  res.json({
    success: true,
    message: `OTP sent to ${mobile}`,
    otp: otp // Only for demo - remove in production
  });
});

// Verify OTP + create session
app.post('/api/auth/verify-otp', (req, res) => {
  const { mobile, otp } = req.body;
  
  if (otp !== '123456') {
    return res.status(400).json({ error: 'Invalid OTP' });
  }
  
  let user = db.users.find(u => u.mobile === mobile);
  
  if (!user) {
    // Create new user
    user = {
      id: uuidv4(),
      name: `User ${mobile.slice(-4)}`,
      mobile,
      pin: '1234',
      balance: 150000,
      role: 'customer'
    };
    db.users.push(user);
  }
  
  const token = jwtSign(user);
  
  res.json({
    success: true,
    token,
    user: { id: user.id, name: user.name, mobile: user.mobile, balance: user.balance }
  });
});

// PIN Login
app.post('/api/auth/pin-login', (req, res) => {
  const { mobile, pin } = req.body;
  
  const user = db.users.find(u => u.mobile === mobile && u.pin === pin);
  
  if (!user) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }
  
  const token = jwtSign(user);
  
  res.json({
    success: true,
    token,
    user: { id: user.id, name: user.name, mobile: user.mobile, balance: user.balance }
  });
});

// JWT helper (mock)
function jwtSign(user) {
  return Buffer.from(JSON.stringify({ id: user.id, mobile: user.mobile, role: user.role })).toString('base64');
}

// Middleware: Auth
function authenticate(req, res, next) {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'No token' });
  
  try {
    const decoded = JSON.parse(Buffer.from(token, 'base64').toString());
    req.user = decoded;
    next();
  } catch (e) {
    return res.status(401).json({ error: 'Invalid token' });
  }
}

// Place BUY order
app.post('/api/orders/buy', authenticate, (req, res) => {
  const { commodity, qty, price } = req.body;
  const user = db.users.find(u => u.id === req.user.id);
  
  if (!user) return res.status(404).json({ error: 'User not found' });
  
  const order = {
    id: uuidv4(),
    userId: user.id,
    commodity: commodity.toUpperCase(),
    buy_sell: 'BUY',
    qty: parseFloat(qty),
    price: parseFloat(price),
    status: 'PENDING',
    createdAt: new Date().toISOString()
  };
  
  db.orders.push(order);
  
  // Broadcast to admin
  io.emit('new_order', order);
  
  res.json({ success: true, order });
});

// Place SELL order
app.post('/api/orders/sell', authenticate, (req, res) => {
  const { commodity, qty, price } = req.body;
  const user = db.users.find(u => u.id === req.user.id);
  
  if (!user) return res.status(404).json({ error: 'User not found' });
  
  const order = {
    id: uuidv4(),
    userId: user.id,
    commodity: commodity.toUpperCase(),
    buy_sell: 'SELL',
    qty: parseFloat(qty),
    price: parseFloat(price),
    status: 'PENDING',
    createdAt: new Date().toISOString()
  };
  
  db.orders.push(order);
  io.emit('new_order', order);
  
  res.json({ success: true, order });
});

// Get user order history
app.get('/api/orders/history', authenticate, (req, res) => {
  const userOrders = db.orders
    .filter(o => o.userId === req.user.id)
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  
  res.json(userOrders);
});

// ==================== ADMIN APIs ====================

// Admin Dashboard
app.get('/api/admin/dashboard', (req, res) => {
  const today = new Date().toISOString().split('T')[0];
  
  const todayOrders = db.orders.filter(o => o.createdAt.startsWith(today));
  
  const totalVolume = todayOrders.reduce((sum, o) => sum + (o.qty * o.price), 0);
  const totalProfit = Math.floor(totalVolume * 0.012); // 1.2% profit simulation
  
  res.json({
    totalUsers: db.users.length,
    activeUsers: db.users.filter(u => u.balance > 50000).length,
    todayOrders: todayOrders.length,
    todayProfit: totalProfit,
    todayVolume: totalVolume,
    pendingOrders: db.orders.filter(o => o.status === 'PENDING').length
  });
});

// Get all orders (admin)
app.get('/api/admin/orders', (req, res) => {
  const { status } = req.query;
  let orders = [...db.orders].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  
  if (status) {
    orders = orders.filter(o => o.status === status.toUpperCase());
  }
  
  // Enrich with user info
  orders = orders.map(order => {
    const user = db.users.find(u => u.id === order.userId);
    return {
      ...order,
      userName: user ? user.name : 'Unknown',
      userMobile: user ? user.mobile : ''
    };
  });
  
  res.json(orders);
});

// Update order status (admin)
app.put('/api/admin/orders/:id', (req, res) => {
  const { id } = req.params;
  const { status } = req.body;
  
  const order = db.orders.find(o => o.id === id);
  if (!order) return res.status(404).json({ error: 'Order not found' });
  
  order.status = status.toUpperCase();
  
  // Notify customer
  io.emit('order_update', order);
  
  res.json({ success: true, order });
});

// Get customers
app.get('/api/admin/customers', (req, res) => {
  res.json(db.users.filter(u => u.role === 'customer'));
});

// Override rates already handled above

// ==================== SOCKET.IO ====================

io.on('connection', (socket) => {
  console.log(`[Socket] Client connected: ${socket.id}`);
  
  // Send initial rates
  socket.emit('live_rates', getLiveRates());
  
  socket.on('subscribe_prices', () => {
    socket.emit('live_rates', getLiveRates());
  });
  
  socket.on('disconnect', () => {
    console.log(`[Socket] Client disconnected: ${socket.id}`);
  });
});

// Start Alice Blue simulator if configured, otherwise wait for active session
if (process.env.ALICEBLUE_SIMULATED === 'true') {
  simulateAliceBlueFeed();
}

// Start server
server.listen(PORT, () => {
  console.log(`🚀 Bullion Backend running on http://localhost:${PORT}`);
  console.log(`📡 Socket.IO ready for real-time updates`);
  if (process.env.ALICEBLUE_SIMULATED === 'true') {
    console.log(`📈 Simulated Alice Blue feed active`);
  } else {
    console.log(`📈 Real Alice Blue WebSocket mode active (awaiting session)`);
    // Auto-fetch nearest expiry tokens on startup
    refreshInstrumentTokens().then(() => {
      console.log(`[Tokens] Gold token: ${db.rates.gold_token} | Silver token: ${db.rates.silver_token}`);
    });
  }
});