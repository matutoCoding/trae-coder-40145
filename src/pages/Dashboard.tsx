import { useMemo } from 'react';
import {
  Umbrella,
  Wallet,
  CreditCard,
  TrendingUp,
  MapPin,
  Clock,
  Ticket,
  ArrowRight,
  Zap,
  Calendar,
  Award,
  Bell,
} from 'lucide-react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from 'recharts';
import { useStore } from '../store/useStore';
import { StatCard } from '../components/StatCard';
import {
  formatCurrency,
  formatDateTime,
  formatDuration,
  calculateTotalSpending,
  getMonthlySpending,
} from '../services/transactionService';
import { getBillStatusLabel, getBillStatusColor } from '../services/billService';
import { checkAndResetQuotaIfNeeded } from '../services/quotaService';

export const Dashboard = () => {
  const {
    user,
    userQuota,
    bills,
    rentalRecords,
    transactions,
    sites,
    coupons,
    promotions,
  } = useStore();

  const { quota } = checkAndResetQuotaIfNeeded(userQuota, new Date());

  const stats = useMemo(() => {
    const pendingBills = bills.filter((b) => b.status === 'pending');
    const completedRentals = rentalRecords.filter((r) => r.status === 'completed');
    const totalSaving = completedRentals.reduce((sum, r) => {
      return sum + r.couponDiscount + r.promotionDiscount;
    }, 0);
    const totalSpending = calculateTotalSpending(
      transactions.filter((t) => t.userId === user.id)
    );

    return [
      {
        title: '账户余额',
        value: formatCurrency(user.balance),
        icon: <Wallet className="w-5 h-5" />,
        color: 'green',
        trend: '+¥50.00',
      },
      {
        title: '待支付账单',
        value: pendingBills.length.toString(),
        icon: <CreditCard className="w-5 h-5" />,
        color: 'orange',
        trend: `¥${pendingBills.reduce((sum, b) => sum + b.finalAmount, 0).toFixed(2)}`,
      },
      {
        title: '累计消费',
        value: formatCurrency(totalSpending),
        icon: <TrendingUp className="w-5 h-5" />,
        color: 'red',
        trend: '-8.3%',
      },
      {
        title: '累计优惠',
        value: formatCurrency(totalSaving),
        icon: <Ticket className="w-5 h-5" />,
        color: 'purple',
        trend: '+15.2%',
      },
    ];
  }, [bills, rentalRecords, transactions, user]);

  const monthlyData = useMemo(() => {
    return getMonthlySpending(
      transactions.filter((t) => t.userId === user.id),
      6
    );
  }, [transactions, user.id]);

  const quotaUsageData = useMemo(() => {
    const remaining = quota.monthlyQuota - quota.usedQuota;
    return [
      { name: '已使用', value: quota.usedQuota, color: '#FF9800' },
      { name: '剩余', value: remaining, color: '#4FC3F7' },
    ];
  }, [quota]);

  const siteUsageData = useMemo(() => {
    return sites.map((site) => ({
      name: site.name,
      available: site.availableUmbrellas,
      used: 10 - site.availableUmbrellas,
    }));
  }, [sites]);

  const recentTransactions = useMemo(() => {
    return transactions
      .filter((t) => t.userId === user.id)
      .sort((a, b) => new Date(b.createTime).getTime() - new Date(a.createTime).getTime())
      .slice(0, 5);
  }, [transactions, user.id]);

  const recentBills = useMemo(() => {
    return bills
      .filter((b) => b.userId === user.id)
      .sort((a, b) => new Date(b.createTime).getTime() - new Date(a.createTime).getTime())
      .slice(0, 5);
  }, [bills, user.id]);

  const activeRentals = useMemo(() => {
    return rentalRecords.filter((r) => r.status === 'ongoing');
  }, [rentalRecords]);

  const getDaysRemainingInCycle = () => {
    const endDate = new Date(quota.cycleEndDate);
    const today = new Date();
    const diff = endDate.getTime() - today.getTime();
    return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
  };

  return (
    <div className="space-y-6">
      <div className="animate-slide-up">
        <div className="bg-gradient-to-r from-primary-600 to-primary-400 rounded-2xl p-6 text-white relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2" />
          <div className="absolute bottom-0 left-0 w-48 h-48 bg-white/10 rounded-full translate-y-1/2 -translate-x-1/2" />
          <div className="relative z-10">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-xl font-bold">欢迎回来，{user.name}</h2>
                <p className="text-white/80 text-sm mt-1">
                  今天是个借伞的好日子 ☔
                </p>
              </div>
              <div className="bg-white/20 rounded-full p-3">
                <Bell className="w-6 h-6" />
              </div>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-6">
              <div className="bg-white/10 backdrop-blur rounded-xl p-4">
                <p className="text-white/70 text-xs">账户余额</p>
                <p className="text-2xl font-bold mt-1">{formatCurrency(user.balance)}</p>
              </div>
              <div className="bg-white/10 backdrop-blur rounded-xl p-4">
                <p className="text-white/70 text-xs">本月剩余额度</p>
                <p className="text-2xl font-bold mt-1">
                  {quota.monthlyQuota - quota.usedQuota} 次
                </p>
              </div>
              <div className="bg-white/10 backdrop-blur rounded-xl p-4">
                <p className="text-white/70 text-xs">可用优惠券</p>
                <p className="text-2xl font-bold mt-1">
                  {coupons.filter((c) => c.isActive).length} 张
                </p>
              </div>
              <div className="bg-white/10 backdrop-blur rounded-xl p-4">
                <p className="text-white/70 text-xs">进行中租借</p>
                <p className="text-2xl font-bold mt-1">{activeRentals.length} 次</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat, index) => (
          <StatCard
            key={stat.title}
            title={stat.title}
            value={stat.value}
            icon={stat.icon}
            color={stat.color as 'green' | 'orange' | 'red' | 'purple'}
            trend={stat.trend}
            delay={index * 50}
          />
        ))}
      </div>

      {activeRentals.length > 0 && (
        <div className="card animate-slide-up animate-stagger-1 border-l-4 border-l-orange-500">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
              <Zap className="w-5 h-5 text-orange-500" />
              进行中的租借
            </h3>
          </div>
          <div className="space-y-3">
            {activeRentals.map((rental) => (
              <div
                key={rental.id}
                className="flex items-center justify-between p-4 bg-orange-50 rounded-xl"
              >
                <div className="flex items-center gap-4">
                  <div className="bg-orange-100 p-2 rounded-lg">
                    <Umbrella className="w-5 h-5 text-orange-600" />
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">
                      {rental.borrowSiteName}
                    </p>
                    <p className="text-sm text-gray-500 flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      借出: {formatDateTime(rental.borrowTime)}
                    </p>
                  </div>
                </div>
                <button className="btn-primary flex items-center gap-1 text-sm">
                  立即归还
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 card animate-slide-up animate-stagger-2">
          <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2 mb-4">
            <TrendingUp className="w-5 h-5 text-primary-500" />
            消费趋势
          </h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart
                data={monthlyData}
                margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
              >
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
                <Line
                  type="monotone"
                  dataKey="amount"
                  stroke="#0F4C81"
                  strokeWidth={3}
                  dot={{ fill: '#0F4C81', strokeWidth: 2, r: 4 }}
                  activeDot={{ r: 6, fill: '#FF9800' }}
                  animationDuration={1000}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="card animate-slide-up animate-stagger-3">
          <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2 mb-4">
            <Award className="w-5 h-5 text-primary-500" />
            本月额度使用
          </h3>
          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={quotaUsageData}
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={70}
                  paddingAngle={5}
                  dataKey="value"
                  animationDuration={1000}
                >
                  {quotaUsageData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="text-center mt-2">
            <p className="text-sm text-gray-500">
              已使用 <span className="font-semibold text-orange-600">{quota.usedQuota}</span> 次，
              剩余 <span className="font-semibold text-sky-500">{quota.monthlyQuota - quota.usedQuota}</span> 次
            </p>
            <p className="text-xs text-gray-400 mt-1 flex items-center justify-center gap-1">
              <Calendar className="w-3 h-3" />
              距重置还有 {getDaysRemainingInCycle()} 天
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="card animate-slide-up animate-stagger-4">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
              <CreditCard className="w-5 h-5 text-primary-500" />
              最近账单
            </h3>
            <button className="text-sm text-primary-600 hover:text-primary-700 flex items-center gap-1">
              查看全部
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
          <div className="space-y-3">
            {recentBills.map((bill) => (
              <div
                key={bill.id}
                className="flex items-center justify-between p-3 rounded-xl hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="bg-primary-100 p-2 rounded-lg">
                    <Umbrella className="w-4 h-4 text-primary-600" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-900">
                      {bill.id}
                    </p>
                    <p className="text-xs text-gray-500">
                      {formatDateTime(bill.createTime)}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-semibold text-primary-600">
                    {formatCurrency(bill.finalAmount)}
                  </p>
                  <span
                    className={`text-xs badge ${getBillStatusColor(bill.status)}`}
                  >
                    {getBillStatusLabel(bill.status)}
                  </span>
                </div>
              </div>
            ))}
            {recentBills.length === 0 && (
              <div className="text-center py-8 text-gray-400">
                暂无账单记录
              </div>
            )}
          </div>
        </div>

        <div className="card animate-slide-up animate-stagger-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
              <MapPin className="w-5 h-5 text-primary-500" />
              站点雨伞库存
            </h3>
          </div>
          <div className="space-y-3">
            {siteUsageData.map((site) => (
              <div
                key={site.name}
                className="flex items-center justify-between p-3 rounded-xl hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="bg-green-100 p-2 rounded-lg">
                    <MapPin className="w-4 h-4 text-green-600" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-900">{site.name}</p>
                    <div className="flex items-center gap-2">
                      <div className="w-24 h-2 bg-gray-200 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-green-400 to-green-600 rounded-full transition-all duration-500"
                          style={{
                            width: `${(site.available / (site.available + site.used)) * 100}%`,
                          }}
                        />
                      </div>
                      <span className="text-xs text-gray-500">
                        {site.available} 把可用
                      </span>
                    </div>
                  </div>
                </div>
                <button className="text-xs btn-secondary px-3 py-1.5">
                  借伞
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="card animate-slide-up animate-stagger-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
            <Ticket className="w-5 h-5 text-primary-500" />
            可用优惠券
          </h3>
          <button className="text-sm text-primary-600 hover:text-primary-700 flex items-center gap-1">
            查看全部
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {coupons
            .filter((c) => c.isActive)
            .slice(0, 3)
            .map((coupon) => (
              <div
                key={coupon.id}
                className="relative bg-gradient-to-r from-orange-500 to-orange-400 rounded-xl p-4 text-white overflow-hidden"
              >
                <div className="absolute top-0 right-0 w-20 h-20 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2" />
                <div className="absolute bottom-0 left-0 w-16 h-16 bg-white/10 rounded-full translate-y-1/2 -translate-x-1/2" />
                <div className="relative z-10">
                  <p className="text-xs text-white/80">满{coupon.minAmount}元可用</p>
                  <p className="text-2xl font-bold mt-1">
                    {coupon.type === 'fixed'
                      ? `¥${coupon.value}`
                      : coupon.type === 'percentage'
                      ? `${(100 - coupon.value) / 10}折`
                      : `免费${coupon.value}小时`}
                  </p>
                  <p className="text-sm font-medium mt-2">{coupon.name}</p>
                  <p className="text-xs text-white/70 mt-1">
                    {coupon.validFrom.split('T')[0]} 至 {coupon.validTo.split('T')[0]}
                  </p>
                </div>
              </div>
            ))}
          {coupons.filter((c) => c.isActive).length === 0 && (
            <div className="col-span-full text-center py-8 text-gray-400">
              暂无可用优惠券
            </div>
          )}
        </div>
      </div>

      <div className="card animate-slide-up animate-stagger-7">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
            <Clock className="w-5 h-5 text-primary-500" />
            最近交易
          </h3>
          <button className="text-sm text-primary-600 hover:text-primary-700 flex items-center gap-1">
            查看全部
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr>
                <th className="table-header">交易时间</th>
                <th className="table-header">类型</th>
                <th className="table-header">描述</th>
                <th className="table-header">金额</th>
                <th className="table-header">余额</th>
              </tr>
            </thead>
            <tbody>
              {recentTransactions.map((transaction) => (
                <tr
                  key={transaction.id}
                  className="hover:bg-gray-50 transition-colors"
                >
                  <td className="table-cell text-xs text-gray-500">
                    {formatDateTime(transaction.createTime)}
                  </td>
                  <td className="table-cell">
                    <span
                      className={`text-xs font-medium ${
                        transaction.type === 'recharge'
                          ? 'text-green-600'
                          : transaction.type === 'refund'
                          ? 'text-blue-600'
                          : 'text-red-600'
                      }`}
                    >
                      {transaction.type === 'recharge'
                        ? '充值'
                        : transaction.type === 'refund'
                        ? '退款'
                        : '消费'}
                    </span>
                  </td>
                  <td className="table-cell text-sm">{transaction.description}</td>
                  <td className="table-cell">
                    <span
                      className={`font-semibold ${
                        transaction.amount >= 0 ? 'text-green-600' : 'text-red-600'
                      }`}
                    >
                      {transaction.amount >= 0
                        ? `+${formatCurrency(transaction.amount)}`
                        : formatCurrency(transaction.amount)}
                    </span>
                  </td>
                  <td className="table-cell font-medium">
                    {formatCurrency(transaction.balance)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
