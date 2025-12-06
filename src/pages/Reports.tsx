import React from 'react';
import { useData } from '@/context/DataContext';
import {
  BarChart3,
  PieChart,
  TrendingUp,
  Users,
  ShoppingCart,
  MapPin,
} from 'lucide-react';

const Reports: React.FC = () => {
  const { orders, prospects } = useData();

  // Orders by State
  const ordersByState = orders.reduce((acc, order) => {
    acc[order.negeri] = (acc[order.negeri] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const sortedStates = Object.entries(ordersByState).sort((a, b) => b[1] - a[1]);

  // Orders by Status
  const ordersByStatus = orders.reduce((acc, order) => {
    acc[order.statusParcel] = (acc[order.statusParcel] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  // Prospects by Type
  const prospectsByType = prospects.reduce((acc, prospect) => {
    acc[prospect.jenisProspek] = (acc[prospect.jenisProspek] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  // Products Performance
  const productPerformance = orders.reduce((acc, order) => {
    if (!acc[order.produk]) {
      acc[order.produk] = { qty: 0, revenue: 0, profit: 0 };
    }
    acc[order.produk].qty += order.kuantiti;
    acc[order.produk].revenue += order.hargaJualanSebenar;
    acc[order.produk].profit += order.profit;
    return acc;
  }, {} as Record<string, { qty: number; revenue: number; profit: number }>);

  const sortedProducts = Object.entries(productPerformance).sort(
    (a, b) => b[1].revenue - a[1].revenue
  );

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Success':
        return 'bg-success';
      case 'Pending':
        return 'bg-warning';
      case 'Processing':
        return 'bg-info';
      case 'Shipped':
        return 'bg-primary';
      case 'Failed':
        return 'bg-destructive';
      default:
        return 'bg-muted';
    }
  };

  const totalOrders = orders.length;

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground">Reports & Analytics</h1>
        <p className="text-muted-foreground">
          Business insights and performance metrics
        </p>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="stat-card">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10">
              <ShoppingCart className="w-5 h-5 text-primary" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">{orders.length}</p>
              <p className="text-sm text-muted-foreground">Total Orders</p>
            </div>
          </div>
        </div>
        <div className="stat-card">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-accent/10">
              <Users className="w-5 h-5 text-accent" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">
                {prospects.length}
              </p>
              <p className="text-sm text-muted-foreground">Total Prospects</p>
            </div>
          </div>
        </div>
        <div className="stat-card">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-success/10">
              <TrendingUp className="w-5 h-5 text-success" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">
                {ordersByStatus['Success'] || 0}
              </p>
              <p className="text-sm text-muted-foreground">Successful</p>
            </div>
          </div>
        </div>
        <div className="stat-card">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-warning/10">
              <BarChart3 className="w-5 h-5 text-warning" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">
                {sortedStates.length}
              </p>
              <p className="text-sm text-muted-foreground">States Covered</p>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Orders by Status */}
        <div className="form-section">
          <div className="flex items-center gap-2 mb-4">
            <PieChart className="w-5 h-5 text-primary" />
            <h2 className="text-lg font-semibold text-foreground">
              Orders by Status
            </h2>
          </div>
          <div className="space-y-3">
            {Object.entries(ordersByStatus).map(([status, count]) => (
              <div key={status} className="flex items-center gap-3">
                <div className={`w-3 h-3 rounded-full ${getStatusColor(status)}`} />
                <span className="flex-1 text-foreground">{status}</span>
                <div className="w-32 h-2 bg-muted rounded-full overflow-hidden">
                  <div
                    className={`h-full ${getStatusColor(status)}`}
                    style={{
                      width: `${totalOrders ? (count / totalOrders) * 100 : 0}%`,
                    }}
                  />
                </div>
                <span className="text-sm font-medium text-muted-foreground w-12 text-right">
                  {count}
                </span>
              </div>
            ))}
            {Object.keys(ordersByStatus).length === 0 && (
              <p className="text-center text-muted-foreground py-4">
                No order data available
              </p>
            )}
          </div>
        </div>

        {/* Prospects by Type */}
        <div className="form-section">
          <div className="flex items-center gap-2 mb-4">
            <Users className="w-5 h-5 text-accent" />
            <h2 className="text-lg font-semibold text-foreground">
              Prospects by Type
            </h2>
          </div>
          <div className="space-y-3">
            {Object.entries(prospectsByType).map(([type, count]) => (
              <div
                key={type}
                className="flex items-center justify-between p-3 bg-muted/30 rounded-lg"
              >
                <span className="text-foreground">{type}</span>
                <span className="text-lg font-bold text-foreground">{count}</span>
              </div>
            ))}
            {Object.keys(prospectsByType).length === 0 && (
              <p className="text-center text-muted-foreground py-4">
                No prospect data available
              </p>
            )}
          </div>
        </div>

        {/* Top States */}
        <div className="form-section">
          <div className="flex items-center gap-2 mb-4">
            <MapPin className="w-5 h-5 text-info" />
            <h2 className="text-lg font-semibold text-foreground">
              Orders by State
            </h2>
          </div>
          <div className="space-y-2">
            {sortedStates.slice(0, 8).map(([state, count], index) => (
              <div
                key={state}
                className="flex items-center justify-between p-3 bg-muted/30 rounded-lg"
              >
                <div className="flex items-center gap-3">
                  <span
                    className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                      index < 3
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-muted text-muted-foreground'
                    }`}
                  >
                    {index + 1}
                  </span>
                  <span className="text-foreground">{state}</span>
                </div>
                <span className="font-semibold text-foreground">{count}</span>
              </div>
            ))}
            {sortedStates.length === 0 && (
              <p className="text-center text-muted-foreground py-4">
                No state data available
              </p>
            )}
          </div>
        </div>

        {/* Product Performance */}
        <div className="form-section">
          <div className="flex items-center gap-2 mb-4">
            <BarChart3 className="w-5 h-5 text-success" />
            <h2 className="text-lg font-semibold text-foreground">
              Product Performance
            </h2>
          </div>
          <div className="space-y-3">
            {sortedProducts.slice(0, 5).map(([product, data]) => (
              <div key={product} className="p-3 bg-muted/30 rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-medium text-foreground">{product}</span>
                  <span className="text-success font-semibold">
                    RM {data.profit.toFixed(2)}
                  </span>
                </div>
                <div className="flex items-center justify-between text-sm text-muted-foreground">
                  <span>{data.qty} units sold</span>
                  <span>Revenue: RM {data.revenue.toFixed(2)}</span>
                </div>
              </div>
            ))}
            {sortedProducts.length === 0 && (
              <p className="text-center text-muted-foreground py-4">
                No product data available
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Reports;
