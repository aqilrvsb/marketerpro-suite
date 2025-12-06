import React, { useState, useMemo, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Trophy, Medal, Award, Calendar, Search, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { format, startOfMonth, endOfMonth, parseISO, isWithinInterval } from 'date-fns';

interface MarketerStats {
  rank: number;
  idStaff: string;
  name: string;
  spend: number;
  totalSales: number;
  returns: number;
  roas: number;
  salesNP: number;
  salesEP: number;
  salesEC: number;
}

interface Order {
  id: string;
  marketer_id_staff: string;
  marketer_name: string;
  date_order: string;
  harga_jualan_sebenar: number;
  delivery_status: string;
  jenis_customer: string;
}

const Top10: React.FC = () => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Date filter state - default to current month
  const today = new Date();
  const [startDate, setStartDate] = useState(format(startOfMonth(today), 'yyyy-MM-dd'));
  const [endDate, setEndDate] = useState(format(endOfMonth(today), 'yyyy-MM-dd'));
  const [searchTerm, setSearchTerm] = useState('');

  // Fetch ALL orders directly from Supabase (no marketer filter)
  useEffect(() => {
    const fetchAllOrders = async () => {
      setIsLoading(true);
      try {
        const { data, error } = await (supabase as any)
          .from('customer_orders')
          .select('id, marketer_id_staff, marketer_name, date_order, harga_jualan_sebenar, delivery_status, jenis_customer')
          .order('created_at', { ascending: false });

        if (error) throw error;
        setOrders(data || []);
      } catch (error) {
        console.error('Error fetching orders:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchAllOrders();
  }, []);

  // Calculate marketer statistics
  const marketerStats = useMemo(() => {
    const stats: Record<string, MarketerStats> = {};

    // Filter orders by date range
    const filteredOrders = orders.filter(order => {
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

    // Aggregate stats by marketer
    filteredOrders.forEach(order => {
      const idStaff = order.marketer_id_staff;
      const name = order.marketer_name;

      if (!stats[idStaff]) {
        stats[idStaff] = {
          rank: 0,
          idStaff,
          name,
          spend: 0,
          totalSales: 0,
          returns: 0,
          roas: 0,
          salesNP: 0,
          salesEP: 0,
          salesEC: 0,
        };
      }

      // Count sales by customer type
      const saleAmount = Number(order.harga_jualan_sebenar) || 0;
      stats[idStaff].totalSales += saleAmount;

      // Count returns
      if (order.delivery_status?.toLowerCase().includes('return')) {
        stats[idStaff].returns += saleAmount;
      }

      // Count by customer type (NP, EP, EC)
      const customerType = order.jenis_customer?.toUpperCase();
      if (customerType === 'NP') {
        stats[idStaff].salesNP += saleAmount;
      } else if (customerType === 'EP') {
        stats[idStaff].salesEP += saleAmount;
      } else if (customerType === 'EC') {
        stats[idStaff].salesEC += saleAmount;
      }
    });

    // Convert to array and sort by total sales (descending)
    const sortedStats = Object.values(stats)
      .sort((a, b) => b.totalSales - a.totalSales)
      .map((stat, index) => ({
        ...stat,
        rank: index + 1,
        roas: stat.spend > 0 ? stat.totalSales / stat.spend : 0,
      }));

    return sortedStats;
  }, [orders, startDate, endDate]);

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

  // Get top 3 for podium display
  const top3 = marketerStats.slice(0, 3);

  const formatNumber = (value: number) => {
    return new Intl.NumberFormat('en-MY', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(value);
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
      <div>
        <h1 className="text-2xl font-bold text-primary">Top 10 Marketers</h1>
        <p className="text-muted-foreground mt-1">Performance leaderboard rankings</p>
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

      {/* Top 3 Podium */}
      {top3.length > 0 && (
        <div className="form-section">
          <h2 className="text-lg font-semibold text-foreground mb-6 flex items-center gap-2">
            <Trophy className="w-5 h-5 text-primary" />
            Top Performers
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* 1st Place */}
            {top3[0] && (
              <div className="relative bg-gradient-to-br from-amber-50 to-amber-100 dark:from-amber-900/20 dark:to-amber-800/20 rounded-xl p-6 border-2 border-amber-300 dark:border-amber-600 shadow-lg">
                <div className="absolute -top-3 -right-3 bg-amber-400 text-amber-900 rounded-full w-10 h-10 flex items-center justify-center font-bold shadow-md">
                  1
                </div>
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-3 rounded-full bg-amber-400/20">
                    <Trophy className="w-8 h-8 text-amber-500" />
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-amber-600 dark:text-amber-400 uppercase tracking-wide">Champion</p>
                    <p className="font-bold text-foreground truncate">{top3[0].name}</p>
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">ID Staff</span>
                    <span className="font-medium">{top3[0].idStaff}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Total Sales</span>
                    <span className="font-bold text-amber-600 dark:text-amber-400">RM {formatNumber(top3[0].totalSales)}</span>
                  </div>
                </div>
              </div>
            )}

            {/* 2nd Place */}
            {top3[1] && (
              <div className="relative bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-800/20 dark:to-slate-700/20 rounded-xl p-6 border-2 border-slate-300 dark:border-slate-600 shadow-md">
                <div className="absolute -top-3 -right-3 bg-slate-400 text-slate-900 rounded-full w-10 h-10 flex items-center justify-center font-bold shadow-md">
                  2
                </div>
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-3 rounded-full bg-slate-400/20">
                    <Medal className="w-8 h-8 text-slate-500" />
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Runner Up</p>
                    <p className="font-bold text-foreground truncate">{top3[1].name}</p>
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">ID Staff</span>
                    <span className="font-medium">{top3[1].idStaff}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Total Sales</span>
                    <span className="font-bold text-slate-600 dark:text-slate-400">RM {formatNumber(top3[1].totalSales)}</span>
                  </div>
                </div>
              </div>
            )}

            {/* 3rd Place */}
            {top3[2] && (
              <div className="relative bg-gradient-to-br from-orange-50 to-orange-100 dark:from-orange-900/20 dark:to-orange-800/20 rounded-xl p-6 border-2 border-orange-300 dark:border-orange-600 shadow-md">
                <div className="absolute -top-3 -right-3 bg-orange-400 text-orange-900 rounded-full w-10 h-10 flex items-center justify-center font-bold shadow-md">
                  3
                </div>
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-3 rounded-full bg-orange-400/20">
                    <Award className="w-8 h-8 text-orange-500" />
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-orange-600 dark:text-orange-400 uppercase tracking-wide">3rd Place</p>
                    <p className="font-bold text-foreground truncate">{top3[2].name}</p>
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">ID Staff</span>
                    <span className="font-medium">{top3[2].idStaff}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Total Sales</span>
                    <span className="font-bold text-orange-600 dark:text-orange-400">RM {formatNumber(top3[2].totalSales)}</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Rankings Table */}
      <div className="form-section">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
          <h2 className="text-lg font-semibold text-foreground">Full Rankings</h2>
          <div className="relative w-full md:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search marketer..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="data-table">
            <thead>
              <tr>
                <th>NO</th>
                <th>ID STAFF</th>
                <th>NAME</th>
                <th className="text-right">SPEND</th>
                <th className="text-right">TOTAL SALES</th>
                <th className="text-right">RETURN</th>
                <th className="text-right">ROAS</th>
                <th className="text-right">SALES NP</th>
                <th className="text-right">SALES EP</th>
                <th className="text-right">SALES EC</th>
              </tr>
            </thead>
            <tbody>
              {filteredStats.slice(0, 10).map((stat) => (
                <tr key={stat.idStaff}>
                  <td>
                    <div className="flex items-center gap-2">
                      {stat.rank === 1 && <Trophy className="w-4 h-4 text-amber-500" />}
                      {stat.rank === 2 && <Medal className="w-4 h-4 text-slate-400" />}
                      {stat.rank === 3 && <Award className="w-4 h-4 text-orange-500" />}
                      <span className={stat.rank <= 3 ? 'font-bold' : ''}>{stat.rank}</span>
                    </div>
                  </td>
                  <td className="font-medium">{stat.idStaff}</td>
                  <td>{stat.name}</td>
                  <td className="text-right">{formatNumber(stat.spend)}</td>
                  <td className="text-right font-semibold text-primary">{formatNumber(stat.totalSales)}</td>
                  <td className="text-right text-destructive">{formatNumber(stat.returns)}</td>
                  <td className="text-right">{formatNumber(stat.roas)}</td>
                  <td className="text-right text-info">{formatNumber(stat.salesNP)}</td>
                  <td className="text-right text-success">{formatNumber(stat.salesEP)}</td>
                  <td className="text-right text-warning">{formatNumber(stat.salesEC)}</td>
                </tr>
              ))}
              {filteredStats.length === 0 && (
                <tr>
                  <td colSpan={10} className="text-center py-8 text-muted-foreground">
                    No marketers found for the selected date range
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

export default Top10;
