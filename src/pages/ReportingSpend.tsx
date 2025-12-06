import React, { useState, useMemo } from 'react';
import { useData } from '@/context/DataContext';
import { useBundles } from '@/context/BundleContext';
import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { 
  DollarSign, Users, TrendingUp, Target, 
  RotateCcw, BarChart3, Percent, Loader2
} from 'lucide-react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { supabase } from '@/integrations/supabase/client';

interface Spend {
  id: string;
  product: string;
  jenisPlatform: string;
  totalSpend: number;
  tarikhSpend: string;
  marketerIdStaff: string;
  createdAt: string;
}

interface AggregatedSpend {
  product: string;
  totalSpend: number;
  totalLeads: number;
  leadsClose: number;
  leadsNotClose: number;
  totalClosedPrice: number;
  kpk: string;
  roas: string;
  closingRate: string;
}

const ReportingSpend: React.FC = () => {
  const { prospects } = useData();
  const { products } = useBundles();
  const { profile } = useAuth();
  const [spends, setSpends] = useState<Spend[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  // Check if current user is marketer (should only see their own data)
  const isMarketer = profile?.role === 'marketer';
  const userIdStaff = profile?.idstaff;

  // Fetch spends data
  const fetchSpends = async () => {
    setIsLoading(true);
    try {
      let query = (supabase as any).from('spends').select('*').order('created_at', { ascending: false });

      // Marketers only see their own spends
      if (isMarketer && userIdStaff) {
        query = query.eq('marketer_id_staff', userIdStaff);
      }

      const { data, error } = await query;
      if (error) throw error;
      setSpends((data || []).map((d: any) => ({
        id: d.id,
        product: d.product,
        jenisPlatform: d.jenis_platform,
        totalSpend: parseFloat(d.total_spend) || 0,
        tarikhSpend: d.tarikh_spend,
        marketerIdStaff: d.marketer_id_staff || '',
        createdAt: d.created_at,
      })));
    } catch (error) {
      console.error('Error fetching spends:', error);
    } finally {
      setIsLoading(false);
    }
  };

  React.useEffect(() => {
    fetchSpends();
  }, [isMarketer, userIdStaff]);

  // Filter spends based on date range
  const filteredSpends = useMemo(() => {
    return spends.filter((spend) => {
      const spendDate = spend.tarikhSpend;
      const matchesStartDate = !startDate || (spendDate && spendDate >= startDate);
      const matchesEndDate = !endDate || (spendDate && spendDate <= endDate);
      return matchesStartDate && matchesEndDate;
    });
  }, [spends, startDate, endDate]);

  // Filter prospects based on same date range (tarikhPhoneNumber)
  const filteredProspects = useMemo(() => {
    return prospects.filter((prospect) => {
      const prospectDate = prospect.tarikhPhoneNumber;
      const matchesStartDate = !startDate || (prospectDate && prospectDate >= startDate);
      const matchesEndDate = !endDate || (prospectDate && prospectDate <= endDate);
      return matchesStartDate && matchesEndDate;
    });
  }, [prospects, startDate, endDate]);

  // Aggregate spends by product
  const aggregatedData = useMemo(() => {
    const productMap = new Map<string, AggregatedSpend>();

    // Get all unique products from spends
    filteredSpends.forEach((spend) => {
      const existing = productMap.get(spend.product);
      if (existing) {
        existing.totalSpend += spend.totalSpend;
      } else {
        productMap.set(spend.product, {
          product: spend.product,
          totalSpend: spend.totalSpend,
          totalLeads: 0,
          leadsClose: 0,
          leadsNotClose: 0,
          totalClosedPrice: 0,
          kpk: '0.00',
          roas: '0.00',
          closingRate: '0.00',
        });
      }
    });

    // Match prospects to products by niche (SKU) -> find product name from SKU
    productMap.forEach((value, productName) => {
      // Find the product by name to get its SKU
      const product = products.find(p => p.name === productName);
      const productSku = product?.sku || productName;

      // Filter prospects matching this product's SKU (niche field stores SKU)
      const matchingProspects = filteredProspects.filter(p => p.niche === productSku);
      
      value.totalLeads = matchingProspects.length;
      value.leadsClose = matchingProspects.filter(p => (p as any).statusClosed === 'closed').length;
      value.leadsNotClose = matchingProspects.filter(p => !(p as any).statusClosed || (p as any).statusClosed !== 'closed').length;
      value.totalClosedPrice = matchingProspects
        .filter(p => (p as any).statusClosed === 'closed')
        .reduce((sum, p) => sum + (parseFloat((p as any).priceClosed) || 0), 0);
      
      // Calculate KPK, ROAS, Closing Rate
      value.kpk = value.totalLeads > 0 ? (value.totalSpend / value.totalLeads).toFixed(2) : '0.00';
      value.roas = value.totalSpend > 0 ? (value.totalClosedPrice / value.totalSpend).toFixed(2) : '0.00';
      value.closingRate = value.totalLeads > 0 ? ((value.leadsClose / value.totalLeads) * 100).toFixed(2) : '0.00';
    });

    return Array.from(productMap.values());
  }, [filteredSpends, filteredProspects, products]);

  // Calculate overall stats
  const stats = useMemo(() => {
    const totalSpend = filteredSpends.reduce((sum, s) => sum + s.totalSpend, 0);
    const totalLeads = filteredProspects.length;
    const overallKPK = totalLeads > 0 ? (totalSpend / totalLeads).toFixed(2) : '0.00';
    const leadsClose = filteredProspects.filter(p => (p as any).statusClosed === 'closed').length;
    const leadsTidakClose = filteredProspects.filter(p => !(p as any).statusClosed || (p as any).statusClosed !== 'closed').length;
    const totalClosedPrice = filteredProspects
      .filter(p => (p as any).statusClosed === 'closed')
      .reduce((sum, p) => sum + (parseFloat((p as any).priceClosed) || 0), 0);
    const roas = totalSpend > 0 ? (totalClosedPrice / totalSpend).toFixed(2) : '0.00';
    const closingRate = totalLeads > 0 ? ((leadsClose / totalLeads) * 100).toFixed(2) : '0.00';

    return { totalSpend, totalLeads, overallKPK, leadsClose, leadsTidakClose, roas, closingRate };
  }, [filteredSpends, filteredProspects]);

  const resetFilters = () => {
    setStartDate('');
    setEndDate('');
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
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-primary">Reporting Spend</h1>
          <p className="text-muted-foreground">Laporan perbelanjaan marketing mengikut produk</p>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4">
        <div className="bg-card border border-border rounded-lg p-4">
          <div className="flex items-center gap-2 text-muted-foreground mb-1">
            <DollarSign className="w-4 h-4 text-green-500" />
            <span className="text-xs uppercase font-medium">Total Spend</span>
          </div>
          <p className="text-xl font-bold text-foreground">RM {stats.totalSpend.toFixed(2)}</p>
        </div>

        <div className="bg-card border border-border rounded-lg p-4">
          <div className="flex items-center gap-2 text-muted-foreground mb-1">
            <Users className="w-4 h-4 text-blue-500" />
            <span className="text-xs uppercase font-medium">Total Leads</span>
          </div>
          <p className="text-xl font-bold text-foreground">{stats.totalLeads}</p>
        </div>

        <div className="bg-card border border-border rounded-lg p-4">
          <div className="flex items-center gap-2 text-muted-foreground mb-1">
            <BarChart3 className="w-4 h-4 text-purple-500" />
            <span className="text-xs uppercase font-medium">Overall KPK</span>
          </div>
          <p className="text-xl font-bold text-foreground">RM {stats.overallKPK}</p>
        </div>

        <div className="bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800 rounded-lg p-4">
          <div className="flex items-center gap-2 text-green-700 dark:text-green-400 mb-1">
            <Target className="w-4 h-4" />
            <span className="text-xs uppercase font-medium">Leads Close</span>
          </div>
          <p className="text-xl font-bold text-green-700 dark:text-green-400">{stats.leadsClose}</p>
        </div>

        <div className="bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 rounded-lg p-4">
          <div className="flex items-center gap-2 text-red-700 dark:text-red-400 mb-1">
            <Target className="w-4 h-4" />
            <span className="text-xs uppercase font-medium">Leads Tidak Close</span>
          </div>
          <p className="text-xl font-bold text-red-700 dark:text-red-400">{stats.leadsTidakClose}</p>
        </div>

        <div className="bg-card border border-border rounded-lg p-4">
          <div className="flex items-center gap-2 text-muted-foreground mb-1">
            <TrendingUp className="w-4 h-4 text-orange-500" />
            <span className="text-xs uppercase font-medium">ROAS</span>
          </div>
          <p className="text-xl font-bold text-foreground">{stats.roas}x</p>
        </div>

        <div className="bg-card border border-border rounded-lg p-4">
          <div className="flex items-center gap-2 text-muted-foreground mb-1">
            <Percent className="w-4 h-4 text-indigo-500" />
            <span className="text-xs uppercase font-medium">Closing Rate</span>
          </div>
          <p className="text-xl font-bold text-foreground">{stats.closingRate}%</p>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-card border border-border rounded-lg p-4">
        <div className="flex flex-wrap gap-4 items-end">
          <div className="flex-1 min-w-[200px]">
            <label className="block text-sm font-medium text-muted-foreground mb-1">Start Date</label>
            <Input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="bg-background"
            />
          </div>
          <div className="flex-1 min-w-[200px]">
            <label className="block text-sm font-medium text-muted-foreground mb-1">End Date</label>
            <Input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="bg-background"
            />
          </div>
          <Button variant="outline" onClick={resetFilters}>
            <RotateCcw className="w-4 h-4 mr-2" />
            Reset
          </Button>
        </div>
      </div>

      {/* Table - Aggregated by Product */}
      <div className="bg-card border border-border rounded-lg overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50">
              <TableHead className="w-16">No</TableHead>
              <TableHead>Product</TableHead>
              <TableHead className="text-right">Total Spend</TableHead>
              <TableHead className="text-right">Total Leads</TableHead>
              <TableHead className="text-right">KPK</TableHead>
              <TableHead className="text-right">Leads Close</TableHead>
              <TableHead className="text-right">Leads X Close</TableHead>
              <TableHead className="text-right">ROAS</TableHead>
              <TableHead className="text-right">Closing Rate</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {aggregatedData.length === 0 ? (
              <TableRow>
                <TableCell colSpan={9} className="text-center py-8 text-muted-foreground">
                  Tiada data spend
                </TableCell>
              </TableRow>
            ) : (
              aggregatedData.map((data, idx) => (
                <TableRow key={data.product} className="hover:bg-muted/30">
                  <TableCell className="font-medium">{idx + 1}</TableCell>
                  <TableCell className="font-medium">{data.product}</TableCell>
                  <TableCell className="text-right font-medium">RM {data.totalSpend.toFixed(2)}</TableCell>
                  <TableCell className="text-right">{data.totalLeads}</TableCell>
                  <TableCell className="text-right">RM {data.kpk}</TableCell>
                  <TableCell className="text-right text-green-600">{data.leadsClose}</TableCell>
                  <TableCell className="text-right text-red-600">{data.leadsNotClose}</TableCell>
                  <TableCell className="text-right">{data.roas}x</TableCell>
                  <TableCell className="text-right">{data.closingRate}%</TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
};

export default ReportingSpend;