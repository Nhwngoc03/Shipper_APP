import React, { useState, useEffect } from 'react';
import {
  View, Text, TouchableOpacity, ScrollView, StyleSheet,
  ActivityIndicator, TextInput, Modal, Alert, RefreshControl
} from 'react-native';
import {
  Wallet, ArrowDownLeft, ArrowUpRight, TrendingUp,
  CheckCircle, XCircle, Clock, RefreshCw, CreditCard
} from 'lucide-react-native';
import { walletService, ShipperWalletResponse, ShipperWithdrawResponse } from '../services';

export default function WalletNative() {
  const [wallet, setWallet] = useState<ShipperWalletResponse | null>(null);
  const [history, setHistory] = useState<ShipperWithdrawResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showWithdraw, setShowWithdraw] = useState(false);
  const [withdrawing, setWithdrawing] = useState(false);
  const [form, setForm] = useState({
    amount: '', reason: '',
    bankName: '', bankAccountNumber: '', bankAccountHolder: '',
  });
  const [error, setError] = useState('');

  const load = async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    try {
      const [walletRes, historyRes] = await Promise.all([
        walletService.getMyWallet(),
        walletService.getMyWithdrawRequests(),
      ]);
      setWallet(walletRes.result || null);
      setHistory(historyRes.result || []);
    } catch {
      // giữ nguyên nếu lỗi
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => { load(); }, []);

  const handleWithdraw = async () => {
    const amount = parseFloat(form.amount);
    if (!form.amount || isNaN(amount) || amount <= 0) {
      setError('Vui lòng nhập số tiền hợp lệ'); return;
    }
    if (wallet && amount > wallet.frozenBalance) {
      setError('Số tiền vượt quá số dư khả dụng'); return;
    }
    if (!form.bankName || !form.bankAccountNumber || !form.bankAccountHolder) {
      setError('Vui lòng điền đầy đủ thông tin ngân hàng'); return;
    }
    setError('');
    setWithdrawing(true);
    try {
      await walletService.createWithdrawRequest({
        amount,
        reason: form.reason,
        bankName: form.bankName,
        bankAccountNumber: form.bankAccountNumber,
        bankAccountHolder: form.bankAccountHolder,
      });
      setShowWithdraw(false);
      setForm({ amount: '', reason: '', bankName: '', bankAccountNumber: '', bankAccountHolder: '' });
      load(true);
    } catch (e: any) {
      setError(e?.data?.message || 'Không thể tạo yêu cầu rút tiền');
    } finally {
      setWithdrawing(false);
    }
  };

  const statusColor = (s: string) => {
    if (s === 'SUCCESS') return '#10b981';
    if (s === 'REJECTED') return '#ef4444';
    return '#f59e0b';
  };

  const statusLabel = (s: string) => {
    if (s === 'SUCCESS') return 'Thành công';
    if (s === 'REJECTED') return 'Từ chối';
    return 'Đang xử lý';
  };

  const StatusIcon = ({ status }: { status: string }) => {
    if (status === 'SUCCESS') return <CheckCircle size={14} color="#10b981" />;
    if (status === 'REJECTED') return <XCircle size={14} color="#ef4444" />;
    return <Clock size={14} color="#f59e0b" />;
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#10b981" />
        <Text style={styles.loadingText}>Đang tải ví...</Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      showsVerticalScrollIndicator={false}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => load(true)} tintColor="#10b981" />}
    >
      {/* Wallet Card */}
      <View style={styles.walletCard}>
        <View style={styles.walletCardTop}>
          <View style={styles.walletIconBox}>
            <Wallet size={24} color="white" />
          </View>
          <View>
            <Text style={styles.walletLabel}>Số dư khả dụng</Text>
            <Text style={styles.walletBalance}>
              {(wallet?.frozenBalance ?? 0).toLocaleString('vi-VN')}đ
            </Text>
          </View>
        </View>

        <View style={styles.walletStats}>
          <View style={styles.walletStatItem}>
            <TrendingUp size={14} color="#d1fae5" />
            <Text style={styles.walletStatLabel}>Tổng thu nhập</Text>
            <Text style={styles.walletStatValue}>
              {(wallet?.totalRevenueAllTime ?? 0).toLocaleString('vi-VN')}đ
            </Text>
          </View>
          <View style={styles.walletDivider} />
          <View style={styles.walletStatItem}>
            <ArrowUpRight size={14} color="#d1fae5" />
            <Text style={styles.walletStatLabel}>Đã rút</Text>
            <Text style={styles.walletStatValue}>
              {(wallet?.totalWithdrawn ?? 0).toLocaleString('vi-VN')}đ
            </Text>
          </View>
          <View style={styles.walletDivider} />
          <View style={styles.walletStatItem}>
            <Clock size={14} color="#d1fae5" />
            <Text style={styles.walletStatLabel}>Đang xử lý</Text>
            <Text style={styles.walletStatValue}>
              {(wallet?.frozenBalance ?? 0).toLocaleString('vi-VN')}đ
            </Text>
          </View>
        </View>
      </View>

      {/* Withdraw Button */}
      <TouchableOpacity style={styles.withdrawBtn} onPress={() => setShowWithdraw(true)}>
        <ArrowDownLeft size={20} color="white" />
        <Text style={styles.withdrawBtnText}>Rút tiền về ngân hàng</Text>
      </TouchableOpacity>

      {/* History */}
      <Text style={styles.sectionTitle}>Lịch sử rút tiền</Text>

      {history.length === 0 ? (
        <View style={styles.emptyBox}>
          <CreditCard size={40} color="#cbd5e1" />
          <Text style={styles.emptyText}>Chưa có yêu cầu rút tiền nào</Text>
        </View>
      ) : (
        <View style={styles.historyList}>
          {history.map(item => (
            <View key={item.id} style={styles.historyItem}>
              <View style={[styles.historyIconBox, { backgroundColor: statusColor(item.status) + '20' }]}>
                <StatusIcon status={item.status} />
              </View>
              <View style={styles.historyInfo}>
                <Text style={styles.historyTitle}>
                  Rút {item.amount.toLocaleString('vi-VN')}đ
                </Text>
                <Text style={styles.historyBank}>
                  {item.bankName} • {item.bankAccountNumber}
                </Text>
                {item.reason ? <Text style={styles.historyReason}>{item.reason}</Text> : null}
                {item.adminNote ? (
                  <Text style={styles.historyNote}>Ghi chú: {item.adminNote}</Text>
                ) : null}
              </View>
              <View style={styles.historyRight}>
                <Text style={[styles.historyStatus, { color: statusColor(item.status) }]}>
                  {statusLabel(item.status)}
                </Text>
                <Text style={styles.historyReceive}>
                  Nhận: {item.receiveAmount.toLocaleString('vi-VN')}đ
                </Text>
              </View>
            </View>
          ))}
        </View>
      )}

      <View style={{ height: 40 }} />

      {/* Withdraw Modal */}
      <Modal visible={showWithdraw} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalBox}>
            <Text style={styles.modalTitle}>Yêu cầu rút tiền</Text>

            <Text style={styles.modalBalance}>
              Số dư: {(wallet?.frozenBalance ?? 0).toLocaleString('vi-VN')}đ
            </Text>

            {[
              { key: 'amount', label: 'Số tiền (đ) *', placeholder: '100000', keyboard: 'numeric' as any },
              { key: 'bankName', label: 'Tên ngân hàng *', placeholder: 'Vietcombank' },
              { key: 'bankAccountNumber', label: 'Số tài khoản *', placeholder: '1234567890', keyboard: 'numeric' as any },
              { key: 'bankAccountHolder', label: 'Chủ tài khoản *', placeholder: 'NGUYEN VAN A' },
              { key: 'reason', label: 'Lý do (tuỳ chọn)', placeholder: 'Rút tiền cuối tuần' },
            ].map(f => (
              <View key={f.key} style={styles.modalField}>
                <Text style={styles.modalLabel}>{f.label}</Text>
                <TextInput
                  style={styles.modalInput}
                  placeholder={f.placeholder}
                  value={form[f.key as keyof typeof form]}
                  onChangeText={v => setForm(prev => ({ ...prev, [f.key]: v }))}
                  keyboardType={f.keyboard || 'default'}
                  placeholderTextColor="#cbd5e1"
                />
              </View>
            ))}

            {error ? <Text style={styles.modalError}>{error}</Text> : null}

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.modalCancel}
                onPress={() => { setShowWithdraw(false); setError(''); }}
              >
                <Text style={styles.modalCancelText}>Huỷ</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalConfirm, withdrawing && styles.btnDisabled]}
                onPress={handleWithdraw}
                disabled={withdrawing}
              >
                {withdrawing
                  ? <ActivityIndicator size="small" color="white" />
                  : <Text style={styles.modalConfirmText}>Xác nhận rút</Text>
                }
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 40 },
  loadingText: { marginTop: 12, fontSize: 14, color: '#64748b', fontWeight: '600' },
  walletCard: {
    margin: 20, borderRadius: 24, padding: 24,
    backgroundColor: '#10b981',
    shadowColor: '#10b981', shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3, shadowRadius: 16, elevation: 8,
  },
  walletCardTop: { flexDirection: 'row', alignItems: 'center', gap: 16, marginBottom: 24 },
  walletIconBox: {
    width: 52, height: 52, borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center', alignItems: 'center',
  },
  walletLabel: { fontSize: 12, fontWeight: '700', color: 'rgba(255,255,255,0.8)', marginBottom: 4 },
  walletBalance: { fontSize: 28, fontWeight: '900', color: 'white' },
  walletStats: {
    flexDirection: 'row', borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.2)', paddingTop: 16,
  },
  walletStatItem: { flex: 1, alignItems: 'center', gap: 4 },
  walletStatLabel: { fontSize: 10, fontWeight: '600', color: 'rgba(255,255,255,0.7)' },
  walletStatValue: { fontSize: 13, fontWeight: '800', color: 'white' },
  walletDivider: { width: 1, backgroundColor: 'rgba(255,255,255,0.2)' },
  withdrawBtn: {
    marginHorizontal: 20, marginBottom: 24, backgroundColor: '#0f172a',
    borderRadius: 16, paddingVertical: 16,
    flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 10,
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15, shadowRadius: 12, elevation: 5,
  },
  withdrawBtnText: { color: 'white', fontSize: 16, fontWeight: '700' },
  sectionTitle: { fontSize: 16, fontWeight: '800', color: '#0f172a', marginHorizontal: 20, marginBottom: 12 },
  emptyBox: { alignItems: 'center', paddingVertical: 40 },
  emptyText: { fontSize: 14, fontWeight: '600', color: '#94a3b8', marginTop: 12 },
  historyList: { paddingHorizontal: 20, gap: 10 },
  historyItem: {
    backgroundColor: 'white', borderRadius: 16, padding: 14,
    flexDirection: 'row', alignItems: 'flex-start', gap: 12,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05, shadowRadius: 8, elevation: 2,
  },
  historyIconBox: {
    width: 36, height: 36, borderRadius: 10,
    justifyContent: 'center', alignItems: 'center',
  },
  historyInfo: { flex: 1 },
  historyTitle: { fontSize: 14, fontWeight: '700', color: '#0f172a', marginBottom: 2 },
  historyBank: { fontSize: 12, fontWeight: '500', color: '#64748b', marginBottom: 2 },
  historyReason: { fontSize: 11, color: '#94a3b8' },
  historyNote: { fontSize: 11, color: '#ef4444', marginTop: 2 },
  historyRight: { alignItems: 'flex-end', gap: 4 },
  historyStatus: { fontSize: 12, fontWeight: '700' },
  historyReceive: { fontSize: 11, fontWeight: '600', color: '#64748b' },
  // Modal
  modalOverlay: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalBox: {
    backgroundColor: 'white', borderTopLeftRadius: 28, borderTopRightRadius: 28,
    padding: 24, paddingBottom: 40,
  },
  modalTitle: { fontSize: 20, fontWeight: '900', color: '#0f172a', marginBottom: 4 },
  modalBalance: { fontSize: 13, fontWeight: '600', color: '#10b981', marginBottom: 20 },
  modalField: { marginBottom: 14 },
  modalLabel: { fontSize: 11, fontWeight: '700', color: '#64748b', marginBottom: 6, textTransform: 'uppercase' },
  modalInput: {
    backgroundColor: '#f1f5f9', borderRadius: 12, paddingHorizontal: 14,
    paddingVertical: 12, fontSize: 14, fontWeight: '600', color: '#0f172a',
    borderWidth: 1, borderColor: '#e2e8f0',
  },
  modalError: { color: '#ef4444', fontSize: 13, fontWeight: '600', marginBottom: 12, textAlign: 'center' },
  modalActions: { flexDirection: 'row', gap: 12, marginTop: 8 },
  modalCancel: {
    flex: 1, backgroundColor: '#f1f5f9', borderRadius: 14,
    paddingVertical: 14, alignItems: 'center',
  },
  modalCancelText: { fontSize: 15, fontWeight: '700', color: '#64748b' },
  modalConfirm: {
    flex: 2, backgroundColor: '#10b981', borderRadius: 14,
    paddingVertical: 14, alignItems: 'center',
  },
  modalConfirmText: { fontSize: 15, fontWeight: '700', color: 'white' },
  btnDisabled: { opacity: 0.6 },
});
