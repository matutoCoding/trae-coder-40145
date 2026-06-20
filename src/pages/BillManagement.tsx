import { useState, useMemo } from 'react';
import {
  Eye,
  CreditCard,
  RefreshCw,
  Search,
  Filter,
  Download,
  MapPin,
  Clock,
  Umbrella,
  AlertCircle,
  Calendar,
  ChevronLeft,
  ChevronRight,
  Receipt,
  TrendingUp,
} from 'lucide-react';
import { useStore } from '../store/useStore';
import { Modal } from '../components/Modal';
import { DiscountDetails } from '../components/DiscountDetails';
import { Bill, RentalRecord } from '../types';
import {
  getBillStatusLabel,
  getBillStatusColor,
} from '../services/billService';
import {
  formatCurrency,
  formatDateTime,
  formatDuration,
  formatDate,
} from '../services/transactionService';

type FilterStatus = 'all' | 'pending' | 'paid' | 'refunded';
type ViewTab = 'list' | 'monthly';

interface MonthlySummary {
  month: string;
  monthLabel: string;
  billCount: number;
  originalBaseAmount: number;
  crossSiteFee: number;
  quotaDiscount: number;
  couponDiscount: number;
  promotionDiscount: number;
  totalDiscount: number;
  finalAmount: number;
  bills: Bill[];
}

export const BillManagement = () => {
  const [viewTab, setViewTab] = useState<ViewTab>('list');
  const [selectedBill, setSelectedBill] = useState<Bill | null>(null);
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [filterStatus, setFilterStatus] = useState<FilterStatus>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [refundModalOpen, setRefundModalOpen] = useState(false);
  const [refundReason, setRefundReason] = useState('');
  const [refundBillId, setRefundBillId] = useState<string | null>(null);
  const [selectedMonth, setSelectedMonth] = useState<string | null>(null);

  const { bills, rentalRecords, transactions, payBill, refundBill } = useStore();

  const getRentalForBill = (billId: string): RentalRecord | undefined => {
    return rentalRecords.find((r) => r.id === billId || r.id === billId.replace('bill_', 'rental_'));
  };

  const filteredBills = bills.filter((bill) => {
    if (filterStatus !== 'all' && bill.status !== filterStatus) return false;
    
    if (searchQuery) {
      const rental = getRentalForBill(bill.rentalId);
      const searchLower = searchQuery.toLowerCase();
      return (
        bill.id.toLowerCase().includes(searchLower) ||
        rental?.borrowSiteName.toLowerCase().includes(searchLower) ||
        rental?.returnSiteName?.toLowerCase().includes(searchLower)
      );
    }
    
    return true;
  }).sort((a, b) => new Date(b.createTime).getTime() - new Date(a.createTime).getTime());

  const monthlySummaries = useMemo((): MonthlySummary[] => {
    const monthMap = new Map<string, Bill[]>();
    
    for (const bill of bills) {
      const date = new Date(bill.createTime);
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      if (!monthMap.has(monthKey)) {
        monthMap.set(monthKey, []);
      }
      monthMap.get(monthKey)!.push(bill);
    }

    const summaries: MonthlySummary[] = [];
    for (const [month, monthBills] of monthMap) {
      const [year, m] = month.split('-');
      summaries.push({
        month,
        monthLabel: `${year}年${parseInt(m)}月`,
        billCount: monthBills.length,
        originalBaseAmount: monthBills.reduce((sum, b) => sum + (b.originalBaseAmount || b.baseAmount + (b.quotaDiscount || 0)), 0),
        crossSiteFee: monthBills.reduce((sum, b) => sum + b.crossSiteFee, 0),
        quotaDiscount: monthBills.reduce((sum, b) => sum + (b.quotaDiscount || 0), 0),
        couponDiscount: monthBills.reduce((sum, b) => sum + (b.couponDiscount || 0), 0),
        promotionDiscount: monthBills.reduce((sum, b) => sum + (b.promotionDiscount || 0), 0),
        totalDiscount: monthBills.reduce((sum, b) => sum + b.totalDiscount, 0),
        finalAmount: monthBills.reduce((sum, b) => sum + b.finalAmount, 0),
        bills: monthBills.sort((a, b) => new Date(b.createTime).getTime() - new Date(a.createTime).getTime()),
      });
    }

    return summaries.sort((a, b) => b.month.localeCompare(a.month));
  }, [bills]);

  const selectedMonthSummary = useMemo(() => {
    if (!selectedMonth) return null;
    return monthlySummaries.find(s => s.month === selectedMonth) || null;
  }, [monthlySummaries, selectedMonth]);

  const selectedMonthTransactionTotal = useMemo(() => {
    if (!selectedMonth) return 0;
    const [year, m] = selectedMonth.split('-');
    return transactions
      .filter(t => {
        const d = new Date(t.createTime);
        return d.getFullYear() === parseInt(year) && d.getMonth() + 1 === parseInt(m) && t.type === 'rental';
      })
      .reduce((sum, t) => sum + Math.abs(t.amount), 0);
  }, [transactions, selectedMonth]);

  const handleViewDetail = (bill: Bill) => {
    setSelectedBill(bill);
    setDetailModalOpen(true);
  };

  const handleRefund = (billId: string) => {
    setRefundBillId(billId);
    setRefundReason('');
    setRefundModalOpen(true);
  };

  const confirmRefund = () => {
    if (refundBillId) {
      refundBill(refundBillId, refundReason || '用户申请退款');
      setRefundModalOpen(false);
      setRefundBillId(null);
    }
  };

  const pendingCount = bills.filter((b) => b.status === 'pending').length;
  const totalAmount = bills.reduce((sum, b) => sum + b.finalAmount, 0);
  const totalDiscount = bills.reduce((sum, b) => sum + b.totalDiscount, 0);

  const stats = [
    { label: '总账单数', value: bills.length, color: 'blue' },
    { label: '待支付', value: pendingCount, color: 'orange' },
    { label: '总金额', value: formatCurrency(totalAmount), color: 'green' },
    { label: '优惠总额', value: formatCurrency(totalDiscount), color: 'purple' },
  ];

  const renderListView = () => (
    <div className="card animate-slide-up animate-stagger-1">
      <div className="flex flex-col sm:flex-row gap-4 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="搜索账单号、借还站点..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="input-field pl-10"
          />
        </div>
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-gray-400" />
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value as FilterStatus)}
            className="input-field w-auto"
          >
            <option value="all">全部状态</option>
            <option value="pending">待支付</option>
            <option value="paid">已支付</option>
            <option value="refunded">已退款</option>
          </select>
        </div>
        <button className="btn-secondary flex items-center gap-2">
          <Download className="w-4 h-4" />
          导出
        </button>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr>
              <th className="table-header">账单号</th>
              <th className="table-header">借还信息</th>
              <th className="table-header">时长</th>
              <th className="table-header">费用明细</th>
              <th className="table-header">优惠</th>
              <th className="table-header">实付</th>
              <th className="table-header">状态</th>
              <th className="table-header">创建时间</th>
              <th className="table-header">操作</th>
            </tr>
          </thead>
          <tbody>
            {filteredBills.map((bill, index) => {
              const rental = getRentalForBill(bill.rentalId);
              const isCrossSite = rental?.borrowSiteId !== rental?.returnSiteId;
              const originalBase = bill.originalBaseAmount || bill.baseAmount + (bill.quotaDiscount || 0);
              
              return (
                <tr
                  key={bill.id}
                  className="hover:bg-gray-50 transition-colors animate-fade-in"
                  style={{ animationDelay: `${index * 30}ms` }}
                >
                  <td className="table-cell font-mono text-xs">{bill.id}</td>
                  <td className="table-cell">
                    <div className="space-y-1">
                      <div className="flex items-center gap-1 text-sm">
                        <MapPin className="w-3 h-3 text-green-500" />
                        <span>{rental?.borrowSiteName}</span>
                      </div>
                      <div className="flex items-center gap-1 text-sm">
                        <MapPin className="w-3 h-3 text-red-500" />
                        <span>
                          {rental?.returnSiteName || '-'}
                          {isCrossSite && (
                            <span className="ml-1 text-xs text-orange-500">(异点)</span>
                          )}
                        </span>
                      </div>
                    </div>
                  </td>
                  <td className="table-cell">
                    {rental?.duration ? formatDuration(rental.duration) : '-'}
                  </td>
                  <td className="table-cell">
                    <div className="text-sm">
                      <div>基础: {formatCurrency(originalBase)}</div>
                      {bill.quotaDiscount > 0 && (
                        <div className="text-primary-600">
                          额度: -{formatCurrency(bill.quotaDiscount)}
                        </div>
                      )}
                      {bill.crossSiteFee > 0 && (
                        <div className="text-orange-600">
                          异点: +{formatCurrency(bill.crossSiteFee)}
                        </div>
                      )}
                    </div>
                  </td>
                  <td className="table-cell text-green-600 font-medium">
                    -{formatCurrency(bill.totalDiscount)}
                  </td>
                  <td className="table-cell font-semibold text-primary-600">
                    {formatCurrency(bill.finalAmount)}
                  </td>
                  <td className="table-cell">
                    <span className={`badge ${getBillStatusColor(bill.status)}`}>
                      {getBillStatusLabel(bill.status)}
                    </span>
                  </td>
                  <td className="table-cell text-xs text-gray-500">
                    {formatDateTime(bill.createTime)}
                  </td>
                  <td className="table-cell">
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => handleViewDetail(bill)}
                        className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors"
                        title="查看详情"
                      >
                        <Eye className="w-4 h-4 text-gray-500" />
                      </button>
                      {bill.status === 'pending' && (
                        <button
                          onClick={() => payBill(bill.id)}
                          className="p-1.5 rounded-lg hover:bg-green-50 transition-colors"
                          title="立即支付"
                        >
                          <CreditCard className="w-4 h-4 text-green-500" />
                        </button>
                      )}
                      {bill.status === 'paid' && (
                        <button
                          onClick={() => handleRefund(bill.id)}
                          className="p-1.5 rounded-lg hover:bg-orange-50 transition-colors"
                          title="申请退款"
                        >
                          <RefreshCw className="w-4 h-4 text-orange-500" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
            {filteredBills.length === 0 && (
              <tr>
                <td colSpan={9} className="table-cell text-center py-8">
                  <div className="flex flex-col items-center gap-2 text-gray-400">
                    <AlertCircle className="w-8 h-8" />
                    <p>暂无账单记录</p>
                  </div>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );

  const renderMonthlyView = () => (
    <div className="space-y-6">
      {!selectedMonth ? (
        <div className="card animate-slide-up">
          <div className="flex items-center gap-2 mb-6">
            <Calendar className="w-5 h-5 text-primary-500" />
            <h3 className="text-lg font-semibold text-gray-900">月度对账</h3>
          </div>

          {monthlySummaries.length === 0 ? (
            <div className="text-center py-12 text-gray-400">
              <Receipt className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p>暂无账单数据</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {monthlySummaries.map((summary) => (
                <div
                  key={summary.month}
                  onClick={() => setSelectedMonth(summary.month)}
                  className="p-5 border-2 border-gray-200 rounded-xl cursor-pointer hover:border-primary-300 hover:shadow-md transition-all"
                >
                  <div className="flex items-center justify-between mb-4">
                    <h4 className="font-semibold text-gray-900">{summary.monthLabel}</h4>
                    <span className="text-sm text-gray-500">{summary.billCount} 笔</span>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div className="p-2 bg-gray-50 rounded-lg">
                      <p className="text-gray-500 text-xs">基础费用</p>
                      <p className="font-semibold text-gray-900">{formatCurrency(summary.originalBaseAmount)}</p>
                    </div>
                    <div className="p-2 bg-gray-50 rounded-lg">
                      <p className="text-gray-500 text-xs">异点费</p>
                      <p className="font-semibold text-gray-900">{formatCurrency(summary.crossSiteFee)}</p>
                    </div>
                    <div className="p-2 bg-blue-50 rounded-lg">
                      <p className="text-blue-500 text-xs">额度抵扣</p>
                      <p className="font-semibold text-blue-700">-{formatCurrency(summary.quotaDiscount)}</p>
                    </div>
                    <div className="p-2 bg-orange-50 rounded-lg">
                      <p className="text-orange-500 text-xs">优惠券</p>
                      <p className="font-semibold text-orange-700">-{formatCurrency(summary.couponDiscount)}</p>
                    </div>
                    <div className="p-2 bg-green-50 rounded-lg">
                      <p className="text-green-500 text-xs">满减</p>
                      <p className="font-semibold text-green-700">-{formatCurrency(summary.promotionDiscount)}</p>
                    </div>
                    <div className="p-2 bg-primary-50 rounded-lg">
                      <p className="text-primary-500 text-xs">实收金额</p>
                      <p className="font-semibold text-primary-700">{formatCurrency(summary.finalAmount)}</p>
                    </div>
                  </div>

                  <div className="mt-3 pt-3 border-t border-gray-100 flex items-center justify-between">
                    <span className="text-sm text-gray-500">
                      优惠合计: <span className="text-green-600">-{formatCurrency(summary.totalDiscount)}</span>
                    </span>
                    <ChevronRight className="w-4 h-4 text-gray-400" />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      ) : (
        <div className="card animate-slide-up">
          <div className="flex items-center gap-3 mb-6">
            <button
              onClick={() => setSelectedMonth(null)}
              className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
            >
              <ChevronLeft className="w-5 h-5 text-gray-500" />
            </button>
            <div>
              <h3 className="text-lg font-semibold text-gray-900">
                {selectedMonthSummary?.monthLabel} 明细
              </h3>
              <p className="text-sm text-gray-500">
                {selectedMonthSummary?.billCount} 笔账单
              </p>
            </div>
          </div>

          {selectedMonthSummary && (
            <div className="mb-6 p-4 bg-gray-50 rounded-xl">
              <h4 className="font-medium text-gray-700 mb-3 flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-primary-500" />
                本月汇总
              </h4>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
                <div>
                  <p className="text-gray-500">基础费用</p>
                  <p className="font-bold text-gray-900">{formatCurrency(selectedMonthSummary.originalBaseAmount)}</p>
                </div>
                <div>
                  <p className="text-gray-500">异点费</p>
                  <p className="font-bold text-gray-900">{formatCurrency(selectedMonthSummary.crossSiteFee)}</p>
                </div>
                <div>
                  <p className="text-gray-500">额度抵扣</p>
                  <p className="font-bold text-blue-600">-{formatCurrency(selectedMonthSummary.quotaDiscount)}</p>
                </div>
                <div>
                  <p className="text-gray-500">优惠券</p>
                  <p className="font-bold text-orange-600">-{formatCurrency(selectedMonthSummary.couponDiscount)}</p>
                </div>
                <div>
                  <p className="text-gray-500">满减</p>
                  <p className="font-bold text-green-600">-{formatCurrency(selectedMonthSummary.promotionDiscount)}</p>
                </div>
                <div>
                  <p className="text-gray-500">优惠合计</p>
                  <p className="font-bold text-green-700">-{formatCurrency(selectedMonthSummary.totalDiscount)}</p>
                </div>
                <div>
                  <p className="text-gray-500">实收金额</p>
                  <p className="font-bold text-primary-600">{formatCurrency(selectedMonthSummary.finalAmount)}</p>
                </div>
                <div>
                  <p className="text-gray-500">消费明细扣款</p>
                  <p className="font-bold text-gray-900">{formatCurrency(selectedMonthTransactionTotal)}</p>
                </div>
              </div>
              {Math.abs(selectedMonthSummary.finalAmount - selectedMonthTransactionTotal) < 0.01 && (
                <div className="mt-3 flex items-center gap-2 text-sm text-green-600 bg-green-50 px-3 py-2 rounded-lg">
                  <Receipt className="w-4 h-4" />
                  <span>账单实收与消费明细扣款总额一致</span>
                </div>
              )}
            </div>
          )}

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr>
                  <th className="table-header">账单号</th>
                  <th className="table-header">基础费</th>
                  <th className="table-header">异点费</th>
                  <th className="table-header">额度抵扣</th>
                  <th className="table-header">优惠券</th>
                  <th className="table-header">满减</th>
                  <th className="table-header">实付</th>
                  <th className="table-header">状态</th>
                  <th className="table-header">操作</th>
                </tr>
              </thead>
              <tbody>
                {selectedMonthSummary?.bills.map((bill) => (
                  <tr key={bill.id} className="hover:bg-gray-50 transition-colors">
                    <td className="table-cell font-mono text-xs">{bill.id}</td>
                    <td className="table-cell text-sm">{formatCurrency(bill.originalBaseAmount || bill.baseAmount + (bill.quotaDiscount || 0))}</td>
                    <td className="table-cell text-sm">{formatCurrency(bill.crossSiteFee)}</td>
                    <td className="table-cell text-sm text-blue-600">-{formatCurrency(bill.quotaDiscount || 0)}</td>
                    <td className="table-cell text-sm text-orange-600">-{formatCurrency(bill.couponDiscount || 0)}</td>
                    <td className="table-cell text-sm text-green-600">-{formatCurrency(bill.promotionDiscount || 0)}</td>
                    <td className="table-cell font-semibold text-primary-600">{formatCurrency(bill.finalAmount)}</td>
                    <td className="table-cell">
                      <span className={`badge ${getBillStatusColor(bill.status)}`}>
                        {getBillStatusLabel(bill.status)}
                      </span>
                    </td>
                    <td className="table-cell">
                      <button
                        onClick={() => handleViewDetail(bill)}
                        className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors"
                        title="查看详情"
                      >
                        <Eye className="w-4 h-4 text-gray-500" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="bg-gray-50 font-semibold">
                  <td className="table-cell text-sm">合计</td>
                  <td className="table-cell text-sm">{formatCurrency(selectedMonthSummary?.originalBaseAmount || 0)}</td>
                  <td className="table-cell text-sm">{formatCurrency(selectedMonthSummary?.crossSiteFee || 0)}</td>
                  <td className="table-cell text-sm text-blue-600">-{formatCurrency(selectedMonthSummary?.quotaDiscount || 0)}</td>
                  <td className="table-cell text-sm text-orange-600">-{formatCurrency(selectedMonthSummary?.couponDiscount || 0)}</td>
                  <td className="table-cell text-sm text-green-600">-{formatCurrency(selectedMonthSummary?.promotionDiscount || 0)}</td>
                  <td className="table-cell text-primary-600">{formatCurrency(selectedMonthSummary?.finalAmount || 0)}</td>
                  <td className="table-cell" colSpan={2}></td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      )}
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat, index) => (
          <div
            key={stat.label}
            className="card animate-slide-up"
            style={{ animationDelay: `${index * 50}ms` }}
          >
            <p className="text-sm text-gray-500 font-medium">{stat.label}</p>
            <p
              className={`text-2xl font-bold mt-1 ${
                stat.color === 'blue'
                  ? 'text-blue-600'
                  : stat.color === 'orange'
                  ? 'text-orange-600'
                  : stat.color === 'green'
                  ? 'text-green-600'
                  : 'text-purple-600'
              }`}
            >
              {stat.value}
            </p>
          </div>
        ))}
      </div>

      <div className="card animate-slide-up">
        <div className="flex border-b border-gray-200">
          <button
            onClick={() => { setViewTab('list'); setSelectedMonth(null); }}
            className={`flex-1 py-3 px-4 text-center font-medium transition-colors relative ${
              viewTab === 'list'
                ? 'text-primary-600'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            <Receipt className="w-5 h-5 inline mr-2" />
            账单列表
            {viewTab === 'list' && (
              <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary-600" />
            )}
          </button>
          <button
            onClick={() => { setViewTab('monthly'); setSelectedMonth(null); }}
            className={`flex-1 py-3 px-4 text-center font-medium transition-colors relative ${
              viewTab === 'monthly'
                ? 'text-primary-600'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            <Calendar className="w-5 h-5 inline mr-2" />
            月度对账
            {viewTab === 'monthly' && (
              <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary-600" />
            )}
          </button>
        </div>
      </div>

      {viewTab === 'list' ? renderListView() : renderMonthlyView()}

      <Modal
        isOpen={detailModalOpen}
        onClose={() => setDetailModalOpen(false)}
        title="账单详情"
        size="lg"
      >
        {selectedBill && (() => {
          const rental = getRentalForBill(selectedBill.rentalId);
          return (
            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-500">账单号</p>
                  <p className="font-mono text-sm">{selectedBill.id}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">状态</p>
                  <span className={`badge ${getBillStatusColor(selectedBill.status)}`}>
                    {getBillStatusLabel(selectedBill.status)}
                  </span>
                </div>
              </div>

              {rental && (
                <div className="p-4 bg-gray-50 rounded-lg space-y-3">
                  <h4 className="font-medium text-gray-900 flex items-center gap-2">
                    <Umbrella className="w-4 h-4 text-primary-500" />
                    租借信息
                  </h4>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div className="flex items-center gap-2">
                      <MapPin className="w-4 h-4 text-green-500" />
                      <span className="text-gray-500">借:</span>
                      <span>{rental.borrowSiteName}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <MapPin className="w-4 h-4 text-red-500" />
                      <span className="text-gray-500">还:</span>
                      <span>{rental.returnSiteName || '-'}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Clock className="w-4 h-4 text-gray-400" />
                      <span className="text-gray-500">时长:</span>
                      <span>{rental.duration ? formatDuration(rental.duration) : '-'}</span>
                    </div>
                  </div>
                  <div className="text-xs text-gray-500">
                    <p>借出: {formatDateTime(rental.borrowTime)}</p>
                    {rental.returnTime && <p>归还: {formatDateTime(rental.returnTime)}</p>}
                  </div>
                </div>
              )}

              <DiscountDetails
                details={rental?.discountDetails || []}
                baseAmount={selectedBill.baseAmount}
                originalBaseAmount={selectedBill.originalBaseAmount}
                crossSiteFee={selectedBill.crossSiteFee}
                finalAmount={selectedBill.finalAmount}
                quotaDiscount={selectedBill.quotaDiscount}
                quotaUsed={selectedBill.quotaUsed}
              />

              <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
                <button
                  onClick={() => setDetailModalOpen(false)}
                  className="btn-secondary"
                >
                  关闭
                </button>
                {selectedBill.status === 'pending' && (
                  <button
                    onClick={() => {
                      payBill(selectedBill.id);
                      setDetailModalOpen(false);
                    }}
                    className="btn-primary"
                  >
                    立即支付
                  </button>
                )}
              </div>
            </div>
          );
        })()}
      </Modal>

      <Modal
        isOpen={refundModalOpen}
        onClose={() => setRefundModalOpen(false)}
        title="申请退款"
        size="md"
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">退款原因</label>
            <textarea
              value={refundReason}
              onChange={(e) => setRefundReason(e.target.value)}
              className="input-field min-h-[100px]"
              placeholder="请输入退款原因..."
            />
          </div>
          <div className="flex justify-end gap-3">
            <button
              onClick={() => setRefundModalOpen(false)}
              className="btn-secondary"
            >
              取消
            </button>
            <button onClick={confirmRefund} className="btn-danger">
              确认退款
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
