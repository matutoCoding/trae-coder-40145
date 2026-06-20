export type CouponType = 'fixed' | 'percentage' | 'free_hours';

export interface Coupon {
  id: string;
  name: string;
  type: CouponType;
  value: number;
  minAmount: number;
  maxDiscount?: number;
  validFrom: string;
  validTo: string;
  isActive: boolean;
}

export interface DiscountPromotion {
  id: string;
  name: string;
  threshold: number;
  discount: number;
  validFrom: string;
  validTo: string;
  isActive: boolean;
}

export type DiscountOrder = 'coupon_first' | 'promotion_first';

export interface DiscountConfig {
  order: DiscountOrder;
  allowStacking: boolean;
  negativeProtection: boolean;
}

export interface PricingRule {
  id: string;
  name: string;
  basePrice: number;
  pricePerHour: number;
  maxDailyPrice: number;
  freeMinutes: number;
  crossSiteReturnFee: number;
  isActive: boolean;
}

export interface QuotaPlan {
  id: string;
  name: string;
  monthlyQuota: number;
  perUseDeductionCap: number;
  description: string;
}

export interface UserQuota {
  userId: string;
  monthlyQuota: number;
  usedQuota: number;
  lastResetDate: string;
  cycleStartDate: string;
  cycleEndDate: string;
  currentPlanId: string;
  pendingPlanId?: string;
  pendingPlanEffectiveDate?: string;
}

export interface User {
  id: string;
  phone: string;
  name: string;
  balance: number;
  createdAt: string;
}

export interface DiscountDetail {
  type: 'coupon' | 'promotion' | 'quota';
  name: string;
  amount: number;
  description: string;
}

export interface RentalRecord {
  id: string;
  userId: string;
  umbrellaId: string;
  borrowSiteId: string;
  borrowSiteName: string;
  returnSiteId?: string;
  returnSiteName?: string;
  borrowTime: string;
  returnTime?: string;
  duration?: number;
  baseAmount: number;
  crossSiteFee: number;
  couponDiscount: number;
  promotionDiscount: number;
  finalAmount: number;
  quotaUsed: number;
  status: 'ongoing' | 'completed' | 'cancelled';
  discountDetails: DiscountDetail[];
  couponId?: string;
}

export interface Bill {
  id: string;
  rentalId: string;
  userId: string;
  baseAmount: number;
  originalBaseAmount: number;
  crossSiteFee: number;
  quotaDiscount: number;
  couponDiscount: number;
  promotionDiscount: number;
  totalDiscount: number;
  finalAmount: number;
  status: 'pending' | 'paid' | 'refunded';
  createTime: string;
  paidTime?: string;
  quotaUsed: number;
}

export interface Transaction {
  id: string;
  userId: string;
  type: 'rental' | 'recharge' | 'refund';
  amount: number;
  balance: number;
  description: string;
  createTime: string;
  relatedBillId?: string;
}

export interface Site {
  id: string;
  name: string;
  address: string;
  availableUmbrellas: number;
}

export interface Umbrella {
  id: string;
  status: 'available' | 'in_use' | 'maintenance';
  currentSiteId: string;
}

export interface QuotaUsageRecord {
  id: string;
  userId: string;
  rentalId: string;
  quotaUsed: number;
  usageTime: string;
  description: string;
}

export interface CalculationResult {
  finalAmount: number;
  baseAmount: number;
  originalBaseAmount: number;
  crossSiteFee: number;
  couponDiscount: number;
  promotionDiscount: number;
  quotaUsed: number;
  details: DiscountDetail[];
}
