import { useState } from 'react';
import {
  Gift,
  Calendar,
  Clock,
  RefreshCw,
  Settings,
  History,
  CheckCircle,
  AlertTriangle,
  Plus,
  Minus,
} from 'lucide-react';
import { useStore } from '../store/useStore';
import { Modal } from '../components/Modal';
import {
  getRemainingQuota,
  getQuotaUsagePercentage,
  calculateDaysRemainingInCycle,
  formatQuotaPeriod,
  calculateQuotaSavings,
} from '../services/quotaService';
import { formatCurrency, formatDateTime, formatDate } from '../services/transactionService';

export const QuotaManagement = () => {
  const { userQuota, quotaUsageRecords, updateMonthlyQuota, resetQuotaManually, pricingRule } = useStore();
  const [settingsModalOpen, setSettingsModalOpen] = useState(false);
  const [newMonthlyQuota, setNewMonthlyQuota] = useState(userQuota.monthlyQuota);
  const [confirmResetOpen, setConfirmResetOpen] = useState(false);

  const remainingQuota = getRemainingQuota(userQuota);
  const usagePercentage = getQuotaUsagePercentage(userQuota);
  const daysRemaining = calculateDaysRemainingInCycle(userQuota);
  const totalSavings = calculateQuotaSavings(quotaUsageRecords, pricingRule.pricePerHour);

  const handleSaveSettings = () => {
    updateMonthlyQuota(newMonthlyQuota);
    setSettingsModalOpen(false);
  };

  const handleReset = () => {
    resetQuotaManually();
    setConfirmResetOpen(false);
  };

  const getProgressColor = (percentage: number) => {
    if (percentage >= 100) return 'bg-red-500';
    if (percentage >= 80) return 'bg-orange-500';
    if (percentage >= 50) return 'bg-yellow-500';
    return 'bg-green-500';
  };

  const sortedRecords = [...quotaUsageRecords].sort(
    (a, b) => new Date(b.usageTime).getTime() - new Date(a.usageTime).getTime()
  );

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 card animate-slide-up">
          <div className="flex items-start justify-between mb-6">
            <div>
              <h3 className="text-lg font-semibold text-gray-900">本月免费额度</h3>
              <p className="text-sm text-gray-500 mt-1">
                {formatQuotaPeriod(userQuota)}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  setNewMonthlyQuota(userQuota.monthlyQuota);
                  setSettingsModalOpen(true);
                }}
                className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
                title="额度设置"
              >
                <Settings className="w-5 h-5 text-gray-500" />
              </button>
              <button
                onClick={() => setConfirmResetOpen(true)}
                className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
                title="重置额度"
              >
                <RefreshCw className="w-5 h-5 text-gray-500" />
              </button>
            </div>
          </div>

          <div className="flex items-center gap-8 mb-6">
            <div className="relative">
              <div className="w-32 h-32 rounded-full border-8 border-gray-100 flex items-center justify-center">
                <div className="text-center">
                  <span className="text-3xl font-bold text-primary-600">
                    {remainingQuota}
                  </span>
                  <span className="text-sm text-gray-500">/{userQuota.monthlyQuota}</span>
                </div>
              </div>
              <svg
                className="absolute inset-0 w-32 h-32 -rotate-90"
                viewBox="0 0 128 128"
              >
                <circle
                  cx="64"
                  cy="64"
                  r="56"
                  fill="none"
                  stroke="#e5e7eb"
                  strokeWidth="8"
                />
                <circle
                  cx="64"
                  cy="64"
                  r="56"
                  fill="none"
                  stroke="#0F4C81"
                  strokeWidth="8"
                  strokeDasharray={`${(usagePercentage / 100) * 352} 352`}
                  strokeLinecap="round"
                  className="transition-all duration-700 ease-out"
                />
              </svg>
            </div>

            <div className="flex-1 space-y-4">
              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-gray-500">已使用</span>
                  <span className="font-medium">
                    {userQuota.usedQuota} 次 ({usagePercentage}%)
                  </span>
                </div>
                <div className="progress-bar">
                  <div
                    className={`progress-bar-fill ${getProgressColor(usagePercentage)}`}
                    style={{ width: `${Math.min(usagePercentage, 100)}%` }}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="p-3 bg-blue-50 rounded-lg">
                  <div className="flex items-center gap-2 text-blue-600 mb-1">
                    <Calendar className="w-4 h-4" />
                    <span className="text-sm">周期剩余</span>
                  </div>
                  <p className="text-xl font-bold text-blue-700">{daysRemaining} 天</p>
                </div>
                <div className="p-3 bg-green-50 rounded-lg">
                  <div className="flex items-center gap-2 text-green-600 mb-1">
                    <Gift className="w-4 h-4" />
                    <span className="text-sm">累计节省</span>
                  </div>
                  <p className="text-xl font-bold text-green-700">
                    {formatCurrency(totalSavings)}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {remainingQuota > 0 ? (
            <div className="flex items-center gap-2 p-4 bg-green-50 rounded-lg text-green-700">
              <CheckCircle className="w-5 h-5" />
              <div>
                <p className="font-medium">额度充足</p>
                <p className="text-sm">本月还可免费借伞 {remainingQuota} 次</p>
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-2 p-4 bg-orange-50 rounded-lg text-orange-700">
              <AlertTriangle className="w-5 h-5" />
              <div>
                <p className="font-medium">本月额度已用完</p>
                <p className="text-sm">后续借伞将转为付费模式，下月1日自动重置</p>
              </div>
            </div>
          )}
        </div>

        <div className="space-y-6">
          <div className="card animate-slide-up animate-stagger-1">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">额度规则</h3>
            <div className="space-y-3 text-sm">
              <div className="flex items-start gap-3">
                <div className="w-6 h-6 bg-primary-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                  <span className="text-primary-600 font-semibold text-xs">1</span>
                </div>
                <div>
                  <p className="font-medium text-gray-700">每月发放</p>
                  <p className="text-gray-500">
                    每月1日自动发放 {userQuota.monthlyQuota} 次免费借伞额度
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-6 h-6 bg-primary-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                  <span className="text-primary-600 font-semibold text-xs">2</span>
                </div>
                <div>
                  <p className="font-medium text-gray-700">额度清零</p>
                  <p className="text-gray-500">当月未使用的额度月底清零，不累加至下月</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-6 h-6 bg-primary-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                  <span className="text-primary-600 font-semibold text-xs">3</span>
                </div>
                <div>
                  <p className="font-medium text-gray-700">使用规则</p>
                  <p className="text-gray-500">
                    每次借伞可使用1次免费额度，抵扣基础费用
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-6 h-6 bg-primary-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                  <span className="text-primary-600 font-semibold text-xs">4</span>
                </div>
                <div>
                  <p className="font-medium text-gray-700">超出付费</p>
                  <p className="text-gray-500">
                    额度用完后，借伞将按正常计费规则收费
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="card animate-slide-up animate-stagger-2">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">快捷充值</h3>
            <div className="grid grid-cols-3 gap-2 mb-4">
              {[10, 20, 50, 100, 200, 500].map((amount) => (
                <button
                  key={amount}
                  className="py-2 border border-gray-200 rounded-lg text-sm font-medium hover:border-primary-500 hover:text-primary-600 transition-colors"
                >
                  ¥{amount}
                </button>
              ))}
            </div>
            <button className="btn-primary w-full">立即充值</button>
          </div>
        </div>
      </div>

      <div className="card animate-slide-up animate-stagger-3">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
            <History className="w-5 h-5 text-primary-500" />
            额度使用记录
          </h3>
          <span className="text-sm text-gray-500">
            共 {sortedRecords.length} 条记录
          </span>
        </div>

        <div className="space-y-3">
          {sortedRecords.map((record, index) => (
            <div
              key={record.id}
              className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors animate-fade-in"
              style={{ animationDelay: `${index * 50}ms` }}
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                  <Minus className="w-5 h-5 text-green-600" />
                </div>
                <div>
                  <p className="font-medium text-gray-900">{record.description}</p>
                  <p className="text-sm text-gray-500">
                    {formatDateTime(record.usageTime)}
                  </p>
                </div>
              </div>
              <div className="text-right">
                <p className="font-medium text-green-600">-1 次</p>
                <p className="text-xs text-gray-500">
                  节省 {formatCurrency(pricingRule.pricePerHour)}
                </p>
              </div>
            </div>
          ))}
          {sortedRecords.length === 0 && (
            <div className="text-center py-8 text-gray-400">
              <Clock className="w-12 h-12 mx-auto mb-2 opacity-50" />
              <p>暂无额度使用记录</p>
            </div>
          )}
        </div>
      </div>

      <Modal
        isOpen={settingsModalOpen}
        onClose={() => setSettingsModalOpen(false)}
        title="额度设置"
        size="md"
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              每月免费额度（次）
            </label>
            <div className="flex items-center gap-3">
              <button
                onClick={() => setNewMonthlyQuota(Math.max(0, newMonthlyQuota - 1))}
                className="w-10 h-10 rounded-lg border border-gray-300 flex items-center justify-center hover:bg-gray-50 transition-colors"
              >
                <Minus className="w-4 h-4" />
              </button>
              <input
                type="number"
                value={newMonthlyQuota}
                onChange={(e) => setNewMonthlyQuota(parseInt(e.target.value) || 0)}
                className="input-field w-24 text-center text-lg font-semibold"
                min="0"
              />
              <button
                onClick={() => setNewMonthlyQuota(newMonthlyQuota + 1)}
                className="w-10 h-10 rounded-lg border border-gray-300 flex items-center justify-center hover:bg-gray-50 transition-colors"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>
          </div>

          <div className="p-4 bg-blue-50 rounded-lg">
            <p className="text-sm text-blue-700">
              <strong>提示：</strong>修改每月额度后，将从下月1日起生效，当前月额度保持不变。
            </p>
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <button
              onClick={() => setSettingsModalOpen(false)}
              className="btn-secondary"
            >
              取消
            </button>
            <button onClick={handleSaveSettings} className="btn-primary">
              保存设置
            </button>
          </div>
        </div>
      </Modal>

      <Modal
        isOpen={confirmResetOpen}
        onClose={() => setConfirmResetOpen(false)}
        title="确认重置额度"
        size="md"
      >
        <div className="space-y-4">
          <div className="flex items-center gap-3 p-4 bg-orange-50 rounded-lg">
            <AlertTriangle className="w-8 h-8 text-orange-500 flex-shrink-0" />
            <div>
              <p className="font-medium text-orange-900">确认要重置本月额度吗？</p>
              <p className="text-sm text-orange-700">
                重置后，已使用的 {userQuota.usedQuota} 次额度将恢复为 {userQuota.monthlyQuota} 次。
                此操作不可撤销。
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 text-sm">
            <div className="p-3 bg-gray-50 rounded-lg">
              <p className="text-gray-500">重置前</p>
              <p className="text-lg font-semibold text-gray-900">
                {userQuota.usedQuota} / {userQuota.monthlyQuota}
              </p>
            </div>
            <div className="p-3 bg-green-50 rounded-lg">
              <p className="text-green-600">重置后</p>
              <p className="text-lg font-semibold text-green-700">
                0 / {userQuota.monthlyQuota}
              </p>
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <button
              onClick={() => setConfirmResetOpen(false)}
              className="btn-secondary"
            >
              取消
            </button>
            <button onClick={handleReset} className="btn-danger">
              确认重置
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
