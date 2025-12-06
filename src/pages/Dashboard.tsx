import React, { useState, useMemo, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useData } from '@/context/DataContext';
import { supabase } from '@/integrations/supabase/client';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Loader2,
  Calendar,
  TrendingUp,
  TrendingDown,
  DollarSign,
  RotateCcw,
  Wallet,
  BarChart3,
  Facebook,
  Database,
  ShoppingBag,
  Play,
  Search as SearchIcon,
  Users,
  UserPlus,
  UserCheck,
  Phone,
  Target,
  Percent,
  Package,
  Clock,
  Truck,
  ClipboardList,
  CreditCard,
  Banknote,
  LineChart as LineChartIcon,
} from 'lucide-react';
import { format, startOfMonth, endOfMonth, parseISO, isWithinInterval, eachDayOfInterval } from 'date-fns';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

interface Spend {
  id: string;
  product: string;
  jenis_platform: string;
  total_spend: number;
  tarikh_spend: string;
  marketer_id_staff: string;
}

const Dashboard: React.FC = () => {
  const { profile } = useAuth();
  const { orders, prospects, isLoading } = useData();
  const [spends, setSpends] = useState<Spend[]>([]);
  const [spendsLoading, setSpendsLoading] = useState(true);

  // Date filter state - default to current month
  const today = new Date();
  const [startDate, setStartDate] = useState(format(startOfMonth(today), 'yyyy-MM-dd'));
  const [endDate, setEndDate] = useState(format(endOfMonth(today), 'yyyy-MM-dd'));

  // Check user role
  const isMarketer = profile?.role === 'marketer';
  const isLogistic = profile?.role === 'logistic';
  const isBOD = profile?.role === 'bod';
  const userIdStaff = profile?.idstaff;

  // All orders for logistic and BOD (fetched directly from Supabase)
  const [allOrders, setAllOrders] = useState<any[]>([]);
  const [allOrdersLoading, setAllOrdersLoading] = useState(true);

  // All spends and prospects for BOD
  const [allSpends, setAllSpends] = useState<Spend[]>([]);
  const [allProspects, setAllProspects] = useState<any[]>([]);
  const [bodDataLoading, setBodDataLoading] = useState(true);

  // Fetch spends for the current marketer
  useEffect(() => {
    const fetchSpends = async () => {
      if (!userIdStaff) return;
      setSpendsLoading(true);
      try {
        const { data, error } = await (supabase as any)
          .from('spends')
          .select('*')
          .eq('marketer_id_staff', userIdStaff);
        if (error) throw error;
        setSpends(data || []);
      } catch (error) {
        console.error('Error fetching spends:', error);
      } finally {
        setSpendsLoading(false);
      }
    };

    if (isMarketer) {
      fetchSpends();
    }
  }, [userIdStaff, isMarketer]);

  // Fetch all orders for logistic and BOD roles
  useEffect(() => {
    const fetchAllOrders = async () => {
      setAllOrdersLoading(true);
      try {
        const { data, error } = await (supabase as any)
          .from('customer_orders')
          .select('*')
          .order('created_at', { ascending: false });
        if (error) throw error;
        setAllOrders(data || []);
      } catch (error) {
        console.error('Error fetching all orders:', error);
      } finally {
        setAllOrdersLoading(false);
      }
    };

    if (isLogistic || isBOD) {
      fetchAllOrders();
    }
  }, [isLogistic, isBOD]);

  // Fetch all spends and prospects for BOD
  useEffect(() => {
    const fetchBODData = async () => {
      setBodDataLoading(true);
      try {
        const [spendsRes, prospectsRes] = await Promise.all([
          (supabase as any).from('spends').select('*'),
          (supabase as any).from('prospects').select('*'),
        ]);

        if (spendsRes.error) throw spendsRes.error;
        if (prospectsRes.error) throw prospectsRes.error;

        setAllSpends(spendsRes.data || []);
        setAllProspects(prospectsRes.data || []);
      } catch (error) {
        console.error('Error fetching BOD data:', error);
      } finally {
        setBodDataLoading(false);
      }
    };

    if (isBOD) {
      fetchBODData();
    }
  }, [isBOD]);

  // Filter orders by date range
  const filteredOrders = useMemo(() => {
    return orders.filter(order => {
      if (!order.dateOrder) return false;
      try {
        const orderDate = parseISO(order.dateOrder);
        return isWithinInterval(orderDate, {
          start: parseISO(startDate),
          end: parseISO(endDate)
        });
      } catch {
        return false;
      }
    });
  }, [orders, startDate, endDate]);

  // Filter spends by date range
  const filteredSpends = useMemo(() => {
    return spends.filter(spend => {
      if (!spend.tarikh_spend) return false;
      try {
        const spendDate = parseISO(spend.tarikh_spend);
        return isWithinInterval(spendDate, {
          start: parseISO(startDate),
          end: parseISO(endDate)
        });
      } catch {
        return false;
      }
    });
  }, [spends, startDate, endDate]);

  // Filter prospects by date range
  const filteredProspects = useMemo(() => {
    return prospects.filter(prospect => {
      if (!prospect.tarikhPhoneNumber) return false;
      try {
        const prospectDate = parseISO(prospect.tarikhPhoneNumber);
        return isWithinInterval(prospectDate, {
          start: parseISO(startDate),
          end: parseISO(endDate)
        });
      } catch {
        return false;
      }
    });
  }, [prospects, startDate, endDate]);

  // Calculate marketer stats
  const marketerStats = useMemo(() => {
    // Total Sales
    const totalSales = filteredOrders.reduce((sum, o) => sum + (o.hargaJualanSebenar || 0), 0);

    // Return (only orders with deliveryStatus = 'Return')
    const returnOrders = filteredOrders.filter(o => o.deliveryStatus === 'Return');
    const totalReturn = returnOrders.reduce((sum, o) => sum + (o.hargaJualanSebenar || 0), 0);

    // Total Spend
    const totalSpend = filteredSpends.reduce((sum, s) => sum + (Number(s.total_spend) || 0), 0);

    // ROAS (Return on Ad Spend) = Total Sales / Total Spend
    const roas = totalSpend > 0 ? totalSales / totalSpend : 0;

    // Sales by Platform
    const salesFB = filteredOrders.filter(o => o.jenisPlatform === 'Facebook').reduce((sum, o) => sum + (o.hargaJualanSebenar || 0), 0);
    const salesDatabase = filteredOrders.filter(o => o.jenisPlatform === 'Database').reduce((sum, o) => sum + (o.hargaJualanSebenar || 0), 0);
    const salesShopee = filteredOrders.filter(o => o.jenisPlatform === 'Shopee').reduce((sum, o) => sum + (o.hargaJualanSebenar || 0), 0);
    const salesTiktok = filteredOrders.filter(o => o.jenisPlatform === 'Tiktok').reduce((sum, o) => sum + (o.hargaJualanSebenar || 0), 0);
    const salesGoogle = filteredOrders.filter(o => o.jenisPlatform === 'Google').reduce((sum, o) => sum + (o.hargaJualanSebenar || 0), 0);

    // Sales by Customer Type
    const salesNP = filteredOrders.filter(o => o.jenisCustomer === 'NP').reduce((sum, o) => sum + (o.hargaJualanSebenar || 0), 0);
    const salesEP = filteredOrders.filter(o => o.jenisCustomer === 'EP').reduce((sum, o) => sum + (o.hargaJualanSebenar || 0), 0);
    const salesEC = filteredOrders.filter(o => o.jenisCustomer === 'EC').reduce((sum, o) => sum + (o.hargaJualanSebenar || 0), 0);

    // Total Lead
    const totalLead = filteredProspects.length;

    // Closed leads (prospects with statusClosed not empty)
    const closedLeads = filteredProspects.filter(p => p.statusClosed && p.statusClosed.trim() !== '').length;

    // Average KPK (Kos Per Klik) = Total Spend / Total Lead
    const averageKPK = totalLead > 0 ? totalSpend / totalLead : 0;

    // Closing Rate Lead = Closed Leads / Total Lead * 100
    const closingRate = totalLead > 0 ? (closedLeads / totalLead) * 100 : 0;

    // Calculate percentages (based on total sales as reference)
    const returnPercent = totalSales > 0 ? (totalReturn / totalSales) * 100 : 0;
    const fbPercent = totalSales > 0 ? (salesFB / totalSales) * 100 : 0;
    const dbPercent = totalSales > 0 ? (salesDatabase / totalSales) * 100 : 0;
    const shopeePercent = totalSales > 0 ? (salesShopee / totalSales) * 100 : 0;
    const tiktokPercent = totalSales > 0 ? (salesTiktok / totalSales) * 100 : 0;
    const googlePercent = totalSales > 0 ? (salesGoogle / totalSales) * 100 : 0;
    const npPercent = totalSales > 0 ? (salesNP / totalSales) * 100 : 0;
    const epPercent = totalSales > 0 ? (salesEP / totalSales) * 100 : 0;
    const ecPercent = totalSales > 0 ? (salesEC / totalSales) * 100 : 0;

    return {
      totalSales,
      totalReturn,
      returnPercent,
      totalSpend,
      roas,
      salesFB,
      fbPercent,
      salesDatabase,
      dbPercent,
      salesShopee,
      shopeePercent,
      salesTiktok,
      tiktokPercent,
      salesGoogle,
      googlePercent,
      salesNP,
      npPercent,
      salesEP,
      epPercent,
      salesEC,
      ecPercent,
      totalLead,
      averageKPK,
      closingRate,
    };
  }, [filteredOrders, filteredSpends, filteredProspects]);

  // Filter all orders by date range for logistic
  const filteredAllOrders = useMemo(() => {
    return allOrders.filter(order => {
      if (!order.date_order) return false;
      try {
        const orderDate = parseISO(order.date_order);
        return isWithinInterval(orderDate, {
          start: parseISO(startDate),
          end: parseISO(endDate)
        });
      } catch {
        return false;
      }
    });
  }, [allOrders, startDate, endDate]);

  // Calculate logistic stats
  const logisticStats = useMemo(() => {
    const totalOrder = filteredAllOrders.length;
    const totalPending = filteredAllOrders.filter(o => o.delivery_status === 'Pending').length;
    const totalProcess = filteredAllOrders.filter(o => o.delivery_status === 'Shipped').length;
    const totalReturn = filteredAllOrders.filter(o => o.delivery_status === 'Return').length;

    // Total Order Biasa = Facebook + Database + Google
    const totalOrderBiasa = filteredAllOrders.filter(o =>
      o.jenis_platform === 'Facebook' || o.jenis_platform === 'Database' || o.jenis_platform === 'Google'
    ).length;

    const totalShopee = filteredAllOrders.filter(o => o.jenis_platform === 'Shopee').length;
    const totalTiktok = filteredAllOrders.filter(o => o.jenis_platform === 'Tiktok').length;
    const totalCash = filteredAllOrders.filter(o => o.cara_bayaran === 'CASH').length;
    const totalCOD = filteredAllOrders.filter(o => o.cara_bayaran === 'COD').length;

    // Total Pending Tracking: Shipped AND (SEO is null OR SEO != 'Successfull Delivery')
    const totalPendingTracking = filteredAllOrders.filter(o =>
      o.delivery_status === 'Shipped' &&
      (!o.seo || o.seo !== 'Successfull Delivery') &&
      o.cara_bayaran === 'COD'
    ).length;

    return {
      totalOrder,
      totalPending,
      totalProcess,
      totalReturn,
      totalOrderBiasa,
      totalShopee,
      totalTiktok,
      totalCash,
      totalCOD,
      totalPendingTracking,
    };
  }, [filteredAllOrders]);

  // Filter all spends by date range for BOD
  const filteredAllSpends = useMemo(() => {
    return allSpends.filter(spend => {
      if (!spend.tarikh_spend) return false;
      try {
        const spendDate = parseISO(spend.tarikh_spend);
        return isWithinInterval(spendDate, {
          start: parseISO(startDate),
          end: parseISO(endDate)
        });
      } catch {
        return false;
      }
    });
  }, [allSpends, startDate, endDate]);

  // Filter all prospects by date range for BOD
  const filteredAllProspects = useMemo(() => {
    return allProspects.filter(prospect => {
      if (!prospect.tarikh_phone_number) return false;
      try {
        const prospectDate = parseISO(prospect.tarikh_phone_number);
        return isWithinInterval(prospectDate, {
          start: parseISO(startDate),
          end: parseISO(endDate)
        });
      } catch {
        return false;
      }
    });
  }, [allProspects, startDate, endDate]);

  // Calculate BOD stats (all marketers combined)
  const bodStats = useMemo(() => {
    // Total Sales
    const totalSales = filteredAllOrders.reduce((sum, o) => sum + (Number(o.harga_jualan_sebenar) || 0), 0);

    // Return (only orders with delivery_status = 'Return')
    const returnOrders = filteredAllOrders.filter(o => o.delivery_status === 'Return');
    const totalReturn = returnOrders.reduce((sum, o) => sum + (Number(o.harga_jualan_sebenar) || 0), 0);

    // Total Spend (all marketers)
    const totalSpend = filteredAllSpends.reduce((sum, s) => sum + (Number(s.total_spend) || 0), 0);

    // ROAS
    const roas = totalSpend > 0 ? totalSales / totalSpend : 0;

    // Sales by Platform
    const salesFB = filteredAllOrders.filter(o => o.jenis_platform === 'Facebook').reduce((sum, o) => sum + (Number(o.harga_jualan_sebenar) || 0), 0);
    const salesDatabase = filteredAllOrders.filter(o => o.jenis_platform === 'Database').reduce((sum, o) => sum + (Number(o.harga_jualan_sebenar) || 0), 0);
    const salesShopee = filteredAllOrders.filter(o => o.jenis_platform === 'Shopee').reduce((sum, o) => sum + (Number(o.harga_jualan_sebenar) || 0), 0);
    const salesTiktok = filteredAllOrders.filter(o => o.jenis_platform === 'Tiktok').reduce((sum, o) => sum + (Number(o.harga_jualan_sebenar) || 0), 0);
    const salesGoogle = filteredAllOrders.filter(o => o.jenis_platform === 'Google').reduce((sum, o) => sum + (Number(o.harga_jualan_sebenar) || 0), 0);

    // Sales by Customer Type
    const salesNP = filteredAllOrders.filter(o => o.jenis_customer === 'NP').reduce((sum, o) => sum + (Number(o.harga_jualan_sebenar) || 0), 0);
    const salesEP = filteredAllOrders.filter(o => o.jenis_customer === 'EP').reduce((sum, o) => sum + (Number(o.harga_jualan_sebenar) || 0), 0);
    const salesEC = filteredAllOrders.filter(o => o.jenis_customer === 'EC').reduce((sum, o) => sum + (Number(o.harga_jualan_sebenar) || 0), 0);

    // Total Lead (all marketers)
    const totalLead = filteredAllProspects.length;

    // Closed leads
    const closedLeads = filteredAllProspects.filter(p => p.status_closed && p.status_closed.trim() !== '').length;

    // Average KPK
    const averageKPK = totalLead > 0 ? totalSpend / totalLead : 0;

    // Closing Rate
    const closingRate = totalLead > 0 ? (closedLeads / totalLead) * 100 : 0;

    // Calculate percentages
    const returnPercent = totalSales > 0 ? (totalReturn / totalSales) * 100 : 0;
    const fbPercent = totalSales > 0 ? (salesFB / totalSales) * 100 : 0;
    const dbPercent = totalSales > 0 ? (salesDatabase / totalSales) * 100 : 0;
    const shopeePercent = totalSales > 0 ? (salesShopee / totalSales) * 100 : 0;
    const tiktokPercent = totalSales > 0 ? (salesTiktok / totalSales) * 100 : 0;
    const googlePercent = totalSales > 0 ? (salesGoogle / totalSales) * 100 : 0;
    const npPercent = totalSales > 0 ? (salesNP / totalSales) * 100 : 0;
    const epPercent = totalSales > 0 ? (salesEP / totalSales) * 100 : 0;
    const ecPercent = totalSales > 0 ? (salesEC / totalSales) * 100 : 0;

    return {
      totalSales,
      totalReturn,
      returnPercent,
      totalSpend,
      roas,
      salesFB,
      fbPercent,
      salesDatabase,
      dbPercent,
      salesShopee,
      shopeePercent,
      salesTiktok,
      tiktokPercent,
      salesGoogle,
      googlePercent,
      salesNP,
      npPercent,
      salesEP,
      epPercent,
      salesEC,
      ecPercent,
      totalLead,
      averageKPK,
      closingRate,
    };
  }, [filteredAllOrders, filteredAllSpends, filteredAllProspects]);

  // Chart data for BOD - Sales by date
  const bodChartData = useMemo(() => {
    if (!startDate || !endDate) return [];

    try {
      const days = eachDayOfInterval({
        start: parseISO(startDate),
        end: parseISO(endDate)
      });

      return days.map(day => {
        const dateStr = format(day, 'yyyy-MM-dd');
        const dayOrders = filteredAllOrders.filter(o => o.date_order === dateStr);

        const totalSales = dayOrders.reduce((sum, o) => sum + (Number(o.harga_jualan_sebenar) || 0), 0);
        const salesNP = dayOrders.filter(o => o.jenis_customer === 'NP').reduce((sum, o) => sum + (Number(o.harga_jualan_sebenar) || 0), 0);
        const salesEP = dayOrders.filter(o => o.jenis_customer === 'EP').reduce((sum, o) => sum + (Number(o.harga_jualan_sebenar) || 0), 0);
        const salesEC = dayOrders.filter(o => o.jenis_customer === 'EC').reduce((sum, o) => sum + (Number(o.harga_jualan_sebenar) || 0), 0);

        return {
          date: format(day, 'dd-MMM'),
          'Total Sales': totalSales,
          'Sales NP': salesNP,
          'Sales EP': salesEP,
          'Sales EC': salesEC,
        };
      });
    } catch {
      return [];
    }
  }, [filteredAllOrders, startDate, endDate]);

  const formatCurrency = (value: number) => {
    return `RM ${value.toLocaleString('en-MY', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const formatPercent = (value: number) => {
    return `${value.toFixed(1)}%`;
  };

  if (isLoading || (isMarketer && spendsLoading)) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  // Marketer Dashboard
  if (isMarketer) {
    return (
      <div className="space-y-6 animate-fade-in">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-primary">
            Welcome back, {profile?.fullName || 'Marketer'}!
          </h1>
          <p className="text-muted-foreground mt-1">
            Your performance dashboard
          </p>
        </div>

        {/* Date Filter */}
        <div className="stat-card">
          <div className="flex flex-col md:flex-row gap-4 items-start md:items-end">
            <div className="flex items-center gap-2 text-muted-foreground">
              <Calendar className="w-5 h-5" />
              <span className="font-medium text-foreground">Date Range:</span>
            </div>
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="space-y-1">
                <Label htmlFor="startDate" className="text-xs text-muted-foreground">From</Label>
                <Input
                  id="startDate"
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-40"
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="endDate" className="text-xs text-muted-foreground">To</Label>
                <Input
                  id="endDate"
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="w-40"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Main Stats Row */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {/* Total Sales */}
          <div className="stat-card border-l-4 border-l-success">
            <div className="flex items-center gap-2 text-success mb-2">
              <DollarSign className="w-5 h-5" />
              <span className="text-sm font-medium">TOTAL SALES</span>
            </div>
            <p className="text-2xl font-bold text-foreground">{formatCurrency(marketerStats.totalSales)}</p>
            <p className="text-xs text-muted-foreground mt-1">100%</p>
          </div>

          {/* Return */}
          <div className="stat-card border-l-4 border-l-destructive">
            <div className="flex items-center gap-2 text-destructive mb-2">
              <RotateCcw className="w-5 h-5" />
              <span className="text-sm font-medium">RETURN</span>
            </div>
            <p className="text-2xl font-bold text-foreground">{formatCurrency(marketerStats.totalReturn)}</p>
            <p className="text-xs text-muted-foreground mt-1">{formatPercent(marketerStats.returnPercent)}</p>
          </div>

          {/* Total Spend */}
          <div className="stat-card border-l-4 border-l-warning">
            <div className="flex items-center gap-2 text-warning mb-2">
              <Wallet className="w-5 h-5" />
              <span className="text-sm font-medium">TOTAL SPEND</span>
            </div>
            <p className="text-2xl font-bold text-foreground">{formatCurrency(marketerStats.totalSpend)}</p>
            <p className="text-xs text-muted-foreground mt-1">Ad Budget</p>
          </div>

          {/* ROAS */}
          <div className="stat-card border-l-4 border-l-primary">
            <div className="flex items-center gap-2 text-primary mb-2">
              <BarChart3 className="w-5 h-5" />
              <span className="text-sm font-medium">ROAS</span>
            </div>
            <p className="text-2xl font-bold text-foreground">{marketerStats.roas.toFixed(2)}x</p>
            <p className="text-xs text-muted-foreground mt-1">Return on Ad Spend</p>
          </div>
        </div>

        {/* Platform Sales Row */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          {/* Sales FB */}
          <div className="stat-card">
            <div className="flex items-center gap-2 text-blue-600 mb-2">
              <Facebook className="w-5 h-5" />
              <span className="text-sm font-medium">SALES FB</span>
            </div>
            <p className="text-xl font-bold text-foreground">{formatCurrency(marketerStats.salesFB)}</p>
            <p className="text-xs text-muted-foreground mt-1">{formatPercent(marketerStats.fbPercent)}</p>
          </div>

          {/* Sales Database */}
          <div className="stat-card">
            <div className="flex items-center gap-2 text-purple-600 mb-2">
              <Database className="w-5 h-5" />
              <span className="text-sm font-medium">SALES DATABASE</span>
            </div>
            <p className="text-xl font-bold text-foreground">{formatCurrency(marketerStats.salesDatabase)}</p>
            <p className="text-xs text-muted-foreground mt-1">{formatPercent(marketerStats.dbPercent)}</p>
          </div>

          {/* Sales Shopee */}
          <div className="stat-card">
            <div className="flex items-center gap-2 text-orange-600 mb-2">
              <ShoppingBag className="w-5 h-5" />
              <span className="text-sm font-medium">SALES SHOPEE</span>
            </div>
            <p className="text-xl font-bold text-foreground">{formatCurrency(marketerStats.salesShopee)}</p>
            <p className="text-xs text-muted-foreground mt-1">{formatPercent(marketerStats.shopeePercent)}</p>
          </div>

          {/* Sales TikTok */}
          <div className="stat-card">
            <div className="flex items-center gap-2 text-pink-600 mb-2">
              <Play className="w-5 h-5" />
              <span className="text-sm font-medium">SALES TIKTOK</span>
            </div>
            <p className="text-xl font-bold text-foreground">{formatCurrency(marketerStats.salesTiktok)}</p>
            <p className="text-xs text-muted-foreground mt-1">{formatPercent(marketerStats.tiktokPercent)}</p>
          </div>

          {/* Sales Google */}
          <div className="stat-card">
            <div className="flex items-center gap-2 text-red-600 mb-2">
              <SearchIcon className="w-5 h-5" />
              <span className="text-sm font-medium">SALES GOOGLE</span>
            </div>
            <p className="text-xl font-bold text-foreground">{formatCurrency(marketerStats.salesGoogle)}</p>
            <p className="text-xs text-muted-foreground mt-1">{formatPercent(marketerStats.googlePercent)}</p>
          </div>
        </div>

        {/* Customer Type Sales Row */}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {/* Sales NP */}
          <div className="stat-card">
            <div className="flex items-center gap-2 text-cyan-600 mb-2">
              <UserPlus className="w-5 h-5" />
              <span className="text-sm font-medium">SALES NP</span>
            </div>
            <p className="text-xl font-bold text-foreground">{formatCurrency(marketerStats.salesNP)}</p>
            <p className="text-xs text-muted-foreground mt-1">{formatPercent(marketerStats.npPercent)} - New Prospect</p>
          </div>

          {/* Sales EP */}
          <div className="stat-card">
            <div className="flex items-center gap-2 text-amber-600 mb-2">
              <Users className="w-5 h-5" />
              <span className="text-sm font-medium">SALES EP</span>
            </div>
            <p className="text-xl font-bold text-foreground">{formatCurrency(marketerStats.salesEP)}</p>
            <p className="text-xs text-muted-foreground mt-1">{formatPercent(marketerStats.epPercent)} - Existing Prospect</p>
          </div>

          {/* Sales EC */}
          <div className="stat-card">
            <div className="flex items-center gap-2 text-emerald-600 mb-2">
              <UserCheck className="w-5 h-5" />
              <span className="text-sm font-medium">SALES EC</span>
            </div>
            <p className="text-xl font-bold text-foreground">{formatCurrency(marketerStats.salesEC)}</p>
            <p className="text-xs text-muted-foreground mt-1">{formatPercent(marketerStats.ecPercent)} - Existing Customer</p>
          </div>
        </div>

        {/* Lead Stats Row */}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {/* Total Lead */}
          <div className="stat-card">
            <div className="flex items-center gap-2 text-indigo-600 mb-2">
              <Phone className="w-5 h-5" />
              <span className="text-sm font-medium">TOTAL LEAD</span>
            </div>
            <p className="text-2xl font-bold text-foreground">{marketerStats.totalLead}</p>
            <p className="text-xs text-muted-foreground mt-1">Prospects in period</p>
          </div>

          {/* Average KPK */}
          <div className="stat-card">
            <div className="flex items-center gap-2 text-teal-600 mb-2">
              <Target className="w-5 h-5" />
              <span className="text-sm font-medium">AVERAGE KPK</span>
            </div>
            <p className="text-2xl font-bold text-foreground">{formatCurrency(marketerStats.averageKPK)}</p>
            <p className="text-xs text-muted-foreground mt-1">Kos Per Lead</p>
          </div>

          {/* Closing Rate Lead */}
          <div className="stat-card-highlight">
            <div className="flex items-center gap-2 text-white/80 mb-2">
              <Percent className="w-5 h-5" />
              <span className="text-sm font-medium">CLOSING RATE</span>
            </div>
            <p className="text-2xl font-bold text-white">{formatPercent(marketerStats.closingRate)}</p>
            <p className="text-xs text-white/60 mt-1">Lead Conversion</p>
          </div>
        </div>
      </div>
    );
  }

  // Logistic Dashboard
  if (isLogistic) {
    if (allOrdersLoading) {
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
            Welcome back, {profile?.fullName || 'Logistic'}!
          </h1>
          <p className="text-muted-foreground mt-1">
            Logistics operations dashboard
          </p>
        </div>

        {/* Date Filter */}
        <div className="stat-card">
          <div className="flex flex-col md:flex-row gap-4 items-start md:items-end">
            <div className="flex items-center gap-2 text-muted-foreground">
              <Calendar className="w-5 h-5" />
              <span className="font-medium text-foreground">Date Range:</span>
            </div>
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="space-y-1">
                <Label htmlFor="startDate" className="text-xs text-muted-foreground">From</Label>
                <Input
                  id="startDate"
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-40"
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="endDate" className="text-xs text-muted-foreground">To</Label>
                <Input
                  id="endDate"
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="w-40"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Main Stats Row */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {/* Total Order */}
          <div className="stat-card border-l-4 border-l-primary">
            <div className="flex items-center gap-2 text-primary mb-2">
              <Package className="w-5 h-5" />
              <span className="text-sm font-medium">TOTAL ORDER</span>
            </div>
            <p className="text-2xl font-bold text-foreground">{logisticStats.totalOrder}</p>
            <p className="text-xs text-muted-foreground mt-1">All orders in period</p>
          </div>

          {/* Total Pending */}
          <div className="stat-card border-l-4 border-l-warning">
            <div className="flex items-center gap-2 text-warning mb-2">
              <Clock className="w-5 h-5" />
              <span className="text-sm font-medium">TOTAL PENDING</span>
            </div>
            <p className="text-2xl font-bold text-foreground">{logisticStats.totalPending}</p>
            <p className="text-xs text-muted-foreground mt-1">Awaiting processing</p>
          </div>

          {/* Total Process */}
          <div className="stat-card border-l-4 border-l-info">
            <div className="flex items-center gap-2 text-info mb-2">
              <Truck className="w-5 h-5" />
              <span className="text-sm font-medium">TOTAL PROCESS</span>
            </div>
            <p className="text-2xl font-bold text-foreground">{logisticStats.totalProcess}</p>
            <p className="text-xs text-muted-foreground mt-1">Shipped orders</p>
          </div>

          {/* Total Return */}
          <div className="stat-card border-l-4 border-l-destructive">
            <div className="flex items-center gap-2 text-destructive mb-2">
              <RotateCcw className="w-5 h-5" />
              <span className="text-sm font-medium">TOTAL RETURN</span>
            </div>
            <p className="text-2xl font-bold text-foreground">{logisticStats.totalReturn}</p>
            <p className="text-xs text-muted-foreground mt-1">Returned orders</p>
          </div>
        </div>

        {/* Platform Stats Row */}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {/* Total Order Biasa */}
          <div className="stat-card">
            <div className="flex items-center gap-2 text-blue-600 mb-2">
              <Package className="w-5 h-5" />
              <span className="text-sm font-medium">TOTAL ORDER BIASA</span>
            </div>
            <p className="text-2xl font-bold text-foreground">{logisticStats.totalOrderBiasa}</p>
            <p className="text-xs text-muted-foreground mt-1">FB + Database + Google</p>
          </div>

          {/* Total Shopee */}
          <div className="stat-card">
            <div className="flex items-center gap-2 text-orange-600 mb-2">
              <ShoppingBag className="w-5 h-5" />
              <span className="text-sm font-medium">TOTAL SHOPEE</span>
            </div>
            <p className="text-2xl font-bold text-foreground">{logisticStats.totalShopee}</p>
            <p className="text-xs text-muted-foreground mt-1">Shopee orders</p>
          </div>

          {/* Total TikTok */}
          <div className="stat-card">
            <div className="flex items-center gap-2 text-pink-600 mb-2">
              <Play className="w-5 h-5" />
              <span className="text-sm font-medium">TOTAL TIKTOK</span>
            </div>
            <p className="text-2xl font-bold text-foreground">{logisticStats.totalTiktok}</p>
            <p className="text-xs text-muted-foreground mt-1">TikTok orders</p>
          </div>
        </div>

        {/* Payment Stats Row */}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {/* Total Cash */}
          <div className="stat-card">
            <div className="flex items-center gap-2 text-emerald-600 mb-2">
              <Banknote className="w-5 h-5" />
              <span className="text-sm font-medium">TOTAL CASH</span>
            </div>
            <p className="text-2xl font-bold text-foreground">{logisticStats.totalCash}</p>
            <p className="text-xs text-muted-foreground mt-1">Cash payments</p>
          </div>

          {/* Total COD */}
          <div className="stat-card">
            <div className="flex items-center gap-2 text-amber-600 mb-2">
              <CreditCard className="w-5 h-5" />
              <span className="text-sm font-medium">TOTAL COD</span>
            </div>
            <p className="text-2xl font-bold text-foreground">{logisticStats.totalCOD}</p>
            <p className="text-xs text-muted-foreground mt-1">Cash on Delivery</p>
          </div>

          {/* Total Pending Tracking */}
          <div className="stat-card-highlight">
            <div className="flex items-center gap-2 text-white/80 mb-2">
              <ClipboardList className="w-5 h-5" />
              <span className="text-sm font-medium">PENDING TRACKING</span>
            </div>
            <p className="text-2xl font-bold text-white">{logisticStats.totalPendingTracking}</p>
            <p className="text-xs text-white/60 mt-1">COD awaiting delivery confirmation</p>
          </div>
        </div>
      </div>
    );
  }

  // BOD Dashboard - Business Owner Dashboard
  if (isBOD) {
    if (allOrdersLoading || bodDataLoading) {
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
            Welcome back, {profile?.fullName || 'Owner'}!
          </h1>
          <p className="text-muted-foreground mt-1">
            Business performance overview - All marketers combined
          </p>
        </div>

        {/* Date Filter */}
        <div className="stat-card">
          <div className="flex flex-col md:flex-row gap-4 items-start md:items-end">
            <div className="flex items-center gap-2 text-muted-foreground">
              <Calendar className="w-5 h-5" />
              <span className="font-medium text-foreground">Date Range:</span>
            </div>
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="space-y-1">
                <Label htmlFor="startDate" className="text-xs text-muted-foreground">From</Label>
                <Input
                  id="startDate"
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-40"
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="endDate" className="text-xs text-muted-foreground">To</Label>
                <Input
                  id="endDate"
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="w-40"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Main Stats Row */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {/* Total Sales */}
          <div className="stat-card border-l-4 border-l-success">
            <div className="flex items-center gap-2 text-success mb-2">
              <DollarSign className="w-5 h-5" />
              <span className="text-sm font-medium">TOTAL SALES</span>
            </div>
            <p className="text-2xl font-bold text-foreground">{formatCurrency(bodStats.totalSales)}</p>
            <p className="text-xs text-muted-foreground mt-1">100%</p>
          </div>

          {/* Return */}
          <div className="stat-card border-l-4 border-l-destructive">
            <div className="flex items-center gap-2 text-destructive mb-2">
              <RotateCcw className="w-5 h-5" />
              <span className="text-sm font-medium">RETURN</span>
            </div>
            <p className="text-2xl font-bold text-foreground">{formatCurrency(bodStats.totalReturn)}</p>
            <p className="text-xs text-muted-foreground mt-1">{formatPercent(bodStats.returnPercent)}</p>
          </div>

          {/* Total Spend */}
          <div className="stat-card border-l-4 border-l-warning">
            <div className="flex items-center gap-2 text-warning mb-2">
              <Wallet className="w-5 h-5" />
              <span className="text-sm font-medium">TOTAL SPEND</span>
            </div>
            <p className="text-2xl font-bold text-foreground">{formatCurrency(bodStats.totalSpend)}</p>
            <p className="text-xs text-muted-foreground mt-1">Ad Budget</p>
          </div>

          {/* ROAS */}
          <div className="stat-card border-l-4 border-l-primary">
            <div className="flex items-center gap-2 text-primary mb-2">
              <BarChart3 className="w-5 h-5" />
              <span className="text-sm font-medium">ROAS</span>
            </div>
            <p className="text-2xl font-bold text-foreground">{bodStats.roas.toFixed(2)}x</p>
            <p className="text-xs text-muted-foreground mt-1">Return on Ad Spend</p>
          </div>
        </div>

        {/* Platform Sales Row */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          {/* Sales FB */}
          <div className="stat-card">
            <div className="flex items-center gap-2 text-blue-600 mb-2">
              <Facebook className="w-5 h-5" />
              <span className="text-sm font-medium">SALES FB</span>
            </div>
            <p className="text-xl font-bold text-foreground">{formatCurrency(bodStats.salesFB)}</p>
            <p className="text-xs text-muted-foreground mt-1">{formatPercent(bodStats.fbPercent)}</p>
          </div>

          {/* Sales Database */}
          <div className="stat-card">
            <div className="flex items-center gap-2 text-purple-600 mb-2">
              <Database className="w-5 h-5" />
              <span className="text-sm font-medium">SALES DATABASE</span>
            </div>
            <p className="text-xl font-bold text-foreground">{formatCurrency(bodStats.salesDatabase)}</p>
            <p className="text-xs text-muted-foreground mt-1">{formatPercent(bodStats.dbPercent)}</p>
          </div>

          {/* Sales Shopee */}
          <div className="stat-card">
            <div className="flex items-center gap-2 text-orange-600 mb-2">
              <ShoppingBag className="w-5 h-5" />
              <span className="text-sm font-medium">SALES SHOPEE</span>
            </div>
            <p className="text-xl font-bold text-foreground">{formatCurrency(bodStats.salesShopee)}</p>
            <p className="text-xs text-muted-foreground mt-1">{formatPercent(bodStats.shopeePercent)}</p>
          </div>

          {/* Sales TikTok */}
          <div className="stat-card">
            <div className="flex items-center gap-2 text-pink-600 mb-2">
              <Play className="w-5 h-5" />
              <span className="text-sm font-medium">SALES TIKTOK</span>
            </div>
            <p className="text-xl font-bold text-foreground">{formatCurrency(bodStats.salesTiktok)}</p>
            <p className="text-xs text-muted-foreground mt-1">{formatPercent(bodStats.tiktokPercent)}</p>
          </div>

          {/* Sales Google */}
          <div className="stat-card">
            <div className="flex items-center gap-2 text-red-600 mb-2">
              <SearchIcon className="w-5 h-5" />
              <span className="text-sm font-medium">SALES GOOGLE</span>
            </div>
            <p className="text-xl font-bold text-foreground">{formatCurrency(bodStats.salesGoogle)}</p>
            <p className="text-xs text-muted-foreground mt-1">{formatPercent(bodStats.googlePercent)}</p>
          </div>
        </div>

        {/* Customer Type Sales Row */}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {/* Sales NP */}
          <div className="stat-card">
            <div className="flex items-center gap-2 text-cyan-600 mb-2">
              <UserPlus className="w-5 h-5" />
              <span className="text-sm font-medium">SALES NP</span>
            </div>
            <p className="text-xl font-bold text-foreground">{formatCurrency(bodStats.salesNP)}</p>
            <p className="text-xs text-muted-foreground mt-1">{formatPercent(bodStats.npPercent)} - New Prospect</p>
          </div>

          {/* Sales EP */}
          <div className="stat-card">
            <div className="flex items-center gap-2 text-amber-600 mb-2">
              <Users className="w-5 h-5" />
              <span className="text-sm font-medium">SALES EP</span>
            </div>
            <p className="text-xl font-bold text-foreground">{formatCurrency(bodStats.salesEP)}</p>
            <p className="text-xs text-muted-foreground mt-1">{formatPercent(bodStats.epPercent)} - Existing Prospect</p>
          </div>

          {/* Sales EC */}
          <div className="stat-card">
            <div className="flex items-center gap-2 text-emerald-600 mb-2">
              <UserCheck className="w-5 h-5" />
              <span className="text-sm font-medium">SALES EC</span>
            </div>
            <p className="text-xl font-bold text-foreground">{formatCurrency(bodStats.salesEC)}</p>
            <p className="text-xs text-muted-foreground mt-1">{formatPercent(bodStats.ecPercent)} - Existing Customer</p>
          </div>
        </div>

        {/* Lead Stats Row */}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {/* Total Lead */}
          <div className="stat-card">
            <div className="flex items-center gap-2 text-indigo-600 mb-2">
              <Phone className="w-5 h-5" />
              <span className="text-sm font-medium">TOTAL LEAD</span>
            </div>
            <p className="text-2xl font-bold text-foreground">{bodStats.totalLead}</p>
            <p className="text-xs text-muted-foreground mt-1">Prospects in period</p>
          </div>

          {/* Average KPK */}
          <div className="stat-card">
            <div className="flex items-center gap-2 text-teal-600 mb-2">
              <Target className="w-5 h-5" />
              <span className="text-sm font-medium">AVERAGE KPK</span>
            </div>
            <p className="text-2xl font-bold text-foreground">{formatCurrency(bodStats.averageKPK)}</p>
            <p className="text-xs text-muted-foreground mt-1">Kos Per Lead</p>
          </div>

          {/* Closing Rate Lead */}
          <div className="stat-card-highlight">
            <div className="flex items-center gap-2 text-white/80 mb-2">
              <Percent className="w-5 h-5" />
              <span className="text-sm font-medium">CLOSING RATE</span>
            </div>
            <p className="text-2xl font-bold text-white">{formatPercent(bodStats.closingRate)}</p>
            <p className="text-xs text-white/60 mt-1">Lead Conversion</p>
          </div>
        </div>

        {/* Sales Chart */}
        <div className="stat-card">
          <div className="flex items-center gap-2 mb-4">
            <LineChartIcon className="w-5 h-5 text-primary" />
            <h2 className="text-lg font-semibold text-foreground">
              Sales Trend from {format(parseISO(startDate), 'dd-MMM-yyyy')} to {format(parseISO(endDate), 'dd-MMM-yyyy')}
            </h2>
          </div>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={bodChartData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis
                  dataKey="date"
                  tick={{ fontSize: 12 }}
                  className="text-muted-foreground"
                />
                <YAxis
                  tick={{ fontSize: 12 }}
                  tickFormatter={(value) => `RM ${(value / 1000).toFixed(0)}k`}
                  className="text-muted-foreground"
                />
                <Tooltip
                  formatter={(value: number) => [`RM ${value.toLocaleString('en-MY', { minimumFractionDigits: 2 })}`, '']}
                  labelStyle={{ color: '#333' }}
                  contentStyle={{ backgroundColor: 'hsl(var(--background))', border: '1px solid hsl(var(--border))' }}
                />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="Total Sales"
                  stroke="#22c55e"
                  strokeWidth={2}
                  dot={{ fill: '#22c55e', strokeWidth: 2 }}
                  activeDot={{ r: 6 }}
                />
                <Line
                  type="monotone"
                  dataKey="Sales NP"
                  stroke="#06b6d4"
                  strokeWidth={2}
                  dot={{ fill: '#06b6d4', strokeWidth: 2 }}
                />
                <Line
                  type="monotone"
                  dataKey="Sales EP"
                  stroke="#f59e0b"
                  strokeWidth={2}
                  dot={{ fill: '#f59e0b', strokeWidth: 2 }}
                />
                <Line
                  type="monotone"
                  dataKey="Sales EC"
                  stroke="#10b981"
                  strokeWidth={2}
                  dot={{ fill: '#10b981', strokeWidth: 2 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    );
  }

  // Default Dashboard for other roles (admin, account)
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

      {/* Default dashboard content - can be customized per role later */}
      <div className="stat-card">
        <p className="text-muted-foreground">Dashboard for {profile?.role || 'user'} role coming soon...</p>
      </div>
    </div>
  );
};

export default Dashboard;
