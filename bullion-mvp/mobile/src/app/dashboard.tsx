import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, RefreshControl } from 'react-native';
import { useRouter } from 'expo-router';
import { io } from 'socket.io-client';
import axios from 'axios';

const API_BASE = 'http://localhost:5000';
const socket = io(API_BASE);

export default function Dashboard() {
  const [rates, setRates] = useState(null);
  const [user, setUser] = useState(global.currentUser || { name: 'Demo User', balance: 250000 });
  const [refreshing, setRefreshing] = useState(false);
  const router = useRouter();

  useEffect(() => {
    fetchRates();
    
    // Real-time updates via Socket.IO
    socket.on('live_rates', (data) => {
      setRates(data);
    });

    return () => {
      socket.off('live_rates');
    };
  }, []);

  const fetchRates = async () => {
    try {
      const res = await axios.get(`${API_BASE}/api/rates/live`);
      setRates(res.data);
    } catch (err) {
      console.error(err);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchRates();
    setRefreshing(false);
  };

  const RateCard = ({ title, data, color }) => (
    <View style={[styles.rateCard, { borderLeftColor: color }]}>
      <Text style={styles.rateTitle}>{title}</Text>
      <View style={styles.rateRow}>
        <View>
          <Text style={styles.mcxLabel}>MCX</Text>
          <Text style={styles.mcxValue}>₹{data?.mcx}</Text>
        </View>
        <View style={{ alignItems: 'flex-end' }}>
          <Text style={[styles.rateLabel, { color: '#22c55e' }]}>BUY</Text>
          <Text style={[styles.rateValue, { color: '#22c55e' }]}>₹{data?.buy}</Text>
          <Text style={[styles.rateLabel, { color: '#ef4444', marginTop: 4 }]}>SELL</Text>
          <Text style={[styles.rateValue, { color: '#ef4444' }]}>₹{data?.sell}</Text>
        </View>
      </View>
    </View>
  );

  return (
    <ScrollView 
      style={styles.container} 
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
    >
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.welcome}>Welcome back,</Text>
          <Text style={styles.userName}>{user.name}</Text>
        </View>
        <View style={styles.balanceCard}>
          <Text style={styles.balanceLabel}>Available Balance</Text>
          <Text style={styles.balance}>₹{user.balance.toLocaleString()}</Text>
        </View>
      </View>

      {/* Live Rates */}
      <Text style={styles.sectionTitle}>📈 Live Rates</Text>
      
      {rates ? (
        <>
          <RateCard title="GOLD" data={rates.gold} color="#f59e0b" />
          <RateCard title="SILVER" data={rates.silver} color="#64748b" />
          
          <View style={styles.usdCard}>
            <Text style={styles.usdLabel}>USD/INR</Text>
            <Text style={styles.usdValue}>₹{rates.usd_inr}</Text>
          </View>
        </>
      ) : (
        <Text style={styles.loading}>Connecting to live feed...</Text>
      )}

      {/* Quick Actions */}
      <Text style={styles.sectionTitle}>Quick Actions</Text>
      <View style={styles.actions}>
        <TouchableOpacity 
          style={[styles.actionBtn, { backgroundColor: '#22c55e' }]} 
          onPress={() => router.push('/buy')}
        >
          <Text style={styles.actionText}>BUY</Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={[styles.actionBtn, { backgroundColor: '#ef4444' }]} 
          onPress={() => router.push('/sell')}
        >
          <Text style={styles.actionText}>SELL</Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={[styles.actionBtn, { backgroundColor: '#3b82f6' }]} 
          onPress={() => router.push('/orders')}
        >
          <Text style={styles.actionText}>ORDERS</Text>
        </TouchableOpacity>
      </View>

      {/* Status Footer */}
      <View style={styles.footer}>
        <Text style={styles.status}>🟢 Connected to Alice Blue (simulated)</Text>
        <Text style={styles.timestamp}>Last updated: {rates ? new Date(rates.timestamp).toLocaleTimeString() : '...'}</Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f172a', padding: 16 },
  header: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 24, alignItems: 'flex-end' },
  welcome: { color: '#94a3b8', fontSize: 14 },
  userName: { color: '#fff', fontSize: 22, fontWeight: '700' },
  balanceCard: { backgroundColor: '#1e2937', padding: 12, borderRadius: 12, alignItems: 'flex-end' },
  balanceLabel: { color: '#64748b', fontSize: 12 },
  balance: { color: '#22c55e', fontSize: 18, fontWeight: '700' },
  
  sectionTitle: { color: '#fff', fontSize: 18, fontWeight: '700', marginBottom: 12, marginTop: 16 },
  
  rateCard: { 
    backgroundColor: '#1e2937', 
    borderRadius: 16, 
    padding: 18, 
    marginBottom: 12,
    borderLeftWidth: 5 
  },
  rateTitle: { color: '#fff', fontSize: 16, fontWeight: '700', marginBottom: 12 },
  rateRow: { flexDirection: 'row', justifyContent: 'space-between' },
  mcxLabel: { color: '#64748b', fontSize: 12 },
  mcxValue: { color: '#94a3b8', fontSize: 20, fontWeight: '600' },
  rateLabel: { fontSize: 12, fontWeight: '600' },
  rateValue: { fontSize: 18, fontWeight: '700' },
  
  usdCard: { 
    backgroundColor: '#1e2937', 
    padding: 18, 
    borderRadius: 16, 
    flexDirection: 'row', 
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20 
  },
  usdLabel: { color: '#64748b', fontSize: 14 },
  usdValue: { color: '#fff', fontSize: 22, fontWeight: '700' },
  
  actions: { flexDirection: 'row', gap: 12, marginTop: 8 },
  actionBtn: { flex: 1, paddingVertical: 18, borderRadius: 14, alignItems: 'center' },
  actionText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  
  loading: { color: '#64748b', textAlign: 'center', marginVertical: 40 },
  
  footer: { marginTop: 30, alignItems: 'center' },
  status: { color: '#22c55e', fontSize: 13 },
  timestamp: { color: '#64748b', fontSize: 11, marginTop: 4 }
});