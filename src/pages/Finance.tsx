import React from 'react';
import { useData } from '@/context/DataContext';
import {
  DollarSign,
  TrendingUp,
  TrendingDown,
  Package,
  Truck,
} from 'lucide-react';

const Finance: React.FC = () => {
  const { orders } = useData();

  const totalRevenue = orders.reduce((sum, o) => sum + o.hargaJualanSebenar, 0);
  const totalProfit = orders.reduce((sum, o) => sum + o.profit, 0);
  const totalProductCost = orders.reduce((sum, o) => sum + o.kosProduk, 0);
  const totalShippingCost = orders.reduce((sum, o) => sum + o.kosPos, 0);
  const totalOrders = orders.length;
  const avgOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;
  const profitMargin = totalRevenue > 0 ? (totalProfit / totalRevenue) * 100 : 0;

  const stats = [
    {
      title: 'Total Revenue',
      value: `RM ${totalRevenue.toLocaleString('en-MY', { minimumFractionDigits: 2 })}`,
      icon: <DollarSign className="w-6 h-6" />,
      color: 'bg-primary',
    },
    {
      title: 'Total Profit',
      value: `RM ${totalProfit.toLocaleString('en-MY', { minimumFractionDigits: 2 })}`,
      icon: <TrendingUp className="w-6 h-6" />,
      color: 'bg-success',
    },
    {
      title: 'Product Cost',
      value: `RM ${totalProductCost.toLocaleString('en-MY', { minimumFractionDigits: 2 })}`,
      icon: <Package className="w-6 h-6" />,
      color: 'bg-warning',
    },
    {
      title: 'Shipping Cost',
      value: `RM ${totalShippingCost.toLocaleString('en-MY', { minimumFractionDigits: 2 })}`,
      icon: <Truck className="w-6 h-6" />,
      color: 'bg-info',
    },
  ];

  // Group orders by marketer for performance tracking
  const marketerPerformance = orders.reduce((acc, order) => {
    const key = order.marketerIdStaff;
    if (!acc[key]) {
      acc[key] = {
        name: order.marketerName,
        orders: 0,
        revenue: 0,
        profit: 0,
      };
    }
    acc[key].orders += 1;
    acc[key].revenue += order.hargaJualanSebenar;
    acc[key].profit += order.profit;
    return acc;
  }, {} as Record<string, { name: string; orders: number; revenue: number; profit: number }>);

  const sortedMarketers = Object.entries(marketerPerformance).sort(
    (a, b) => b[1].profit - a[1].profit
  );

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground">Finance Overview</h1>
        <p className="text-muted-foreground">
          Track revenue, costs, and profitability
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat, index) => (
          <div
            key={stat.title}
            className="stat-card animate-slide-up"
            style={{ animationDelay: `${index * 100}ms` }}
          >
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-muted-foreground">{stat.title}</p>
                <p className="text-2xl font-bold text-foreground mt-1">
                  {stat.value}
                </p>
              </div>
              <div
                className={`p-3 rounded-xl ${stat.color} text-primary-foreground`}
              >
                {stat.icon}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Key Metrics */}
        <div className="form-section">
          <h2 className="text-lg font-semibold text-foreground mb-4">
            Key Metrics
          </h2>
          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 bg-muted/30 rounded-lg">
              <span className="text-muted-foreground">Total Orders</span>
              <span className="text-xl font-bold text-foreground">
                {totalOrders}
              </span>
            </div>
            <div className="flex items-center justify-between p-4 bg-muted/30 rounded-lg">
              <span className="text-muted-foreground">Average Order Value</span>
              <span className="text-xl font-bold text-foreground">
                RM {avgOrderValue.toFixed(2)}
              </span>
            </div>
            <div className="flex items-center justify-between p-4 bg-success/10 rounded-lg">
              <span className="text-muted-foreground">Profit Margin</span>
              <span className="text-xl font-bold text-success">
                {profitMargin.toFixed(1)}%
              </span>
            </div>
          </div>
        </div>

        {/* Top Marketers */}
        <div className="form-section">
          <h2 className="text-lg font-semibold text-foreground mb-4">
            Top Performing Marketers
          </h2>
          {sortedMarketers.length > 0 ? (
            <div className="space-y-3">
              {sortedMarketers.slice(0, 5).map(([id, data], index) => (
                <div
                  key={id}
                  className="flex items-center justify-between p-3 bg-muted/30 rounded-lg"
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                        index === 0
                          ? 'bg-warning text-warning-foreground'
                          : index === 1
                          ? 'bg-muted text-muted-foreground'
                          : index === 2
                          ? 'bg-amber-700 text-primary-foreground'
                          : 'bg-muted text-muted-foreground'
                      }`}
                    >
                      {index + 1}
                    </div>
                    <div>
                      <p className="font-medium text-foreground">{data.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {data.orders} orders
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold text-success">
                      RM {data.profit.toFixed(2)}
                    </p>
                    <p className="text-xs text-muted-foreground">profit</p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-center text-muted-foreground py-8">
              No data available yet.
            </p>
          )}
        </div>
      </div>

      {/* Recent Transactions */}
      <div className="form-section overflow-hidden p-0">
        <div className="p-6 border-b border-border">
          <h2 className="text-lg font-semibold text-foreground">
            Recent Transactions
          </h2>
        </div>
        <div className="overflow-x-auto">
          <table className="data-table">
            <thead>
              <tr>
                <th>Order</th>
                <th>Marketer</th>
                <th>Product</th>
                <th>Revenue</th>
                <th>Cost</th>
                <th>Profit</th>
              </tr>
            </thead>
            <tbody>
              {orders.slice(0, 10).length > 0 ? (
                orders.slice(0, 10).map((order) => (
                  <tr key={order.id}>
                    <td className="font-medium">#{order.noTempahan}</td>
                    <td>{order.marketerIdStaff}</td>
                    <td>{order.produk}</td>
                    <td>RM {order.hargaJualanSebenar.toFixed(2)}</td>
                    <td className="text-muted-foreground">
                      RM {(order.kosProduk + order.kosPos).toFixed(2)}
                    </td>
                    <td className="text-success font-medium">
                      RM {order.profit.toFixed(2)}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td
                    colSpan={6}
                    className="text-center py-12 text-muted-foreground"
                  >
                    No transactions yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default Finance;
