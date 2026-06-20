import {
  Coupon,
  DiscountPromotion,
  DiscountConfig,
  DiscountDetail,
  PricingRule,
  CalculationResult,
  CouponType,
} from '../types';
import { formatCurrency } from './transactionService';

export const calculateBaseAmount = (
  durationMinutes: number,
  pricingRule: PricingRule
): number => {
  if (durationMinutes <= pricingRule.freeMinutes) {
    return 0;
  }

  const billableMinutes = durationMinutes - pricingRule.freeMinutes;
  const billableHours = Math.ceil(billableMinutes / 60);
  
  let amount = pricingRule.basePrice + (billableHours - 1) * pricingRule.pricePerHour;
  
  if (amount > pricingRule.maxDailyPrice) {
    amount = pricingRule.maxDailyPrice;
  }

  return Math.round(amount * 100) / 100;
};

export const calculateCouponDiscount = (
  amount: number,
  coupon: Coupon,
  pricingRule: PricingRule
): { discount: number; freeHours?: number } => {
  if (!coupon.isActive || amount < coupon.minAmount) {
    return { discount: 0 };
  }

  const now = new Date();
  const validFrom = new Date(coupon.validFrom);
  const validTo = new Date(coupon.validTo);
  
  if (now < validFrom || now > validTo) {
    return { discount: 0 };
  }

  switch (coupon.type) {
    case 'fixed':
      return { discount: Math.min(coupon.value, amount) };
    
    case 'percentage':
      let percentageDiscount = (amount * coupon.value) / 100;
      if (coupon.maxDiscount) {
        percentageDiscount = Math.min(percentageDiscount, coupon.maxDiscount);
      }
      return { discount: Math.min(percentageDiscount, amount) };
    
    case 'free_hours':
      const freeHoursValue = coupon.value * pricingRule.pricePerHour;
      return { discount: Math.min(freeHoursValue, amount), freeHours: coupon.value };
    
    default:
      return { discount: 0 };
  }
};

export const calculatePromotionDiscount = (
  amount: number,
  promotions: DiscountPromotion[]
): { discount: number; promotion?: DiscountPromotion } => {
  const activePromotions = promotions.filter(p => {
    if (!p.isActive) return false;
    const now = new Date();
    const validFrom = new Date(p.validFrom);
    const validTo = new Date(p.validTo);
    return now >= validFrom && now <= validTo;
  });

  let maxDiscount = 0;
  let bestPromotion: DiscountPromotion | undefined;

  for (const promo of activePromotions) {
    if (amount >= promo.threshold && promo.discount > maxDiscount) {
      maxDiscount = promo.discount;
      bestPromotion = promo;
    }
  }

  return { discount: Math.min(maxDiscount, amount), promotion: bestPromotion };
};

export const calculateCrossSiteReturn = (
  borrowSiteId: string,
  returnSiteId: string,
  pricingRule: PricingRule
): { crossSiteFee: number; isCrossSite: boolean } => {
  const isCrossSite = borrowSiteId !== returnSiteId;
  const crossSiteFee = isCrossSite ? pricingRule.crossSiteReturnFee : 0;
  return { crossSiteFee, isCrossSite };
};

export const getCouponDescription = (coupon: Coupon): string => {
  switch (coupon.type) {
    case 'fixed':
      return `满${coupon.minAmount}元减${coupon.value}元`;
    case 'percentage':
      const discountPercent = (100 - coupon.value) / 10;
      return `${discountPercent}折优惠${coupon.maxDiscount ? `，最高减${coupon.maxDiscount}元` : ''}`;
    case 'free_hours':
      return `免费${coupon.value}小时`;
    default:
      return coupon.name;
  }
};

export const calculateQuotaDiscount = (
  baseAmount: number,
  quotaUsed: number,
  pricingRule: PricingRule
): { quotaDiscount: number; effectiveAmount: number } => {
  if (quotaUsed <= 0 || baseAmount <= 0) {
    return { quotaDiscount: 0, effectiveAmount: baseAmount };
  }

  const quotaValue = pricingRule.pricePerHour;
  const quotaDiscount = Math.min(quotaValue * quotaUsed, baseAmount);
  const effectiveAmount = Math.max(0, baseAmount - quotaDiscount);

  return {
    quotaDiscount: Math.round(quotaDiscount * 100) / 100,
    effectiveAmount: Math.round(effectiveAmount * 100) / 100,
  };
};

export const calculateFinalAmount = (
  baseAmount: number,
  crossSiteFee: number,
  coupon: Coupon | null,
  promotions: DiscountPromotion[],
  config: DiscountConfig,
  pricingRule: PricingRule,
  useQuota: number = 0
): CalculationResult => {
  const { quotaDiscount, effectiveAmount } = calculateQuotaDiscount(
    baseAmount,
    useQuota,
    pricingRule
  );

  const details: DiscountDetail[] = [];

  if (quotaDiscount > 0) {
    details.push({
      type: 'quota',
      name: '免费额度',
      amount: quotaDiscount,
      description: `使用免费额度${useQuota}次，抵扣${formatCurrency(quotaDiscount)}`,
    });
  }

  let currentAmount = effectiveAmount + crossSiteFee;
  let couponDiscount = 0;
  let promotionDiscount = 0;

  if (config.order === 'coupon_first') {
    if (coupon && coupon.isActive) {
      const { discount } = calculateCouponDiscount(currentAmount, coupon, pricingRule);
      couponDiscount = discount;
      currentAmount -= discount;
      if (discount > 0) {
        details.push({
          type: 'coupon',
          name: coupon.name,
          amount: discount,
          description: getCouponDescription(coupon),
        });
      }
    }

    if (config.allowStacking) {
      const { discount, promotion } = calculatePromotionDiscount(currentAmount, promotions);
      promotionDiscount = discount;
      currentAmount -= discount;
      if (discount > 0 && promotion) {
        details.push({
          type: 'promotion',
          name: promotion.name,
          amount: discount,
          description: `满${promotion.threshold}减${promotion.discount}`,
        });
      }
    }
  } else {
    const { discount, promotion } = calculatePromotionDiscount(currentAmount, promotions);
    promotionDiscount = discount;
    currentAmount -= discount;
    if (discount > 0 && promotion) {
      details.push({
        type: 'promotion',
        name: promotion.name,
        amount: discount,
        description: `满${promotion.threshold}减${promotion.discount}`,
      });
    }

    if (config.allowStacking && coupon && coupon.isActive) {
      const { discount } = calculateCouponDiscount(currentAmount, coupon, pricingRule);
      couponDiscount = discount;
      currentAmount -= discount;
      if (discount > 0) {
        details.push({
          type: 'coupon',
          name: coupon.name,
          amount: discount,
          description: getCouponDescription(coupon),
        });
      }
    }
  }

  if (config.negativeProtection && currentAmount < 0) {
    currentAmount = 0;
  }

  return {
    finalAmount: Math.round(currentAmount * 100) / 100,
    baseAmount: Math.round(baseAmount * 100) / 100,
    crossSiteFee: Math.round(crossSiteFee * 100) / 100,
    couponDiscount: Math.round(couponDiscount * 100) / 100,
    promotionDiscount: Math.round(promotionDiscount * 100) / 100,
    quotaUsed: useQuota,
    details,
  };
};

export const calculateRentalDuration = (
  borrowTime: string,
  returnTime: string
): number => {
  const borrow = new Date(borrowTime).getTime();
  const returnT = new Date(returnTime).getTime();
  return Math.ceil((returnT - borrow) / (1000 * 60));
};

export const isCouponValid = (coupon: Coupon, amount: number): boolean => {
  if (!coupon.isActive) return false;
  if (amount < coupon.minAmount) return false;
  
  const now = new Date();
  const validFrom = new Date(coupon.validFrom);
  const validTo = new Date(coupon.validTo);
  
  return now >= validFrom && now <= validTo;
};

export const getActiveCoupons = (coupons: Coupon[], amount: number): Coupon[] => {
  return coupons.filter(coupon => isCouponValid(coupon, amount));
};

export const getCouponTypeLabel = (type: CouponType): string => {
  const labels: Record<CouponType, string> = {
    fixed: '固定金额',
    percentage: '折扣',
    free_hours: '免费时长',
  };
  return labels[type];
};
