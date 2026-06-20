import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import {
  Coupon,
  DiscountPromotion,
  DiscountConfig,
  PricingRule,
  UserQuota,
  User,
  RentalRecord,
  Bill,
  Transaction,
  Site,
  QuotaUsageRecord,
  CalculationResult,
} from '../types';
import {
  mockUser,
  mockUserQuota,
  mockCoupons,
  mockPromotions,
  mockDiscountConfig,
  mockPricingRule,
  mockSites,
  mockRentalRecords,
  mockBills,
  mockTransactions,
  mockQuotaUsageRecords,
  generateId,
} from '../data/mockData';
import {
  calculateFinalAmount,
  calculateBaseAmount,
  calculateRentalDuration,
  calculateCrossSiteReturn,
} from '../services/discountService';
import { useQuota, checkAndResetQuotaIfNeeded } from '../services/quotaService';
import { generateBill, payBill, refundBill } from '../services/billService';
import { createRechargeTransaction, formatCurrency } from '../services/transactionService';

interface AppState {
  user: User;
  userQuota: UserQuota;
  coupons: Coupon[];
  promotions: DiscountPromotion[];
  discountConfig: DiscountConfig;
  pricingRule: PricingRule;
  sites: Site[];
  rentalRecords: RentalRecord[];
  bills: Bill[];
  transactions: Transaction[];
  quotaUsageRecords: QuotaUsageRecord[];
  currentRental: RentalRecord | null;
  selectedCoupon: Coupon | null;
  notifications: { id: string; message: string; type: 'success' | 'error' | 'info' }[];

  setSelectedCoupon: (coupon: Coupon | null) => void;
  addNotification: (message: string, type: 'success' | 'error' | 'info') => void;
  removeNotification: (id: string) => void;

  updateDiscountConfig: (config: Partial<DiscountConfig>) => void;
  updatePricingRule: (rule: Partial<PricingRule>) => void;
  addCoupon: (coupon: Omit<Coupon, 'id'>) => void;
  updateCoupon: (id: string, coupon: Partial<Coupon>) => void;
  deleteCoupon: (id: string) => void;
  addPromotion: (promotion: Omit<DiscountPromotion, 'id'>) => void;
  updatePromotion: (id: string, promotion: Partial<DiscountPromotion>) => void;
  deletePromotion: (id: string) => void;

  borrowUmbrella: (siteId: string, useQuota: boolean) => void;
  returnUmbrella: (siteId: string) => void;
  cancelRental: () => void;
  previewCharges: (durationMinutes: number, borrowSiteId: string, returnSiteId: string, useQuota?: number) => CalculationResult;
  calculateDiscountByAmount: (amount: number, coupon: Coupon | null, useQuota?: number) => CalculationResult;

  payBill: (billId: string) => void;
  refundBill: (billId: string, reason: string) => void;

  recharge: (amount: number) => void;

  updateMonthlyQuota: (newQuota: number) => void;
  resetQuotaManually: () => void;
}

export const useStore = create<AppState>()(
  persist(
    (set, get) => ({
      user: mockUser,
      userQuota: mockUserQuota,
      coupons: mockCoupons,
      promotions: mockPromotions,
      discountConfig: mockDiscountConfig,
      pricingRule: mockPricingRule,
      sites: mockSites,
      rentalRecords: mockRentalRecords,
      bills: mockBills,
      transactions: mockTransactions,
      quotaUsageRecords: mockQuotaUsageRecords,
      currentRental: mockRentalRecords.find(r => r.status === 'ongoing') || null,
      selectedCoupon: null,
      notifications: [],

      setSelectedCoupon: (coupon) => set({ selectedCoupon: coupon }),

      addNotification: (message, type) => {
        const id = generateId('notif');
        set(state => ({
          notifications: [...state.notifications, { id, message, type }],
        }));
        setTimeout(() => {
          get().removeNotification(id);
        }, 3000);
      },

      removeNotification: (id) =>
        set(state => ({
          notifications: state.notifications.filter(n => n.id !== id),
        })),

      updateDiscountConfig: (config) =>
        set(state => ({
          discountConfig: { ...state.discountConfig, ...config },
        })),

      updatePricingRule: (rule) =>
        set(state => ({
          pricingRule: { ...state.pricingRule, ...rule },
        })),

      addCoupon: (coupon) =>
        set(state => ({
          coupons: [...state.coupons, { ...coupon, id: generateId('coupon') }],
        })),

      updateCoupon: (id, coupon) =>
        set(state => ({
          coupons: state.coupons.map(c =>
            c.id === id ? { ...c, ...coupon } : c
          ),
        })),

      deleteCoupon: (id) =>
        set(state => ({
          coupons: state.coupons.filter(c => c.id !== id),
        })),

      addPromotion: (promotion) =>
        set(state => ({
          promotions: [...state.promotions, { ...promotion, id: generateId('promo') }],
        })),

      updatePromotion: (id, promotion) =>
        set(state => ({
          promotions: state.promotions.map(p =>
            p.id === id ? { ...p, ...promotion } : p
          ),
        })),

      deletePromotion: (id) =>
        set(state => ({
          promotions: state.promotions.filter(p => p.id !== id),
        })),

      borrowUmbrella: (siteId, useQuotaFlag) => {
        const state = get();
        
        if (state.currentRental) {
          state.addNotification('您有未归还的雨伞', 'error');
          return;
        }

        const site = state.sites.find(s => s.id === siteId);
        if (!site || site.availableUmbrellas <= 0) {
          state.addNotification('该站点暂无可用雨伞', 'error');
          return;
        }

        let { quota: userQuota } = checkAndResetQuotaIfNeeded(state.userQuota);
        let quotaUsed = 0;
        let usageRecord: QuotaUsageRecord | null = null;

        if (useQuotaFlag) {
          const result = useQuota(userQuota, 'pending');
          if (result.usageRecord) {
            userQuota = result.updatedQuota;
            quotaUsed = 1;
            usageRecord = result.usageRecord;
          }
        }

        const rental: RentalRecord = {
          id: generateId('rental'),
          userId: state.user.id,
          umbrellaId: `umb_${Date.now()}`,
          borrowSiteId: siteId,
          borrowSiteName: site.name,
          borrowTime: new Date().toISOString(),
          baseAmount: 0,
          crossSiteFee: 0,
          couponDiscount: 0,
          promotionDiscount: 0,
          finalAmount: 0,
          quotaUsed,
          status: 'ongoing',
          discountDetails: [],
        };

        if (usageRecord) {
          usageRecord.rentalId = rental.id;
        }

        set(s => ({
          currentRental: rental,
          rentalRecords: [rental, ...s.rentalRecords],
          userQuota,
          quotaUsageRecords: usageRecord
            ? [usageRecord, ...s.quotaUsageRecords]
            : s.quotaUsageRecords,
          sites: s.sites.map(s =>
            s.id === siteId
              ? { ...s, availableUmbrellas: s.availableUmbrellas - 1 }
              : s
          ),
        }));

        state.addNotification(
          quotaUsed > 0 ? '成功借伞，使用免费额度' : '成功借伞',
          'success'
        );
      },

      returnUmbrella: (returnSiteId) => {
        const state = get();
        
        if (!state.currentRental) {
          state.addNotification('没有正在进行的租借', 'error');
          return;
        }

        const returnSite = state.sites.find(s => s.id === returnSiteId);
        if (!returnSite) {
          state.addNotification('站点不存在', 'error');
          return;
        }

        const returnTime = new Date().toISOString();
        const duration = calculateRentalDuration(
          state.currentRental.borrowTime,
          returnTime
        );

        const baseAmount = calculateBaseAmount(duration, state.pricingRule);
        const { crossSiteFee } = calculateCrossSiteReturn(
          state.currentRental.borrowSiteId,
          returnSiteId,
          state.pricingRule
        );

        const calculationResult = calculateFinalAmount(
          baseAmount,
          crossSiteFee,
          state.selectedCoupon,
          state.promotions,
          state.discountConfig,
          state.pricingRule,
          state.currentRental.quotaUsed
        );

        const updatedRental: RentalRecord = {
          ...state.currentRental,
          returnSiteId,
          returnSiteName: returnSite.name,
          returnTime,
          duration,
          baseAmount: calculationResult.baseAmount,
          crossSiteFee: calculationResult.crossSiteFee,
          couponDiscount: calculationResult.couponDiscount,
          promotionDiscount: calculationResult.promotionDiscount,
          finalAmount: calculationResult.finalAmount,
          status: 'completed',
          discountDetails: calculationResult.details,
          couponId: state.selectedCoupon?.id,
        };

        const bill = generateBill(updatedRental, calculationResult);

        let updatedUser = state.user;
        let transaction: Transaction | null = null;

        if (bill.status === 'pending' && bill.finalAmount > 0) {
          try {
            const result = payBill(bill, state.user);
            bill.status = result.updatedBill.status;
            bill.paidTime = result.updatedBill.paidTime;
            updatedUser = result.updatedUser;
            transaction = result.transaction;
            
            if (bill.quotaUsed > 0) {
              transaction.description = `雨伞租借（使用免费额度抵扣${formatCurrency(bill.quotaDiscount)}）`;
            }
          } catch (e) {
            state.addNotification((e as Error).message, 'error');
          }
        } else if (bill.finalAmount === 0 && bill.quotaUsed > 0) {
          transaction = {
            id: generateId('trans'),
            userId: state.user.id,
            type: 'rental',
            amount: 0,
            balance: state.user.balance,
            description: `雨伞租借（免费额度抵扣${formatCurrency(bill.quotaDiscount)}，无需支付）`,
            createTime: new Date().toISOString(),
            relatedBillId: bill.id,
          };
        }

        set(s => ({
          currentRental: null,
          selectedCoupon: null,
          rentalRecords: s.rentalRecords.map(r =>
            r.id === updatedRental.id ? updatedRental : r
          ),
          bills: [bill, ...s.bills],
          user: updatedUser,
          transactions: transaction
            ? [transaction, ...s.transactions]
            : s.transactions,
          sites: s.sites.map(s =>
            s.id === returnSiteId
              ? { ...s, availableUmbrellas: s.availableUmbrellas + 1 }
              : s
          ),
        }));

        const quotaUsed = calculationResult.quotaUsed;
        const quotaDiscount = calculationResult.details.find(d => d.type === 'quota')?.amount || 0;
        let notificationMsg = `还伞成功`;
        if (quotaUsed > 0) {
          notificationMsg += `，免费额度抵扣${formatCurrency(quotaDiscount)}`;
        }
        if (calculationResult.finalAmount > 0) {
          notificationMsg += `，支付${formatCurrency(calculationResult.finalAmount)}`;
        } else if (quotaUsed === 0) {
          notificationMsg += `，无需支付`;
        }
        state.addNotification(notificationMsg, 'success');
      },

      cancelRental: () => {
        const state = get();
        if (!state.currentRental) return;

        set(s => ({
          currentRental: null,
          rentalRecords: s.rentalRecords.filter(
            r => r.id !== s.currentRental?.id
          ),
        }));

        state.addNotification('租借已取消', 'info');
      },

      previewCharges: (durationMinutes, borrowSiteId, returnSiteId, useQuota = 0) => {
        const state = get();
        const baseAmount = calculateBaseAmount(durationMinutes, state.pricingRule);
        const { crossSiteFee } = calculateCrossSiteReturn(
          borrowSiteId,
          returnSiteId,
          state.pricingRule
        );

        return calculateFinalAmount(
          baseAmount,
          crossSiteFee,
          state.selectedCoupon,
          state.promotions,
          state.discountConfig,
          state.pricingRule,
          useQuota
        );
      },

      calculateDiscountByAmount: (amount, coupon, useQuota = 0) => {
        const state = get();
        return calculateFinalAmount(
          amount,
          0,
          coupon,
          state.promotions,
          state.discountConfig,
          state.pricingRule,
          useQuota
        );
      },

      payBill: (billId) => {
        const state = get();
        const bill = state.bills.find(b => b.id === billId);
        
        if (!bill) {
          state.addNotification('账单不存在', 'error');
          return;
        }

        try {
          const result = payBill(bill, state.user);
          set(s => ({
            bills: s.bills.map(b =>
              b.id === billId ? result.updatedBill : b
            ),
            user: result.updatedUser,
            transactions: [result.transaction, ...s.transactions],
          }));
          state.addNotification('支付成功', 'success');
        } catch (e) {
          state.addNotification((e as Error).message, 'error');
        }
      },

      refundBill: (billId, reason) => {
        const state = get();
        const bill = state.bills.find(b => b.id === billId);
        
        if (!bill) {
          state.addNotification('账单不存在', 'error');
          return;
        }

        try {
          const result = refundBill(bill, state.user, reason);
          set(s => ({
            bills: s.bills.map(b =>
              b.id === billId ? result.updatedBill : b
            ),
            user: result.updatedUser,
            transactions: [result.transaction, ...s.transactions],
          }));
          state.addNotification('退款成功', 'success');
        } catch (e) {
          state.addNotification((e as Error).message, 'error');
        }
      },

      recharge: (amount) => {
        const state = get();
        try {
          const result = createRechargeTransaction(state.user, amount);
          set(s => ({
            user: result.updatedUser,
            transactions: [result.transaction, ...s.transactions],
          }));
          state.addNotification(`充值成功：¥${amount.toFixed(2)}`, 'success');
        } catch (e) {
          state.addNotification((e as Error).message, 'error');
        }
      },

      updateMonthlyQuota: (newQuota) =>
        set(state => ({
          userQuota: { ...state.userQuota, monthlyQuota: newQuota },
        })),

      resetQuotaManually: () =>
        set(state => ({
          userQuota: {
            ...state.userQuota,
            usedQuota: 0,
            lastResetDate: new Date().toISOString().split('T')[0],
          },
        })),
    }),
    {
      name: 'umbrella-share-storage',
      partialize: state => ({
        user: state.user,
        userQuota: state.userQuota,
        coupons: state.coupons,
        promotions: state.promotions,
        discountConfig: state.discountConfig,
        pricingRule: state.pricingRule,
        rentalRecords: state.rentalRecords,
        bills: state.bills,
        transactions: state.transactions,
        quotaUsageRecords: state.quotaUsageRecords,
        currentRental: state.currentRental,
      }),
    }
  )
);
