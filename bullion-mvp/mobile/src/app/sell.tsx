import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, Alert, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import axios from 'axios';

const API_BASE = 'http://localhost:5000';

export default function SellScreen() {
  const [rates, setRates] = useState(null);
  const [commodity, setCommodity] = useState('GOLD');
  const [qty, setQty] = useState('10');
  const [price, setPrice] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  useEffect(() => {
    fetchRates();
  }, []);

  const fetchRates = async () => {
    try {
      const res = await axios.get(`${API_BASE}/api/rates/live`);
      setRates(res.data);
      updatePrice(res.data, commodity);
    } catch (err) {
      console.error(err);
    }
  };

  const updatePrice = (data, comm) => {
    if (!data) return;
    const rateData = comm === 'GOLD' ? data.gold : data.silver;
    setPrice(rateData.sell.toString());
  };

  const handleCommodityChange = (newComm) => {
    setCommodity(newComm);
    if (rates) updatePrice(rates, newComm);
  };

  const placeSellOrder = async () => {
    if (!qty || !price) {
      Alert.alert('Error', 'Please enter quantity and price');
      return;
    }

    setLoading(true);
    try {
      await axios.post(`${API_BASE}/api/orders/sell`, {
        commodity,
        qty: parseFloat(qty),
        price: parseFloat(price)
      }, {
        headers: { Authorization: `Bearer ${global.userToken}` }
      });
      
      Alert.alert('Success', `Sell order placed for ${qty} ${commodity} @ ₹${price}`, [
        { text: 'OK', onPress: () => router.back() }
      ]);
    } catch (err) {
      Alert.alert('Error', err.response?.data?.error || 'Order placement failed');
    }
    setLoading(false);
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.card}>
        <Text style={styles.title}>Place SELL Order</Text>

        <Text style={styles.label}>Commodity</Text>
        <View style={styles.commodityRow}>
          <TouchableOpacity 
            style={[styles.commBtn, commodity === 'GOLD' && styles.commBtnActive]} 
            onPress={() => handleCommodityChange('GOLD')}
          >
            <Text style={[styles.commText, commodity === 'GOLD' && styles.commTextActive]}>GOLD</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.commBtn, commodity === 'SILVER' && styles.commBtnActive]} 
            onPress={() => handleCommodityChange('SILVER')}
          >
            <Text style={[styles.commText, commodity === 'SILVER' && styles.commTextActive]}>SILVER</Text>
          </TouchableOpacity>
        </View>

        {rates && (
          <View style={styles.rateInfo}>
            <Text style={styles.rateInfoText}>
              Current {commodity} SELL Rate: <Text style={{ fontWeight: '700' }}>₹{(commodity === 'GOLD' ? rates.gold.sell : rates.silver.sell)}</Text>
            </Text>
          </View>
        )}

        <Text style={styles.label}>Quantity (grams)</Text>
        <TextInput
          style={styles.input}
          value={qty}
          onChangeText={setQty}
          keyboardType="numeric"
          placeholder="10"
        />

        <Text style={styles.label}>Rate (Auto-filled)</Text>
        <TextInput
          style={styles.input}
          value={price}
          onChangeText={setPrice}
          keyboardType="numeric"
          placeholder="98600"
        />

        {qty && price && (
          <View style={styles.summary}>
            <Text style={styles.summaryText}>Total Value</Text>
            <Text style={styles.summaryValue}>₹{(parseFloat(qty) * parseFloat(price)).toLocaleString()}</Text>
          </View>
        )}

        <TouchableOpacity 
          style={[styles.sellBtn, loading && { opacity: 0.6 }]} 
          onPress={placeSellOrder} 
          disabled={loading}
        >
          <Text style={styles.sellBtnText}>{loading ? 'PLACING ORDER...' : 'CONFIRM SELL'}</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.cancelBtn} onPress={() => router.back()}>
          <Text style={styles.cancelText}>Cancel</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f172a', padding: 16 },
  card: { backgroundColor: '#1e2937', borderRadius: 20, padding: 24, marginTop: 20 },
  title: { color: '#fff', fontSize: 22, fontWeight: '700', textAlign: 'center', marginBottom: 24 },
  label: { color: '#94a3b8', marginBottom: 8, fontSize: 14, marginTop: 12 },
  input: { backgroundColor: '#334155', color: '#fff', padding: 16, borderRadius: 12, fontSize: 18 },
  commodityRow: { flexDirection: 'row', gap: 12, marginTop: 8 },
  commBtn: { flex: 1, padding: 14, backgroundColor: '#334155', borderRadius: 12, alignItems: 'center' },
  commBtnActive: { backgroundColor: '#3b82f6' },
  commText: { color: '#94a3b8', fontWeight: '600' },
  commTextActive: { color: '#fff' },
  rateInfo: { backgroundColor: '#0f172a', padding: 12, borderRadius: 10, marginVertical: 16 },
  rateInfoText: { color: '#64748b' },
  summary: { backgroundColor: '#0f172a', padding: 16, borderRadius: 12, marginVertical: 20, alignItems: 'center' },
  summaryText: { color: '#64748b', fontSize: 13 },
  summaryValue: { color: '#ef4444', fontSize: 26, fontWeight: '800', marginTop: 4 },
  sellBtn: { backgroundColor: '#ef4444', paddingVertical: 18, borderRadius: 14, alignItems: 'center', marginTop: 10 },
  sellBtnText: { color: '#fff', fontSize: 17, fontWeight: '700' },
  cancelBtn: { marginTop: 16, alignItems: 'center' },
  cancelText: { color: '#64748b' }
});