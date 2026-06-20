import { UserQuota, QuotaUsageRecord, QuotaPlan, PlanChangeRecord } from '../types';

export const DEFAULT_QUOTA_PLANS: QuotaPlan[] = [
  {
    id: 'plan_normal',
    name: '普通用户',
    monthlyQuota: 3,
    perUseDeductionCap: 5,
    description: '每月3次免费借伞，单次最高抵扣5元',
    isActive: true,
    createdAt: '2026-01-01T00:00:00Z',
  },
  {
    id: 'plan_member',
    name: '会员用户',
    monthlyQuota: 8,
    perUseDeductionCap: 8,
    description: '每月8次免费借伞，单次最高抵扣8元',
    isActive: true,
    createdAt: '2026-01-01T00:00:00Z',
  },
  {
    id: 'plan_enterprise',
    name: '企业用户',
    monthlyQuota: 20,
    perUseDeductionCap: 10,
    description: '每月20次免费借伞，单次最高抵扣10元',
    isActive: true,
    createdAt: '2026-01-01T00:00:00Z',
  },
];

export const getQuotaPlanById = (planId: string, plans: QuotaPlan[] = DEFAULT_QUOTA_PLANS): QuotaPlan | undefined => {
  return plans.find(p => p.id === planId);
};

export const getCurrentPlan = (quota: UserQuota, plans: QuotaPlan[] = DEFAULT_QUOTA_PLANS): QuotaPlan => {
  return getQuotaPlanById(quota.currentPlanId, plans) || (plans.find(p => p.isActive) || plans[0]);
};

export const getPendingPlan = (quota: UserQuota, plans: QuotaPlan[] = DEFAULT_QUOTA_PLANS): QuotaPlan | undefined => {
  if (!quota.pendingPlanId) return undefined;
  return getQuotaPlanById(quota.pendingPlanId, plans);
};

export const createNewPlan = (
  name: string,
  monthlyQuota: number,
  perUseDeductionCap: number,
  description: string
): QuotaPlan => {
  return {
    id: `plan_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
    name,
    monthlyQuota,
    perUseDeductionCap,
    description,
    isActive: true,
    createdAt: new Date().toISOString(),
  };
};

export const togglePlanActive = (plan: QuotaPlan): QuotaPlan => {
  return { ...plan, isActive: !plan.isActive };
};

export const updatePlan = (
  plan: QuotaPlan,
  updates: Partial<Pick<QuotaPlan, 'name' | 'monthlyQuota' | 'perUseDeductionCap' | 'description'>>
): QuotaPlan => {
  return { ...plan, ...updates };
};

export const switchQuotaPlan = (
  quota: UserQuota,
  newPlanId: string
): UserQuota => {
  const newPlan = getQuotaPlanById(newPlanId);
  if (!newPlan) return quota;

  const nextResetDate = getNextResetDate();

  return {
    ...quota,
    pendingPlanId: newPlanId,
    pendingPlanEffectiveDate: nextResetDate,
  };
};

export interface MonthlyQuotaRecord {
  month: string;
  monthlyQuota: number;
  usedQuota: number;
  planId: string;
  planName: string;
  cycleStartDate: string;
  cycleEndDate: string;
}

export const generateMonthlyHistory = (
  currentQuota: UserQuota,
  usageRecords: QuotaUsageRecord[],
  monthsCount: number = 6,
  plans: QuotaPlan[] = DEFAULT_QUOTA_PLANS,
  planChangeRecords?: PlanChangeRecord[]
): MonthlyQuotaRecord[] => {
  const history: MonthlyQuotaRecord[] = [];
  const today = new Date();
  const currentPlan = getCurrentPlan(currentQuota, plans);

  for (let i = 0; i < monthsCount; i++) {
    const targetDate = new Date(today.getFullYear(), today.getMonth() - i, 1);
    const monthStr = `${targetDate.getFullYear()}-${String(targetDate.getMonth() + 1).padStart(2, '0')}`;
    const monthStart = new Date(targetDate.getFullYear(), targetDate.getMonth(), 1);
    const monthEnd = new Date(targetDate.getFullYear(), targetDate.getMonth() + 1, 0);

    const monthRecords = usageRecords.filter(record => {
      const recordDate = new Date(record.usageTime);
      return recordDate >= monthStart && recordDate <= monthEnd;
    });

    const usedQuota = monthRecords.reduce((sum, record) => sum + record.quotaUsed, 0);

    let monthPlan = currentPlan;
    if (planChangeRecords && planChangeRecords.length > 0) {
      const changesBeforeOrAtMonth = planChangeRecords
        .filter(r => r.effectiveMonth <= monthStr)
        .sort((a, b) => b.effectiveMonth.localeCompare(a.effectiveMonth));
      if (changesBeforeOrAtMonth.length > 0) {
        const latestChange = changesBeforeOrAtMonth[0];
        const plan = getQuotaPlanById(latestChange.toPlanId, plans);
        if (plan) {
          monthPlan = plan;
        }
      }
    }

    history.push({
      month: monthStr,
      monthlyQuota: monthPlan.monthlyQuota,
      usedQuota,
      planId: monthPlan.id,
      planName: monthPlan.name,
      cycleStartDate: monthStart.toISOString().split('T')[0],
      cycleEndDate: monthEnd.toISOString().split('T')[0],
    });
  }

  return history;
};

export const formatMonthDisplay = (month: string): string => {
  const [year, m] = month.split('-');
  return `${year}年${parseInt(m)}月`;
};

export const getDaysUntilReset = (): number => {
  const today = new Date();
  const nextReset = new Date(today.getFullYear(), today.getMonth() + 1, 1);
  const diffTime = nextReset.getTime() - today.getTime();
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
};

export const resetMonthlyQuota = (
  quota: UserQuota,
  currentDate: Date = new Date()
): UserQuota => {
  const currentMonth = currentDate.getMonth();
  const currentYear = currentDate.getFullYear();
  const lastResetDate = new Date(quota.lastResetDate);
  
  const needsReset = 
    lastResetDate.getMonth() !== currentMonth || 
    lastResetDate.getFullYear() !== currentYear;

  if (needsReset) {
    const cycleStart = new Date(currentYear, currentMonth, 1);
    const cycleEnd = new Date(currentYear, currentMonth + 1, 0);

    let effectivePlanId = quota.currentPlanId;
    let monthlyQuota = quota.monthlyQuota;
    let pendingPlanId = quota.pendingPlanId;
    let pendingPlanEffectiveDate = quota.pendingPlanEffectiveDate;

    if (pendingPlanId && pendingPlanEffectiveDate) {
      const effectiveDate = new Date(pendingPlanEffectiveDate);
      if (currentDate >= effectiveDate) {
        const pendingPlan = getQuotaPlanById(pendingPlanId);
        if (pendingPlan) {
          effectivePlanId = pendingPlanId;
          monthlyQuota = pendingPlan.monthlyQuota;
          pendingPlanId = undefined;
          pendingPlanEffectiveDate = undefined;
        }
      }
    }
    
    return {
      ...quota,
      usedQuota: 0,
      monthlyQuota,
      currentPlanId: effectivePlanId,
      pendingPlanId,
      pendingPlanEffectiveDate,
      lastResetDate: currentDate.toISOString().split('T')[0],
      cycleStartDate: cycleStart.toISOString().split('T')[0],
      cycleEndDate: cycleEnd.toISOString().split('T')[0],
    };
  }

  return quota;
};

export const hasAvailableQuota = (quota: UserQuota): boolean => {
  return quota.usedQuota < quota.monthlyQuota;
};

export const getRemainingQuota = (quota: UserQuota): number => {
  return Math.max(0, quota.monthlyQuota - quota.usedQuota);
};

export const getQuotaUsagePercentage = (quota: UserQuota): number => {
  if (quota.monthlyQuota === 0) return 0;
  return Math.round((quota.usedQuota / quota.monthlyQuota) * 100);
};

export const useQuota = (
  quota: UserQuota,
  rentalId: string,
  description: string = '借伞使用免费额度'
): { updatedQuota: UserQuota; usageRecord: QuotaUsageRecord | null } => {
  if (!hasAvailableQuota(quota)) {
    return { updatedQuota: quota, usageRecord: null };
  }

  const updatedQuota: UserQuota = {
    ...quota,
    usedQuota: quota.usedQuota + 1,
  };

  const usageRecord: QuotaUsageRecord = {
    id: `quota_usage_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    userId: quota.userId,
    rentalId,
    quotaUsed: 1,
    usageTime: new Date().toISOString(),
    description,
  };

  return { updatedQuota, usageRecord };
};

export const calculateDaysRemainingInCycle = (quota: UserQuota): number => {
  const cycleEnd = new Date(quota.cycleEndDate);
  const today = new Date();
  const diffTime = cycleEnd.getTime() - today.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return Math.max(0, diffDays);
};

export const formatQuotaPeriod = (quota: UserQuota): string => {
  const start = new Date(quota.cycleStartDate);
  const end = new Date(quota.cycleEndDate);
  
  const formatDate = (date: Date) => 
    `${date.getFullYear()}年${date.getMonth() + 1}月${date.getDate()}日`;
  
  return `${formatDate(start)} - ${formatDate(end)}`;
};

export const checkAndResetQuotaIfNeeded = (
  quota: UserQuota,
  currentDate: Date = new Date()
): { quota: UserQuota; wasReset: boolean } => {
  const resetQuota = resetMonthlyQuota(quota, currentDate);
  const wasReset = resetQuota.usedQuota === 0 && quota.usedQuota > 0;
  return { quota: resetQuota, wasReset };
};

export const getNextResetDate = (currentDate: Date = new Date()): string => {
  const nextMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1);
  return nextMonth.toISOString().split('T')[0];
};

export const createInitialQuota = (
  userId: string,
  monthlyQuota: number = 5,
  planId: string = 'plan_normal'
): UserQuota => {
  const now = new Date();
  const cycleStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const cycleEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0);

  return {
    userId,
    monthlyQuota,
    usedQuota: 0,
    lastResetDate: now.toISOString().split('T')[0],
    cycleStartDate: cycleStart.toISOString().split('T')[0],
    cycleEndDate: cycleEnd.toISOString().split('T')[0],
    currentPlanId: planId,
  };
};

export const calculateQuotaSavings = (
  usageRecords: QuotaUsageRecord[],
  pricePerUse: number = 5
): number => {
  return usageRecords.length * pricePerUse;
};
