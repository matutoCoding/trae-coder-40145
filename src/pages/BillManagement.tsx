import { useState } from 'react';
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
} from '../services/transactionService';

type FilterStatus = 'all' | 'pending' | 'paid' | 'refunded';

export const BillManagement = () => {
  const [selectedBill, setSelectedBill] = useState<Bill | null>(null);
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [filterStatus, setFilterStatus] = useState<FilterStatus>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [refundModalOpen, setRefundModalOpen] = useState(false);
  const [refundReason, setRefundReason] = useState('');
  const [refundBillId, setRefundBillId] = useState<string | null>(null);

  const { bills, rentalRecords, payBill, refundBill } = useStore();

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
                        <div>基础: {formatCurrency(bill.baseAmount)}</div>
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
                crossSiteFee={selectedBill.crossSiteFee}
                finalAmount={selectedBill.finalAmount}
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
