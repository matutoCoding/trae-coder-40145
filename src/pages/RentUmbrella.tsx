import { useState, useEffect, useMemo } from 'react';
import {
  Umbrella,
  MapPin,
  Clock,
  Ticket,
  CheckCircle,
  AlertTriangle,
  ChevronRight,
  RefreshCw,
  Wallet,
  Zap,
  Info,
} from 'lucide-react';
import { useStore } from '../store/useStore';
import { Modal } from '../components/Modal';
import { DiscountDetails } from '../components/DiscountDetails';
import { Switch } from '../components/Switch';
import {
  formatCurrency,
  formatDateTime,
  formatDuration,
} from '../services/transactionService';
import { checkAndResetQuotaIfNeeded, hasAvailableQuota } from '../services/quotaService';
import { Coupon as CouponType, Site } from '../types';

export const RentUmbrella = () => {
  const {
    user,
    userQuota,
    sites,
    coupons,
    currentRental,
    selectedCoupon,
    setSelectedCoupon,
    borrowUmbrella,
    returnUmbrella,
    previewCharges,
    pricingRule,
    addNotification,
  } = useStore();

  const [activeTab, setActiveTab] = useState<'borrow' | 'return'>('borrow');
  const [selectedBorrowSite, setSelectedBorrowSite] = useState<string | null>(null);
  const [selectedReturnSite, setSelectedReturnSite] = useState<string | null>(null);
  const [useQuota, setUseQuota] = useState(true);
  const [previewDuration, setPreviewDuration] = useState(60);
  const [showCouponModal, setShowCouponModal] = useState(false);
  const [confirmModalOpen, setConfirmModalOpen] = useState(false);
  const [confirmAction, setConfirmAction] = useState<'borrow' | 'return'>('borrow');
  const [elapsedTime, setElapsedTime] = useState(0);

  const { quota } = checkAndResetQuotaIfNeeded(userQuota, new Date());
  const canUseQuota = hasAvailableQuota(quota);

  useEffect(() => {
    if (!currentRental) return;

    const timer = setInterval(() => {
      const now = new Date();
      const borrowTime = new Date(currentRental.borrowTime);
      const diff = Math.floor((now.getTime() - borrowTime.getTime()) / 1000 / 60);
      setElapsedTime(diff);
    }, 1000);

    return () => clearInterval(timer);
  }, [currentRental]);

  const previewResult = useMemo(() => {
    if (!selectedBorrowSite || !selectedReturnSite) return null;
    return previewCharges(previewDuration, selectedBorrowSite, selectedReturnSite, useQuota && canUseQuota ? 1 : 0);
  }, [previewDuration, selectedBorrowSite, selectedReturnSite, selectedCoupon, useQuota, canUseQuota]);

  const returnPreviewResult = useMemo(() => {
    if (!currentRental || !selectedReturnSite) return null;
    return previewCharges(
      elapsedTime,
      currentRental.borrowSiteId,
      selectedReturnSite,
      currentRental.quotaUsed
    );
  }, [elapsedTime, currentRental, selectedReturnSite, selectedCoupon]);

  const availableCoupons = useMemo(() => {
    return coupons.filter((c) => c.isActive && new Date(c.validTo) > new Date());
  }, [coupons]);

  const handleSelectCoupon = (coupon: CouponType | null) => {
    setSelectedCoupon(coupon);
    setShowCouponModal(false);
  };

  const handleBorrowClick = (siteId: string) => {
    setSelectedBorrowSite(siteId);
    setConfirmAction('borrow');
    setConfirmModalOpen(true);
  };

  const handleReturnClick = (siteId: string) => {
    setSelectedReturnSite(siteId);
    setConfirmAction('return');
    setConfirmModalOpen(true);
  };

  const confirmActionHandler = () => {
    if (confirmAction === 'borrow' && selectedBorrowSite) {
      borrowUmbrella(selectedBorrowSite, useQuota && canUseQuota);
    } else if (confirmAction === 'return' && selectedReturnSite) {
      returnUmbrella(selectedReturnSite);
    }
    setConfirmModalOpen(false);
    setSelectedBorrowSite(null);
    setSelectedReturnSite(null);
  };

  const getBorrowSite = () => {
    if (!currentRental) return null;
    return sites.find((s) => s.id === currentRental.borrowSiteId);
  };

  const renderSiteCard = (site: Site, isSelectable: boolean, onClick?: () => void) => {
    const isSelected =
      (activeTab === 'borrow' && selectedBorrowSite === site.id) ||
      (activeTab === 'return' && selectedReturnSite === site.id);

    return (
      <div
        key={site.id}
        onClick={isSelectable ? onClick : undefined}
        className={`p-4 rounded-xl border-2 transition-all duration-300 ${
          isSelectable
            ? 'cursor-pointer hover:border-primary-300 hover:shadow-md'
            : 'cursor-default'
        } ${
          isSelected
            ? 'border-primary-500 bg-primary-50 shadow-md'
            : 'border-gray-200 bg-white'
        } ${site.availableUmbrellas === 0 ? 'opacity-60' : ''}`}
      >
        <div className="flex items-start justify-between">
          <div className="flex items-start gap-3">
            <div
              className={`p-2 rounded-lg ${
                site.availableUmbrellas > 0 ? 'bg-green-100' : 'bg-gray-100'
              }`}
            >
              <MapPin
                className={`w-5 h-5 ${
                  site.availableUmbrellas > 0 ? 'text-green-600' : 'text-gray-400'
                }`}
              />
            </div>
            <div>
              <h4 className="font-medium text-gray-900">{site.name}</h4>
              <p className="text-sm text-gray-500 mt-0.5">{site.address}</p>
              <div className="flex items-center gap-2 mt-2">
                <Umbrella className="w-3.5 h-3.5 text-gray-400" />
                <span className="text-sm text-gray-600">
                  可用 <span className="font-semibold">{site.availableUmbrellas}</span> 把
                </span>
              </div>
            </div>
          </div>
          {isSelectable && (
            <ChevronRight
              className={`w-5 h-5 transition-transform ${
                isSelected ? 'text-primary-500 rotate-90' : 'text-gray-400'
              }`}
            />
          )}
        </div>
        {site.availableUmbrellas === 0 && (
          <div className="mt-3 flex items-center gap-1.5 text-sm text-orange-600 bg-orange-50 px-3 py-1.5 rounded-lg">
            <AlertTriangle className="w-4 h-4" />
            该站点暂时无可用雨伞
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {currentRental && (
        <div className="card animate-slide-up border-l-4 border-l-orange-500">
          <div className="flex items-center gap-2 mb-4">
            <Zap className="w-5 h-5 text-orange-500" />
            <h3 className="text-lg font-semibold text-gray-900">进行中的租借</h3>
          </div>
          <div className="bg-orange-50 rounded-xl p-4">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="bg-orange-100 p-3 rounded-xl">
                  <Umbrella className="w-8 h-8 text-orange-600" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <MapPin className="w-4 h-4 text-green-500" />
                    <span className="font-medium">{getBorrowSite()?.name}</span>
                  </div>
                  <p className="text-sm text-gray-500 mt-1">
                    借出时间: {formatDateTime(currentRental.borrowTime)}
                  </p>
                  <p className="text-2xl font-bold text-orange-600 mt-2">
                    {formatDuration(elapsedTime)}
                  </p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-sm text-gray-500">预计费用</p>
                <p className="text-xl font-bold text-gray-900">
                  {formatCurrency(
                    previewCharges(
                      elapsedTime,
                      currentRental.borrowSiteId,
                      currentRental.borrowSiteId,
                      currentRental.quotaUsed
                    ).finalAmount
                  )}
                </p>
                {currentRental.quotaUsed > 0 && (
                  <span className="inline-block mt-1 text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full">
                    使用免费额度
                  </span>
                )}
              </div>
            </div>
          </div>
          <div className="mt-4 p-4 bg-blue-50 rounded-xl">
            <div className="flex items-start gap-2">
              <Info className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" />
              <div className="text-sm text-blue-700">
                <p className="font-medium">计费规则</p>
                <p className="mt-1">
                  {pricingRule.freeMinutes}分钟内免费，基础费{formatCurrency(pricingRule.basePrice)}，
                  每小时{formatCurrency(pricingRule.pricePerHour)}，每日封顶{formatCurrency(pricingRule.maxDailyPrice)}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {!currentRental && (
        <div className="card animate-slide-up">
          <div className="flex border-b border-gray-200 mb-6">
            <button
              onClick={() => setActiveTab('borrow')}
              className={`flex-1 py-3 px-4 text-center font-medium transition-colors relative ${
                activeTab === 'borrow'
                  ? 'text-primary-600'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              <Umbrella className="w-5 h-5 inline mr-2" />
              我要借伞
              {activeTab === 'borrow' && (
                <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary-600" />
              )}
            </button>
            <button
              onClick={() => setActiveTab('return')}
              className={`flex-1 py-3 px-4 text-center font-medium transition-colors relative ${
                activeTab === 'return'
                  ? 'text-primary-600'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              <RefreshCw className="w-5 h-5 inline mr-2" />
              我要还伞
              {activeTab === 'return' && (
                <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary-600" />
              )}
            </button>
          </div>

          {activeTab === 'borrow' && (
            <div className="space-y-6">
              {canUseQuota && (
                <div className="flex items-center justify-between p-4 bg-green-50 rounded-xl">
                  <div className="flex items-center gap-3">
                    <CheckCircle className="w-5 h-5 text-green-500" />
                    <div>
                      <p className="font-medium text-gray-900">使用免费额度</p>
                      <p className="text-sm text-gray-500">
                        本月剩余 {quota.monthlyQuota - quota.usedQuota} 次免费额度
                      </p>
                    </div>
                  </div>
                  <Switch checked={useQuota} onChange={setUseQuota} />
                </div>
              )}

              {!canUseQuota && (
                <div className="flex items-center gap-3 p-4 bg-orange-50 rounded-xl">
                  <AlertTriangle className="w-5 h-5 text-orange-500" />
                  <div>
                    <p className="font-medium text-gray-900">本月免费额度已用完</p>
                    <p className="text-sm text-gray-500">
                      本次借伞将正常计费，下月1日自动重置额度
                    </p>
                  </div>
                </div>
              )}

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Ticket className="w-5 h-5 text-orange-500" />
                  <span className="font-medium">选择优惠券</span>
                </div>
                <button
                  onClick={() => setShowCouponModal(true)}
                  className="text-sm text-primary-600 hover:text-primary-700 flex items-center gap-1"
                >
                  {selectedCoupon ? `已选: ${selectedCoupon.name}` : '选择优惠券'}
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>

              <div className="p-4 bg-gray-50 rounded-xl">
                <div className="flex items-center justify-between mb-4">
                  <span className="font-medium">费用预览</span>
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4 text-gray-400" />
                    <input
                      type="range"
                      min="15"
                      max="300"
                      step="15"
                      value={previewDuration}
                      onChange={(e) => setPreviewDuration(Number(e.target.value))}
                      className="w-32 accent-primary-500"
                    />
                    <span className="text-sm text-gray-600 w-16">
                      {formatDuration(previewDuration)}
                    </span>
                  </div>
                </div>

                {previewResult && (
                  <DiscountDetails
                    details={previewResult.details}
                    baseAmount={previewResult.baseAmount}
                    originalBaseAmount={previewResult.originalBaseAmount}
                    crossSiteFee={previewResult.crossSiteFee}
                    finalAmount={previewResult.finalAmount}
                    quotaUsed={previewResult.quotaUsed}
                    quotaDiscount={previewResult.details.find(d => d.type === 'quota')?.amount}
                  />
                )}
              </div>

              <div>
                <h4 className="font-medium text-gray-900 mb-3 flex items-center gap-2">
                  <MapPin className="w-5 h-5 text-primary-500" />
                  选择借伞站点
                </h4>
                <div className="grid gap-3">
                  {sites.map((site) =>
                    renderSiteCard(site, site.availableUmbrellas > 0, () =>
                      handleBorrowClick(site.id)
                    )
                  )}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'return' && (
            <div className="space-y-6">
              <div className="p-4 bg-blue-50 rounded-xl">
                <div className="flex items-start gap-2">
                  <Info className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" />
                  <div className="text-sm text-blue-700">
                    <p className="font-medium">异点归还说明</p>
                    <p className="mt-1">
                      如需在非借伞站点归还，将收取{formatCurrency(pricingRule.crossSiteReturnFee)}的异点归还费
                    </p>
                  </div>
                </div>
              </div>

              <div>
                <h4 className="font-medium text-gray-900 mb-3 flex items-center gap-2">
                  <MapPin className="w-5 h-5 text-primary-500" />
                  选择还伞站点
                </h4>
                <div className="grid gap-3">
                  {sites.map((site) =>
                    renderSiteCard(site, true, () => handleReturnClick(site.id))
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {currentRental && (
        <div className="card animate-slide-up animate-stagger-1">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
              <MapPin className="w-5 h-5 text-primary-500" />
              选择归还站点
            </h3>
          </div>
          <div className="p-4 bg-orange-50 rounded-xl mb-4">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-orange-500" />
              <p className="text-sm text-orange-700">
                异点归还将收取{formatCurrency(pricingRule.crossSiteReturnFee)}的服务费
              </p>
            </div>
          </div>
          <div className="grid gap-3">
            {sites.map((site) => {
              const isBorrowSite = site.id === currentRental.borrowSiteId;
              return (
                <div
                  key={site.id}
                  onClick={() => handleReturnClick(site.id)}
                  className="p-4 rounded-xl border-2 border-gray-200 bg-white cursor-pointer hover:border-primary-300 hover:shadow-md transition-all"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="bg-green-100 p-2 rounded-lg">
                        <MapPin className="w-5 h-5 text-green-600" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="font-medium text-gray-900">{site.name}</h4>
                          {isBorrowSite && (
                            <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full">
                              借伞点
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-gray-500">{site.address}</p>
                      </div>
                    </div>
                    <ChevronRight className="w-5 h-5 text-gray-400" />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {currentRental && (
        <div className="card animate-slide-up animate-stagger-2">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
              <Ticket className="w-5 h-5 text-primary-500" />
              选择优惠券
            </h3>
          </div>
          <div
            onClick={() => setShowCouponModal(true)}
            className="p-4 border-2 border-dashed border-gray-300 rounded-xl cursor-pointer hover:border-primary-400 transition-colors"
          >
            {selectedCoupon ? (
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="bg-orange-100 p-2 rounded-lg">
                    <Ticket className="w-5 h-5 text-orange-600" />
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">{selectedCoupon.name}</p>
                    <p className="text-sm text-gray-500">
                      {selectedCoupon.type === 'fixed'
                        ? `立减¥${selectedCoupon.value}`
                        : selectedCoupon.type === 'percentage'
                        ? `${(100 - selectedCoupon.value) / 10}折优惠`
                        : `免费${selectedCoupon.value}小时`}
                    </p>
                  </div>
                </div>
                <ChevronRight className="w-5 h-5 text-gray-400" />
              </div>
            ) : (
              <div className="text-center text-gray-500">
                <Ticket className="w-8 h-8 mx-auto mb-2 text-gray-300" />
                <p>点击选择优惠券</p>
              </div>
            )}
          </div>
        </div>
      )}

      <Modal
        isOpen={showCouponModal}
        onClose={() => setShowCouponModal(false)}
        title="选择优惠券"
        size="lg"
      >
        <div className="space-y-3">
          <div
            onClick={() => handleSelectCoupon(null)}
            className={`p-4 rounded-xl border-2 cursor-pointer transition-all ${
              selectedCoupon === null
                ? 'border-primary-500 bg-primary-50'
                : 'border-gray-200 hover:border-gray-300'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-gray-600">不使用优惠券</span>
              {selectedCoupon === null && (
                <CheckCircle className="w-5 h-5 text-primary-500" />
              )}
            </div>
          </div>
          {availableCoupons.length === 0 ? (
            <div className="text-center py-8 text-gray-400">
              <Ticket className="w-12 h-12 mx-auto mb-2 opacity-50" />
              <p>暂无可用优惠券</p>
            </div>
          ) : (
            availableCoupons.map((coupon) => (
              <div
                key={coupon.id}
                onClick={() => handleSelectCoupon(coupon)}
                className={`p-4 rounded-xl border-2 cursor-pointer transition-all ${
                  selectedCoupon?.id === coupon.id
                    ? 'border-primary-500 bg-primary-50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="bg-gradient-to-r from-orange-500 to-orange-400 text-white px-4 py-2 rounded-lg">
                      <p className="text-xl font-bold">
                        {coupon.type === 'fixed'
                          ? `¥${coupon.value}`
                          : coupon.type === 'percentage'
                          ? `${(100 - coupon.value) / 10}折`
                          : `${coupon.value}h`}
                      </p>
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">{coupon.name}</p>
                      <p className="text-sm text-gray-500">
                        满{coupon.minAmount}元可用 · 至 {coupon.validTo.split('T')[0]}
                      </p>
                    </div>
                  </div>
                  {selectedCoupon?.id === coupon.id && (
                    <CheckCircle className="w-5 h-5 text-primary-500" />
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </Modal>

      <Modal
        isOpen={confirmModalOpen}
        onClose={() => setConfirmModalOpen(false)}
        title={confirmAction === 'borrow' ? '确认借伞' : '确认还伞'}
        size="md"
      >
        <div className="space-y-4">
          {confirmAction === 'borrow' && selectedBorrowSite && (
            <>
              <div className="p-4 bg-blue-50 rounded-xl">
                <div className="flex items-center gap-3">
                  <div className="bg-blue-100 p-2 rounded-lg">
                    <MapPin className="w-5 h-5 text-blue-600" />
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">
                      {sites.find((s) => s.id === selectedBorrowSite)?.name}
                    </p>
                    <p className="text-sm text-gray-500">
                      {sites.find((s) => s.id === selectedBorrowSite)?.address}
                    </p>
                  </div>
                </div>
              </div>
              {useQuota && canUseQuota && (
                <div className="flex items-center gap-2 p-3 bg-green-50 rounded-lg text-green-700">
                  <CheckCircle className="w-5 h-5" />
                  <span>本次使用免费额度</span>
                </div>
              )}
              <div className="flex items-center gap-2 p-3 bg-gray-50 rounded-lg">
                <Wallet className="w-5 h-5 text-gray-400" />
                <span className="text-gray-600">
                  账户余额: {formatCurrency(user.balance)}
                </span>
              </div>
              <p className="text-sm text-gray-500 text-center">
                确认要在该站点借伞吗？
              </p>
            </>
          )}

          {confirmAction === 'return' && selectedReturnSite && currentRental && (
            <>
              <div className="p-4 bg-blue-50 rounded-xl space-y-3">
                <div className="flex items-center gap-3">
                  <div className="bg-green-100 p-2 rounded-lg">
                    <MapPin className="w-5 h-5 text-green-600" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">借伞站点</p>
                    <p className="font-medium text-gray-900">
                      {sites.find((s) => s.id === currentRental.borrowSiteId)?.name}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="bg-red-100 p-2 rounded-lg">
                    <MapPin className="w-5 h-5 text-red-600" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">还伞站点</p>
                    <p className="font-medium text-gray-900">
                      {sites.find((s) => s.id === selectedReturnSite)?.name}
                    </p>
                  </div>
                </div>
                {currentRental.borrowSiteId !== selectedReturnSite && (
                  <div className="flex items-center gap-2 p-2 bg-orange-50 rounded-lg text-orange-700 text-sm">
                    <AlertTriangle className="w-4 h-4" />
                    <span>异点归还，将收取{formatCurrency(pricingRule.crossSiteReturnFee)}服务费</span>
                  </div>
                )}
              </div>
              <div className="p-4 bg-gray-50 rounded-xl">
                <div className="flex items-center justify-between mb-4">
                  <span className="font-medium">费用明细</span>
                </div>
                {returnPreviewResult && (
                  <DiscountDetails
                    details={returnPreviewResult.details}
                    baseAmount={returnPreviewResult.baseAmount}
                    originalBaseAmount={returnPreviewResult.originalBaseAmount}
                    crossSiteFee={returnPreviewResult.crossSiteFee}
                    finalAmount={returnPreviewResult.finalAmount}
                    quotaUsed={returnPreviewResult.quotaUsed}
                    quotaDiscount={returnPreviewResult.details.find(d => d.type === 'quota')?.amount}
                  />
                )}
              </div>
              <p className="text-sm text-gray-500 text-center">
                确认要在该站点还伞吗？
              </p>
            </>
          )}

          <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
            <button
              onClick={() => setConfirmModalOpen(false)}
              className="btn-secondary"
            >
              取消
            </button>
            <button onClick={confirmActionHandler} className="btn-primary">
              {confirmAction === 'borrow' ? '确认借伞' : '确认还伞'}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
