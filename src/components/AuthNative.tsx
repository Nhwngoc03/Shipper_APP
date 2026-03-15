import React, { useState } from 'react';
import { 
  View, 
  Text, 
  TouchableOpacity, 
  ScrollView,
  StyleSheet
} from 'react-native';
import { 
  Phone
} from 'lucide-react-native';
import LoginNative from './LoginNative';
import RegisterNative from './RegisterNative';

interface AuthNativeProps {
  onLogin: () => void;
}

export default function AuthNative({ onLogin }: AuthNativeProps) {
  const [isLogin, setIsLogin] = useState(true);

  return (
    <ScrollView style={styles.container}>
      {/* Logo */}
      <View style={styles.logoContainer}>
        <View style={styles.logoBg}>
          <Phone size={32} color="white" />
        </View>
        <Text style={styles.appName}>Shipper Pro</Text>
        <Text style={styles.appSubtitle}>Hệ thống đối tác tài xế</Text>
      </View>

      {/* Tabs */}
      <View style={styles.tabContainer}>
        <TouchableOpacity 
          style={[styles.tab, isLogin && styles.tabActive]}
          onPress={() => setIsLogin(true)}
        >
          <Text style={[styles.tabText, isLogin && styles.tabTextActive]}>Đăng nhập</Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={[styles.tab, !isLogin && styles.tabActive]}
          onPress={() => setIsLogin(false)}
        >
          <Text style={[styles.tabText, !isLogin && styles.tabTextActive]}>Đăng ký</Text>
        </TouchableOpacity>
      </View>

      {/* Forms */}
      {isLogin ? (
        <LoginNative onLogin={onLogin} />
      ) : (
        <RegisterNative onRegister={onLogin} />
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'white',
  },
  logoContainer: {
    alignItems: 'center',
    marginTop: 60,
    marginBottom: 40,
  },
  logoBg: {
    width: 64,
    height: 64,
    backgroundColor: '#10b981',
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 5,
  },
  appName: {
    fontSize: 28,
    fontWeight: '900',
    color: '#0f172a',
    marginBottom: 4,
  },
  appSubtitle: {
    fontSize: 14,
    fontWeight: '500',
    color: '#64748b',
  },
  tabContainer: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
    marginHorizontal: 20,
  },
  tab: {
    flex: 1,
    paddingVertical: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  tabActive: {
    borderBottomWidth: 3,
    borderBottomColor: '#10b981',
  },
  tabText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#94a3b8',
  },
  tabTextActive: {
    color: '#10b981',
  },
});
