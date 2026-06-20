import { useState, useMemo } from 'react';
import {
  Search,
  Filter,
  Download,
  Calendar,
  TrendingUp,
  Wallet,
  RefreshCw,
  Umbrella,
  PlusCircle,
  AlertCircle,
  FileText,
} from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { useStore } from '../store/useStore';
import { Transaction } from '../types';
import {
  getTransactionTypeLabel,
  getTransactionTypeColor,
  getMonthlySpending,
  calculateTotalRecharge,
  calculateTotalSpending,
  calculateTotalRefund,
  exportTransactionsToCSV,
  formatCurrency,
  formatDateTime,
} from '../services/transactionService';
import { StatCard } from '../components/StatCard';
import { Modal } from '../components/Modal';

type FilterType = 'all' | 'rental' | 'recharge' | 'refund';

export const TransactionList = () => {
  const { transactions, user } = useStore();
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<FilterType>('all');
  const [dateRange, setDateRange] = useState({ start: '', end: '' });
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [selectedTransaction, setSelectedTransaction] = useState<Transaction | null>(null);

  const userTransactions = useMemo(() => {
    return transactions
      .filter((t) => t.userId === user.id)
      .sort((a, b) => new Date(b.createTime).getTime() - new Date(a.createTime).getTime());
  }, [transactions, user.id]);

  const filteredTransactions = useMemo(() => {
    return userTransactions.filter((t) => {
      if (filterType !== 'all' && t.type !== filterType) return false;

      if (dateRange.start) {
        const transDate = new Date(t.createTime);
        const startDate = new Date(dateRange.start);
        if (transDate < startDate) return false;
      }
      if (dateRange.end) {
        const transDate = new Date(t.createTime);
        const endDate = new Date(dateRange.end);
        endDate.setHours(23, 59, 59, 999);
        if (transDate > endDate) return false;
      }

      if (searchQuery) {
        const searchLower = searchQuery.toLowerCase();
        return (
          t.id.toLowerCase().includes(searchLower) ||
          t.description.toLowerCase().includes(searchLower)
        );
      }

      return true;
    });
  }, [userTransactions, filterType, dateRange, searchQuery]);

  const totalRecharge = calculateTotalRecharge(userTransactions);
  const totalSpending = calculateTotalSpending(userTransactions);
  const totalRefund = calculateTotalRefund(userTransactions);
  const monthlyData = getMonthlySpending(userTransactions, 6);

  const handleExport = () => {
    const csvContent = exportTransactionsToCSV(filteredTransactions);
    const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `消费明细_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
  };

  const handleViewDetail = (transaction: Transaction) => {
    setSelectedTransaction(transaction);
    setDetailModalOpen(true);
  };

  const getTypeIcon = (type: Transaction['type']) => {
    switch (type) {
      case 'rental':
        return <Umbrella className="w-5 h-5" />;
      case 'recharge':
        return <PlusCircle className="w-5 h-5" />;
      case 'refund':
        return <RefreshCw className="w-5 h-5" />;
    }
  };

  const getTypeBgColor = (type: Transaction['type']) => {
    switch (type) {
      case 'rental':
        return 'bg-red-100 text-red-600';
      case 'recharge':
        return 'bg-green-100 text-green-600';
      case 'refund':
        return 'bg-blue-100 text-blue-600';
    }
  };

  const stats = [
    {
      title: '累计充值',
      value: formatCurrency(totalRecharge),
      icon: <Wallet className="w-5 h-5" />,
      color: 'green',
      trend: '+12.5%',
    },
    {
      title: '累计消费',
      value: formatCurrency(totalSpending),
      icon: <Umbrella className="w-5 h-5" />,
      color: 'red',
      trend: '-8.3%',
    },
    {
      title: '累计退款',
      value: formatCurrency(totalRefund),
      icon: <RefreshCw className="w-5 h-5" />,
      color: 'blue',
      trend: '+0%',
    },
    {
      title: '交易笔数',
      value: userTransactions.length.toString(),
      icon: <FileText className="w-5 h-5" />,
      color: 'purple',
      trend: '+5',
    },
  ];

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat, index) => (
          <StatCard
            key={stat.title}
            title={stat.title}
            value={stat.value}
            icon={stat.icon}
            color={stat.color as 'green' | 'red' | 'blue' | 'purple'}
            trend={stat.trend}
            delay={index * 50}
          />
        ))}
      </div>

      <div className="card animate-slide-up animate-stagger-1">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-primary-500" />
            近6个月消费趋势
          </h3>
        </div>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={monthlyData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
              <XAxis dataKey="month" tick={{ fontSize: 12 }} stroke="#6B7280" />
              <YAxis tick={{ fontSize: 12 }} stroke="#6B7280" />
              <Tooltip
                formatter={(value: number) => [formatCurrency(value), '消费金额']}
                contentStyle={{
                  backgroundColor: '#FFF',
                  border: '1px solid #E5E7EB',
                  borderRadius: '8px',
                  boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
                }}
              />
              <Bar
                dataKey="amount"
                fill="#0F4C81"
                radius={[4, 4, 0, 0]}
                animationDuration={1000}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="card animate-slide-up animate-stagger-2">
        <div className="flex flex-col lg:flex-row gap-4 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="搜索交易号、描述..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="input-field pl-10"
            />
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-gray-400" />
              <select
                value={filterType}
                onChange={(e) => setFilterType(e.target.value as FilterType)}
                className="input-field w-auto"
              >
                <option value="all">全部类型</option>
                <option value="rental">租借消费</option>
                <option value="recharge">账户充值</option>
                <option value="refund">费用退还</option>
              </select>
            </div>
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-gray-400" />
              <input
                type="date"
                value={dateRange.start}
                onChange={(e) => setDateRange({ ...dateRange, start: e.target.value })}
                className="input-field w-auto"
              />
              <span className="text-gray-400">至</span>
              <input
                type="date"
                value={dateRange.end}
                onChange={(e) => setDateRange({ ...dateRange, end: e.target.value })}
                className="input-field w-auto"
              />
            </div>
            <button onClick={handleExport} className="btn-secondary flex items-center gap-2">
              <Download className="w-4 h-4" />
              导出明细
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr>
                <th className="table-header">交易时间</th>
                <th className="table-header">类型</th>
                <th className="table-header">交易号</th>
                <th className="table-header">描述</th>
                <th className="table-header">金额</th>
                <th className="table-header">账户余额</th>
                <th className="table-header">操作</th>
              </tr>
            </thead>
            <tbody>
              {filteredTransactions.map((transaction, index) => (
                <tr
                  key={transaction.id}
                  className="hover:bg-gray-50 transition-colors animate-fade-in"
                  style={{ animationDelay: `${index * 30}ms` }}
                >
                  <td className="table-cell text-xs text-gray-500">
                    {formatDateTime(transaction.createTime)}
                  </td>
                  <td className="table-cell">
                    <div className="flex items-center gap-2">
                      <span
                        className={`p-1.5 rounded-lg ${getTypeBgColor(
                          transaction.type
                        )}`}
                      >
                        {getTypeIcon(transaction.type)}
                      </span>
                      <span className="text-sm font-medium">
                        {getTransactionTypeLabel(transaction.type)}
                      </span>
                    </div>
                  </td>
                  <td className="table-cell font-mono text-xs">{transaction.id}</td>
                  <td className="table-cell text-sm">{transaction.description}</td>
                  <td className="table-cell">
                    <span
                      className={`font-semibold ${getTransactionTypeColor(
                        transaction.type
                      )}`}
                    >
                      {transaction.amount >= 0
                        ? `+${formatCurrency(transaction.amount)}`
                        : formatCurrency(transaction.amount)}
                    </span>
                  </td>
                  <td className="table-cell font-medium text-gray-700">
                    {formatCurrency(transaction.balance)}
                  </td>
                  <td className="table-cell">
                    <button
                      onClick={() => handleViewDetail(transaction)}
                      className="text-primary-600 hover:text-primary-700 text-sm font-medium"
                    >
                      详情
                    </button>
                  </td>
                </tr>
              ))}
              {filteredTransactions.length === 0 && (
                <tr>
                  <td colSpan={7} className="table-cell text-center py-8">
                    <div className="flex flex-col items-center gap-2 text-gray-400">
                      <AlertCircle className="w-8 h-8" />
                      <p>暂无交易记录</p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <Modal
        isOpen={detailModalOpen}
        onClose={() => setDetailModalOpen(false)}
        title="交易详情"
        size="md"
      >
        {selectedTransaction && (
          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
              <div className="flex items-center gap-3">
                <span
                  className={`p-2 rounded-lg ${getTypeBgColor(
                    selectedTransaction.type
                  )}`}
                >
                  {getTypeIcon(selectedTransaction.type)}
                </span>
                <div>
                  <p className="font-medium text-gray-900">
                    {getTransactionTypeLabel(selectedTransaction.type)}
                  </p>
                  <p className="text-xs text-gray-500">
                    {formatDateTime(selectedTransaction.createTime)}
                  </p>
                </div>
              </div>
              <p
                className={`text-xl font-bold ${getTransactionTypeColor(
                  selectedTransaction.type
                )}`}
              >
                {selectedTransaction.amount >= 0
                  ? `+${formatCurrency(selectedTransaction.amount)}`
                  : formatCurrency(selectedTransaction.amount)}
              </p>
            </div>

            <div className="space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">交易号</span>
                <span className="font-mono">{selectedTransaction.id}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">交易描述</span>
                <span>{selectedTransaction.description}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">交易后余额</span>
                <span className="font-medium">
                  {formatCurrency(selectedTransaction.balance)}
                </span>
              </div>
              {selectedTransaction.relatedBillId && (
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">关联账单</span>
                  <span className="font-mono">{selectedTransaction.relatedBillId}</span>
                </div>
              )}
            </div>

            <div className="flex justify-end pt-4 border-t border-gray-100">
              <button
                onClick={() => setDetailModalOpen(false)}
                className="btn-primary"
              >
                关闭
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};
