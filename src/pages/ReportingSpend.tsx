import React, { useState, useMemo } from 'react';
import { useData } from '@/context/DataContext';
import { useBundles } from '@/context/BundleContext';
import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  DollarSign, Users, TrendingUp, Target,
  RotateCcw, BarChart3, Percent, Loader2,
  Facebook, Video, ShoppingBag, Database, Globe
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
  platform: string;
  totalSpend: number;
  totalLeads: number;
  leadsClose: number;
  leadsNotClose: number;
  totalClosedPrice: number;
  kpk: string;
  roas: string;
  closingRate: string;
}

interface PlatformSpend {
  platform: string;
  totalSpend: number;
  icon: React.ReactNode;
  color: string;
  bgColor: string;
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

  // Aggregate spends by platform
  const platformStats = useMemo(() => {
    const platforms = ['Facebook', 'Tiktok', 'Shopee', 'Database', 'Google'];
    const platformIcons: Record<string, { icon: React.ReactNode; color: string; bgColor: string }> = {
      'Facebook': { icon: <Facebook className="w-4 h-4" />, color: 'text-blue-600 dark:text-blue-400', bgColor: 'bg-blue-50 dark:bg-blue-950/30 border-blue-200 dark:border-blue-800' },
      'Tiktok': { icon: <Video className="w-4 h-4" />, color: 'text-pink-600 dark:text-pink-400', bgColor: 'bg-pink-50 dark:bg-pink-950/30 border-pink-200 dark:border-pink-800' },
      'Shopee': { icon: <ShoppingBag className="w-4 h-4" />, color: 'text-orange-600 dark:text-orange-400', bgColor: 'bg-orange-50 dark:bg-orange-950/30 border-orange-200 dark:border-orange-800' },
      'Database': { icon: <Database className="w-4 h-4" />, color: 'text-purple-600 dark:text-purple-400', bgColor: 'bg-purple-50 dark:bg-purple-950/30 border-purple-200 dark:border-purple-800' },
      'Google': { icon: <Globe className="w-4 h-4" />, color: 'text-green-600 dark:text-green-400', bgColor: 'bg-green-50 dark:bg-green-950/30 border-green-200 dark:border-green-800' },
    };

    return platforms.map(platform => {
      const totalSpend = filteredSpends
        .filter(s => s.jenisPlatform?.toLowerCase() === platform.toLowerCase())
        .reduce((sum, s) => sum + s.totalSpend, 0);
      return {
        platform,
        totalSpend,
        ...platformIcons[platform]
      };
    });
  }, [filteredSpends]);

  // Aggregate spends by product + platform
  const aggregatedData = useMemo(() => {
    const dataMap = new Map<string, AggregatedSpend>();

    // Get all unique product + platform combinations from spends
    filteredSpends.forEach((spend) => {
      const key = `${spend.product}|${spend.jenisPlatform || 'Unknown'}`;
      const existing = dataMap.get(key);
      if (existing) {
        existing.totalSpend += spend.totalSpend;
      } else {
        dataMap.set(key, {
          product: spend.product,
          platform: spend.jenisPlatform || 'Unknown',
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

    // Match prospects to products by niche (product name)
    // Note: Prospects don't have platform info, so we distribute leads proportionally across platforms for same product
    dataMap.forEach((value, key) => {
      const productName = value.product;
      // Filter prospects matching this product name (niche field stores product name)
      const matchingProspects = filteredProspects.filter(p => p.niche === productName);

      // Get total spend for this product across all platforms
      const productTotalSpend = Array.from(dataMap.values())
        .filter(d => d.product === productName)
        .reduce((sum, d) => sum + d.totalSpend, 0);

      // Distribute leads proportionally based on spend ratio
      const spendRatio = productTotalSpend > 0 ? value.totalSpend / productTotalSpend : 0;
      const distributedLeads = Math.round(matchingProspects.length * spendRatio);
      const distributedLeadsClose = Math.round(matchingProspects.filter(p => (p as any).statusClosed === 'closed').length * spendRatio);
      const distributedLeadsNotClose = distributedLeads - distributedLeadsClose;
      const distributedClosedPrice = matchingProspects
        .filter(p => (p as any).statusClosed === 'closed')
        .reduce((sum, p) => sum + (parseFloat((p as any).priceClosed) || 0), 0) * spendRatio;

      value.totalLeads = distributedLeads;
      value.leadsClose = distributedLeadsClose;
      value.leadsNotClose = distributedLeadsNotClose;
      value.totalClosedPrice = distributedClosedPrice;

      // Calculate KPK, ROAS, Closing Rate
      value.kpk = value.totalLeads > 0 ? (value.totalSpend / value.totalLeads).toFixed(2) : '0.00';
      value.roas = value.totalSpend > 0 ? (value.totalClosedPrice / value.totalSpend).toFixed(2) : '0.00';
      value.closingRate = value.totalLeads > 0 ? ((value.leadsClose / value.totalLeads) * 100).toFixed(2) : '0.00';
    });

    return Array.from(dataMap.values()).sort((a, b) => {
      // Sort by product first, then platform
      if (a.product !== b.product) return a.product.localeCompare(b.product);
      return a.platform.localeCompare(b.platform);
    });
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

      {/* Spend By Platform */}
      <div>
        <h2 className="text-lg font-semibold text-foreground mb-3">Spend By Platform</h2>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
          {platformStats.map((platform) => (
            <div key={platform.platform} className={`border rounded-lg p-4 ${platform.bgColor}`}>
              <div className={`flex items-center gap-2 mb-1 ${platform.color}`}>
                {platform.icon}
                <span className="text-xs uppercase font-medium">{platform.platform}</span>
              </div>
              <p className={`text-xl font-bold ${platform.color}`}>RM {platform.totalSpend.toFixed(2)}</p>
            </div>
          ))}
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

      {/* Table - Aggregated by Product + Platform */}
      <div className="bg-card border border-border rounded-lg overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50">
              <TableHead className="w-16">No</TableHead>
              <TableHead>Product</TableHead>
              <TableHead>Platform</TableHead>
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
                <TableCell colSpan={10} className="text-center py-8 text-muted-foreground">
                  Tiada data spend
                </TableCell>
              </TableRow>
            ) : (
              aggregatedData.map((data, idx) => (
                <TableRow key={`${data.product}-${data.platform}`} className="hover:bg-muted/30">
                  <TableCell className="font-medium">{idx + 1}</TableCell>
                  <TableCell className="font-medium">{data.product}</TableCell>
                  <TableCell>
                    <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                      data.platform === 'Facebook' ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400' :
                      data.platform === 'Tiktok' ? 'bg-pink-100 text-pink-800 dark:bg-pink-900/30 dark:text-pink-400' :
                      data.platform === 'Shopee' ? 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400' :
                      data.platform === 'Database' ? 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400' :
                      data.platform === 'Google' ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400' :
                      'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400'
                    }`}>
                      {data.platform}
                    </span>
                  </TableCell>
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