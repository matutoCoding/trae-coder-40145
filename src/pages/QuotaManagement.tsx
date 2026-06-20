import { useState, useMemo, useEffect } from 'react';
import {
  Gift,
  Calendar,
  Clock,
  RefreshCw,
  Settings,
  Shield,
  History,
  CheckCircle,
  AlertTriangle,
  Plus,
  Minus,
  BarChart3,
  RotateCcw,
  Edit2,
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts';
import { useStore } from '../store/useStore';
import { Modal } from '../components/Modal';
import { Switch } from '../components/Switch';
import { QuotaPlan } from '../types';
import {
  getRemainingQuota,
  getQuotaUsagePercentage,
  calculateDaysRemainingInCycle,
  formatQuotaPeriod,
  calculateQuotaSavings,
  checkAndResetQuotaIfNeeded,
  generateMonthlyHistory,
  formatMonthDisplay,
  getNextResetDate,
  getDaysUntilReset,
  MonthlyQuotaRecord,
  getCurrentPlan,
  getPendingPlan,
  DEFAULT_QUOTA_PLANS,
} from '../services/quotaService';
import { formatCurrency, formatDateTime, formatDate } from '../services/transactionService';

export const QuotaManagement = () => {
  const {
    userQuota,
    quotaUsageRecords,
    updateMonthlyQuota,
    resetQuotaManually,
    user,
    quotaPlans,
    switchQuotaPlan,
    addQuotaPlan,
    updateQuotaPlan,
    toggleQuotaPlanActive,
  } = useStore();
  const [settingsModalOpen, setSettingsModalOpen] = useState(false);
  const [newMonthlyQuota, setNewMonthlyQuota] = useState(userQuota.monthlyQuota);
  const [confirmResetOpen, setConfirmResetOpen] = useState(false);
  const [confirmPlanOpen, setConfirmPlanOpen] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<QuotaPlan | null>(null);
  const [planModalOpen, setPlanModalOpen] = useState(false);
  const [editingPlan, setEditingPlan] = useState<QuotaPlan | null>(null);
  const [planForm, setPlanForm] = useState<{
    name: string;
    monthlyQuota: number;
    perUseDeductionCap: number;
    description: string;
  }>({
    name: '',
    monthlyQuota: 0,
    perUseDeductionCap: 0,
    description: '',
  });

  const { quota: currentQuota, wasReset } = checkAndResetQuotaIfNeeded(userQuota);

  const currentPlan = getCurrentPlan(currentQuota);
  const pendingPlan = getPendingPlan(currentQuota);

  const remainingQuota = getRemainingQuota(currentQuota);
  const usagePercentage = getQuotaUsagePercentage(currentQuota);
  const daysRemaining = calculateDaysRemainingInCycle(currentQuota);
  const totalSavings = calculateQuotaSavings(quotaUsageRecords, currentPlan.perUseDeductionCap);
  const nextResetDate = getNextResetDate();
  const daysUntilReset = getDaysUntilReset();

  const monthlyHistory = useMemo(() => {
    return generateMonthlyHistory(currentQuota, quotaUsageRecords, 6).reverse();
  }, [currentQuota, quotaUsageRecords]);

  const sortedRecords = [...quotaUsageRecords].sort(
    (a, b) => new Date(b.usageTime).getTime() - new Date(a.usageTime).getTime()
  );

  const handleSaveSettings = () => {
    updateMonthlyQuota(newMonthlyQuota);
    setSettingsModalOpen(false);
  };

  const handleReset = () => {
    resetQuotaManually();
    setConfirmResetOpen(false);
  };

  const handleSwitchPlan = (plan: QuotaPlan) => {
    setSelectedPlan(plan);
    setConfirmPlanOpen(true);
  };

  const confirmSwitchPlan = () => {
    if (selectedPlan) {
      switchQuotaPlan(selectedPlan.id);
    }
    setConfirmPlanOpen(false);
    setSelectedPlan(null);
  };

  const handleOpenPlanModal = (plan?: QuotaPlan) => {
    if (plan) {
      setEditingPlan(plan);
      setPlanForm({
        name: plan.name,
        monthlyQuota: plan.monthlyQuota,
        perUseDeductionCap: plan.perUseDeductionCap,
        description: plan.description,
      });
    } else {
      setEditingPlan(null);
      setPlanForm({
        name: '',
        monthlyQuota: 5,
        perUseDeductionCap: 5,
        description: '',
      });
    }
    setPlanModalOpen(true);
  };

  const handleSavePlan = () => {
    if (!planForm.name.trim()) return;

    if (editingPlan) {
      updateQuotaPlan(editingPlan.id, {
        name: planForm.name,
        monthlyQuota: planForm.monthlyQuota,
        perUseDeductionCap: planForm.perUseDeductionCap,
        description: planForm.description,
      });
    } else {
      addQuotaPlan(
        planForm.name,
        planForm.monthlyQuota,
        planForm.perUseDeductionCap,
        planForm.description
      );
    }
    setPlanModalOpen(false);
  };

  const isCurrentOrPendingPlan = (planId: string) => {
    return planId === currentQuota.currentPlanId || planId === currentQuota.pendingPlanId;
  };

  const getProgressColor = (percentage: number) => {
    if (percentage >= 100) return 'bg-red-500';
    if (percentage >= 80) return 'bg-orange-500';
    if (percentage >= 50) return 'bg-yellow-500';
    return 'bg-green-500';
  };

  const getBarColor = (item: MonthlyQuotaRecord) => {
    const percentage = item.monthlyQuota > 0 ? (item.usedQuota / item.monthlyQuota) * 100 : 0;
    if (percentage >= 100) return '#EF4444';
    if (percentage >= 80) return '#F97316';
    if (percentage >= 50) return '#EAB308';
    return '#22C55E';
  };

  return (
    <div className="space-y-6">
      {wasReset && (
        <div className="bg-green-50 border border-green-200 rounded-xl p-4 animate-fade-in">
          <div className="flex items-center gap-3">
            <RotateCcw className="w-5 h-5 text-green-500 animate-spin" style={{ animationDuration: '2s' }} />
            <div>
              <p className="font-medium text-green-800">额度已自动重置</p>
              <p className="text-sm text-green-600">新的一个月开始了，您的免费额度已重置为 {currentQuota.monthlyQuota} 次</p>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 card animate-slide-up">
          <div className="flex items-start justify-between mb-6">
            <div>
              <h3 className="text-lg font-semibold text-gray-900">本月免费额度</h3>
              <p className="text-sm text-gray-500 mt-1">
                {formatQuotaPeriod(currentQuota)}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  setNewMonthlyQuota(currentQuota.monthlyQuota);
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
                  <span className="text-sm text-gray-500">/{currentQuota.monthlyQuota}</span>
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
                    {currentQuota.usedQuota} 次 ({usagePercentage}%)
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
            <h3 className="text-lg font-semibold text-gray-900 mb-4">周期信息</h3>
            <div className="space-y-4">
              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center gap-3">
                  <Calendar className="w-5 h-5 text-primary-500" />
                  <div>
                    <p className="text-sm text-gray-500">下次重置日</p>
                    <p className="font-medium text-gray-900">{formatDate(nextResetDate)}</p>
                  </div>
                </div>
                <span className="bg-primary-100 text-primary-700 px-3 py-1 rounded-full text-sm font-medium">
                  {daysUntilReset}天后
                </span>
              </div>
              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center gap-3">
                  <Clock className="w-5 h-5 text-orange-500" />
                  <div>
                    <p className="text-sm text-gray-500">本月已使用</p>
                    <p className="font-medium text-gray-900">{currentQuota.usedQuota} 次</p>
                  </div>
                </div>
                <span className="bg-orange-100 text-orange-700 px-3 py-1 rounded-full text-sm font-medium">
                  {usagePercentage}%
                </span>
              </div>
              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center gap-3">
                  <Gift className="w-5 h-5 text-green-500" />
                  <div>
                    <p className="text-sm text-gray-500">每月额度</p>
                    <p className="font-medium text-gray-900">{currentQuota.monthlyQuota} 次</p>
                  </div>
                </div>
                <span className="bg-green-100 text-green-700 px-3 py-1 rounded-full text-sm font-medium">
                  {currentPlan.name}
                </span>
              </div>
            </div>
          </div>

          <div className="card animate-slide-up animate-stagger-2">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">额度规则</h3>
            <div className="space-y-3 text-sm">
              <div className="flex items-start gap-3">
                <div className="w-6 h-6 bg-primary-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                  <span className="text-primary-600 font-semibold text-xs">1</span>
                </div>
                <div>
                  <p className="font-medium text-gray-700">每月发放</p>
                  <p className="text-gray-500">
                    每月1日自动发放 {currentQuota.monthlyQuota} 次免费借伞额度
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
                    每次借伞可使用1次免费额度，抵扣最高 {formatCurrency(currentPlan.perUseDeductionCap)}
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
        </div>
      </div>

      <div className="card animate-slide-up animate-stagger-3">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
            <Shield className="w-5 h-5 text-primary-500" />
            套餐管理
          </h3>
          <button
            onClick={() => handleOpenPlanModal()}
            className="btn-primary flex items-center gap-2 text-sm"
          >
            <Plus className="w-4 h-4" />
            新增套餐
          </button>
        </div>

        {pendingPlan && (
          <div className="mb-4 flex items-center gap-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
            <Clock className="w-5 h-5 text-blue-500 flex-shrink-0" />
            <div>
              <p className="text-sm font-medium text-blue-800">
                已选择「{pendingPlan.name}」，将于下月1日生效
              </p>
              <p className="text-xs text-blue-600">
                每月{pendingPlan.monthlyQuota}次 · 单次最高抵扣{formatCurrency(pendingPlan.perUseDeductionCap)}
              </p>
            </div>
          </div>
        )}

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr>
                <th className="table-header">套餐名称</th>
                <th className="table-header">每月次数</th>
                <th className="table-header">单次抵扣上限</th>
                <th className="table-header">描述</th>
                <th className="table-header">状态</th>
                <th className="table-header">操作</th>
              </tr>
            </thead>
            <tbody>
              {quotaPlans.map((plan, index) => {
                const isCurrent = plan.id === currentQuota.currentPlanId;
                const isPending = plan.id === currentQuota.pendingPlanId;
                return (
                  <tr
                    key={plan.id}
                    className={`hover:bg-gray-50 transition-colors animate-fade-in ${!plan.isActive ? 'opacity-60' : ''}`}
                    style={{ animationDelay: `${index * 30}ms` }}
                  >
                    <td className="table-cell">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-gray-900">{plan.name}</span>
                        {isCurrent && (
                          <span className="bg-primary-100 text-primary-700 text-xs px-2 py-0.5 rounded-full">
                            当前
                          </span>
                        )}
                        {isPending && (
                          <span className="bg-blue-100 text-blue-700 text-xs px-2 py-0.5 rounded-full">
                            待生效
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="table-cell text-sm text-gray-700">
                      {plan.monthlyQuota} 次
                    </td>
                    <td className="table-cell text-sm text-gray-700">
                      {formatCurrency(plan.perUseDeductionCap)}
                    </td>
                    <td className="table-cell text-sm text-gray-500 max-w-xs truncate">
                      {plan.description}
                    </td>
                    <td className="table-cell">
                      <Switch
                        checked={plan.isActive}
                        onChange={() => toggleQuotaPlanActive(plan.id)}
                        label={plan.isActive ? '启用' : '停用'}
                      />
                    </td>
                    <td className="table-cell">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleOpenPlanModal(plan)}
                          className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors"
                          title="编辑"
                        >
                          <Edit2 className="w-4 h-4 text-gray-500" />
                        </button>
                        {!isCurrent && plan.isActive && (
                          <button
                            onClick={() => handleSwitchPlan(plan)}
                            className="text-xs text-primary-600 hover:text-primary-700 font-medium"
                          >
                            切换
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
              {quotaPlans.length === 0 && (
                <tr>
                  <td colSpan={6} className="table-cell text-center py-8">
                    <div className="flex flex-col items-center gap-2 text-gray-400">
                      <Shield className="w-8 h-8" />
                      <p>暂无套餐</p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {editingPlan && isCurrentOrPendingPlan(editingPlan.id) && (
          <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
            <div className="flex items-start gap-2">
              <AlertTriangle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-yellow-800">
                  当前套餐修改提示
                </p>
                <p className="text-xs text-yellow-700">
                  修改当前套餐参数仅对未来周期生效，当前周期仍按原配置执行
                </p>
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="card animate-slide-up animate-stagger-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-primary-500" />
            近6个月额度使用情况
          </h3>
        </div>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={monthlyHistory} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
              <XAxis
                dataKey="month"
                tick={{ fontSize: 12 }}
                stroke="#6B7280"
                tickFormatter={(value) => formatMonthDisplay(value).replace('年', '/').replace('月', '')}
              />
              <YAxis tick={{ fontSize: 12 }} stroke="#6B7280" />
              <Tooltip
                formatter={(value: number, name: string) => [
                  `${value} 次`,
                  name === 'usedQuota' ? '已使用' : '每月额度'
                ]}
                labelFormatter={(label) => formatMonthDisplay(label)}
                contentStyle={{
                  backgroundColor: '#FFF',
                  border: '1px solid #E5E7EB',
                  borderRadius: '8px',
                  boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
                }}
              />
              <Bar
                dataKey="usedQuota"
                name="usedQuota"
                radius={[4, 4, 0, 0]}
                animationDuration={1000}
              >
                {monthlyHistory.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={getBarColor(entry)} />
                ))}
              </Bar>
              <Bar
                dataKey="monthlyQuota"
                name="monthlyQuota"
                fill="#E5E7EB"
                radius={[4, 4, 0, 0]}
                animationDuration={1000}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
        <div className="flex justify-center gap-6 mt-4">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded bg-primary-500" />
            <span className="text-sm text-gray-600">已使用</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded bg-gray-300" />
            <span className="text-sm text-gray-600">每月额度</span>
          </div>
        </div>
      </div>

      <div className="card animate-slide-up animate-stagger-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
            <History className="w-5 h-5 text-primary-500" />
            额度使用记录
          </h3>
          <span className="text-sm text-gray-500">
            共 {sortedRecords.length} 条记录
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr>
                <th className="table-header">使用时间</th>
                <th className="table-header">使用次数</th>
                <th className="table-header">描述</th>
                <th className="table-header">节省金额</th>
              </tr>
            </thead>
            <tbody>
              {sortedRecords.map((record, index) => (
                <tr
                  key={record.id}
                  className="hover:bg-gray-50 transition-colors animate-fade-in"
                  style={{ animationDelay: `${index * 30}ms` }}
                >
                  <td className="table-cell text-sm text-gray-600">
                    {formatDateTime(record.usageTime)}
                  </td>
                  <td className="table-cell">
                    <span className="inline-flex items-center justify-center w-8 h-8 bg-orange-100 text-orange-700 rounded-full font-semibold text-sm">
                      -{record.quotaUsed}
                    </span>
                  </td>
                  <td className="table-cell text-sm text-gray-700">
                    {record.description}
                  </td>
                  <td className="table-cell text-sm font-medium text-green-600">
                    {formatCurrency(currentPlan.perUseDeductionCap * record.quotaUsed)}
                  </td>
                </tr>
              ))}
              {sortedRecords.length === 0 && (
                <tr>
                  <td colSpan={4} className="table-cell text-center py-8">
                    <div className="flex flex-col items-center gap-2 text-gray-400">
                      <Clock className="w-8 h-8" />
                      <p>暂无额度使用记录</p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
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
                重置后，已使用的 {currentQuota.usedQuota} 次额度将恢复为 {currentQuota.monthlyQuota} 次。
                此操作不可撤销。
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 text-sm">
            <div className="p-3 bg-gray-50 rounded-lg">
              <p className="text-gray-500">重置前</p>
              <p className="text-lg font-semibold text-gray-900">
                {currentQuota.usedQuota} / {currentQuota.monthlyQuota}
              </p>
            </div>
            <div className="p-3 bg-green-50 rounded-lg">
              <p className="text-green-600">重置后</p>
              <p className="text-lg font-semibold text-green-700">
                0 / {currentQuota.monthlyQuota}
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

      <Modal
        isOpen={confirmPlanOpen}
        onClose={() => {
          setConfirmPlanOpen(false);
          setSelectedPlan(null);
        }}
        title="切换额度套餐"
        size="md"
      >
        <div className="space-y-4">
          {selectedPlan && (
            <>
              <div className="flex items-center gap-3 p-4 bg-blue-50 rounded-lg">
                <Shield className="w-8 h-8 text-blue-500 flex-shrink-0" />
                <div>
                  <p className="font-medium text-blue-900">
                    确认切换到「{selectedPlan.name}」套餐？
                  </p>
                  <p className="text-sm text-blue-700">
                    新套餐将于下月1日生效，当前周期仍使用「{currentPlan.name}」套餐
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 text-sm">
                <div className="p-3 bg-gray-50 rounded-lg">
                  <p className="text-gray-500 mb-1">当前套餐</p>
                  <p className="text-lg font-semibold text-gray-900">{currentPlan.name}</p>
                  <p className="text-gray-500">{currentPlan.monthlyQuota}次/月 · 抵扣{formatCurrency(currentPlan.perUseDeductionCap)}/次</p>
                </div>
                <div className="p-3 bg-primary-50 rounded-lg">
                  <p className="text-primary-600 mb-1">切换至</p>
                  <p className="text-lg font-semibold text-primary-700">{selectedPlan.name}</p>
                  <p className="text-primary-500">{selectedPlan.monthlyQuota}次/月 · 抵扣{formatCurrency(selectedPlan.perUseDeductionCap)}/次</p>
                </div>
              </div>

              <div className="p-4 bg-yellow-50 rounded-lg">
                <p className="text-sm text-yellow-700">
                  <strong>提示：</strong>套餐切换将在下一个计费周期（下月1日）自动生效，当前周期套餐保持不变。
                </p>
              </div>
            </>
          )}

          <div className="flex justify-end gap-3 pt-4">
            <button
              onClick={() => {
                setConfirmPlanOpen(false);
                setSelectedPlan(null);
              }}
              className="btn-secondary"
            >
              取消
            </button>
            <button onClick={confirmSwitchPlan} className="btn-primary">
              确认切换
            </button>
          </div>
        </div>
      </Modal>

      <Modal
        isOpen={planModalOpen}
        onClose={() => setPlanModalOpen(false)}
        title={editingPlan ? '编辑套餐' : '新增套餐'}
        size="md"
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              套餐名称
            </label>
            <input
              type="text"
              value={planForm.name}
              onChange={(e) => setPlanForm({ ...planForm, name: e.target.value })}
              className="input-field"
              placeholder="请输入套餐名称"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                每月次数
              </label>
              <input
                type="number"
                value={planForm.monthlyQuota}
                onChange={(e) => setPlanForm({ ...planForm, monthlyQuota: parseInt(e.target.value) || 0 })}
                className="input-field"
                min="0"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                单次抵扣上限（元）
              </label>
              <input
                type="number"
                value={planForm.perUseDeductionCap}
                onChange={(e) => setPlanForm({ ...planForm, perUseDeductionCap: parseFloat(e.target.value) || 0 })}
                className="input-field"
                min="0"
                step="0.5"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              描述
            </label>
            <textarea
              value={planForm.description}
              onChange={(e) => setPlanForm({ ...planForm, description: e.target.value })}
              className="input-field min-h-20 resize-y"
              placeholder="请输入套餐描述"
              rows={3}
            />
          </div>

          {editingPlan && isCurrentOrPendingPlan(editingPlan.id) && (
            <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
              <div className="flex items-start gap-2">
                <AlertTriangle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-yellow-800">
                    修改提示
                  </p>
                  <p className="text-xs text-yellow-700">
                    此套餐为当前或待生效套餐，修改后仅对未来周期生效
                  </p>
                </div>
              </div>
            </div>
          )}

          <div className="flex justify-end gap-3 pt-4">
            <button
              onClick={() => setPlanModalOpen(false)}
              className="btn-secondary"
            >
              取消
            </button>
            <button
              onClick={handleSavePlan}
              className="btn-primary"
              disabled={!planForm.name.trim()}
            >
              {editingPlan ? '保存修改' : '创建套餐'}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
