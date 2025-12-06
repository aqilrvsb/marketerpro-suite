import React, { useState, useMemo, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Calendar, Search, Loader2, FileSpreadsheet, Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { format, startOfMonth, endOfMonth, parseISO, isWithinInterval } from 'date-fns';

interface Order {
  id: string;
  marketer_id_staff: string;
  marketer_name: string;
  date_order: string;
  harga_jualan_sebenar: number;
  delivery_status: string;
  jenis_customer: string;
  jenis_platform: string;
}

interface Spend {
  id: string;
  marketer_id_staff: string;
  total_spend: number;
  tarikh_spend: string;
}

interface Prospect {
  id: string;
  admin_id_staff: string;
  tarikh_phone_number: string;
  status_closed: string;
}

interface MarketerStats {
  idStaff: string;
  name: string;
  totalSales: number;
  totalReturn: number;
  returnPercent: number;
  totalSpend: number;
  roas: number;
  salesFB: number;
  salesDatabase: number;
  salesShopee: number;
  salesTiktok: number;
  salesGoogle: number;
  salesNP: number;
  salesEP: number;
  salesEC: number;
  totalLead: number;
  averageKPK: number;
  closingRate: number;
}

const ReportSales: React.FC = () => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [spends, setSpends] = useState<Spend[]>([]);
  const [prospects, setProspects] = useState<Prospect[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Date filter state - default to current month
  const today = new Date();
  const [startDate, setStartDate] = useState(format(startOfMonth(today), 'yyyy-MM-dd'));
  const [endDate, setEndDate] = useState(format(endOfMonth(today), 'yyyy-MM-dd'));
  const [searchTerm, setSearchTerm] = useState('');

  // Fetch all data
  useEffect(() => {
    const fetchAllData = async () => {
      setIsLoading(true);
      try {
        const [ordersRes, spendsRes, prospectsRes] = await Promise.all([
          (supabase as any)
            .from('customer_orders')
            .select('id, marketer_id_staff, marketer_name, date_order, harga_jualan_sebenar, delivery_status, jenis_customer, jenis_platform')
            .order('created_at', { ascending: false }),
          (supabase as any)
            .from('spends')
            .select('id, marketer_id_staff, total_spend, tarikh_spend'),
          (supabase as any)
            .from('prospects')
            .select('id, admin_id_staff, tarikh_phone_number, status_closed'),
        ]);

        if (ordersRes.error) throw ordersRes.error;
        if (spendsRes.error) throw spendsRes.error;
        if (prospectsRes.error) throw prospectsRes.error;

        setOrders(ordersRes.data || []);
        setSpends(spendsRes.data || []);
        setProspects(prospectsRes.data || []);
      } catch (error) {
        console.error('Error fetching data:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchAllData();
  }, []);

  // Filter data by date range
  const filteredOrders = useMemo(() => {
    return orders.filter(order => {
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
  }, [orders, startDate, endDate]);

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

  const filteredProspects = useMemo(() => {
    return prospects.filter(prospect => {
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
  }, [prospects, startDate, endDate]);

  // Calculate stats by marketer
  const marketerStats = useMemo(() => {
    const stats: Record<string, MarketerStats> = {};

    // Process orders
    filteredOrders.forEach(order => {
      const idStaff = order.marketer_id_staff;
      const name = order.marketer_name;

      if (!stats[idStaff]) {
        stats[idStaff] = {
          idStaff,
          name,
          totalSales: 0,
          totalReturn: 0,
          returnPercent: 0,
          totalSpend: 0,
          roas: 0,
          salesFB: 0,
          salesDatabase: 0,
          salesShopee: 0,
          salesTiktok: 0,
          salesGoogle: 0,
          salesNP: 0,
          salesEP: 0,
          salesEC: 0,
          totalLead: 0,
          averageKPK: 0,
          closingRate: 0,
        };
      }

      const saleAmount = Number(order.harga_jualan_sebenar) || 0;
      stats[idStaff].totalSales += saleAmount;

      // Count returns
      if (order.delivery_status === 'Return') {
        stats[idStaff].totalReturn += saleAmount;
      }

      // Count by platform
      if (order.jenis_platform === 'Facebook') {
        stats[idStaff].salesFB += saleAmount;
      } else if (order.jenis_platform === 'Database') {
        stats[idStaff].salesDatabase += saleAmount;
      } else if (order.jenis_platform === 'Shopee') {
        stats[idStaff].salesShopee += saleAmount;
      } else if (order.jenis_platform === 'Tiktok') {
        stats[idStaff].salesTiktok += saleAmount;
      } else if (order.jenis_platform === 'Google') {
        stats[idStaff].salesGoogle += saleAmount;
      }

      // Count by customer type
      const customerType = order.jenis_customer?.toUpperCase();
      if (customerType === 'NP') {
        stats[idStaff].salesNP += saleAmount;
      } else if (customerType === 'EP') {
        stats[idStaff].salesEP += saleAmount;
      } else if (customerType === 'EC') {
        stats[idStaff].salesEC += saleAmount;
      }
    });

    // Process spends
    filteredSpends.forEach(spend => {
      const idStaff = spend.marketer_id_staff;
      if (stats[idStaff]) {
        stats[idStaff].totalSpend += Number(spend.total_spend) || 0;
      }
    });

    // Process prospects
    filteredProspects.forEach(prospect => {
      const idStaff = prospect.admin_id_staff;
      if (stats[idStaff]) {
        stats[idStaff].totalLead += 1;
        if (prospect.status_closed && prospect.status_closed.trim() !== '') {
          // Count closed leads for closing rate calculation
        }
      }
    });

    // Calculate derived stats
    Object.values(stats).forEach(stat => {
      // Return percent
      stat.returnPercent = stat.totalSales > 0 ? (stat.totalReturn / stat.totalSales) * 100 : 0;

      // ROAS
      stat.roas = stat.totalSpend > 0 ? stat.totalSales / stat.totalSpend : 0;

      // Average KPK
      stat.averageKPK = stat.totalLead > 0 ? stat.totalSpend / stat.totalLead : 0;

      // Closing rate (need to count closed leads)
      const marketerProspects = filteredProspects.filter(p => p.admin_id_staff === stat.idStaff);
      const closedLeads = marketerProspects.filter(p => p.status_closed && p.status_closed.trim() !== '').length;
      stat.closingRate = marketerProspects.length > 0 ? (closedLeads / marketerProspects.length) * 100 : 0;
    });

    // Convert to array and sort by total sales
    return Object.values(stats).sort((a, b) => b.totalSales - a.totalSales);
  }, [filteredOrders, filteredSpends, filteredProspects]);

  // Filter by search term
  const filteredStats = useMemo(() => {
    if (!searchTerm) return marketerStats;
    const term = searchTerm.toLowerCase();
    return marketerStats.filter(
      stat =>
        stat.idStaff.toLowerCase().includes(term) ||
        stat.name.toLowerCase().includes(term)
    );
  }, [marketerStats, searchTerm]);

  // Calculate totals
  const totals = useMemo(() => {
    return filteredStats.reduce(
      (acc, stat) => ({
        totalSales: acc.totalSales + stat.totalSales,
        totalReturn: acc.totalReturn + stat.totalReturn,
        totalSpend: acc.totalSpend + stat.totalSpend,
        salesFB: acc.salesFB + stat.salesFB,
        salesDatabase: acc.salesDatabase + stat.salesDatabase,
        salesShopee: acc.salesShopee + stat.salesShopee,
        salesTiktok: acc.salesTiktok + stat.salesTiktok,
        salesGoogle: acc.salesGoogle + stat.salesGoogle,
        salesNP: acc.salesNP + stat.salesNP,
        salesEP: acc.salesEP + stat.salesEP,
        salesEC: acc.salesEC + stat.salesEC,
        totalLead: acc.totalLead + stat.totalLead,
      }),
      {
        totalSales: 0,
        totalReturn: 0,
        totalSpend: 0,
        salesFB: 0,
        salesDatabase: 0,
        salesShopee: 0,
        salesTiktok: 0,
        salesGoogle: 0,
        salesNP: 0,
        salesEP: 0,
        salesEC: 0,
        totalLead: 0,
      }
    );
  }, [filteredStats]);

  const formatNumber = (value: number) => {
    return new Intl.NumberFormat('en-MY', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(value);
  };

  const formatPercent = (value: number) => {
    return `${value.toFixed(1)}%`;
  };

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
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-primary flex items-center gap-2">
            <FileSpreadsheet className="w-6 h-6" />
            Report Sales
          </h1>
          <p className="text-muted-foreground mt-1">Sales performance by marketer</p>
        </div>
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
          <div className="relative w-full md:w-64 md:ml-auto">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search marketer..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>
      </div>

      {/* Sales Report Table */}
      <div className="form-section">
        <h2 className="text-lg font-semibold text-foreground mb-4">
          Sales Report by Marketer
        </h2>

        <div className="overflow-x-auto">
          <table className="data-table">
            <thead>
              <tr>
                <th className="sticky left-0 bg-muted z-10">ID STAFF</th>
                <th>NAME</th>
                <th className="text-right">TOTAL SALES</th>
                <th className="text-right">RETURN</th>
                <th className="text-right">RETURN %</th>
                <th className="text-right">SPEND</th>
                <th className="text-right">ROAS</th>
                <th className="text-right">SALES FB</th>
                <th className="text-right">SALES DB</th>
                <th className="text-right">SALES SHOPEE</th>
                <th className="text-right">SALES TIKTOK</th>
                <th className="text-right">SALES GOOGLE</th>
                <th className="text-right">SALES NP</th>
                <th className="text-right">SALES EP</th>
                <th className="text-right">SALES EC</th>
                <th className="text-right">TOTAL LEAD</th>
                <th className="text-right">AVG KPK</th>
                <th className="text-right">CLOSING %</th>
              </tr>
            </thead>
            <tbody>
              {filteredStats.map((stat) => (
                <tr key={stat.idStaff}>
                  <td className="sticky left-0 bg-background z-10 font-medium">{stat.idStaff}</td>
                  <td>{stat.name}</td>
                  <td className="text-right font-semibold text-success">{formatNumber(stat.totalSales)}</td>
                  <td className="text-right text-destructive">{formatNumber(stat.totalReturn)}</td>
                  <td className="text-right text-destructive">{formatPercent(stat.returnPercent)}</td>
                  <td className="text-right text-warning">{formatNumber(stat.totalSpend)}</td>
                  <td className="text-right text-primary font-medium">{stat.roas.toFixed(2)}x</td>
                  <td className="text-right text-blue-600">{formatNumber(stat.salesFB)}</td>
                  <td className="text-right text-purple-600">{formatNumber(stat.salesDatabase)}</td>
                  <td className="text-right text-orange-600">{formatNumber(stat.salesShopee)}</td>
                  <td className="text-right text-pink-600">{formatNumber(stat.salesTiktok)}</td>
                  <td className="text-right text-red-600">{formatNumber(stat.salesGoogle)}</td>
                  <td className="text-right text-cyan-600">{formatNumber(stat.salesNP)}</td>
                  <td className="text-right text-amber-600">{formatNumber(stat.salesEP)}</td>
                  <td className="text-right text-emerald-600">{formatNumber(stat.salesEC)}</td>
                  <td className="text-right">{stat.totalLead}</td>
                  <td className="text-right">{formatNumber(stat.averageKPK)}</td>
                  <td className="text-right font-medium">{formatPercent(stat.closingRate)}</td>
                </tr>
              ))}
              {filteredStats.length === 0 && (
                <tr>
                  <td colSpan={18} className="text-center py-8 text-muted-foreground">
                    No marketers found for the selected date range
                  </td>
                </tr>
              )}
            </tbody>
            {filteredStats.length > 0 && (
              <tfoot>
                <tr className="bg-muted/50 font-semibold">
                  <td className="sticky left-0 bg-muted/50 z-10">TOTAL</td>
                  <td>{filteredStats.length} marketers</td>
                  <td className="text-right text-success">{formatNumber(totals.totalSales)}</td>
                  <td className="text-right text-destructive">{formatNumber(totals.totalReturn)}</td>
                  <td className="text-right text-destructive">
                    {formatPercent(totals.totalSales > 0 ? (totals.totalReturn / totals.totalSales) * 100 : 0)}
                  </td>
                  <td className="text-right text-warning">{formatNumber(totals.totalSpend)}</td>
                  <td className="text-right text-primary">
                    {(totals.totalSpend > 0 ? totals.totalSales / totals.totalSpend : 0).toFixed(2)}x
                  </td>
                  <td className="text-right text-blue-600">{formatNumber(totals.salesFB)}</td>
                  <td className="text-right text-purple-600">{formatNumber(totals.salesDatabase)}</td>
                  <td className="text-right text-orange-600">{formatNumber(totals.salesShopee)}</td>
                  <td className="text-right text-pink-600">{formatNumber(totals.salesTiktok)}</td>
                  <td className="text-right text-red-600">{formatNumber(totals.salesGoogle)}</td>
                  <td className="text-right text-cyan-600">{formatNumber(totals.salesNP)}</td>
                  <td className="text-right text-amber-600">{formatNumber(totals.salesEP)}</td>
                  <td className="text-right text-emerald-600">{formatNumber(totals.salesEC)}</td>
                  <td className="text-right">{totals.totalLead}</td>
                  <td className="text-right">
                    {formatNumber(totals.totalLead > 0 ? totals.totalSpend / totals.totalLead : 0)}
                  </td>
                  <td className="text-right">-</td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </div>
    </div>
  );
};

export default ReportSales;
