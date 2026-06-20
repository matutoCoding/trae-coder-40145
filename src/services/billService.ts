import {
  Bill,
  RentalRecord,
  User,
  Transaction,
  CalculationResult,
} from '../types';
import { generateId } from '../data/mockData';

export const generateBill = (
  rental: RentalRecord,
  calculationResult: CalculationResult,
  quotaPlanId?: string
): Bill => {
  const quotaDiscount = calculationResult.details.find(d => d.type === 'quota')?.amount || 0;
  const totalDiscount = 
    quotaDiscount +
    calculationResult.couponDiscount + 
    calculationResult.promotionDiscount;

  return {
    id: generateId('bill'),
    rentalId: rental.id,
    userId: rental.userId,
    baseAmount: calculationResult.baseAmount,
    originalBaseAmount: calculationResult.originalBaseAmount,
    crossSiteFee: calculationResult.crossSiteFee,
    quotaDiscount: Math.round(quotaDiscount * 100) / 100,
    couponDiscount: calculationResult.couponDiscount,
    promotionDiscount: calculationResult.promotionDiscount,
    totalDiscount: Math.round(totalDiscount * 100) / 100,
    finalAmount: calculationResult.finalAmount,
    status: calculationResult.finalAmount === 0 ? 'paid' : 'pending',
    createTime: new Date().toISOString(),
    paidTime: calculationResult.finalAmount === 0 ? new Date().toISOString() : undefined,
    quotaUsed: calculationResult.quotaUsed,
    quotaPlanId,
  };
};

export const payBill = (
  bill: Bill,
  user: User
): { updatedBill: Bill; updatedUser: User; transaction: Transaction } => {
  if (bill.status !== 'pending') {
    throw new Error('账单状态不正确，无法支付');
  }

  if (user.balance < bill.finalAmount) {
    throw new Error('账户余额不足');
  }

  const now = new Date().toISOString();
  
  const updatedBill: Bill = {
    ...bill,
    status: 'paid',
    paidTime: now,
  };

  const updatedUser: User = {
    ...user,
    balance: Math.round((user.balance - bill.finalAmount) * 100) / 100,
  };

  const transaction: Transaction = {
    id: generateId('trans'),
    userId: user.id,
    type: 'rental',
    amount: -bill.finalAmount,
    balance: updatedUser.balance,
    description: '雨伞租借费用',
    createTime: now,
    relatedBillId: bill.id,
  };

  return { updatedBill, updatedUser, transaction };
};

export const refundBill = (
  bill: Bill,
  user: User,
  reason: string = '退款'
): { updatedBill: Bill; updatedUser: User; transaction: Transaction } => {
  if (bill.status !== 'paid') {
    throw new Error('只有已支付的账单才能退款');
  }

  const now = new Date().toISOString();
  
  const updatedBill: Bill = {
    ...bill,
    status: 'refunded',
  };

  const updatedUser: User = {
    ...user,
    balance: Math.round((user.balance + bill.finalAmount) * 100) / 100,
  };

  const transaction: Transaction = {
    id: generateId('trans'),
    userId: user.id,
    type: 'refund',
    amount: bill.finalAmount,
    balance: updatedUser.balance,
    description: reason,
    createTime: now,
    relatedBillId: bill.id,
  };

  return { updatedBill, updatedUser, transaction };
};

export const getBillStatusLabel = (status: Bill['status']): string => {
  const labels: Record<Bill['status'], string> = {
    pending: '待支付',
    paid: '已支付',
    refunded: '已退款',
  };
  return labels[status];
};

export const getBillStatusColor = (status: Bill['status']): string => {
  const colors: Record<Bill['status'], string> = {
    pending: 'bg-amber-100 text-amber-800',
    paid: 'bg-green-100 text-green-800',
    refunded: 'bg-gray-100 text-gray-800',
  };
  return colors[status];
};

export const getBillById = (bills: Bill[], billId: string): Bill | undefined => {
  return bills.find(b => b.id === billId);
};

export const getBillsByUserId = (bills: Bill[], userId: string): Bill[] => {
  return bills.filter(b => b.userId === userId);
};

export const getBillsByStatus = (bills: Bill[], status: Bill['status']): Bill[] => {
  return bills.filter(b => b.status === status);
};

export const getBillsByDateRange = (
  bills: Bill[],
  startDate: string,
  endDate: string
): Bill[] => {
  return bills.filter(b => {
    const billDate = new Date(b.createTime);
    return billDate >= new Date(startDate) && billDate <= new Date(endDate);
  });
};

export const calculateTotalAmount = (bills: Bill[]): number => {
  return bills.reduce((sum, bill) => sum + bill.finalAmount, 0);
};

export const calculateTotalDiscount = (bills: Bill[]): number => {
  return bills.reduce((sum, bill) => sum + bill.totalDiscount, 0);
};

export const getPendingBillsCount = (bills: Bill[]): number => {
  return bills.filter(b => b.status === 'pending').length;
};

export interface MonthlyBusinessSummary {
  month: string;
  monthLabel: string;
  orderCount: number;
  originalBaseAmount: number;
  crossSiteFee: number;
  quotaDiscount: number;
  couponDiscount: number;
  promotionDiscount: number;
  totalDiscount: number;
  finalAmount: number;
  crossSiteOrderCount: number;
  quotaUsedCount: number;
  couponUsedCount: number;
}

export interface PlanBusinessSummary {
  planId: string;
  planName: string;
  orderCount: number;
  finalAmount: number;
  quotaDiscount: number;
  couponDiscount: number;
  promotionDiscount: number;
}

export const generateMonthlyBusinessSummary = (bills: Bill[]): MonthlyBusinessSummary[] => {
  const monthMap = new Map<string, MonthlyBusinessSummary>();

  for (const bill of bills) {
    if (bill.status === 'refunded') continue;
    const date = new Date(bill.createTime);
    const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;

    if (!monthMap.has(monthKey)) {
      const [year, m] = monthKey.split('-');
      monthMap.set(monthKey, {
        month: monthKey,
        monthLabel: `${year}年${parseInt(m)}月`,
        orderCount: 0,
        originalBaseAmount: 0,
        crossSiteFee: 0,
        quotaDiscount: 0,
        couponDiscount: 0,
        promotionDiscount: 0,
        totalDiscount: 0,
        finalAmount: 0,
        crossSiteOrderCount: 0,
        quotaUsedCount: 0,
        couponUsedCount: 0,
      });
    }

    const summary = monthMap.get(monthKey)!;
    summary.orderCount++;
    summary.originalBaseAmount += bill.originalBaseAmount || bill.baseAmount + (bill.quotaDiscount || 0);
    summary.crossSiteFee += bill.crossSiteFee;
    summary.quotaDiscount += bill.quotaDiscount || 0;
    summary.couponDiscount += bill.couponDiscount || 0;
    summary.promotionDiscount += bill.promotionDiscount || 0;
    summary.totalDiscount += bill.totalDiscount;
    summary.finalAmount += bill.finalAmount;
    if (bill.crossSiteFee > 0) summary.crossSiteOrderCount++;
    if ((bill.quotaUsed || 0) > 0) summary.quotaUsedCount++;
    if ((bill.couponDiscount || 0) > 0) summary.couponUsedCount++;
  }

  return Array.from(monthMap.values()).sort((a, b) => b.month.localeCompare(a.month));
};

export const generatePlanBusinessSummary = (
  bills: Bill[],
  plans: { id: string; name: string }[]
): PlanBusinessSummary[] => {
  const planMap = new Map<string, PlanBusinessSummary>();

  for (const plan of plans) {
    planMap.set(plan.id, {
      planId: plan.id,
      planName: plan.name,
      orderCount: 0,
      finalAmount: 0,
      quotaDiscount: 0,
      couponDiscount: 0,
      promotionDiscount: 0,
    });
  }

  for (const bill of bills) {
    if (bill.status === 'refunded') continue;
    const planId = bill.quotaPlanId || 'plan_normal';
    const summary = planMap.get(planId);
    if (!summary) continue;

    summary.orderCount++;
    summary.finalAmount += bill.finalAmount;
    summary.quotaDiscount += bill.quotaDiscount || 0;
    summary.couponDiscount += bill.couponDiscount || 0;
    summary.promotionDiscount += bill.promotionDiscount || 0;
  }

  return Array.from(planMap.values());
};

export const reconcileBillWithTransaction = (
  bills: Bill[],
  transactions: { type: string; relatedBillId?: string; amount: number }[]
): { matched: boolean; difference: number; billTotal: number; transactionTotal: number } => {
  const paidBills = bills.filter(b => b.status === 'paid');
  const billTotal = paidBills.reduce((sum, b) => sum + b.finalAmount, 0);

  const rentalTransactions = transactions.filter(t => t.type === 'rental');
  const transactionTotal = Math.abs(rentalTransactions.reduce((sum, t) => sum + t.amount, 0));

  return {
    matched: Math.abs(billTotal - transactionTotal) < 0.01,
    difference: Math.abs(billTotal - transactionTotal),
    billTotal,
    transactionTotal,
  };
};
