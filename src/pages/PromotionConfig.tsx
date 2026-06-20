import { useState } from 'react';
import {
  Plus,
  Edit2,
  Trash2,
  Settings,
  Ticket,
  Tag,
  ArrowRight,
  Calendar,
  Check,
} from 'lucide-react';
import { useStore } from '../store/useStore';
import { Switch } from '../components/Switch';
import { Modal } from '../components/Modal';
import { Coupon, DiscountPromotion } from '../types';
import { getCouponTypeLabel } from '../services/discountService';
import { formatDate, formatCurrency } from '../services/transactionService';

type TabType = 'pricing' | 'coupons' | 'promotions' | 'order';

export const PromotionConfig = () => {
  const [activeTab, setActiveTab] = useState<TabType>('pricing');
  const [couponModalOpen, setCouponModalOpen] = useState(false);
  const [promoModalOpen, setPromoModalOpen] = useState(false);
  const [editingCoupon, setEditingCoupon] = useState<Coupon | null>(null);
  const [editingPromo, setEditingPromo] = useState<DiscountPromotion | null>(null);
  const [demoAmount, setDemoAmount] = useState(50);
  const [demoCoupon, setDemoCoupon] = useState<string | null>(null);

  const {
    pricingRule,
    coupons,
    promotions,
    discountConfig,
    updatePricingRule,
    updateDiscountConfig,
    addCoupon,
    updateCoupon,
    deleteCoupon,
    addPromotion,
    updatePromotion,
    deletePromotion,
    previewCharges,
    setSelectedCoupon,
    selectedCoupon,
  } = useStore();

  const [couponForm, setCouponForm] = useState<Partial<Coupon>>({
    name: '',
    type: 'fixed',
    value: 0,
    minAmount: 0,
    maxDiscount: undefined,
    validFrom: new Date().toISOString().split('T')[0],
    validTo: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    isActive: true,
  });

  const [promoForm, setPromoForm] = useState<Partial<DiscountPromotion>>({
    name: '',
    threshold: 0,
    discount: 0,
    validFrom: new Date().toISOString().split('T')[0],
    validTo: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    isActive: true,
  });

  const handleOpenCouponModal = (coupon?: Coupon) => {
    if (coupon) {
      setEditingCoupon(coupon);
      setCouponForm(coupon);
    } else {
      setEditingCoupon(null);
      setCouponForm({
        name: '',
        type: 'fixed',
        value: 0,
        minAmount: 0,
        maxDiscount: undefined,
        validFrom: new Date().toISOString().split('T')[0],
        validTo: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        isActive: true,
      });
    }
    setCouponModalOpen(true);
  };

  const handleSaveCoupon = () => {
    if (!couponForm.name || couponForm.value === undefined) return;
    
    if (editingCoupon) {
      updateCoupon(editingCoupon.id, couponForm);
    } else {
      addCoupon(couponForm as Omit<Coupon, 'id'>);
    }
    setCouponModalOpen(false);
  };

  const handleOpenPromoModal = (promo?: DiscountPromotion) => {
    if (promo) {
      setEditingPromo(promo);
      setPromoForm(promo);
    } else {
      setEditingPromo(null);
      setPromoForm({
        name: '',
        threshold: 0,
        discount: 0,
        validFrom: new Date().toISOString().split('T')[0],
        validTo: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        isActive: true,
      });
    }
    setPromoModalOpen(true);
  };

  const handleSavePromo = () => {
    if (!promoForm.name || promoForm.threshold === undefined || promoForm.discount === undefined) return;
    
    if (editingPromo) {
      updatePromotion(editingPromo.id, promoForm);
    } else {
      addPromotion(promoForm as Omit<DiscountPromotion, 'id'>);
    }
    setPromoModalOpen(false);
  };

  const demoResult = previewCharges(demoAmount, 'site_001', 'site_001');

  const tabs = [
    { id: 'pricing' as TabType, label: '计费规则', icon: Settings },
    { id: 'coupons' as TabType, label: '优惠券管理', icon: Ticket },
    { id: 'promotions' as TabType, label: '满减活动', icon: Tag },
    { id: 'order' as TabType, label: '优惠顺序', icon: ArrowRight },
  ];

  return (
    <div className="space-y-6">
      <div className="flex gap-2 bg-white p-1 rounded-lg border border-gray-200 w-fit">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all ${
                activeTab === tab.id
                  ? 'bg-primary-500 text-white'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              <Icon className="w-4 h-4" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {activeTab === 'pricing' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="card animate-slide-up">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">计费规则配置</h3>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    基础价格（元）
                  </label>
                  <input
                    type="number"
                    value={pricingRule.basePrice}
                    onChange={(e) =>
                      updatePricingRule({ basePrice: parseFloat(e.target.value) || 0 })
                    }
                    className="input-field"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    每小时价格（元）
                  </label>
                  <input
                    type="number"
                    value={pricingRule.pricePerHour}
                    onChange={(e) =>
                      updatePricingRule({ pricePerHour: parseFloat(e.target.value) || 0 })
                    }
                    className="input-field"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    每日最高价格（元）
                  </label>
                  <input
                    type="number"
                    value={pricingRule.maxDailyPrice}
                    onChange={(e) =>
                      updatePricingRule({ maxDailyPrice: parseFloat(e.target.value) || 0 })
                    }
                    className="input-field"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    免费时长（分钟）
                  </label>
                  <input
                    type="number"
                    value={pricingRule.freeMinutes}
                    onChange={(e) =>
                      updatePricingRule({ freeMinutes: parseInt(e.target.value) || 0 })
                    }
                    className="input-field"
                  />
                </div>
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    异点归还费（元）
                  </label>
                  <input
                    type="number"
                    value={pricingRule.crossSiteReturnFee}
                    onChange={(e) =>
                      updatePricingRule({ crossSiteReturnFee: parseFloat(e.target.value) || 0 })
                    }
                    className="input-field"
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="card animate-slide-up animate-stagger-1">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">计费规则说明</h3>
            <div className="space-y-3 text-sm text-gray-600">
              <div className="flex items-start gap-3 p-3 bg-blue-50 rounded-lg">
                <div className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
                  <span className="text-blue-600 font-semibold text-xs">1</span>
                </div>
                <div>
                  <p className="font-medium text-blue-900">免费时长</p>
                  <p>前 {pricingRule.freeMinutes} 分钟免费，超过后开始计费</p>
                </div>
              </div>
              <div className="flex items-start gap-3 p-3 bg-green-50 rounded-lg">
                <div className="w-6 h-6 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0">
                  <span className="text-green-600 font-semibold text-xs">2</span>
                </div>
                <div>
                  <p className="font-medium text-green-900">计费方式</p>
                  <p>
                    基础价 {formatCurrency(pricingRule.basePrice)}，之后每小时{' '}
                    {formatCurrency(pricingRule.pricePerHour)}，不足1小时按1小时计算
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3 p-3 bg-orange-50 rounded-lg">
                <div className="w-6 h-6 bg-orange-100 rounded-full flex items-center justify-center flex-shrink-0">
                  <span className="text-orange-600 font-semibold text-xs">3</span>
                </div>
                <div>
                  <p className="font-medium text-orange-900">每日封顶</p>
                  <p>每日最高 {formatCurrency(pricingRule.maxDailyPrice)}</p>
                </div>
              </div>
              <div className="flex items-start gap-3 p-3 bg-red-50 rounded-lg">
                <div className="w-6 h-6 bg-red-100 rounded-full flex items-center justify-center flex-shrink-0">
                  <span className="text-red-600 font-semibold text-xs">4</span>
                </div>
                <div>
                  <p className="font-medium text-red-900">异点归还</p>
                  <p>非原站点归还收取 {formatCurrency(pricingRule.crossSiteReturnFee)}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'coupons' && (
        <div className="space-y-6">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-semibold text-gray-900">优惠券列表</h3>
            <button
              onClick={() => handleOpenCouponModal()}
              className="btn-primary flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              添加优惠券
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {coupons.map((coupon, index) => (
              <div
                key={coupon.id}
                className={`card animate-slide-up ${!coupon.isActive ? 'opacity-60' : ''}`}
                style={{ animationDelay: `${index * 50}ms` }}
              >
                <div className="flex items-start justify-between mb-3">
                  <div
                    className={`px-3 py-1 rounded-full text-xs font-medium ${
                      coupon.type === 'fixed'
                        ? 'bg-accent-100 text-accent-700'
                        : coupon.type === 'percentage'
                        ? 'bg-green-100 text-green-700'
                        : 'bg-primary-100 text-primary-700'
                    }`}
                  >
                    {getCouponTypeLabel(coupon.type)}
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => handleOpenCouponModal(coupon)}
                      className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors"
                    >
                      <Edit2 className="w-4 h-4 text-gray-500" />
                    </button>
                    <button
                      onClick={() => deleteCoupon(coupon.id)}
                      className="p-1.5 rounded-lg hover:bg-red-50 transition-colors"
                    >
                      <Trash2 className="w-4 h-4 text-red-500" />
                    </button>
                  </div>
                </div>

                <h4 className="text-lg font-semibold text-gray-900 mb-1">{coupon.name}</h4>
                
                <div className="text-2xl font-bold text-accent-500 mb-2">
                  {coupon.type === 'fixed' && `${formatCurrency(coupon.value)}`}
                  {coupon.type === 'percentage' && `${100 - coupon.value}折`}
                  {coupon.type === 'free_hours' && `免费${coupon.value}小时`}
                </div>

                <div className="space-y-1 text-sm text-gray-500">
                  <p>满 {formatCurrency(coupon.minAmount)} 可用</p>
                  {coupon.maxDiscount && (
                    <p>最高优惠 {formatCurrency(coupon.maxDiscount)}</p>
                  )}
                  <div className="flex items-center gap-1">
                    <Calendar className="w-3 h-3" />
                    <span>
                      {formatDate(coupon.validFrom)} - {formatDate(coupon.validTo)}
                    </span>
                  </div>
                </div>

                <div className="mt-3 pt-3 border-t border-gray-100">
                  <Switch
                    checked={coupon.isActive}
                    onChange={(checked) => updateCoupon(coupon.id, { isActive: checked })}
                    label={coupon.isActive ? '已启用' : '已禁用'}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {activeTab === 'promotions' && (
        <div className="space-y-6">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-semibold text-gray-900">满减活动</h3>
            <button
              onClick={() => handleOpenPromoModal()}
              className="btn-primary flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              添加满减活动
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {promotions.map((promo, index) => (
              <div
                key={promo.id}
                className={`card animate-slide-up ${!promo.isActive ? 'opacity-60' : ''}`}
                style={{ animationDelay: `${index * 50}ms` }}
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-xs font-medium">
                    满减
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => handleOpenPromoModal(promo)}
                      className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors"
                    >
                      <Edit2 className="w-4 h-4 text-gray-500" />
                    </button>
                    <button
                      onClick={() => deletePromotion(promo.id)}
                      className="p-1.5 rounded-lg hover:bg-red-50 transition-colors"
                    >
                      <Trash2 className="w-4 h-4 text-red-500" />
                    </button>
                  </div>
                </div>

                <h4 className="text-lg font-semibold text-gray-900 mb-2">{promo.name}</h4>
                
                <div className="text-2xl font-bold text-green-600 mb-2">
                  满 {promo.threshold} 减 {promo.discount}
                </div>

                <div className="space-y-1 text-sm text-gray-500">
                  <div className="flex items-center gap-1">
                    <Calendar className="w-3 h-3" />
                    <span>
                      {formatDate(promo.validFrom)} - {formatDate(promo.validTo)}
                    </span>
                  </div>
                </div>

                <div className="mt-3 pt-3 border-t border-gray-100">
                  <Switch
                    checked={promo.isActive}
                    onChange={(checked) => updatePromotion(promo.id, { isActive: checked })}
                    label={promo.isActive ? '已启用' : '已禁用'}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {activeTab === 'order' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="card animate-slide-up">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">优惠顺序配置</h3>
            
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-3">优惠计算顺序</label>
                <div className="flex gap-4">
                  <button
                    onClick={() => updateDiscountConfig({ order: 'coupon_first' })}
                    className={`flex-1 p-4 rounded-lg border-2 transition-all ${
                      discountConfig.order === 'coupon_first'
                        ? 'border-primary-500 bg-primary-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <div className="flex items-center justify-center gap-2 mb-2">
                      <Ticket className="w-5 h-5 text-accent-500" />
                      <ArrowRight className="w-4 h-4 text-gray-400" />
                      <Tag className="w-5 h-5 text-green-500" />
                    </div>
                    <p className="text-sm font-medium text-gray-900">先优惠券后满减</p>
                  </button>
                  <button
                    onClick={() => updateDiscountConfig({ order: 'promotion_first' })}
                    className={`flex-1 p-4 rounded-lg border-2 transition-all ${
                      discountConfig.order === 'promotion_first'
                        ? 'border-primary-500 bg-primary-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <div className="flex items-center justify-center gap-2 mb-2">
                      <Tag className="w-5 h-5 text-green-500" />
                      <ArrowRight className="w-4 h-4 text-gray-400" />
                      <Ticket className="w-5 h-5 text-accent-500" />
                    </div>
                    <p className="text-sm font-medium text-gray-900">先满减后优惠券</p>
                  </button>
                </div>
              </div>

              <div className="space-y-4">
                <Switch
                  checked={discountConfig.allowStacking}
                  onChange={(checked) => updateDiscountConfig({ allowStacking: checked })}
                  label="允许优惠叠加"
                />
                <p className="text-sm text-gray-500 pl-14">
                  开启后，优惠券和满减活动可同时使用
                </p>
              </div>

              <div className="space-y-4">
                <Switch
                  checked={discountConfig.negativeProtection}
                  onChange={(checked) => updateDiscountConfig({ negativeProtection: checked })}
                  label="负值兜底保护"
                />
                <p className="text-sm text-gray-500 pl-14">
                  开启后，优惠后金额为负时自动置为0
                </p>
              </div>
            </div>
          </div>

          <div className="card animate-slide-up animate-stagger-1">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">优惠计算演示</h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  模拟消费金额（元）
                </label>
                <input
                  type="number"
                  value={demoAmount}
                  onChange={(e) => setDemoAmount(parseInt(e.target.value) || 0)}
                  className="input-field"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  选择优惠券
                </label>
                <select
                  value={demoCoupon || ''}
                  onChange={(e) => {
                    setDemoCoupon(e.target.value || null);
                    const coupon = coupons.find((c) => c.id === e.target.value) || null;
                    setSelectedCoupon(coupon);
                  }}
                  className="input-field"
                >
                  <option value="">不使用优惠券</option>
                  {coupons.filter(c => c.isActive).map((coupon) => (
                    <option key={coupon.id} value={coupon.id}>
                      {coupon.name} ({getCouponTypeLabel(coupon.type)})
                    </option>
                  ))}
                </select>
              </div>

              <div className="p-4 bg-gray-50 rounded-lg">
                <div className="text-sm text-gray-500 mb-2">
                  当前顺序：{discountConfig.order === 'coupon_first' ? '优惠券 → 满减' : '满减 → 优惠券'}
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">原始金额</span>
                    <span className="font-medium">{formatCurrency(demoAmount)}</span>
                  </div>
                  {demoResult.couponDiscount > 0 && (
                    <div className="flex justify-between text-sm">
                      <span className="text-accent-600">优惠券优惠</span>
                      <span className="text-accent-600 font-medium">
                        -{formatCurrency(demoResult.couponDiscount)}
                      </span>
                    </div>
                  )}
                  {demoResult.promotionDiscount > 0 && (
                    <div className="flex justify-between text-sm">
                      <span className="text-green-600">满减优惠</span>
                      <span className="text-green-600 font-medium">
                        -{formatCurrency(demoResult.promotionDiscount)}
                      </span>
                    </div>
                  )}
                  <div className="flex justify-between pt-2 border-t border-gray-200">
                    <span className="font-semibold text-gray-900">最终金额</span>
                    <span className="text-xl font-bold text-primary-600">
                      {formatCurrency(demoResult.finalAmount)}
                    </span>
                  </div>
                  {demoResult.finalAmount === 0 && demoAmount > 0 && (
                    <div className="text-center text-sm text-green-600 bg-green-50 py-2 rounded-md mt-2">
                      <Check className="w-4 h-4 inline mr-1" />
                      负值兜底已触发，金额置为0
                    </div>
                  )}
                </div>
              </div>

              {demoResult.details.length > 0 && (
                <div>
                  <h4 className="text-sm font-medium text-gray-700 mb-2">优惠明细</h4>
                  <div className="space-y-2">
                    {demoResult.details.map((detail, index) => (
                      <div
                        key={index}
                        className="flex items-center justify-between p-2 bg-gray-50 rounded-md"
                      >
                        <div className="flex items-center gap-2">
                          {detail.type === 'coupon' && (
                            <Ticket className="w-4 h-4 text-accent-500" />
                          )}
                          {detail.type === 'promotion' && (
                            <Tag className="w-4 h-4 text-green-500" />
                          )}
                          <span className="text-sm text-gray-700">{detail.name}</span>
                        </div>
                        <span className="text-sm font-medium text-green-600">
                          -{formatCurrency(detail.amount)}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      <Modal
        isOpen={couponModalOpen}
        onClose={() => setCouponModalOpen(false)}
        title={editingCoupon ? '编辑优惠券' : '添加优惠券'}
        size="lg"
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">优惠券名称</label>
            <input
              type="text"
              value={couponForm.name || ''}
              onChange={(e) => setCouponForm({ ...couponForm, name: e.target.value })}
              className="input-field"
              placeholder="请输入优惠券名称"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">优惠类型</label>
              <select
                value={couponForm.type || 'fixed'}
                onChange={(e) =>
                  setCouponForm({ ...couponForm, type: e.target.value as Coupon['type'] })
                }
                className="input-field"
              >
                <option value="fixed">固定金额</option>
                <option value="percentage">折扣</option>
                <option value="free_hours">免费时长</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {couponForm.type === 'fixed'
                  ? '优惠金额（元）'
                  : couponForm.type === 'percentage'
                  ? '折扣比例（%）'
                  : '免费时长（小时）'}
              </label>
              <input
                type="number"
                value={couponForm.value || 0}
                onChange={(e) =>
                  setCouponForm({ ...couponForm, value: parseFloat(e.target.value) || 0 })
                }
                className="input-field"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">最低消费（元）</label>
              <input
                type="number"
                value={couponForm.minAmount || 0}
                onChange={(e) =>
                  setCouponForm({ ...couponForm, minAmount: parseFloat(e.target.value) || 0 })
                }
                className="input-field"
              />
            </div>
            {couponForm.type === 'percentage' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">最高优惠（元）</label>
                <input
                  type="number"
                  value={couponForm.maxDiscount || ''}
                  onChange={(e) =>
                    setCouponForm({
                      ...couponForm,
                      maxDiscount: parseFloat(e.target.value) || undefined,
                    })
                  }
                  className="input-field"
                  placeholder="不限则留空"
                />
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">有效期开始</label>
              <input
                type="date"
                value={couponForm.validFrom || ''}
                onChange={(e) => setCouponForm({ ...couponForm, validFrom: e.target.value })}
                className="input-field"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">有效期结束</label>
              <input
                type="date"
                value={couponForm.validTo || ''}
                onChange={(e) => setCouponForm({ ...couponForm, validTo: e.target.value })}
                className="input-field"
              />
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <button
              onClick={() => setCouponModalOpen(false)}
              className="btn-secondary"
            >
              取消
            </button>
            <button onClick={handleSaveCoupon} className="btn-primary">
              {editingCoupon ? '保存修改' : '创建优惠券'}
            </button>
          </div>
        </div>
      </Modal>

      <Modal
        isOpen={promoModalOpen}
        onClose={() => setPromoModalOpen(false)}
        title={editingPromo ? '编辑满减活动' : '添加满减活动'}
        size="lg"
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">活动名称</label>
            <input
              type="text"
              value={promoForm.name || ''}
              onChange={(e) => setPromoForm({ ...promoForm, name: e.target.value })}
              className="input-field"
              placeholder="请输入活动名称"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">满减门槛（元）</label>
              <input
                type="number"
                value={promoForm.threshold || 0}
                onChange={(e) =>
                  setPromoForm({ ...promoForm, threshold: parseFloat(e.target.value) || 0 })
                }
                className="input-field"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">减免金额（元）</label>
              <input
                type="number"
                value={promoForm.discount || 0}
                onChange={(e) =>
                  setPromoForm({ ...promoForm, discount: parseFloat(e.target.value) || 0 })
                }
                className="input-field"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">活动开始</label>
              <input
                type="date"
                value={promoForm.validFrom || ''}
                onChange={(e) => setPromoForm({ ...promoForm, validFrom: e.target.value })}
                className="input-field"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">活动结束</label>
              <input
                type="date"
                value={promoForm.validTo || ''}
                onChange={(e) => setPromoForm({ ...promoForm, validTo: e.target.value })}
                className="input-field"
              />
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <button
              onClick={() => setPromoModalOpen(false)}
              className="btn-secondary"
            >
              取消
            </button>
            <button onClick={handleSavePromo} className="btn-primary">
              {editingPromo ? '保存修改' : '创建活动'}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
