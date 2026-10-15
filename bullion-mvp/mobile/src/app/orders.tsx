import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, RefreshControl } from 'react-native';
import { useRouter } from 'expo-router';
import axios from 'axios';

const API_BASE = 'http://localhost:5000';

export default function OrdersScreen() {
  const [orders, setOrders] = useState([]);
  const [refreshing, setRefreshing] = useState(false);
  const router = useRouter();

  const fetchOrders = async () => {
    try {
      const res = await axios.get(`${API_BASE}/api/orders/history`, {
        headers: { Authorization: `Bearer ${global.userToken}` }
      });
      setOrders(res.data);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchOrders();
  }, []);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchOrders();
    setRefreshing(false);
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'PENDING': return '#f59e0b';
      case 'COMPLETED': return '#22c55e';
      case 'CANCELLED': return '#ef4444';
      default: return '#64748b';
    }
  };

  const renderOrder = ({ item }) => (
    <View style={styles.orderCard}>
      <View style={styles.orderHeader}>
        <View>
          <Text style={styles.orderId}>#{item.id.slice(0, 8)}</Text>
          <Text style={styles.orderDate}>{new Date(item.createdAt).toLocaleDateString()}</Text>
        </View>
        <View style={[styles.statusBadge, { backgroundColor: getStatusColor(item.status) + '22' }]}>
          <Text style={[styles.statusText, { color: getStatusColor(item.status) }]}>{item.status}</Text>
        </View>
      </View>

      <View style={styles.orderBody}>
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <Text style={styles.commodity}>{item.commodity}</Text>
          <Text style={[styles.action, { color: item.buy_sell === 'BUY' ? '#22c55e' : '#ef4444' }]}>
            {item.buy_sell}
          </Text>
        </View>
        
        <View style={styles.orderDetails}>
          <Text style={styles.detailText}>Qty: <Text style={{ fontWeight: '600' }}>{item.qty}</Text></Text>
          <Text style={styles.detailText}>Rate: <Text style={{ fontWeight: '600' }}>₹{item.price}</Text></Text>
        </View>
        
        <Text style={styles.total}>Total: ₹{(item.qty * item.price).toLocaleString()}</Text>
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      <FlatList
        data={orders}
        keyExtractor={(item) => item.id}
        renderItem={renderOrder}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        ListEmptyComponent={
          <View style={{ padding: 40, alignItems: 'center' }}>
            <Text style={{ color: '#64748b' }}>No orders yet</Text>
          </View>
        }
        contentContainerStyle={{ padding: 16 }}
      />

      <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
        <Text style={styles.backText}>← Back to Dashboard</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f172a' },
  orderCard: { backgroundColor: '#1e2937', borderRadius: 16, padding: 18, marginBottom: 12 },
  orderHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  orderId: { color: '#64748b', fontSize: 12, fontFamily: 'monospace' },
  orderDate: { color: '#94a3b8', fontSize: 13 },
  statusBadge: { paddingHorizontal: 12, paddingVertical: 4, borderRadius: 20 },
  statusText: { fontSize: 12, fontWeight: '700' },
  orderBody: { marginTop: 12 },
  commodity: { color: '#fff', fontSize: 18, fontWeight: '700' },
  action: { marginLeft: 10, fontSize: 16, fontWeight: '700' },
  orderDetails: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 10 },
  detailText: { color: '#94a3b8', fontSize: 14 },
  total: { color: '#fff', fontSize: 17, fontWeight: '700', marginTop: 12 },
  backBtn: { margin: 20, alignItems: 'center' },
  backText: { color: '#64748b', fontSize: 15 }
});