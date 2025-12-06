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
import { Checkbox } from '@/components/ui/checkbox';
import { Search, Package, Truck, CheckCircle2, Clock, XCircle, Printer, Send, Loader2 } from 'lucide-react';
import { STATUS_OPTIONS, KURIER_OPTIONS } from '@/types';
import { toast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import ProductTab from '@/components/logistics/ProductTab';
import BundleTab from '@/components/logistics/BundleTab';
import StockInTab from '@/components/logistics/StockInTab';
import StockOutTab from '@/components/logistics/StockOutTab';

const PLATFORM_OPTIONS = ['All', 'Facebook', 'Tiktok', 'Shopee', 'Database', 'Google'];
const CARA_BAYARAN_OPTIONS = ['All', 'CASH', 'COD'];
const PAGE_SIZE_OPTIONS = [10, 50, 100];

const Logistics: React.FC = () => {
  const { orders, updateOrder, refreshData } = useData();
  const location = useLocation();
  const navigate = useNavigate();
  const [search, setSearch] = useState('');

  // Date filters for Order tab (filters by date_order)
  const [orderStartDate, setOrderStartDate] = useState('');
  const [orderEndDate, setOrderEndDate] = useState('');

  // Date filters for Shipment tab (filters by date_processed)
  const [shipmentStartDate, setShipmentStartDate] = useState('');
  const [shipmentEndDate, setShipmentEndDate] = useState('');

  // New filter states
  const [platformFilter, setPlatformFilter] = useState('All');
  const [caraBayaranFilter, setCaraBayaranFilter] = useState('All');

  // Pagination state
  const [pageSize, setPageSize] = useState(10);
  const [currentPage, setCurrentPage] = useState(1);

  // Checkbox selection state
  const [selectedOrders, setSelectedOrders] = useState<Set<string>>(new Set());

  // Loading states
  const [isShipping, setIsShipping] = useState(false);
  const [isPrinting, setIsPrinting] = useState(false);

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
    // Reset selections when changing tabs
    setSelectedOrders(new Set());
    setCurrentPage(1);
  };

  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [kurierFilter, setKurierFilter] = useState<string>('all');

  // Filter orders for Order tab - only Pending, filter by date_order
  const pendingOrders = orders.filter((order) => {
    const isPending = order.deliveryStatus === 'Pending';
    if (!isPending) return false;

    // Advanced search with + for combining filters (e.g., "CASH+Facebook")
    let matchesSearch = true;
    if (search.trim()) {
      const searchTerms = search.toLowerCase().split('+').map(s => s.trim()).filter(Boolean);

      if (searchTerms.length > 1) {
        // Multiple terms with + means ALL must match (AND logic)
        matchesSearch = searchTerms.every(term => {
          return (
            order.marketerName.toLowerCase().includes(term) ||
            order.noPhone.toLowerCase().includes(term) ||
            order.alamat.toLowerCase().includes(term) ||
            (order.caraBayaran && order.caraBayaran.toLowerCase().includes(term)) ||
            (order.jenisPlatform && order.jenisPlatform.toLowerCase().includes(term)) ||
            (order.negeri && order.negeri.toLowerCase().includes(term)) ||
            (order.produk && order.produk.toLowerCase().includes(term))
          );
        });
      } else {
        // Single term - normal search (OR logic)
        const term = searchTerms[0] || '';
        matchesSearch =
          order.marketerName.toLowerCase().includes(term) ||
          order.noPhone.toLowerCase().includes(term) ||
          order.alamat.toLowerCase().includes(term) ||
          (order.caraBayaran && order.caraBayaran.toLowerCase().includes(term)) ||
          (order.jenisPlatform && order.jenisPlatform.toLowerCase().includes(term)) ||
          (order.negeri && order.negeri.toLowerCase().includes(term)) ||
          (order.produk && order.produk.toLowerCase().includes(term));
      }
    }

    // Platform filter
    const matchesPlatform = platformFilter === 'All' || order.jenisPlatform === platformFilter;

    // Cara Bayaran filter
    const matchesCaraBayaran = caraBayaranFilter === 'All' || order.caraBayaran === caraBayaranFilter;

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

    return matchesSearch && matchesDate && matchesPlatform && matchesCaraBayaran;
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

  // Pagination logic for Order tab
  const totalPages = Math.ceil(pendingOrders.length / pageSize);
  const paginatedOrders = pendingOrders.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize
  );

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

  // Checkbox handlers
  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      const allIds = new Set(paginatedOrders.map(order => order.id));
      setSelectedOrders(allIds);
    } else {
      setSelectedOrders(new Set());
    }
  };

  const handleSelectOrder = (orderId: string, checked: boolean) => {
    const newSelection = new Set(selectedOrders);
    if (checked) {
      newSelection.add(orderId);
    } else {
      newSelection.delete(orderId);
    }
    setSelectedOrders(newSelection);
  };

  const isAllSelected = paginatedOrders.length > 0 && paginatedOrders.every(order => selectedOrders.has(order.id));
  const isSomeSelected = selectedOrders.size > 0;

  // Bulk Shipped action
  const handleBulkShipped = async () => {
    if (selectedOrders.size === 0) {
      toast({
        title: 'No orders selected',
        description: 'Please select orders to mark as shipped.',
        variant: 'destructive',
      });
      return;
    }

    setIsShipping(true);
    const today = new Date().toISOString().split('T')[0];

    try {
      // Update all selected orders
      const updatePromises = Array.from(selectedOrders).map(orderId =>
        supabase
          .from('customer_orders')
          .update({
            delivery_status: 'Shipped',
            date_processed: today,
            updated_at: new Date().toISOString(),
          })
          .eq('id', orderId)
      );

      await Promise.all(updatePromises);

      toast({
        title: 'Orders Shipped',
        description: `${selectedOrders.size} order(s) have been marked as Shipped.`,
      });

      // Refresh data and clear selection
      await refreshData();
      setSelectedOrders(new Set());
    } catch (error) {
      console.error('Error updating orders:', error);
      toast({
        title: 'Error',
        description: 'Failed to update orders. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsShipping(false);
    }
  };

  // Bulk Print waybill action
  const handleBulkPrint = async () => {
    if (selectedOrders.size === 0) {
      toast({
        title: 'No orders selected',
        description: 'Please select orders to print waybills.',
        variant: 'destructive',
      });
      return;
    }

    // Get tracking numbers for selected orders (only Ninjavan orders)
    const selectedOrdersList = paginatedOrders.filter(order => selectedOrders.has(order.id));
    const ninjavanOrders = selectedOrdersList.filter(
      order => order.jenisPlatform !== 'Shopee' && order.jenisPlatform !== 'Tiktok' && order.noTracking
    );

    if (ninjavanOrders.length === 0) {
      toast({
        title: 'No Ninjavan orders',
        description: 'Selected orders do not have Ninjavan tracking numbers.',
        variant: 'destructive',
      });
      return;
    }

    const trackingNumbers = ninjavanOrders.map(order => order.noTracking).filter(Boolean);

    if (trackingNumbers.length === 0) {
      toast({
        title: 'No tracking numbers',
        description: 'Selected orders do not have tracking numbers.',
        variant: 'destructive',
      });
      return;
    }

    setIsPrinting(true);

    try {
      // Call Ninjavan waybill function - returns PDF directly
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ninjavan-waybill`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
          },
          body: JSON.stringify({ trackingNumbers }),
        }
      );

      if (!response.ok) {
        // Try to parse error message from JSON response
        const contentType = response.headers.get('content-type') || '';
        if (contentType.includes('application/json')) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Failed to fetch waybill');
        } else {
          throw new Error(`Failed to fetch waybill: ${response.status}`);
        }
      }

      // Check if response is PDF
      const contentType = response.headers.get('content-type') || '';
      if (contentType.includes('application/pdf')) {
        // Get PDF as blob and open in new tab
        const blob = await response.blob();
        const url = URL.createObjectURL(blob);
        window.open(url, '_blank');

        toast({
          title: 'Waybill Generated',
          description: `Waybill for ${trackingNumbers.length} order(s) opened in new tab.`,
        });
      } else {
        // Unexpected response format
        const text = await response.text();
        console.error('Unexpected response:', text);
        throw new Error('Unexpected response format from server');
      }
    } catch (error: any) {
      console.error('Error fetching waybill:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to generate waybill. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsPrinting(false);
    }
  };

  // Reset page when filters change
  const handleFilterChange = () => {
    setCurrentPage(1);
    setSelectedOrders(new Set());
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
          <div className="flex flex-col gap-4">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Search... (use + to combine, e.g. CASH+Facebook)"
                  value={search}
                  onChange={(e) => { setSearch(e.target.value); handleFilterChange(); }}
                  className="pl-10"
                />
              </div>
              <div className="flex gap-2">
                <Input
                  type="date"
                  value={orderStartDate}
                  onChange={(e) => { setOrderStartDate(e.target.value); handleFilterChange(); }}
                  className="w-40"
                  placeholder="Start Date"
                />
                <Input
                  type="date"
                  value={orderEndDate}
                  onChange={(e) => { setOrderEndDate(e.target.value); handleFilterChange(); }}
                  className="w-40"
                  placeholder="End Date"
                />
              </div>
            </div>

            {/* Additional Filters Row */}
            <div className="flex flex-wrap items-center gap-4">
              {/* Platform Filter */}
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">Platform:</span>
                <Select value={platformFilter} onValueChange={(value) => { setPlatformFilter(value); handleFilterChange(); }}>
                  <SelectTrigger className="w-36">
                    <SelectValue placeholder="All" />
                  </SelectTrigger>
                  <SelectContent>
                    {PLATFORM_OPTIONS.map((opt) => (
                      <SelectItem key={opt} value={opt}>{opt}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Cara Bayaran Filter */}
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">Cara Bayaran:</span>
                <Select value={caraBayaranFilter} onValueChange={(value) => { setCaraBayaranFilter(value); handleFilterChange(); }}>
                  <SelectTrigger className="w-32">
                    <SelectValue placeholder="All" />
                  </SelectTrigger>
                  <SelectContent>
                    {CARA_BAYARAN_OPTIONS.map((opt) => (
                      <SelectItem key={opt} value={opt}>{opt}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Page Size Filter */}
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">Show:</span>
                <Select value={pageSize.toString()} onValueChange={(value) => { setPageSize(Number(value)); setCurrentPage(1); }}>
                  <SelectTrigger className="w-20">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {PAGE_SIZE_OPTIONS.map((size) => (
                      <SelectItem key={size} value={size.toString()}>{size}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <span className="text-sm text-muted-foreground">entries</span>
              </div>

              {/* Spacer */}
              <div className="flex-1" />

              {/* Action Buttons */}
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={handleBulkPrint}
                  disabled={!isSomeSelected || isPrinting}
                  className="gap-2"
                >
                  {isPrinting ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Printer className="w-4 h-4" />
                  )}
                  Print ({selectedOrders.size})
                </Button>
                <Button
                  onClick={handleBulkShipped}
                  disabled={!isSomeSelected || isShipping}
                  className="gap-2"
                >
                  {isShipping ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Send className="w-4 h-4" />
                  )}
                  Shipped ({selectedOrders.size})
                </Button>
              </div>
            </div>
          </div>

          {/* Order Table */}
          <div className="form-section overflow-hidden p-0">
            <div className="overflow-x-auto">
              <table className="data-table">
                <thead>
                  <tr>
                    <th className="w-10">
                      <Checkbox
                        checked={isAllSelected}
                        onCheckedChange={handleSelectAll}
                        aria-label="Select all"
                      />
                    </th>
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
                  {paginatedOrders.length > 0 ? (
                    paginatedOrders.map((order, index) => (
                      <tr key={order.id}>
                        <td>
                          <Checkbox
                            checked={selectedOrders.has(order.id)}
                            onCheckedChange={(checked) => handleSelectOrder(order.id, checked as boolean)}
                            aria-label={`Select order ${index + 1}`}
                          />
                        </td>
                        <td>{(currentPage - 1) * pageSize + index + 1}</td>
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
                        colSpan={14}
                        className="text-center py-12 text-muted-foreground"
                      >
                        No pending orders found.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between px-4 py-3 border-t border-border">
                <div className="text-sm text-muted-foreground">
                  Showing {(currentPage - 1) * pageSize + 1} to {Math.min(currentPage * pageSize, pendingOrders.length)} of {pendingOrders.length} entries
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                    disabled={currentPage === 1}
                  >
                    Previous
                  </Button>
                  <div className="flex items-center gap-1">
                    {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                      let pageNum;
                      if (totalPages <= 5) {
                        pageNum = i + 1;
                      } else if (currentPage <= 3) {
                        pageNum = i + 1;
                      } else if (currentPage >= totalPages - 2) {
                        pageNum = totalPages - 4 + i;
                      } else {
                        pageNum = currentPage - 2 + i;
                      }
                      return (
                        <Button
                          key={pageNum}
                          variant={currentPage === pageNum ? "default" : "outline"}
                          size="sm"
                          onClick={() => setCurrentPage(pageNum)}
                          className="w-8 h-8 p-0"
                        >
                          {pageNum}
                        </Button>
                      );
                    })}
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                    disabled={currentPage === totalPages}
                  >
                    Next
                  </Button>
                </div>
              </div>
            )}
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
