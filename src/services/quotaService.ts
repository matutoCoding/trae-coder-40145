import { UserQuota, QuotaUsageRecord } from '../types';

export interface MonthlyQuotaRecord {
  month: string;
  monthlyQuota: number;
  usedQuota: number;
  cycleStartDate: string;
  cycleEndDate: string;
}

export const generateMonthlyHistory = (
  currentQuota: UserQuota,
  usageRecords: QuotaUsageRecord[],
  monthsCount: number = 6
): MonthlyQuotaRecord[] => {
  const history: MonthlyQuotaRecord[] = [];
  const today = new Date();

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

    history.push({
      month: monthStr,
      monthlyQuota: currentQuota.monthlyQuota,
      usedQuota,
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
    
    return {
      ...quota,
      usedQuota: 0,
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
  monthlyQuota: number = 5
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
  };
};

export const calculateQuotaSavings = (
  usageRecords: QuotaUsageRecord[],
  pricePerUse: number = 5
): number => {
  return usageRecords.length * pricePerUse;
};
