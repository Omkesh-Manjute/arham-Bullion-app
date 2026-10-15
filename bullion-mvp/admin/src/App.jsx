import React, { useState, useEffect } from 'react';
import { 
  Box, CssBaseline, AppBar, Toolbar, Typography, Container, Grid, Paper, 
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow, 
  Button, TextField, Card, CardContent, Chip, Select, MenuItem, FormControl, InputLabel
} from '@mui/material';
import { io } from 'socket.io-client';
import axios from 'axios';

const API_BASE = 'http://localhost:5000';
const socket = io(API_BASE);

function AdminPanel() {
  const [liveRates, setLiveRates] = useState(null);
  const [orders, setOrders] = useState([]);
  const [dashboard, setDashboard] = useState({});
  const [marginOverrides, setMarginOverrides] = useState({
    gold_margin: 250,
    silver_margin: 180,
    spread: 15,
    premium: 50,
    gst: 3,
    gold_token: '239484',
    silver_token: '239485'
  });
  const [filterStatus, setFilterStatus] = useState('');

  // Load initial data
  useEffect(() => {
    fetchLiveRates();
    fetchDashboard();
    fetchOrders();
    
    // Check for Alice Blue callback parameters in the URL
    const params = new URLSearchParams(window.location.search);
    const authCode = params.get('authCode');
    const userId = params.get('userId');
    if (authCode && userId) {
      // Remove query parameters from URL immediately to prevent double calls in React StrictMode
      window.history.replaceState({}, document.title, window.location.pathname);
      handleAliceBlueCallback(authCode, userId);
    }
    
    // Socket listeners
    socket.on('live_rates', (rates) => {
      setLiveRates(rates);
      if (rates) {
        setMarginOverrides(prev => ({
          ...prev,
          gold_token: rates.gold_token || prev.gold_token,
          silver_token: rates.silver_token || prev.silver_token
        }));
      }
    });
    
    socket.on('new_order', (order) => {
      setOrders(prev => [order, ...prev]);
      fetchDashboard();
    });
    
    socket.on('order_update', () => {
      fetchOrders();
    });
    
    return () => {
      socket.off('live_rates');
      socket.off('new_order');
      socket.off('order_update');
    };
  }, []);

  const handleAliceBlueCallback = async (authCode, userId) => {
    try {
      const res = await axios.post(`${API_BASE}/api/aliceblue/session`, { authCode, userId });
      alert(`Alice Blue Connected! Client ID: ${res.data.clientId}`);
      // Remove query parameters from URL
      window.history.replaceState({}, document.title, window.location.pathname);
      fetchLiveRates();
    } catch (err) {
      console.error('Alice Blue connection failed:', err);
      alert('Failed to connect to Alice Blue: ' + (err.response?.data?.error || err.message));
    }
  };

  const loginAliceBlue = () => {
    const appCode = liveRates?.alice_app_code;
    if (!appCode || appCode === 'YOUR_APP_CODE') {
      alert('Please configure ALICEBLUE_APP_CODE in your backend .env file first.');
      return;
    }
    window.location.href = `https://ant.aliceblueonline.com/?appcode=${appCode}`;
  };

  const fetchLiveRates = async () => {
    try {
      const res = await axios.get(`${API_BASE}/api/rates/live`);
      setLiveRates(res.data);
      if (res.data) {
        setMarginOverrides(prev => ({
          ...prev,
          gold_margin: res.data.gold.margin,
          silver_margin: res.data.silver.margin,
          spread: res.data.gold.spread,
          premium: res.data.gold.premium,
          gst: res.data.gst || prev.gst,
          gold_token: res.data.gold_token || prev.gold_token,
          silver_token: res.data.silver_token || prev.silver_token
        }));
      }
    } catch (err) {
      console.error(err);
    }
  };

  const fetchDashboard = async () => {
    try {
      const res = await axios.get(`${API_BASE}/api/admin/dashboard`);
      setDashboard(res.data);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchOrders = async (status = '') => {
    try {
      const url = status 
        ? `${API_BASE}/api/admin/orders?status=${status}` 
        : `${API_BASE}/api/admin/orders`;
      const res = await axios.get(url);
      setOrders(res.data);
    } catch (err) {
      console.error(err);
    }
  };

  const handleMarginChange = (field, value) => {
    const isToken = field.includes('token');
    setMarginOverrides(prev => ({ 
      ...prev, 
      [field]: isToken ? value : (parseFloat(value) || 0) 
    }));
  };

  const applyMarginOverrides = async () => {
    try {
      await axios.post(`${API_BASE}/api/rates/override`, marginOverrides);
      alert('Margins updated successfully! Live rates pushed to clients.');
    } catch (err) {
      alert('Error updating margins');
    }
  };

  const updateOrderStatus = async (orderId, newStatus) => {
    try {
      await axios.put(`${API_BASE}/api/admin/orders/${orderId}`, { status: newStatus });
      fetchOrders(filterStatus);
      alert(`Order ${orderId} marked as ${newStatus}`);
    } catch (err) {
      alert('Failed to update order');
    }
  };

  const handleFilterChange = (e) => {
    const status = e.target.value;
    setFilterStatus(status);
    fetchOrders(status);
  };

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', minHeight: '100vh', bgcolor: '#f5f5f5' }}>
      <CssBaseline />
      
      {/* Header */}
      <AppBar position="static" sx={{ bgcolor: '#1a237e' }}>
        <Toolbar>
          <Typography variant="h5" sx={{ flexGrow: 1, fontWeight: 700 }}>
            🏆 Bullion Live • Admin Panel
          </Typography>
          <Typography variant="body2" sx={{ color: '#90caf9' }}>
            MVP v1.0 • Localhost
          </Typography>
        </Toolbar>
      </AppBar>

      <Container maxWidth="xl" sx={{ py: 3, flex: 1 }}>
        {/* Dashboard Stats */}
        <Grid container spacing={3} sx={{ mb: 4 }}>
          <Grid item xs={12} md={3}>
            <Card sx={{ bgcolor: '#e3f2fd' }}>
              <CardContent>
                <Typography color="text.secondary" gutterBottom>Total Users</Typography>
                <Typography variant="h4" fontWeight="bold">{dashboard.totalUsers || 0}</Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} md={3}>
            <Card sx={{ bgcolor: '#e8f5e9' }}>
              <CardContent>
                <Typography color="text.secondary" gutterBottom>Active Users</Typography>
                <Typography variant="h4" fontWeight="bold">{dashboard.activeUsers || 0}</Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} md={3}>
            <Card sx={{ bgcolor: '#fff3e0' }}>
              <CardContent>
                <Typography color="text.secondary" gutterBottom>Today's Orders</Typography>
                <Typography variant="h4" fontWeight="bold">{dashboard.todayOrders || 0}</Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} md={3}>
            <Card sx={{ bgcolor: '#fce4ec' }}>
              <CardContent>
                <Typography color="text.secondary" gutterBottom>Today's Profit</Typography>
                <Typography variant="h4" fontWeight="bold">₹{(dashboard.todayProfit || 0).toLocaleString()}</Typography>
              </CardContent>
            </Card>
          </Grid>
        </Grid>

        <Grid container spacing={3}>
          {/* Live Rates + Margin Controls */}
          <Grid item xs={12} md={5}>
            {/* Alice Blue Status Widget */}
            <Paper sx={{ p: 3, mb: 3, borderLeft: '5px solid', borderColor: liveRates?.alice_connected ? '#2e7d32' : '#d32f2f' }}>
              <Typography variant="h6" gutterBottom sx={{ fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                🔌 Alice Blue Live Feed
                <Chip 
                  label={liveRates?.alice_connected ? 'CONNECTED' : 'DISCONNECTED'} 
                  color={liveRates?.alice_connected ? 'success' : 'error'} 
                  size="small" 
                />
              </Typography>
              
              {liveRates?.alice_connected ? (
                <Box>
                  <Typography variant="body2" sx={{ mb: 1 }}>
                    <strong>Client ID:</strong> {liveRates.alice_client_id || 'Connected'}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Real-time MCX Gold/Silver feed is active.
                  </Typography>
                </Box>
              ) : (
                <Box>
                  <Typography variant="body2" sx={{ mb: 2, color: 'text.secondary' }}>
                    API session is not connected. Log in to start receiving live rates.
                  </Typography>
                  <Button 
                    variant="contained" 
                    color="secondary" 
                    fullWidth 
                    onClick={loginAliceBlue}
                  >
                    Login to Alice Blue
                  </Button>
                </Box>
              )}
            </Paper>

            <Paper sx={{ p: 3, mb: 3 }}>
              <Typography variant="h6" gutterBottom sx={{ fontWeight: 600 }}>
                📊 Live MCX Rates (Real-time)
              </Typography>
              
              {liveRates ? (
                <Box>
                  {/* Gold */}
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2, p: 2, bgcolor: '#fafafa', borderRadius: 2 }}>
                    <Box>
                      <Typography fontWeight="bold">GOLD</Typography>
                      <Typography variant="caption" color="text.secondary">MCX: ₹{liveRates.gold.mcx} (Token: {liveRates.gold_token})</Typography>
                    </Box>
                    <Box sx={{ textAlign: 'right' }}>
                      <Chip label={`BUY: ₹${liveRates.gold.buy}`} color="success" size="small" sx={{ mr: 1 }} />
                      <Chip label={`SELL: ₹${liveRates.gold.sell}`} color="error" size="small" />
                    </Box>
                  </Box>

                  {/* Silver */}
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2, p: 2, bgcolor: '#fafafa', borderRadius: 2 }}>
                    <Box>
                      <Typography fontWeight="bold">SILVER</Typography>
                      <Typography variant="caption" color="text.secondary">MCX: ₹{liveRates.silver.mcx} (Token: {liveRates.silver_token})</Typography>
                    </Box>
                    <Box sx={{ textAlign: 'right' }}>
                      <Chip label={`BUY: ₹${liveRates.silver.buy}`} color="success" size="small" sx={{ mr: 1 }} />
                      <Chip label={`SELL: ₹${liveRates.silver.sell}`} color="error" size="small" />
                    </Box>
                  </Box>

                  <Typography variant="caption" sx={{ display: 'block', mt: 1, color: 'text.secondary' }}>
                    Last updated: {new Date(liveRates.timestamp).toLocaleTimeString()}
                  </Typography>
                </Box>
              ) : (
                <Typography>Loading live rates...</Typography>
              )}
            </Paper>

            {/* Margin Override Panel */}
            <Paper sx={{ p: 3 }}>
              <Typography variant="h6" gutterBottom sx={{ fontWeight: 600 }}>
                ⚙️ Margin & Pricing Controls
              </Typography>
              
              <Grid container spacing={2}>
                <Grid item xs={6}>
                  <TextField 
                    label="Gold Margin" 
                    type="number" 
                    value={marginOverrides.gold_margin} 
                    onChange={(e) => handleMarginChange('gold_margin', e.target.value)}
                    fullWidth 
                    size="small"
                  />
                </Grid>
                <Grid item xs={6}>
                  <TextField 
                    label="Silver Margin" 
                    type="number" 
                    value={marginOverrides.silver_margin} 
                    onChange={(e) => handleMarginChange('silver_margin', e.target.value)}
                    fullWidth 
                    size="small"
                  />
                </Grid>
                <Grid item xs={4}>
                  <TextField 
                    label="Spread" 
                    type="number" 
                    value={marginOverrides.spread} 
                    onChange={(e) => handleMarginChange('spread', e.target.value)}
                    fullWidth size="small"
                  />
                </Grid>
                <Grid item xs={4}>
                  <TextField 
                    label="Premium" 
                    type="number" 
                    value={marginOverrides.premium} 
                    onChange={(e) => handleMarginChange('premium', e.target.value)}
                    fullWidth size="small"
                  />
                </Grid>
                <Grid item xs={4}>
                  <TextField 
                    label="GST %" 
                    type="number" 
                    value={marginOverrides.gst} 
                    onChange={(e) => handleMarginChange('gst', e.target.value)}
                    fullWidth size="small"
                  />
                </Grid>
                
                {/* Active MCX Token Configurations */}
                <Grid item xs={6}>
                  <TextField 
                    label="Gold MCX Token" 
                    value={marginOverrides.gold_token || ''} 
                    onChange={(e) => handleMarginChange('gold_token', e.target.value)}
                    fullWidth size="small"
                  />
                </Grid>
                <Grid item xs={6}>
                  <TextField 
                    label="Silver MCX Token" 
                    value={marginOverrides.silver_token || ''} 
                    onChange={(e) => handleMarginChange('silver_token', e.target.value)}
                    fullWidth size="small"
                  />
                </Grid>
              </Grid>

              <Button 
                variant="contained" 
                color="primary" 
                fullWidth 
                sx={{ mt: 2 }} 
                onClick={applyMarginOverrides}
              >
                Apply & Push Live Updates
              </Button>
              
              <Typography variant="caption" sx={{ mt: 1, display: 'block', color: 'text.secondary' }}>
                Example: MCX 98450 + Margin 250 + Spread 15 + Premium 50 + GST = Final Rate
              </Typography>
            </Paper>
          </Grid>

          {/* Orders Management */}
          <Grid item xs={12} md={7}>
            <Paper sx={{ p: 3 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Typography variant="h6" sx={{ fontWeight: 600 }}>
                  📋 Orders Management
                </Typography>
                
                <FormControl size="small" sx={{ minWidth: 140 }}>
                  <InputLabel>Status Filter</InputLabel>
                  <Select value={filterStatus} onChange={handleFilterChange} label="Status Filter">
                    <MenuItem value="">All</MenuItem>
                    <MenuItem value="PENDING">Pending</MenuItem>
                    <MenuItem value="ACCEPTED">Accepted</MenuItem>
                    <MenuItem value="COMPLETED">Completed</MenuItem>
                    <MenuItem value="CANCELLED">Cancelled</MenuItem>
                  </Select>
                </FormControl>
              </Box>

              <TableContainer sx={{ maxHeight: 480 }}>
                <Table stickyHeader size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>Order ID</TableCell>
                      <TableCell>Customer</TableCell>
                      <TableCell>Commodity</TableCell>
                      <TableCell>Action</TableCell>
                      <TableCell align="right">Qty</TableCell>
                      <TableCell align="right">Rate</TableCell>
                      <TableCell>Status</TableCell>
                      <TableCell align="center">Action</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {orders.length > 0 ? orders.map((order) => (
                      <TableRow key={order.id}>
                        <TableCell sx={{ fontFamily: 'monospace', fontSize: '0.75rem' }}>{order.id.slice(0,8)}</TableCell>
                        <TableCell>{order.userName || order.userMobile}</TableCell>
                        <TableCell>
                          <Chip 
                            label={order.commodity} 
                            size="small" 
                            color={order.commodity === 'GOLD' ? 'warning' : 'info'} 
                          />
                        </TableCell>
                        <TableCell>
                          <Chip 
                            label={order.buy_sell} 
                            size="small" 
                            color={order.buy_sell === 'BUY' ? 'success' : 'error'} 
                          />
                        </TableCell>
                        <TableCell align="right">{order.qty}</TableCell>
                        <TableCell align="right">₹{order.price}</TableCell>
                        <TableCell>
                          <Chip 
                            label={order.status} 
                            size="small" 
                            color={
                              order.status === 'PENDING' ? 'warning' : 
                              order.status === 'COMPLETED' ? 'success' : 'default'
                            } 
                          />
                        </TableCell>
                        <TableCell align="center">
                          {order.status === 'PENDING' && (
                            <>
                              <Button 
                                size="small" 
                                variant="outlined" 
                                color="success" 
                                onClick={() => updateOrderStatus(order.id, 'COMPLETED')}
                                sx={{ mr: 0.5 }}
                              >
                                Complete
                              </Button>
                              <Button 
                                size="small" 
                                variant="outlined" 
                                color="error" 
                                onClick={() => updateOrderStatus(order.id, 'CANCELLED')}
                              >
                                Cancel
                              </Button>
                            </>
                          )}
                          {order.status !== 'PENDING' && (
                            <Typography variant="caption" color="text.secondary">Done</Typography>
                          )}
                        </TableCell>
                      </TableRow>
                    )) : (
                      <TableRow>
                        <TableCell colSpan={8} align="center">No orders found</TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </TableContainer>
            </Paper>
          </Grid>
        </Grid>
      </Container>

      <Box sx={{ textAlign: 'center', py: 2, bgcolor: '#fff', borderTop: '1px solid #eee' }}>
        <Typography variant="caption" color="text.secondary">
          Bullion Live MVP • Alice Blue simulated feed • Socket.IO real-time • Localhost only
        </Typography>
      </Box>
    </Box>
  );
}

export default AdminPanel;