import React, { useState, useMemo, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Calendar, Search, Loader2, Users } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { format, startOfMonth, endOfMonth, parseISO, isWithinInterval } from 'date-fns';

interface Prospect {
  id: string;
  marketer_id_staff: string;
  marketer_name: string;
  tarikh_phone_number: string;
  jenis_prospek: string;
  status_closed: string;
  price_closed: number;
  count_order: number;
  niche: string;
}

interface Order {
  id: string;
  marketer_id_staff: string;
  date_order: string;
  harga_jualan_sebenar: number;
}

interface MarketerStats {
  idStaff: string;
  name: string;
  totalLead: number;
  totalNP: number;
  totalNPPercent: number;
  totalEP: number;
  totalEPPercent: number;
  totalClosed: number;
  totalClosedPercent: number;
  totalOrder: number;
  averageKPK: number;
  closingRate: number;
}

const ReportLeads: React.FC = () => {
  const [prospects, setProspects] = useState<Prospect[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
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
        // Get marketer names from profiles
        const { data: profiles } = await (supabase as any)
          .from('profiles')
          .select('idstaff, name')
          .eq('role', 'marketer');

        const profileMap: Record<string, string> = {};
        (profiles || []).forEach((p: any) => {
          profileMap[p.idstaff] = p.name;
        });

        const [prospectsRes, ordersRes] = await Promise.all([
          (supabase as any)
            .from('prospects')
            .select('id, marketer_id_staff, tarikh_phone_number, jenis_prospek, status_closed, price_closed, count_order, niche'),
          (supabase as any)
            .from('customer_orders')
            .select('id, marketer_id_staff, date_order, harga_jualan_sebenar')
            .order('created_at', { ascending: false }),
        ]);

        if (prospectsRes.error) throw prospectsRes.error;
        if (ordersRes.error) throw ordersRes.error;

        // Add marketer names to prospects
        const prospectsWithNames = (prospectsRes.data || []).map((p: any) => ({
          ...p,
          marketer_name: profileMap[p.marketer_id_staff] || p.marketer_id_staff,
        }));

        setProspects(prospectsWithNames);
        setOrders(ordersRes.data || []);
      } catch (error) {
        console.error('Error fetching data:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchAllData();
  }, []);

  // Filter data by date range
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

  // Calculate stats by marketer
  const marketerStats = useMemo(() => {
    const stats: Record<string, MarketerStats> = {};

    // Process prospects
    filteredProspects.forEach(prospect => {
      const idStaff = prospect.marketer_id_staff;
      const name = prospect.marketer_name;

      if (!stats[idStaff]) {
        stats[idStaff] = {
          idStaff,
          name,
          totalLead: 0,
          totalNP: 0,
          totalNPPercent: 0,
          totalEP: 0,
          totalEPPercent: 0,
          totalClosed: 0,
          totalClosedPercent: 0,
          totalOrder: 0,
          averageKPK: 0,
          closingRate: 0,
        };
      }

      stats[idStaff].totalLead += 1;

      // Count by jenis prospek
      const jenisProspek = prospect.jenis_prospek?.toUpperCase();
      if (jenisProspek === 'NP') {
        stats[idStaff].totalNP += 1;
      } else if (jenisProspek === 'EP') {
        stats[idStaff].totalEP += 1;
      }

      // Count closed leads
      if (prospect.status_closed === 'closed') {
        stats[idStaff].totalClosed += 1;
      }
    });

    // Process orders to get order counts per marketer
    filteredOrders.forEach(order => {
      const idStaff = order.marketer_id_staff;
      if (stats[idStaff]) {
        stats[idStaff].totalOrder += 1;
      }
    });

    // Calculate derived stats
    Object.values(stats).forEach(stat => {
      // Percentage by jenis prospek
      stat.totalNPPercent = stat.totalLead > 0 ? (stat.totalNP / stat.totalLead) * 100 : 0;
      stat.totalEPPercent = stat.totalLead > 0 ? (stat.totalEP / stat.totalLead) * 100 : 0;

      // Closed percentage
      stat.totalClosedPercent = stat.totalLead > 0 ? (stat.totalClosed / stat.totalLead) * 100 : 0;

      // Average KPK (Kos Per Klik) - Orders / Leads
      stat.averageKPK = stat.totalLead > 0 ? stat.totalOrder / stat.totalLead : 0;

      // Closing Rate - Closed / Leads * 100
      stat.closingRate = stat.totalLead > 0 ? (stat.totalClosed / stat.totalLead) * 100 : 0;
    });

    // Convert to array and sort by total lead
    return Object.values(stats).sort((a, b) => b.totalLead - a.totalLead);
  }, [filteredProspects, filteredOrders]);

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
        totalLead: acc.totalLead + stat.totalLead,
        totalNP: acc.totalNP + stat.totalNP,
        totalEP: acc.totalEP + stat.totalEP,
        totalClosed: acc.totalClosed + stat.totalClosed,
        totalOrder: acc.totalOrder + stat.totalOrder,
      }),
      {
        totalLead: 0,
        totalNP: 0,
        totalEP: 0,
        totalClosed: 0,
        totalOrder: 0,
      }
    );
  }, [filteredStats]);

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
            <Users className="w-6 h-6" />
            Report Leads
          </h1>
          <p className="text-muted-foreground mt-1">Leads performance by marketer</p>
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

      {/* Leads Report Table */}
      <div className="form-section">
        <h2 className="text-lg font-semibold text-foreground mb-4">
          Leads Report by Marketer
        </h2>

        <div className="overflow-x-auto border rounded-lg">
          <table className="w-full min-w-[1000px] border-collapse">
            <thead className="bg-muted">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider whitespace-nowrap min-w-[100px]">ID STAFF</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider whitespace-nowrap min-w-[150px]">NAME</th>
                <th className="px-4 py-3 text-center text-xs font-semibold text-muted-foreground uppercase tracking-wider whitespace-nowrap min-w-[100px]">TOTAL LEAD</th>
                <th className="px-4 py-3 text-center text-xs font-semibold text-muted-foreground uppercase tracking-wider whitespace-nowrap min-w-[100px]">NP</th>
                <th className="px-4 py-3 text-center text-xs font-semibold text-muted-foreground uppercase tracking-wider whitespace-nowrap min-w-[100px]">EP</th>
                <th className="px-4 py-3 text-center text-xs font-semibold text-muted-foreground uppercase tracking-wider whitespace-nowrap min-w-[100px]">CLOSED</th>
                <th className="px-4 py-3 text-center text-xs font-semibold text-muted-foreground uppercase tracking-wider whitespace-nowrap min-w-[100px]">TOTAL ORDER</th>
                <th className="px-4 py-3 text-center text-xs font-semibold text-muted-foreground uppercase tracking-wider whitespace-nowrap min-w-[100px]">AVG KPK</th>
                <th className="px-4 py-3 text-center text-xs font-semibold text-muted-foreground uppercase tracking-wider whitespace-nowrap min-w-[100px]">CLOSING %</th>
              </tr>
            </thead>
            <tbody className="bg-background divide-y divide-border">
              {filteredStats.map((stat) => (
                <tr key={stat.idStaff} className="hover:bg-muted/50 transition-colors">
                  <td className="px-4 py-3 text-sm font-medium whitespace-nowrap">{stat.idStaff}</td>
                  <td className="px-4 py-3 text-sm whitespace-nowrap">{stat.name}</td>
                  <td className="px-4 py-3 text-sm text-center font-semibold text-primary whitespace-nowrap">{stat.totalLead}</td>
                  <td className="px-4 py-3 text-sm text-center whitespace-nowrap">
                    <div className="text-cyan-600 font-medium">{stat.totalNP}</div>
                    <div className="text-xs text-muted-foreground">{formatPercent(stat.totalNPPercent)}</div>
                  </td>
                  <td className="px-4 py-3 text-sm text-center whitespace-nowrap">
                    <div className="text-amber-600 font-medium">{stat.totalEP}</div>
                    <div className="text-xs text-muted-foreground">{formatPercent(stat.totalEPPercent)}</div>
                  </td>
                  <td className="px-4 py-3 text-sm text-center whitespace-nowrap">
                    <div className="text-success font-medium">{stat.totalClosed}</div>
                    <div className="text-xs text-muted-foreground">{formatPercent(stat.totalClosedPercent)}</div>
                  </td>
                  <td className="px-4 py-3 text-sm text-center font-medium text-blue-600 whitespace-nowrap">{stat.totalOrder}</td>
                  <td className="px-4 py-3 text-sm text-center font-medium text-purple-600 whitespace-nowrap">{stat.averageKPK.toFixed(2)}</td>
                  <td className="px-4 py-3 text-sm text-center font-medium text-success whitespace-nowrap">{formatPercent(stat.closingRate)}</td>
                </tr>
              ))}
              {filteredStats.length === 0 && (
                <tr>
                  <td colSpan={9} className="px-4 py-8 text-center text-muted-foreground">
                    No marketers found for the selected date range
                  </td>
                </tr>
              )}
            </tbody>
            {filteredStats.length > 0 && (
              <tfoot className="bg-muted/70">
                <tr className="font-semibold">
                  <td className="px-4 py-3 text-sm whitespace-nowrap">TOTAL</td>
                  <td className="px-4 py-3 text-sm whitespace-nowrap">{filteredStats.length} marketers</td>
                  <td className="px-4 py-3 text-sm text-center text-primary whitespace-nowrap">{totals.totalLead}</td>
                  <td className="px-4 py-3 text-sm text-center whitespace-nowrap">
                    <div className="text-cyan-600">{totals.totalNP}</div>
                    <div className="text-xs text-muted-foreground">{formatPercent(totals.totalLead > 0 ? (totals.totalNP / totals.totalLead) * 100 : 0)}</div>
                  </td>
                  <td className="px-4 py-3 text-sm text-center whitespace-nowrap">
                    <div className="text-amber-600">{totals.totalEP}</div>
                    <div className="text-xs text-muted-foreground">{formatPercent(totals.totalLead > 0 ? (totals.totalEP / totals.totalLead) * 100 : 0)}</div>
                  </td>
                  <td className="px-4 py-3 text-sm text-center whitespace-nowrap">
                    <div className="text-success">{totals.totalClosed}</div>
                    <div className="text-xs text-muted-foreground">{formatPercent(totals.totalLead > 0 ? (totals.totalClosed / totals.totalLead) * 100 : 0)}</div>
                  </td>
                  <td className="px-4 py-3 text-sm text-center text-blue-600 whitespace-nowrap">{totals.totalOrder}</td>
                  <td className="px-4 py-3 text-sm text-center text-purple-600 whitespace-nowrap">
                    {(totals.totalLead > 0 ? totals.totalOrder / totals.totalLead : 0).toFixed(2)}
                  </td>
                  <td className="px-4 py-3 text-sm text-center text-success whitespace-nowrap">
                    {formatPercent(totals.totalLead > 0 ? (totals.totalClosed / totals.totalLead) * 100 : 0)}
                  </td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </div>
    </div>
  );
};

export default ReportLeads;
