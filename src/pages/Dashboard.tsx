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
} from 'lucide-react';
import { format, startOfMonth, endOfMonth, parseISO, isWithinInterval } from 'date-fns';

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

  // Check if user is marketer
  const isMarketer = profile?.role === 'marketer';
  const userIdStaff = profile?.idstaff;

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

  // Default Dashboard for other roles (admin, bod, logistic, account)
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
