import React, { useState, useMemo } from 'react';
import { 
  View, 
  Text, 
  TouchableOpacity, 
  ScrollView, 
  StyleSheet, 
  TextInput,
  FlatList
} from 'react-native';
import { 
  ArrowUpRight, 
  ArrowDownLeft, 
  TrendingUp,
  Search,
  X,
  Filter
} from 'lucide-react-native';

const transactions = [
  { id: 1, title: 'Đơn hàng #VN8829310', amount: 45000, time: 'Hôm nay, 10:45', type: 'income' },
  { id: 2, title: 'Đơn hàng #VN8829305', amount: 32000, time: 'Hôm nay, 09:15', type: 'income' },
  { id: 3, title: 'Rút tiền về ngân hàng', amount: -500000, time: 'Hôm qua, 18:30', type: 'withdraw' },
  { id: 4, title: 'Đơn hàng #VN8829290', amount: 55000, time: 'Hôm qua, 16:20', type: 'income' },
  { id: 5, title: 'Thưởng hoàn thành ngày', amount: 100000, time: 'Hôm qua, 22:00', type: 'bonus' },
];

export default function IncomeNative() {
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState('all');

  const filteredTransactions = useMemo(() => {
    return transactions.filter(tx => {
      const matchesSearch = tx.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
                           tx.time.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesType = filterType === 'all' || tx.type === filterType;
      return matchesSearch && matchesType;
    });
  }, [searchQuery, filterType]);

  const totalIncome = transactions
    .filter(tx => tx.type === 'income' || tx.type === 'bonus')
    .reduce((sum, tx) => sum + tx.amount, 0);

  const getTypeColor = (type: string) => {
    switch(type) {
      case 'withdraw': return '#ef4444';
      case 'bonus': return '#f59e0b';
      case 'income': return '#10b981';
      default: return '#6b7280';
    }
  };

  const getTypeBgColor = (type: string) => {
    switch(type) {
      case 'withdraw': return '#fee2e2';
      case 'bonus': return '#fef3c7';
      case 'income': return '#d1fae5';
      default: return '#f3f4f6';
    }
  };

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.headerLabel}>Tổng thu nhập tuần này</Text>
          <Text style={styles.headerAmount}>{totalIncome.toLocaleString()}đ</Text>
        </View>
        <View style={styles.headerIcon}>
          <TrendingUp size={24} color="#10b981" />
        </View>
      </View>

      {/* Action Buttons */}
      <View style={styles.buttonContainer}>
        <TouchableOpacity style={styles.primaryButton}>
          <ArrowDownLeft size={20} color="white" />
          <Text style={styles.primaryButtonText}>Rút tiền</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.secondaryButton}>
          <TrendingUp size={20} color="white" />
          <Text style={styles.secondaryButtonText}>Ví tiền</Text>
        </TouchableOpacity>
      </View>

      {/* Stats */}
      <View style={styles.statsContainer}>
        <View style={styles.statBox}>
          <Text style={styles.statLabel}>Đơn hàng</Text>
          <Text style={styles.statValue}>84</Text>
          <Text style={styles.statChange}>+12% so với tuần trước</Text>
        </View>
        <View style={styles.statBox}>
          <Text style={styles.statLabel}>Đánh giá</Text>
          <Text style={styles.statValue}>4.95</Text>
          <Text style={styles.statChange}>Rất tốt</Text>
        </View>
      </View>

      {/* Search and Filter */}
      <View style={styles.searchContainer}>
        <View style={styles.searchBox}>
          <Search size={18} color="#94a3b8" />
          <TextInput 
            style={styles.searchInput}
            placeholder="Tìm kiếm giao dịch..."
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholderTextColor="#cbd5e1"
          />
          {searchQuery ? (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <X size={18} color="#cbd5e1" />
            </TouchableOpacity>
          ) : null}
        </View>

        {/* Filter Buttons */}
        <View style={styles.filterContainer}>
          {['all', 'income', 'withdraw', 'bonus'].map((type) => (
            <TouchableOpacity
              key={type}
              style={[
                styles.filterButton,
                filterType === type && styles.filterButtonActive
              ]}
              onPress={() => setFilterType(type)}
            >
              <Text style={[
                styles.filterButtonText,
                filterType === type && styles.filterButtonTextActive
              ]}>
                {type === 'all' ? 'Tất cả' : 
                 type === 'income' ? 'Thu nhập' : 
                 type === 'withdraw' ? 'Rút tiền' : 'Thưởng'}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Transactions List */}
      <View style={styles.transactionsContainer}>
        <Text style={styles.transactionsTitle}>Lịch sử giao dịch</Text>
        
        {filteredTransactions.length > 0 ? (
          <View style={styles.transactionsList}>
            {filteredTransactions.map((tx) => (
              <View key={tx.id} style={styles.transactionItem}>
                <View style={[
                  styles.transactionIcon,
                  { backgroundColor: getTypeBgColor(tx.type) }
                ]}>
                  {tx.type === 'withdraw' ? (
                    <ArrowUpRight size={20} color={getTypeColor(tx.type)} />
                  ) : (
                    <ArrowDownLeft size={20} color={getTypeColor(tx.type)} />
                  )}
                </View>
                
                <View style={styles.transactionInfo}>
                  <Text style={styles.transactionTitle}>{tx.title}</Text>
                  <Text style={styles.transactionTime}>{tx.time}</Text>
                </View>
                
                <View style={styles.transactionAmountContainer}>
                  <Text style={[
                    styles.transactionAmount,
                    { color: getTypeColor(tx.type) }
                  ]}>
                    {tx.amount > 0 ? '+' : ''}{tx.amount.toLocaleString()}đ
                  </Text>
                </View>
              </View>
            ))}
          </View>
        ) : (
          <View style={styles.emptyContainer}>
            <Search size={32} color="#cbd5e1" />
            <Text style={styles.emptyText}>Không tìm thấy giao dịch nào</Text>
            <Text style={styles.emptySubtext}>Thử thay đổi từ khóa hoặc bộ lọc</Text>
          </View>
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
    paddingHorizontal: 20,
  },
  header: {
    backgroundColor: 'white',
    borderRadius: 24,
    padding: 20,
    marginTop: 20,
    marginBottom: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 3,
  },
  headerLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#94a3b8',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  headerAmount: {
    fontSize: 28,
    fontWeight: '900',
    color: '#0f172a',
  },
  headerIcon: {
    width: 48,
    height: 48,
    borderRadius: 16,
    backgroundColor: '#d1fae5',
    justifyContent: 'center',
    alignItems: 'center',
  },
  buttonContainer: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 20,
  },
  primaryButton: {
    flex: 1,
    backgroundColor: '#10b981',
    borderRadius: 16,
    padding: 16,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 5,
  },
  primaryButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '700',
  },
  secondaryButton: {
    flex: 1,
    backgroundColor: '#1e293b',
    borderRadius: 16,
    padding: 16,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 5,
  },
  secondaryButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '700',
  },
  statsContainer: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 24,
  },
  statBox: {
    flex: 1,
    backgroundColor: 'white',
    borderRadius: 20,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  statLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#94a3b8',
    marginBottom: 4,
    textTransform: 'uppercase',
  },
  statValue: {
    fontSize: 20,
    fontWeight: '900',
    color: '#0f172a',
    marginBottom: 4,
  },
  statChange: {
    fontSize: 10,
    fontWeight: '700',
    color: '#10b981',
  },
  searchContainer: {
    marginBottom: 24,
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  searchInput: {
    flex: 1,
    paddingHorizontal: 8,
    fontSize: 14,
    fontWeight: '600',
  },
  filterContainer: {
    flexDirection: 'row',
    gap: 8,
  },
  filterButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 12,
    backgroundColor: 'white',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  filterButtonActive: {
    backgroundColor: '#10b981',
    borderColor: '#10b981',
  },
  filterButtonText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#64748b',
  },
  filterButtonTextActive: {
    color: 'white',
  },
  transactionsContainer: {
    marginBottom: 40,
  },
  transactionsTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0f172a',
    marginBottom: 12,
  },
  transactionsList: {
    gap: 10,
  },
  transactionItem: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  transactionIcon: {
    width: 48,
    height: 48,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  transactionInfo: {
    flex: 1,
  },
  transactionTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0f172a',
    marginBottom: 2,
  },
  transactionTime: {
    fontSize: 12,
    fontWeight: '500',
    color: '#94a3b8',
  },
  transactionAmountContainer: {
    alignItems: 'flex-end',
  },
  transactionAmount: {
    fontSize: 14,
    fontWeight: '900',
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#64748b',
    marginTop: 12,
  },
  emptySubtext: {
    fontSize: 12,
    fontWeight: '500',
    color: '#94a3b8',
    marginTop: 4,
  },
});
