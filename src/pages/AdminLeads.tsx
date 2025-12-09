import React, { useState, useMemo, useRef, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useData } from '@/context/DataContext';
import { useBundles } from '@/context/BundleContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import {
  Plus, Search, Trash2, Loader2, Users,
  Calendar, RotateCcw, Download, Upload, Pencil,
  ShoppingCart, UserPlus, Inbox
} from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

const AdminLeads: React.FC = () => {
  const { profile } = useAuth();
  const { prospects, addProspect, updateProspect, deleteProspect, isLoading, refreshData } = useData();
  const { products } = useBundles();
  const [search, setSearch] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [marketerFilter, setMarketerFilter] = useState('All');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editingProspect, setEditingProspect] = useState<any>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [prospectToDelete, setProspectToDelete] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isImporting, setIsImporting] = useState(false);
  const [showFormatDialog, setShowFormatDialog] = useState(false);
  const [ordersModalOpen, setOrdersModalOpen] = useState(false);
  const [selectedProspectOrders, setSelectedProspectOrders] = useState<any[]>([]);
  const [selectedProspectName, setSelectedProspectName] = useState('');
  const [isLoadingOrders, setIsLoadingOrders] = useState(false);

  // Get Leads feature
  const [getLeadsCount, setGetLeadsCount] = useState<number>(10);
  const [isGettingLeads, setIsGettingLeads] = useState(false);
  const [unclaimedLeadsCount, setUnclaimedLeadsCount] = useState<number>(0);

  const [formData, setFormData] = useState({
    namaProspek: '',
    noTelefon: '',
    niche: '',
    tarikhPhoneNumber: '',
    adminIdStaff: '',
    marketerIdStaff: '',
  });

  // Fetch unclaimed leads count
  const fetchUnclaimedCount = async () => {
    try {
      const { count, error } = await (supabase as any)
        .from('prospects')
        .select('*', { count: 'exact', head: true })
        .or('admin_id_staff.is.null,admin_id_staff.eq.');

      if (!error) {
        setUnclaimedLeadsCount(count || 0);
      }
    } catch (e) {
      console.error('Error fetching unclaimed count:', e);
    }
  };

  useEffect(() => {
    fetchUnclaimedCount();
  }, [prospects]);

  // Handle Get Leads - claim leads for this admin
  const handleGetLeads = async () => {
    if (!profile?.idstaff) {
      toast({
        title: 'Error',
        description: 'Admin ID not found.',
        variant: 'destructive',
      });
      return;
    }

    if (getLeadsCount <= 0) {
      toast({
        title: 'Error',
        description: 'Please enter a valid number.',
        variant: 'destructive',
      });
      return;
    }

    if (getLeadsCount > unclaimedLeadsCount) {
      toast({
        title: 'Error',
        description: `Only ${unclaimedLeadsCount} unclaimed leads available.`,
        variant: 'destructive',
      });
      return;
    }

    setIsGettingLeads(true);

    try {
      // First, get the IDs of unclaimed leads (limit to requested count)
      const { data: unclaimedLeads, error: fetchError } = await (supabase as any)
        .from('prospects')
        .select('id')
        .or('admin_id_staff.is.null,admin_id_staff.eq.')
        .order('created_at', { ascending: true })
        .limit(getLeadsCount);

      if (fetchError) throw fetchError;

      if (!unclaimedLeads || unclaimedLeads.length === 0) {
        toast({
          title: 'No Leads',
          description: 'No unclaimed leads available.',
          variant: 'destructive',
        });
        return;
      }

      // Update each lead with admin_id_staff
      const leadIds = unclaimedLeads.map((l: any) => l.id);
      const { error: updateError } = await (supabase as any)
        .from('prospects')
        .update({
          admin_id_staff: profile.idstaff,
          updated_at: new Date().toISOString()
        })
        .in('id', leadIds);

      if (updateError) throw updateError;

      toast({
        title: 'Leads Claimed!',
        description: `Successfully claimed ${leadIds.length} leads.`,
      });

      // Refresh data
      await refreshData();
      await fetchUnclaimedCount();
    } catch (error) {
      console.error('Error getting leads:', error);
      toast({
        title: 'Error',
        description: 'Failed to claim leads. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsGettingLeads(false);
    }
  };

  // Get unique marketers from prospects
  const uniqueMarketers = useMemo(() => {
    const marketers = new Set<string>();
    prospects.forEach(p => {
      if (p.marketerIdStaff) marketers.add(p.marketerIdStaff);
    });
    return Array.from(marketers).sort();
  }, [prospects]);

  // Filter prospects based on admin assignment, search, date range, and marketer
  const filteredProspects = useMemo(() => {
    return prospects.filter((prospect) => {
      // Only show leads assigned to current admin
      const matchesAdmin = prospect.adminIdStaff === profile?.idstaff;

      const matchesSearch =
        prospect.namaProspek.toLowerCase().includes(search.toLowerCase()) ||
        prospect.noTelefon.includes(search) ||
        prospect.niche.toLowerCase().includes(search.toLowerCase()) ||
        (prospect.marketerIdStaff || '').toLowerCase().includes(search.toLowerCase());

      const prospectDate = prospect.tarikhPhoneNumber;
      const matchesStartDate = !startDate || (prospectDate && prospectDate >= startDate);
      const matchesEndDate = !endDate || (prospectDate && prospectDate <= endDate);
      const matchesMarketer = marketerFilter === 'All' || prospect.marketerIdStaff === marketerFilter;

      return matchesAdmin && matchesSearch && matchesStartDate && matchesEndDate && matchesMarketer;
    });
  }, [prospects, search, startDate, endDate, marketerFilter, profile?.idstaff]);

  // Calculate stats
  const stats = useMemo(() => {
    const totalLead = filteredProspects.length;
    const totalNP = filteredProspects.filter(p => p.jenisProspek === 'NP').length;
    const totalEP = filteredProspects.filter(p => p.jenisProspek === 'EP').length;
    const totalSales = filteredProspects
      .filter(p => p.statusClosed === 'closed')
      .reduce((sum, p) => sum + (p.priceClosed || 0), 0);
    const leadClose = filteredProspects.filter(p => p.statusClosed === 'closed').length;
    const leadXClose = filteredProspects.filter(p => !p.statusClosed || p.statusClosed !== 'closed').length;
    return { totalLead, totalNP, totalEP, totalSales, leadClose, leadXClose };
  }, [filteredProspects]);

  const resetFilters = () => {
    setSearch('');
    setStartDate('');
    setEndDate('');
    setMarketerFilter('All');
  };

  const handleViewOrders = async (prospect: any) => {
    if (!prospect.countOrder || prospect.countOrder === 0) return;

    setSelectedProspectName(prospect.namaProspek);
    setIsLoadingOrders(true);
    setOrdersModalOpen(true);

    try {
      const { data: orders, error } = await (supabase as any)
        .from('customer_orders')
        .select('tarikh_tempahan, harga_jualan_sebenar, produk, kuantiti')
        .eq('no_phone', prospect.noTelefon)
        .eq('marketer_id_staff', prospect.marketerIdStaff)
        .order('tarikh_tempahan', { ascending: false });

      if (error) throw error;
      setSelectedProspectOrders(orders || []);
    } catch (error) {
      console.error('Error fetching orders:', error);
      toast({
        title: 'Error',
        description: 'Gagal mendapatkan senarai order.',
        variant: 'destructive',
      });
      setSelectedProspectOrders([]);
    } finally {
      setIsLoadingOrders(false);
    }
  };

  const handleChange = (field: string, value: string) => {
    let processedValue = value;
    if (field === 'namaProspek' || field === 'adminIdStaff' || field === 'marketerIdStaff') {
      processedValue = value.toUpperCase();
    }
    setFormData((prev) => ({ ...prev, [field]: processedValue }));
  };

  const resetForm = () => {
    setFormData({
      namaProspek: '',
      noTelefon: '',
      niche: '',
      tarikhPhoneNumber: '',
      adminIdStaff: '',
      marketerIdStaff: '',
    });
    setEditingProspect(null);
  };

  const handleEdit = (prospect: any) => {
    setEditingProspect(prospect);
    setFormData({
      namaProspek: prospect.namaProspek,
      noTelefon: prospect.noTelefon,
      niche: prospect.niche,
      tarikhPhoneNumber: prospect.tarikhPhoneNumber || '',
      adminIdStaff: prospect.adminIdStaff || '',
      marketerIdStaff: prospect.marketerIdStaff || '',
    });
    setIsDialogOpen(true);
  };

  const handleSubmit = async () => {
    if (!formData.namaProspek || !formData.noTelefon || !formData.niche || !formData.tarikhPhoneNumber || !formData.marketerIdStaff) {
      toast({
        title: 'Error',
        description: 'Sila lengkapkan semua medan yang diperlukan.',
        variant: 'destructive',
      });
      return;
    }

    setIsSubmitting(true);

    try {
      if (editingProspect) {
        await updateProspect(editingProspect.id, {
          namaProspek: formData.namaProspek,
          noTelefon: formData.noTelefon,
          niche: formData.niche,
          tarikhPhoneNumber: formData.tarikhPhoneNumber,
          adminIdStaff: formData.adminIdStaff,
          marketerIdStaff: formData.marketerIdStaff,
        });
        toast({ title: 'Berjaya', description: 'Lead telah dikemaskini.' });
      } else {
        await addProspect({
          namaProspek: formData.namaProspek,
          noTelefon: formData.noTelefon,
          niche: formData.niche,
          jenisProspek: '', // Will be determined by OrderForm
          tarikhPhoneNumber: formData.tarikhPhoneNumber,
          adminIdStaff: formData.adminIdStaff,
          marketerIdStaff: formData.marketerIdStaff,
          statusClosed: '',
          priceClosed: 0,
          countOrder: 0,
        });
        toast({ title: 'Berjaya', description: 'Lead baru telah ditambah.' });
      }
      setIsDialogOpen(false);
      resetForm();
    } catch (error) {
      console.error('Error saving prospect:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const confirmDelete = async () => {
    if (!prospectToDelete) return;
    try {
      await deleteProspect(prospectToDelete);
      toast({ title: 'Berjaya', description: 'Lead telah dipadam.' });
    } catch (error) {
      console.error('Error deleting prospect:', error);
    } finally {
      setDeleteDialogOpen(false);
      setProspectToDelete(null);
    }
  };

  const exportCSV = () => {
    const headers = ['No', 'Tarikh', 'Nama', 'Phone', 'Niche', 'Jenis Prospek', 'Count Order', 'Admin Id', 'Marketer', 'Status', 'Price'];
    const rows = filteredProspects.map((prospect, idx) => [
      idx + 1,
      prospect.tarikhPhoneNumber || '-',
      prospect.namaProspek,
      prospect.noTelefon,
      prospect.niche,
      prospect.jenisProspek || '-',
      prospect.countOrder || 0,
      prospect.adminIdStaff || '-',
      prospect.marketerIdStaff || '-',
      prospect.statusClosed || '-',
      prospect.priceClosed > 0 ? prospect.priceClosed.toFixed(2) : '-',
    ]);

    const csvContent = [headers, ...rows].map(row => row.join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `leads_admin_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const handleImportCSV = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsImporting(true);
    try {
      const text = await file.text();
      const lines = text.split('\n').filter(line => line.trim());

      // Skip header
      const dataLines = lines.slice(1);
      let successCount = 0;
      let errorCount = 0;

      for (const line of dataLines) {
        const [nama, phone, niche, tarikh, marketer] = line.split(',').map(s => s.trim());
        if (nama && phone && niche && tarikh && marketer) {
          try {
            await addProspect({
              namaProspek: nama.toUpperCase(),
              noTelefon: phone,
              niche: niche,
              jenisProspek: '',
              tarikhPhoneNumber: tarikh,
              adminIdStaff: profile?.idstaff || '',
              marketerIdStaff: marketer.toUpperCase(),
              statusClosed: '',
              priceClosed: 0,
              countOrder: 0,
            });
            successCount++;
          } catch {
            errorCount++;
          }
        } else {
          errorCount++;
        }
      }

      toast({
        title: 'Import Selesai',
        description: `${successCount} leads berjaya diimport. ${errorCount} gagal.`,
      });
    } catch (error) {
      console.error('Import error:', error);
      toast({
        title: 'Error',
        description: 'Gagal membaca fail CSV.',
        variant: 'destructive',
      });
    } finally {
      setIsImporting(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Leads Management</h1>
          <p className="text-muted-foreground">Manage your assigned leads</p>
        </div>
        <div className="flex gap-2">
          <input
            type="file"
            accept=".csv"
            onChange={handleImportCSV}
            ref={fileInputRef}
            className="hidden"
          />
          <Button variant="outline" size="sm" onClick={() => setShowFormatDialog(true)}>
            <Upload className="w-4 h-4 mr-2" />
            Import
          </Button>
          <Button variant="outline" size="sm" onClick={exportCSV}>
            <Download className="w-4 h-4 mr-2" />
            Export
          </Button>
          <Button onClick={() => { resetForm(); setIsDialogOpen(true); }}>
            <Plus className="w-4 h-4 mr-2" />
            Tambah Lead
          </Button>
        </div>
      </div>

      {/* Get Leads Section */}
      <div className="bg-card border border-border rounded-lg p-4">
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10">
              <Inbox className="w-5 h-5 text-primary" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Unclaimed Leads</p>
              <p className="text-xl font-bold text-foreground">{unclaimedLeadsCount}</p>
            </div>
          </div>
          <div className="h-10 w-px bg-border hidden sm:block" />
          <div className="flex items-center gap-3">
            <div>
              <Label className="text-xs text-muted-foreground mb-1.5 block">Number of Leads</Label>
              <Input
                type="number"
                min={1}
                max={unclaimedLeadsCount}
                value={getLeadsCount}
                onChange={(e) => setGetLeadsCount(parseInt(e.target.value) || 0)}
                className="w-[120px]"
                placeholder="10"
              />
            </div>
            <Button
              onClick={handleGetLeads}
              disabled={isGettingLeads || unclaimedLeadsCount === 0}
              className="mt-5"
            >
              {isGettingLeads ? (
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
              ) : (
                <UserPlus className="w-4 h-4 mr-2" />
              )}
              GET
            </Button>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <div className="bg-card border border-border rounded-lg p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-blue-500/10">
              <Users className="w-5 h-5 text-blue-500" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Total Lead</p>
              <p className="text-xl font-bold text-foreground">{stats.totalLead}</p>
            </div>
          </div>
        </div>
        <div className="bg-card border border-border rounded-lg p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-green-500/10">
              <Users className="w-5 h-5 text-green-500" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">NP</p>
              <p className="text-xl font-bold text-foreground">{stats.totalNP}</p>
            </div>
          </div>
        </div>
        <div className="bg-card border border-border rounded-lg p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-purple-500/10">
              <Users className="w-5 h-5 text-purple-500" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">EP</p>
              <p className="text-xl font-bold text-foreground">{stats.totalEP}</p>
            </div>
          </div>
        </div>
        <div className="bg-card border border-border rounded-lg p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-emerald-500/10">
              <Users className="w-5 h-5 text-emerald-500" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Lead Close</p>
              <p className="text-xl font-bold text-foreground">{stats.leadClose}</p>
            </div>
          </div>
        </div>
        <div className="bg-card border border-border rounded-lg p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-red-500/10">
              <Users className="w-5 h-5 text-red-500" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Lead X Close</p>
              <p className="text-xl font-bold text-foreground">{stats.leadXClose}</p>
            </div>
          </div>
        </div>
        <div className="bg-card border border-border rounded-lg p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-amber-500/10">
              <Users className="w-5 h-5 text-amber-500" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Total Sales</p>
              <p className="text-xl font-bold text-foreground">RM {stats.totalSales.toFixed(2)}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-card border border-border rounded-lg p-4">
        <div className="flex flex-wrap items-end gap-4">
          <div className="flex-1 min-w-[200px]">
            <Label className="text-xs text-muted-foreground mb-1.5 block">Search</Label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Cari nama, phone, niche, marketer..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
          </div>
          <div className="w-[180px]">
            <Label className="text-xs text-muted-foreground mb-1.5 block">Marketer</Label>
            <Select value={marketerFilter} onValueChange={setMarketerFilter}>
              <SelectTrigger>
                <SelectValue placeholder="All Marketers" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="All">All Marketers</SelectItem>
                {uniqueMarketers.map((m) => (
                  <SelectItem key={m} value={m}>{m}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="w-[150px]">
            <Label className="text-xs text-muted-foreground mb-1.5 block">Dari Tarikh</Label>
            <div className="relative">
              <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="pl-9"
              />
            </div>
          </div>
          <div className="w-[150px]">
            <Label className="text-xs text-muted-foreground mb-1.5 block">Hingga Tarikh</Label>
            <div className="relative">
              <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="pl-9"
              />
            </div>
          </div>
          <Button variant="outline" size="icon" onClick={resetFilters} title="Reset Filters">
            <RotateCcw className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Table */}
      <div className="bg-card border border-border rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-muted/50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase">No</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase">Tarikh</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase">Nama</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase">Phone</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase">Niche</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase">Jenis</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase">Orders</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase">Marketer</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase">Status</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase">Price</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filteredProspects.length > 0 ? (
                filteredProspects.map((prospect, index) => (
                  <tr key={prospect.id} className="hover:bg-muted/30 transition-colors">
                    <td className="px-4 py-3 text-sm text-foreground">{index + 1}</td>
                    <td className="px-4 py-3 text-sm text-foreground">{prospect.tarikhPhoneNumber || '-'}</td>
                    <td className="px-4 py-3 text-sm font-medium text-foreground">{prospect.namaProspek}</td>
                    <td className="px-4 py-3 text-sm font-mono text-foreground">{prospect.noTelefon}</td>
                    <td className="px-4 py-3 text-sm text-foreground">{prospect.niche}</td>
                    <td className="px-4 py-3">
                      {prospect.jenisProspek ? (
                        <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                          prospect.jenisProspek === 'NP'
                            ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
                            : 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400'
                        }`}>
                          {prospect.jenisProspek}
                        </span>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-sm text-center font-medium text-foreground">
                      {prospect.countOrder > 0 ? (
                        <button
                          onClick={() => handleViewOrders(prospect)}
                          className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-full bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400 hover:bg-blue-200 dark:hover:bg-blue-900/50 transition-colors cursor-pointer"
                        >
                          <ShoppingCart className="w-3 h-3" />
                          {prospect.countOrder}
                        </button>
                      ) : (
                        <span className="text-muted-foreground">0</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-sm text-foreground font-medium">{prospect.marketerIdStaff || '-'}</td>
                    <td className="px-4 py-3">
                      {prospect.statusClosed ? (
                        <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                          prospect.statusClosed === 'closed'
                            ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
                            : 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400'
                        }`}>
                          {prospect.statusClosed}
                        </span>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-sm text-foreground">
                      {prospect.priceClosed > 0 ? `RM ${prospect.priceClosed.toFixed(2)}` : '-'}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleEdit(prospect)}
                          className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                        >
                          <Pencil className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => { setProspectToDelete(prospect.id); setDeleteDialogOpen(true); }}
                          className="p-1.5 rounded-lg hover:bg-red-100 text-muted-foreground hover:text-red-600 transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={11} className="px-4 py-12 text-center text-muted-foreground">
                    Tiada lead dijumpai.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add/Edit Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editingProspect ? 'Edit Lead' : 'Tambah Lead Baru'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Nama Prospek *</Label>
              <Input
                value={formData.namaProspek}
                onChange={(e) => handleChange('namaProspek', e.target.value)}
                placeholder="Masukkan nama"
              />
            </div>
            <div>
              <Label>No. Telefon *</Label>
              <Input
                value={formData.noTelefon}
                onChange={(e) => handleChange('noTelefon', e.target.value)}
                placeholder="60123456789"
              />
            </div>
            <div>
              <Label>Niche *</Label>
              <Select value={formData.niche} onValueChange={(v) => handleChange('niche', v)}>
                <SelectTrigger>
                  <SelectValue placeholder="Pilih Niche" />
                </SelectTrigger>
                <SelectContent>
                  {products.map((p) => (
                    <SelectItem key={p.id} value={p.name}>{p.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Tarikh Phone Number *</Label>
              <Input
                type="date"
                value={formData.tarikhPhoneNumber}
                onChange={(e) => handleChange('tarikhPhoneNumber', e.target.value)}
              />
            </div>
            <div>
              <Label>Marketer ID Staff *</Label>
              <Input
                value={formData.marketerIdStaff}
                onChange={(e) => handleChange('marketerIdStaff', e.target.value)}
                placeholder="Masukkan ID staff marketer"
              />
            </div>
            <div>
              <Label>Admin ID Staff</Label>
              <Input
                value={formData.adminIdStaff}
                onChange={(e) => handleChange('adminIdStaff', e.target.value)}
                placeholder="Masukkan ID staff admin"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>Batal</Button>
            <Button onClick={handleSubmit} disabled={isSubmitting}>
              {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
              {editingProspect ? 'Kemaskini' : 'Simpan'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Padam Lead?</AlertDialogTitle>
            <AlertDialogDescription>
              Tindakan ini tidak boleh dibatalkan. Lead ini akan dipadam secara kekal.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Batal</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} className="bg-red-600 hover:bg-red-700">
              Padam
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Import Format Dialog */}
      <Dialog open={showFormatDialog} onOpenChange={setShowFormatDialog}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Format Import CSV</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Fail CSV mesti mempunyai format berikut:
            </p>
            <div className="bg-muted p-3 rounded-lg font-mono text-xs">
              <p className="font-semibold mb-2">Header:</p>
              <p>Nama,Phone,Niche,Tarikh,Marketer</p>
              <p className="font-semibold mt-3 mb-2">Contoh Data:</p>
              <p>ALI BIN ABU,60123456789,Product A,2024-01-15,JOHN</p>
              <p>SITI BINTI AHMAD,60198765432,Product B,2024-01-16,JANE</p>
            </div>
            <Button onClick={() => { setShowFormatDialog(false); fileInputRef.current?.click(); }}>
              <Upload className="w-4 h-4 mr-2" />
              Pilih Fail CSV
            </Button>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowFormatDialog(false)}>Tutup</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Orders Modal */}
      <Dialog open={ordersModalOpen} onOpenChange={setOrdersModalOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ShoppingCart className="w-5 h-5 text-blue-500" />
              Senarai Order - {selectedProspectName}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {isLoadingOrders ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin text-primary" />
              </div>
            ) : selectedProspectOrders.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-muted/50">
                    <tr>
                      <th className="px-3 py-2 text-left text-xs font-semibold text-muted-foreground uppercase">Tarikh Order</th>
                      <th className="px-3 py-2 text-left text-xs font-semibold text-muted-foreground uppercase">Price</th>
                      <th className="px-3 py-2 text-left text-xs font-semibold text-muted-foreground uppercase">Bundle</th>
                      <th className="px-3 py-2 text-left text-xs font-semibold text-muted-foreground uppercase">Unit</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {selectedProspectOrders.map((order, idx) => (
                      <tr key={idx} className="hover:bg-muted/30">
                        <td className="px-3 py-2 text-foreground">{order.tarikh_tempahan || '-'}</td>
                        <td className="px-3 py-2 text-foreground">RM {(order.harga_jualan_sebenar || 0).toFixed(2)}</td>
                        <td className="px-3 py-2 text-foreground">{order.produk || '-'}</td>
                        <td className="px-3 py-2 text-foreground text-center">{order.kuantiti || 1}</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot className="bg-muted/30">
                    <tr>
                      <td className="px-3 py-2 font-semibold text-foreground">Total</td>
                      <td className="px-3 py-2 font-semibold text-foreground">
                        RM {selectedProspectOrders.reduce((sum, o) => sum + (o.harga_jualan_sebenar || 0), 0).toFixed(2)}
                      </td>
                      <td className="px-3 py-2"></td>
                      <td className="px-3 py-2 font-semibold text-foreground text-center">
                        {selectedProspectOrders.reduce((sum, o) => sum + (o.kuantiti || 1), 0)}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                Tiada order dijumpai.
              </div>
            )}
          </div>
          <DialogFooter>
            <Button onClick={() => setOrdersModalOpen(false)}>Tutup</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminLeads;
