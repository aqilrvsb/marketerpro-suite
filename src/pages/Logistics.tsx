import React, { useState } from 'react';
import { useData } from '@/context/DataContext';
import { useLocation, useNavigate } from 'react-router-dom';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Search, Package, Truck, CheckCircle2, Clock, XCircle, Calendar } from 'lucide-react';
import { STATUS_OPTIONS, KURIER_OPTIONS } from '@/types';
import { toast } from '@/hooks/use-toast';
import ProductTab from '@/components/logistics/ProductTab';
import BundleTab from '@/components/logistics/BundleTab';
import StockInTab from '@/components/logistics/StockInTab';
import StockOutTab from '@/components/logistics/StockOutTab';

const Logistics: React.FC = () => {
  const { orders, updateOrder } = useData();
  const location = useLocation();
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  
  // Date filters for Order tab (filters by date_order)
  const [orderStartDate, setOrderStartDate] = useState('');
  const [orderEndDate, setOrderEndDate] = useState('');
  
  // Date filters for Shipment tab (filters by date_processed)
  const [shipmentStartDate, setShipmentStartDate] = useState('');
  const [shipmentEndDate, setShipmentEndDate] = useState('');
  
  // Determine current tab from URL path
  const getTabFromPath = () => {
    if (location.pathname.includes('/logistics/product')) return 'product';
    if (location.pathname.includes('/logistics/bundle')) return 'bundle';
    if (location.pathname.includes('/logistics/stock-in')) return 'stock-in';
    if (location.pathname.includes('/logistics/stock-out')) return 'stock-out';
    if (location.pathname.includes('/logistics/order')) return 'order';
    if (location.pathname.includes('/logistics/shipment')) return 'shipment';
    return 'order';
  };
  
  const currentTab = getTabFromPath();
  
  const handleTabChange = (value: string) => {
    navigate(`/dashboard/logistics/${value}`);
  };

  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [kurierFilter, setKurierFilter] = useState<string>('all');

  // Filter orders for Order tab - only Pending, filter by date_order
  const pendingOrders = orders.filter((order) => {
    const isPending = order.deliveryStatus === 'Pending';
    if (!isPending) return false;
    
    const matchesSearch =
      order.marketerName.toLowerCase().includes(search.toLowerCase()) ||
      order.noPhone.toLowerCase().includes(search.toLowerCase()) ||
      order.alamat.toLowerCase().includes(search.toLowerCase());
    
    // Date filter by date_order
    let matchesDate = true;
    if (orderStartDate || orderEndDate) {
      const orderDate = order.dateOrder ? new Date(order.dateOrder) : null;
      if (orderDate) {
        if (orderStartDate) {
          matchesDate = matchesDate && orderDate >= new Date(orderStartDate);
        }
        if (orderEndDate) {
          matchesDate = matchesDate && orderDate <= new Date(orderEndDate);
        }
      } else {
        matchesDate = false;
      }
    }
    
    return matchesSearch && matchesDate;
  });

  // Filter orders for Shipment tab - only Shipped, filter by date_processed
  const shippedOrders = orders.filter((order) => {
    const isShipped = order.deliveryStatus === 'Shipped';
    if (!isShipped) return false;
    
    const matchesSearch =
      order.marketerName.toLowerCase().includes(search.toLowerCase()) ||
      order.noPhone.toLowerCase().includes(search.toLowerCase()) ||
      order.alamat.toLowerCase().includes(search.toLowerCase());
    
    // Date filter by date_processed
    let matchesDate = true;
    if (shipmentStartDate || shipmentEndDate) {
      const processedDate = order.dateProcessed ? new Date(order.dateProcessed) : null;
      if (processedDate) {
        if (shipmentStartDate) {
          matchesDate = matchesDate && processedDate >= new Date(shipmentStartDate);
        }
        if (shipmentEndDate) {
          matchesDate = matchesDate && processedDate <= new Date(shipmentEndDate);
        }
      } else {
        matchesDate = false;
      }
    }
    
    return matchesSearch && matchesDate;
  });

  // Order tab counts - Pending orders
  const orderCounts = {
    totalPending: pendingOrders.length,
    cashPending: pendingOrders.filter((o) => o.caraBayaran === 'CASH').length,
    codPending: pendingOrders.filter((o) => o.caraBayaran === 'COD').length,
  };

  // Shipment tab counts - Shipped orders
  const shipmentCounts = {
    totalShipped: shippedOrders.length,
    cashShipped: shippedOrders.filter((o) => o.caraBayaran === 'CASH').length,
    codShipped: shippedOrders.filter((o) => o.caraBayaran === 'COD').length,
  };

  // Process order - update delivery_status to Shipped and set date_processed
  const handleProcessOrder = async (orderId: string) => {
    const today = new Date().toISOString().split('T')[0];
    try {
      await updateOrder(orderId, { 
        deliveryStatus: 'Shipped',
        dateProcessed: today 
      });
      toast({
        title: 'Order Processed',
        description: 'Order has been marked as Shipped.',
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to process order.',
        variant: 'destructive',
      });
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'Pending':
        return <Clock className="w-5 h-5 text-warning" />;
      case 'Processing':
        return <Package className="w-5 h-5 text-info" />;
      case 'Shipped':
        return <Truck className="w-5 h-5 text-primary" />;
      case 'Success':
        return <CheckCircle2 className="w-5 h-5 text-success" />;
      case 'Failed':
        return <XCircle className="w-5 h-5 text-destructive" />;
      default:
        return <Clock className="w-5 h-5 text-muted-foreground" />;
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Tabs */}
      <Tabs value={currentTab} onValueChange={handleTabChange} className="w-full">
        {/* Order Tab - duplicate of Shipment */}
        <TabsContent value="order" className="space-y-6">
          {/* Section Title */}
          <h2 className="text-xl font-semibold text-foreground">Order Management</h2>
          
          {/* Order Stats - 3 boxes for Pending orders */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="stat-card flex items-center gap-3">
              <Clock className="w-5 h-5 text-warning" />
              <div>
                <p className="text-2xl font-bold text-foreground">{orderCounts.totalPending}</p>
                <p className="text-sm text-muted-foreground">Total Order Pending</p>
              </div>
            </div>
            <div className="stat-card flex items-center gap-3">
              <Package className="w-5 h-5 text-success" />
              <div>
                <p className="text-2xl font-bold text-foreground">{orderCounts.cashPending}</p>
                <p className="text-sm text-muted-foreground">Total Order Cash Pending</p>
              </div>
            </div>
            <div className="stat-card flex items-center gap-3">
              <Truck className="w-5 h-5 text-primary" />
              <div>
                <p className="text-2xl font-bold text-foreground">{orderCounts.codPending}</p>
                <p className="text-sm text-muted-foreground">Total Order COD Pending</p>
              </div>
            </div>
          </div>

          {/* Filters */}
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search by name, phone, or address..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10"
              />
            </div>
            <div className="flex gap-2">
              <Input
                type="date"
                value={orderStartDate}
                onChange={(e) => setOrderStartDate(e.target.value)}
                className="w-40"
                placeholder="Start Date"
              />
              <Input
                type="date"
                value={orderEndDate}
                onChange={(e) => setOrderEndDate(e.target.value)}
                className="w-40"
                placeholder="End Date"
              />
            </div>
          </div>

          {/* Order Table */}
          <div className="form-section overflow-hidden p-0">
            <div className="overflow-x-auto">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>No</th>
                    <th>Tarikh Order</th>
                    <th>Nama Pelanggan</th>
                    <th>Phone</th>
                    <th>Produk</th>
                    <th>Total Sales</th>
                    <th>Jenis Platform</th>
                    <th>Jenis Customer</th>
                    <th>Negeri</th>
                    <th>Alamat</th>
                    <th>Cara Bayaran</th>
                    <th>Delivery Status</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {pendingOrders.length > 0 ? (
                    pendingOrders.map((order, index) => (
                      <tr key={order.id}>
                        <td>{index + 1}</td>
                        <td>{order.dateOrder || '-'}</td>
                        <td>{order.marketerName || '-'}</td>
                        <td>{order.noPhone || '-'}</td>
                        <td>{order.produk || '-'}</td>
                        <td>RM {order.hargaJualanSebenar?.toFixed(2) || '0.00'}</td>
                        <td>{order.jenisPlatform || '-'}</td>
                        <td>{order.jenisCustomer || '-'}</td>
                        <td>{order.negeri || '-'}</td>
                        <td>
                          <div className="max-w-xs">
                            <p className="text-sm truncate">{order.alamat}</p>
                            <p className="text-xs text-muted-foreground">
                              {order.poskod} {order.bandar}
                            </p>
                          </div>
                        </td>
                        <td>{order.caraBayaran || '-'}</td>
                        <td>
                          <span className="px-2 py-1 rounded-full text-xs font-medium bg-warning/20 text-warning">
                            {order.deliveryStatus || 'Pending'}
                          </span>
                        </td>
                        <td>
                          <Button
                            size="sm"
                            onClick={() => handleProcessOrder(order.id)}
                          >
                            Process
                          </Button>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td
                        colSpan={13}
                        className="text-center py-12 text-muted-foreground"
                      >
                        No pending orders found.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </TabsContent>

        {/* Shipment Tab - Shipped orders */}
        <TabsContent value="shipment" className="space-y-6">
          {/* Section Title */}
          <h2 className="text-xl font-semibold text-foreground">Shipment Management</h2>
          
          {/* Shipment Stats - 3 boxes for Shipped orders */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="stat-card flex items-center gap-3">
              <Truck className="w-5 h-5 text-primary" />
              <div>
                <p className="text-2xl font-bold text-foreground">{shipmentCounts.totalShipped}</p>
                <p className="text-sm text-muted-foreground">Total Order Shipped</p>
              </div>
            </div>
            <div className="stat-card flex items-center gap-3">
              <Package className="w-5 h-5 text-success" />
              <div>
                <p className="text-2xl font-bold text-foreground">{shipmentCounts.cashShipped}</p>
                <p className="text-sm text-muted-foreground">Total Order Cash Shipped</p>
              </div>
            </div>
            <div className="stat-card flex items-center gap-3">
              <Truck className="w-5 h-5 text-info" />
              <div>
                <p className="text-2xl font-bold text-foreground">{shipmentCounts.codShipped}</p>
                <p className="text-sm text-muted-foreground">Total Order COD Shipped</p>
              </div>
            </div>
          </div>

          {/* Filters */}
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search by name, phone, or address..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10"
              />
            </div>
            <div className="flex gap-2">
              <Input
                type="date"
                value={shipmentStartDate}
                onChange={(e) => setShipmentStartDate(e.target.value)}
                className="w-40"
                placeholder="Start Date"
              />
              <Input
                type="date"
                value={shipmentEndDate}
                onChange={(e) => setShipmentEndDate(e.target.value)}
                className="w-40"
                placeholder="End Date"
              />
            </div>
          </div>

          {/* Shipment Table */}
          <div className="form-section overflow-hidden p-0">
            <div className="overflow-x-auto">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>No</th>
                    <th>Tarikh Order</th>
                    <th>Nama Pelanggan</th>
                    <th>Phone</th>
                    <th>Produk</th>
                    <th>Total Sales</th>
                    <th>Jenis Platform</th>
                    <th>Jenis Customer</th>
                    <th>Negeri</th>
                    <th>Alamat</th>
                    <th>Cara Bayaran</th>
                    <th>Delivery Status</th>
                  </tr>
                </thead>
                <tbody>
                  {shippedOrders.length > 0 ? (
                    shippedOrders.map((order, index) => (
                      <tr key={order.id}>
                        <td>{index + 1}</td>
                        <td>{order.dateOrder || '-'}</td>
                        <td>{order.marketerName || '-'}</td>
                        <td>{order.noPhone || '-'}</td>
                        <td>{order.produk || '-'}</td>
                        <td>RM {order.hargaJualanSebenar?.toFixed(2) || '0.00'}</td>
                        <td>{order.jenisPlatform || '-'}</td>
                        <td>{order.jenisCustomer || '-'}</td>
                        <td>{order.negeri || '-'}</td>
                        <td>
                          <div className="max-w-xs">
                            <p className="text-sm truncate">{order.alamat}</p>
                            <p className="text-xs text-muted-foreground">
                              {order.poskod} {order.bandar}
                            </p>
                          </div>
                        </td>
                        <td>{order.caraBayaran || '-'}</td>
                        <td>
                          <span className="px-2 py-1 rounded-full text-xs font-medium bg-primary/20 text-primary">
                            {order.deliveryStatus || 'Shipped'}
                          </span>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td
                        colSpan={12}
                        className="text-center py-12 text-muted-foreground"
                      >
                        No shipped orders found.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="product" className="mt-6">
          <ProductTab />
        </TabsContent>

        <TabsContent value="bundle" className="mt-6">
          <BundleTab />
        </TabsContent>

        <TabsContent value="stock-in" className="mt-6">
          <StockInTab />
        </TabsContent>

        <TabsContent value="stock-out" className="mt-6">
          <StockOutTab />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Logistics;
