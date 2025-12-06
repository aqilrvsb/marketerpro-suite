import React from 'react';
import { useAuth } from '@/context/AuthContext';
import { useData } from '@/context/DataContext';
import {
  Phone,
  XCircle,
  MessageSquare,
  CheckCircle,
  DollarSign,
  TrendingUp,
  Monitor,
  CheckSquare,
  XSquare,
  Loader2,
} from 'lucide-react';

const Dashboard: React.FC = () => {
  const { profile } = useAuth();
  const { orders, prospects, isLoading } = useData();

  const totalOrders = orders.length;
  const totalProspects = prospects.length;
  const successOrders = orders.filter((o) => o.statusParcel === 'Success').length;
  const pendingOrders = orders.filter((o) => o.statusParcel === 'Pending').length;
  const processingOrders = orders.filter((o) => o.statusParcel === 'Processing').length;
  const totalRevenue = orders.reduce((sum, o) => sum + o.hargaJualanSebenar, 0);
  const closingRate = totalProspects > 0 ? ((successOrders / totalProspects) * 100).toFixed(2) : '0';

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-primary">
          Welcome back, {profile?.fullName || 'User'}!
        </h1>
        <p className="text-muted-foreground mt-1">
          Here's an overview of your system and performance.
        </p>
      </div>

      {/* Device Status Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="stat-card">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Total Orders</p>
              <p className="text-3xl font-bold text-foreground mt-1">{totalOrders}</p>
              <p className="text-xs text-muted-foreground mt-1">All registered orders</p>
            </div>
            <div className="p-2 rounded-lg bg-primary/10">
              <Monitor className="w-6 h-6 text-primary" />
            </div>
          </div>
        </div>

        <div className="stat-card">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Success Orders</p>
              <p className="text-3xl font-bold text-foreground mt-1">{successOrders}</p>
              <p className="text-xs text-muted-foreground mt-1">Currently completed</p>
            </div>
            <div className="p-2 rounded-lg bg-success/10">
              <CheckSquare className="w-6 h-6 text-success" />
            </div>
          </div>
        </div>

        <div className="stat-card">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Pending Orders</p>
              <p className="text-3xl font-bold text-foreground mt-1">{pendingOrders}</p>
              <p className="text-xs text-muted-foreground mt-1">Awaiting processing</p>
            </div>
            <div className="p-2 rounded-lg bg-destructive/10">
              <XSquare className="w-6 h-6 text-destructive" />
            </div>
          </div>
        </div>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
        <div className="stat-card">
          <div className="stat-label text-muted-foreground">
            <Phone className="w-4 h-4" />
            <span>TOTAL LEAD</span>
          </div>
          <p className="stat-value text-foreground">{totalProspects}</p>
        </div>

        <div className="stat-card border-l-4 border-l-destructive">
          <div className="stat-label text-destructive">
            <XCircle className="w-4 h-4" />
            <span>PENDING</span>
          </div>
          <p className="stat-value text-destructive">{pendingOrders}</p>
        </div>

        <div className="stat-card border-l-4 border-l-info">
          <div className="stat-label text-info">
            <MessageSquare className="w-4 h-4" />
            <span>PROCESSING</span>
          </div>
          <p className="stat-value text-info">{processingOrders}</p>
        </div>

        <div className="stat-card border-l-4 border-l-success">
          <div className="stat-label text-success">
            <CheckCircle className="w-4 h-4" />
            <span>SUCCESS</span>
          </div>
          <p className="stat-value text-success">{successOrders}</p>
        </div>

        <div className="stat-card border-l-4 border-l-warning">
          <div className="stat-label text-warning">
            <DollarSign className="w-4 h-4" />
            <span>SALES</span>
          </div>
          <p className="stat-value text-warning">RM {totalRevenue.toLocaleString()}</p>
        </div>

        <div className="stat-card-highlight">
          <div className="stat-label text-white/80">
            <TrendingUp className="w-4 h-4" />
            <span>CLOSING RATE</span>
          </div>
          <p className="stat-value text-white">{closingRate}%</p>
        </div>
      </div>

      {/* Recent Orders */}
      <div className="form-section">
        <h2 className="text-lg font-semibold text-foreground mb-4">
          Recent Orders
        </h2>
        {orders.slice(0, 5).length > 0 ? (
          <div className="overflow-x-auto">
            <table className="data-table">
              <thead>
                <tr>
                  <th>No</th>
                  <th>Date</th>
                  <th>Product</th>
                  <th>Customer</th>
                  <th>Amount</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {orders.slice(0, 5).map((order, index) => (
                  <tr key={order.id}>
                    <td className="font-medium">{index + 1}</td>
                    <td>{new Date(order.tarikhTempahan).toLocaleDateString()}</td>
                    <td>{order.produk}</td>
                    <td>{order.marketerName}</td>
                    <td className="font-medium">RM {order.hargaJualanSebenar.toFixed(2)}</td>
                    <td>
                      <span
                        className={`status-badge ${
                          order.statusParcel === 'Success'
                            ? 'status-success'
                            : order.statusParcel === 'Pending'
                            ? 'status-warning'
                            : 'status-pending'
                        }`}
                      >
                        {order.statusParcel}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-muted-foreground text-center py-8">
            No orders yet. Create your first order!
          </p>
        )}
      </div>
    </div>
  );
};

export default Dashboard;
