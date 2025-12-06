import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
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
import { Trophy, Medal, Award, Calendar, Search } from 'lucide-react';
import { useData } from '@/context/DataContext';
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

const Top10: React.FC = () => {
  const { orders } = useData();

  // Date filter state - default to current month
  const today = new Date();
  const [startDate, setStartDate] = useState(format(startOfMonth(today), 'yyyy-MM-dd'));
  const [endDate, setEndDate] = useState(format(endOfMonth(today), 'yyyy-MM-dd'));
  const [searchTerm, setSearchTerm] = useState('');

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

      // Count returns (assuming delivery_status contains return info)
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
        // Calculate ROAS (if spend > 0)
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

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-MY', {
      style: 'currency',
      currency: 'MYR',
      minimumFractionDigits: 2,
    }).format(value);
  };

  const formatNumber = (value: number) => {
    return new Intl.NumberFormat('en-MY', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(value);
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Top 10 Marketers</h1>
          <p className="text-muted-foreground">Leaderboard performance rankings</p>
        </div>
      </div>

      {/* Date Filter */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col md:flex-row gap-4 items-end">
            <div className="flex items-center gap-2">
              <Calendar className="w-5 h-5 text-muted-foreground" />
              <span className="font-medium">Target :</span>
            </div>
            <div className="flex flex-col md:flex-row gap-4">
              <div className="space-y-1">
                <Label htmlFor="startDate">From</Label>
                <Input
                  id="startDate"
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-40"
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="endDate">To</Label>
                <Input
                  id="endDate"
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="w-40"
                />
              </div>
            </div>
            <div className="text-lg font-semibold text-primary">
              {format(parseISO(startDate), 'dd-MM-yyyy')} TO {format(parseISO(endDate), 'dd-MM-yyyy')}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Top 3 Podium */}
      <div className="space-y-4">
        {/* TOP ONE - Gold */}
        {top3[0] && (
          <div className="text-center">
            <p className="text-sm font-medium text-muted-foreground mb-2">TOP ONE</p>
            <div className="inline-flex items-center gap-3 px-8 py-4 rounded-full bg-gradient-to-r from-yellow-300 to-yellow-500 text-yellow-900 shadow-lg">
              <Trophy className="w-6 h-6" />
              <span className="text-lg font-bold uppercase">{top3[0].name}</span>
            </div>
          </div>
        )}

        {/* TOP TWO - Silver */}
        {top3[1] && (
          <div className="text-center">
            <p className="text-sm font-medium text-muted-foreground mb-2">TOP TWO</p>
            <div className="inline-flex items-center gap-3 px-8 py-4 rounded-full bg-gradient-to-r from-blue-300 to-blue-500 text-blue-900 shadow-lg">
              <Medal className="w-6 h-6" />
              <span className="text-lg font-bold uppercase">{top3[1].name}</span>
            </div>
          </div>
        )}

        {/* TOP THREE - Bronze */}
        {top3[2] && (
          <div className="text-center">
            <p className="text-sm font-medium text-muted-foreground mb-2">TOP THREE</p>
            <div className="inline-flex items-center gap-3 px-8 py-4 rounded-full bg-gradient-to-r from-green-300 to-green-500 text-green-900 shadow-lg">
              <Award className="w-6 h-6" />
              <span className="text-lg font-bold uppercase">{top3[2].name}</span>
            </div>
          </div>
        )}

        {top3.length === 0 && (
          <div className="text-center py-8 text-muted-foreground">
            No data available for the selected date range
          </div>
        )}
      </div>

      {/* Data Table */}
      <Card>
        <CardHeader>
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <CardTitle>Marketer Rankings</CardTitle>
            <div className="relative w-full md:w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-yellow-400 hover:bg-yellow-400">
                  <TableHead className="text-yellow-900 font-bold">NO</TableHead>
                  <TableHead className="text-yellow-900 font-bold">ID STAFF</TableHead>
                  <TableHead className="text-yellow-900 font-bold">NAME</TableHead>
                  <TableHead className="text-yellow-900 font-bold text-right">SPEND</TableHead>
                  <TableHead className="text-yellow-900 font-bold text-right">TOTAL SALES</TableHead>
                  <TableHead className="text-yellow-900 font-bold text-right">RETURN</TableHead>
                  <TableHead className="text-yellow-900 font-bold text-right">ROAS</TableHead>
                  <TableHead className="text-yellow-900 font-bold text-right">SALES NP</TableHead>
                  <TableHead className="text-yellow-900 font-bold text-right">SALES EP</TableHead>
                  <TableHead className="text-yellow-900 font-bold text-right">SALES EC</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredStats.slice(0, 10).map((stat, index) => (
                  <TableRow
                    key={stat.idStaff}
                    className={index % 2 === 0 ? 'bg-yellow-50' : 'bg-green-50'}
                  >
                    <TableCell className="font-medium">{stat.rank}</TableCell>
                    <TableCell className="font-medium">{stat.idStaff}</TableCell>
                    <TableCell>{stat.name}</TableCell>
                    <TableCell className="text-right">{formatNumber(stat.spend)}</TableCell>
                    <TableCell className="text-right font-semibold">{formatNumber(stat.totalSales)}</TableCell>
                    <TableCell className="text-right text-red-600">{formatNumber(stat.returns)}</TableCell>
                    <TableCell className="text-right">{formatNumber(stat.roas)}</TableCell>
                    <TableCell className="text-right text-blue-600">{formatNumber(stat.salesNP)}</TableCell>
                    <TableCell className="text-right text-green-600">{formatNumber(stat.salesEP)}</TableCell>
                    <TableCell className="text-right text-purple-600">{formatNumber(stat.salesEC)}</TableCell>
                  </TableRow>
                ))}
                {filteredStats.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={10} className="text-center py-8 text-muted-foreground">
                      No marketers found
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Top10;
