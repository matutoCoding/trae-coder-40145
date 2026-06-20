import { Tag, Ticket, Percent, Gift } from 'lucide-react';
import { DiscountDetail } from '../types';
import { formatCurrency } from '../services/transactionService';

interface DiscountDetailsProps {
  details: DiscountDetail[];
  baseAmount: number;
  crossSiteFee: number;
  finalAmount: number;
}

export const DiscountDetails = ({
  details,
  baseAmount,
  crossSiteFee,
  finalAmount,
}: DiscountDetailsProps) => {
  const getIcon = (type: DiscountDetail['type']) => {
    switch (type) {
      case 'coupon':
        return <Ticket className="w-4 h-4" />;
      case 'promotion':
        return <Percent className="w-4 h-4" />;
      case 'quota':
        return <Gift className="w-4 h-4" />;
    }
  };

  const getColor = (type: DiscountDetail['type']) => {
    switch (type) {
      case 'coupon':
        return 'text-accent-600 bg-accent-50';
      case 'promotion':
        return 'text-green-600 bg-green-50';
      case 'quota':
        return 'text-primary-600 bg-primary-50';
    }
  };

  const totalDiscount = details.reduce((sum, d) => sum + d.amount, 0);
  const totalBeforeDiscount = baseAmount + crossSiteFee;

  return (
    <div className="space-y-3">
      <div className="flex justify-between text-sm">
        <span className="text-gray-500">基础费用</span>
        <span className="font-medium">{formatCurrency(baseAmount)}</span>
      </div>

      {crossSiteFee > 0 && (
        <div className="flex justify-between text-sm">
          <span className="text-gray-500">异点归还费</span>
          <span className="font-medium">{formatCurrency(crossSiteFee)}</span>
        </div>
      )}

      {details.length > 0 && (
        <>
          <div className="border-t border-gray-100 pt-3">
            <div className="flex items-center gap-2 mb-2">
              <Tag className="w-4 h-4 text-accent-500" />
              <span className="text-sm font-medium text-gray-700">优惠明细</span>
            </div>
            <div className="space-y-2">
              {details.map((detail, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between pl-2"
                >
                  <div className="flex items-center gap-2">
                    <span
                      className={`w-6 h-6 rounded-full flex items-center justify-center ${getColor(
                        detail.type
                      )}`}
                    >
                      {getIcon(detail.type)}
                    </span>
                    <div>
                      <p className="text-sm font-medium text-gray-700">
                        {detail.name}
                      </p>
                      <p className="text-xs text-gray-500">
                        {detail.description}
                      </p>
                    </div>
                  </div>
                  <span className="text-sm font-medium text-green-600">
                    -{formatCurrency(detail.amount)}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div className="flex justify-between text-sm border-t border-gray-100 pt-3">
            <span className="text-gray-500">优惠合计</span>
            <span className="font-medium text-green-600">
              -{formatCurrency(totalDiscount)}
            </span>
          </div>
        </>
      )}

      <div className="flex justify-between pt-3 border-t-2 border-primary-100">
        <span className="font-semibold text-gray-900">应付金额</span>
        <span className="text-xl font-bold text-primary-600">
          {formatCurrency(finalAmount)}
        </span>
      </div>

      {totalBeforeDiscount > 0 && finalAmount === 0 && (
        <div className="text-center text-sm text-green-600 bg-green-50 py-2 rounded-md">
          优惠后金额为0，无需支付
        </div>
      )}
    </div>
  );
};
