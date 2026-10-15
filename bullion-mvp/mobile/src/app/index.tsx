import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, KeyboardAvoidingView, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import axios from 'axios';

const API_BASE = 'http://localhost:5000';

export default function LoginScreen() {
  const [mobile, setMobile] = useState('9876543210');
  const [otp, setOtp] = useState('');
  const [showOtp, setShowOtp] = useState(false);
  const [loading, setLoading] = useState(false);
  const [pinLogin, setPinLogin] = useState(false);
  const [pin, setPin] = useState('');
  const router = useRouter();

  const sendOtp = async () => {
    if (!mobile || mobile.length < 10) {
      Alert.alert('Error', 'Please enter a valid mobile number');
      return;
    }
    
    setLoading(true);
    try {
      const res = await axios.post(`${API_BASE}/api/auth/login`, { mobile });
      Alert.alert('OTP Sent', `Demo OTP: ${res.data.otp || '123456'}`);
      setShowOtp(true);
    } catch (err) {
      Alert.alert('Error', 'Failed to send OTP');
    }
    setLoading(false);
  };

  const verifyOtp = async () => {
    if (!otp) {
      Alert.alert('Error', 'Please enter OTP');
      return;
    }
    
    setLoading(true);
    try {
      const res = await axios.post(`${API_BASE}/api/auth/verify-otp`, { mobile, otp });
      
      // Store user & token
      global.userToken = res.data.token;
      global.currentUser = res.data.user;
      
      router.replace('/dashboard');
    } catch (err) {
      Alert.alert('Error', err.response?.data?.error || 'Invalid OTP');
    }
    setLoading(false);
  };

  const handlePinLogin = async () => {
    if (!mobile || !pin) {
      Alert.alert('Error', 'Enter mobile and PIN');
      return;
    }
    
    setLoading(true);
    try {
      const res = await axios.post(`${API_BASE}/api/auth/pin-login`, { mobile, pin });
      
      global.userToken = res.data.token;
      global.currentUser = res.data.user;
      
      router.replace('/dashboard');
    } catch (err) {
      Alert.alert('Error', 'Invalid PIN or Mobile');
    }
    setLoading(false);
  };

  return (
    <KeyboardAvoidingView 
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'} 
      style={styles.container}
    >
      <View style={styles.inner}>
        <Text style={styles.logo}>🏆 BULLION LIVE</Text>
        <Text style={styles.subtitle}>MCX Gold & Silver Trading</Text>

        <View style={styles.card}>
          <Text style={styles.label}>Mobile Number</Text>
          <TextInput
            style={styles.input}
            placeholder="9876543210"
            value={mobile}
            onChangeText={setMobile}
            keyboardType="phone-pad"
            maxLength={10}
          />

          {!pinLogin && !showOtp && (
            <TouchableOpacity style={styles.primaryBtn} onPress={sendOtp} disabled={loading}>
              <Text style={styles.btnText}>{loading ? 'Sending...' : 'Send OTP'}</Text>
            </TouchableOpacity>
          )}

          {showOtp && !pinLogin && (
            <>
              <Text style={styles.label}>Enter OTP (Demo: 123456)</Text>
              <TextInput
                style={styles.input}
                placeholder="123456"
                value={otp}
                onChangeText={setOtp}
                keyboardType="numeric"
                maxLength={6}
              />
              <TouchableOpacity style={styles.primaryBtn} onPress={verifyOtp} disabled={loading}>
                <Text style={styles.btnText}>{loading ? 'Verifying...' : 'Verify & Login'}</Text>
              </TouchableOpacity>
            </>
          )}

          <View style={{ marginVertical: 15, flexDirection: 'row', alignItems: 'center' }}>
            <View style={{ flex: 1, height: 1, backgroundColor: '#ddd' }} />
            <Text style={{ marginHorizontal: 10, color: '#666' }}>OR</Text>
            <View style={{ flex: 1, height: 1, backgroundColor: '#ddd' }} />
          </View>

          <TouchableOpacity 
            style={styles.secondaryBtn} 
            onPress={() => {
              setPinLogin(!pinLogin);
              setShowOtp(false);
            }}
          >
            <Text style={styles.secondaryBtnText}>
              {pinLogin ? 'Use OTP Login' : 'Login with PIN'}
            </Text>
          </TouchableOpacity>

          {pinLogin && (
            <>
              <Text style={styles.label}>4-Digit PIN</Text>
              <TextInput
                style={styles.input}
                placeholder="1234"
                value={pin}
                onChangeText={setPin}
                keyboardType="numeric"
                secureTextEntry
                maxLength={4}
              />
              <TouchableOpacity style={styles.primaryBtn} onPress={handlePinLogin} disabled={loading}>
                <Text style={styles.btnText}>{loading ? 'Logging in...' : 'Login with PIN'}</Text>
              </TouchableOpacity>
            </>
          )}
        </View>

        <Text style={styles.footer}>MVP Demo • Localhost</Text>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f172a' },
  inner: { flex: 1, justifyContent: 'center', padding: 24 },
  logo: { fontSize: 32, fontWeight: '800', color: '#fff', textAlign: 'center', marginBottom: 8 },
  subtitle: { fontSize: 16, color: '#94a3b8', textAlign: 'center', marginBottom: 40 },
  card: { backgroundColor: '#1e2937', padding: 24, borderRadius: 16 },
  label: { color: '#94a3b8', marginBottom: 6, fontSize: 13 },
  input: { 
    backgroundColor: '#334155', 
    color: '#fff', 
    padding: 14, 
    borderRadius: 10, 
    fontSize: 16, 
    marginBottom: 16 
  },
  primaryBtn: { 
    backgroundColor: '#3b82f6', 
    padding: 15, 
    borderRadius: 12, 
    alignItems: 'center' 
  },
  btnText: { color: '#fff', fontWeight: '700', fontSize: 16 },
  secondaryBtn: { 
    borderWidth: 1, 
    borderColor: '#64748b', 
    padding: 14, 
    borderRadius: 12, 
    alignItems: 'center' 
  },
  secondaryBtnText: { color: '#64748b', fontWeight: '600' },
  footer: { textAlign: 'center', marginTop: 40, color: '#64748b', fontSize: 12 }
});