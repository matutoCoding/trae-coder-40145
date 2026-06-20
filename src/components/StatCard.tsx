import { ReactNode } from 'react';

interface StatCardProps {
  title: string;
  value: string | number;
  icon: ReactNode;
  trend?: string | number;
  trendLabel?: string;
  color?: 'blue' | 'green' | 'orange' | 'purple' | 'red';
  delay?: number;
}

export const StatCard = ({
  title,
  value,
  icon,
  trend,
  trendLabel,
  color = 'blue',
  delay = 0,
}: StatCardProps) => {
  const colorClasses = {
    blue: 'bg-blue-50 text-blue-600',
    green: 'bg-green-50 text-green-600',
    orange: 'bg-orange-50 text-orange-600',
    purple: 'bg-purple-50 text-purple-600',
    red: 'bg-red-50 text-red-600',
  };

  const getTrendColor = (trendValue: string | number): string => {
    if (typeof trendValue === 'number') {
      return trendValue >= 0 ? 'text-green-600' : 'text-red-600';
    }
    return trendValue.startsWith('+') ? 'text-green-600' : 'text-red-600';
  };

  const formatTrend = (trendValue: string | number): string => {
    if (typeof trendValue === 'number') {
      return `${trendValue >= 0 ? '+' : ''}${trendValue}%`;
    }
    return trendValue;
  };

  return (
    <div
      className="card animate-slide-up"
      style={{ animationDelay: `${delay}ms` }}
    >
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-gray-500 font-medium">{title}</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">{value}</p>
          {trend !== undefined && (
            <div className="flex items-center gap-1 mt-2">
              <span className={`text-sm font-medium ${getTrendColor(trend)}`}>
                {formatTrend(trend)}
              </span>
              {trendLabel && (
                <span className="text-xs text-gray-500">{trendLabel}</span>
              )}
            </div>
          )}
        </div>
        <div
          className={`w-12 h-12 rounded-xl flex items-center justify-center ${colorClasses[color]}`}
        >
          {icon}
        </div>
      </div>
    </div>
  );
};
