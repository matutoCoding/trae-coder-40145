import { Transaction, User } from '../types';
import { generateId } from '../data/mockData';

export const createRechargeTransaction = (
  user: User,
  amount: number
): { updatedUser: User; transaction: Transaction } => {
  if (amount <= 0) {
    throw new Error('充值金额必须大于0');
  }

  const now = new Date().toISOString();
  
  const updatedUser: User = {
    ...user,
    balance: Math.round((user.balance + amount) * 100) / 100,
  };

  const transaction: Transaction = {
    id: generateId('trans'),
    userId: user.id,
    type: 'recharge',
    amount,
    balance: updatedUser.balance,
    description: '账户充值',
    createTime: now,
  };

  return { updatedUser, transaction };
};

export const getTransactionTypeLabel = (type: Transaction['type']): string => {
  const labels: Record<Transaction['type'], string> = {
    rental: '租借消费',
    recharge: '账户充值',
    refund: '费用退还',
  };
  return labels[type];
};

export const getTransactionTypeColor = (type: Transaction['type']): string => {
  const colors: Record<Transaction['type'], string> = {
    rental: 'text-red-600',
    recharge: 'text-green-600',
    refund: 'text-blue-600',
  };
  return colors[type];
};

export const getTransactionTypeIcon = (type: Transaction['type']): string => {
  const icons: Record<Transaction['type'], string> = {
    rental: 'umbrella',
    recharge: 'plus-circle',
    refund: 'refresh-cw',
  };
  return icons[type];
};

export const getTransactionsByUserId = (
  transactions: Transaction[],
  userId: string
): Transaction[] => {
  return transactions
    .filter(t => t.userId === userId)
    .sort((a, b) => new Date(b.createTime).getTime() - new Date(a.createTime).getTime());
};

export const getTransactionsByType = (
  transactions: Transaction[],
  type: Transaction['type']
): Transaction[] => {
  return transactions.filter(t => t.type === type);
};

export const getTransactionsByDateRange = (
  transactions: Transaction[],
  startDate: string,
  endDate: string
): Transaction[] => {
  return transactions.filter(t => {
    const transDate = new Date(t.createTime);
    return transDate >= new Date(startDate) && transDate <= new Date(endDate);
  });
};

export const calculateTotalRecharge = (transactions: Transaction[]): number => {
  return transactions
    .filter(t => t.type === 'recharge')
    .reduce((sum, t) => sum + t.amount, 0);
};

export const calculateTotalSpending = (transactions: Transaction[]): number => {
  return Math.abs(
    transactions
      .filter(t => t.type === 'rental')
      .reduce((sum, t) => sum + t.amount, 0)
  );
};

export const calculateTotalRefund = (transactions: Transaction[]): number => {
  return transactions
    .filter(t => t.type === 'refund')
    .reduce((sum, t) => sum + t.amount, 0);
};

export const getMonthlySpending = (transactions: Transaction[], months: number = 6): { month: string; amount: number }[] => {
  const result: { month: string; amount: number }[] = [];
  const now = new Date();

  for (let i = months - 1; i >= 0; i--) {
    const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
    const monthLabel = `${date.getFullYear()}年${date.getMonth() + 1}月`;

    const monthTotal = transactions
      .filter(t => {
        if (t.type !== 'rental') return false;
        const transDate = new Date(t.createTime);
        return (
          transDate.getFullYear() === date.getFullYear() &&
          transDate.getMonth() === date.getMonth()
        );
      })
      .reduce((sum, t) => sum + Math.abs(t.amount), 0);

    result.push({ month: monthLabel, amount: Math.round(monthTotal * 100) / 100 });
  }

  return result;
};

export const exportTransactionsToCSV = (transactions: Transaction[]): string => {
  const headers = ['交易时间', '类型', '金额', '余额', '描述'];
  
  const rows = transactions.map(t => [
    formatDateTime(t.createTime),
    getTransactionTypeLabel(t.type),
    t.amount >= 0 ? `+${t.amount.toFixed(2)}` : t.amount.toFixed(2),
    t.balance.toFixed(2),
    t.description,
  ]);

  const csvContent = [
    headers.join(','),
    ...rows.map(row => row.join(',')),
  ].join('\n');

  return csvContent;
};

export const formatDateTime = (isoString: string): string => {
  const date = new Date(isoString);
  return (
    `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')} ` +
    `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}:${String(date.getSeconds()).padStart(2, '0')}`
  );
};

export const formatDate = (isoString: string): string => {
  const date = new Date(isoString);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
};

export const formatDuration = (minutes: number): string => {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  
  if (hours === 0) {
    return `${mins}分钟`;
  }
  if (mins === 0) {
    return `${hours}小时`;
  }
  return `${hours}小时${mins}分钟`;
};

export const formatCurrency = (amount: number): string => {
  return `¥${amount.toFixed(2)}`;
};
