import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { toast } from '@/hooks/use-toast';
import {
  MessageSquare,
  Loader2,
  Save,
  Plus,
  Trash2,
  Info,
} from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';

interface MessageTemplate {
  id: string;
  status: string;
  template: string;
  created_at: string;
  updated_at: string;
}

// Available statuses from Ninjavan
const STATUSES = [
  'Pending',
  'Arrived at Destination Hub',
  'Arrived at Origin Hub',
  'Arrived at Transit Hub',
  'Cancelled',
  'Delivered, Collected by Customer',
  'Delivered, Left at Doorstep',
  'Delivered, Received By Customer',
  'In Transit to Next Sorting Hub',
  'On Vehicle for Delivery',
  'Picked Up, In Transit to Origin Hub',
  'Returned To Sender',
];

// Available placeholders from customer_orders table
const PLACEHOLDERS = [
  { key: '[name]', description: 'Nama customer (marketer_name)' },
  { key: '[phone]', description: 'No telefon customer (no_phone)' },
  { key: '[tracking]', description: 'No tracking (no_tracking)' },
  { key: '[payment]', description: 'Cara bayaran (cara_bayaran)' },
  { key: '[total]', description: 'Harga jualan sebenar (harga_jualan_sebenar)' },
  { key: '[bundle]', description: 'Nama produk/bundle (produk)' },
  { key: '[address]', description: 'Alamat penuh (alamat)' },
  { key: '[city]', description: 'Bandar (bandar)' },
  { key: '[state]', description: 'Negeri (negeri)' },
  { key: '[postcode]', description: 'Poskod (poskod)' },
  { key: '[order_no]', description: 'No tempahan (no_tempahan)' },
  { key: '[status]', description: 'Status semasa (seo)' },
];

const Template: React.FC = () => {
  const [templates, setTemplates] = useState<MessageTemplate[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<MessageTemplate | null>(null);
  const [newStatus, setNewStatus] = useState('');
  const [newTemplate, setNewTemplate] = useState('');
  const [showAddForm, setShowAddForm] = useState(false);

  useEffect(() => {
    loadTemplates();
  }, []);

  const loadTemplates = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await (supabase as any)
        .from('message_templates')
        .select('*')
        .order('status', { ascending: true });

      if (error) throw error;
      setTemplates(data || []);
    } catch (error: any) {
      console.error('Error loading templates:', error);
      toast({
        title: 'Error',
        description: 'Gagal memuatkan template.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddTemplate = async () => {
    if (!newStatus || !newTemplate.trim()) {
      toast({
        title: 'Error',
        description: 'Sila pilih status dan masukkan template.',
        variant: 'destructive',
      });
      return;
    }

    // Check if status already exists
    if (templates.some(t => t.status === newStatus)) {
      toast({
        title: 'Error',
        description: 'Template untuk status ini sudah wujud.',
        variant: 'destructive',
      });
      return;
    }

    setIsSaving(true);
    try {
      const { data, error } = await (supabase as any)
        .from('message_templates')
        .insert({
          status: newStatus,
          template: newTemplate,
        })
        .select()
        .single();

      if (error) throw error;

      setTemplates([...templates, data]);
      setNewStatus('');
      setNewTemplate('');
      setShowAddForm(false);
      toast({
        title: 'Berjaya',
        description: 'Template berjaya ditambah.',
      });
    } catch (error: any) {
      console.error('Error adding template:', error);
      toast({
        title: 'Error',
        description: error.message || 'Gagal menambah template.',
        variant: 'destructive',
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleUpdateTemplate = async (template: MessageTemplate) => {
    setIsSaving(true);
    try {
      const { error } = await (supabase as any)
        .from('message_templates')
        .update({
          template: template.template,
          updated_at: new Date().toISOString(),
        })
        .eq('id', template.id);

      if (error) throw error;

      setTemplates(templates.map(t => t.id === template.id ? template : t));
      setEditingTemplate(null);
      toast({
        title: 'Berjaya',
        description: 'Template berjaya dikemaskini.',
      });
    } catch (error: any) {
      console.error('Error updating template:', error);
      toast({
        title: 'Error',
        description: error.message || 'Gagal mengemaskini template.',
        variant: 'destructive',
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteTemplate = async (id: string) => {
    if (!confirm('Adakah anda pasti mahu padam template ini?')) return;

    try {
      const { error } = await (supabase as any)
        .from('message_templates')
        .delete()
        .eq('id', id);

      if (error) throw error;

      setTemplates(templates.filter(t => t.id !== id));
      toast({
        title: 'Berjaya',
        description: 'Template berjaya dipadam.',
      });
    } catch (error: any) {
      console.error('Error deleting template:', error);
      toast({
        title: 'Error',
        description: error.message || 'Gagal memadam template.',
        variant: 'destructive',
      });
    }
  };

  const insertPlaceholder = (placeholder: string, isEditing: boolean) => {
    if (isEditing && editingTemplate) {
      setEditingTemplate({
        ...editingTemplate,
        template: editingTemplate.template + placeholder,
      });
    } else {
      setNewTemplate(newTemplate + placeholder);
    }
  };

  // Get available statuses (exclude already used ones)
  const availableStatuses = STATUSES.filter(
    status => !templates.some(t => t.status === status)
  );

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-primary">Message Templates</h1>
          <p className="text-muted-foreground">
            Urus template mesej WhatsApp untuk setiap status penghantaran
          </p>
        </div>
        {!showAddForm && availableStatuses.length > 0 && (
          <Button onClick={() => setShowAddForm(true)}>
            <Plus className="w-4 h-4 mr-2" />
            Tambah Template
          </Button>
        )}
      </div>

      {/* Placeholder Guide */}
      <div className="bg-card border border-border rounded-lg p-4">
        <div className="flex items-center gap-2 mb-3">
          <Info className="w-5 h-5 text-primary" />
          <h3 className="font-semibold text-foreground">Placeholder yang tersedia</h3>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
          {PLACEHOLDERS.map((p) => (
            <Tooltip key={p.key}>
              <TooltipTrigger asChild>
                <div className="bg-muted px-2 py-1 rounded text-sm font-mono cursor-help">
                  {p.key}
                </div>
              </TooltipTrigger>
              <TooltipContent>
                <p>{p.description}</p>
              </TooltipContent>
            </Tooltip>
          ))}
        </div>
      </div>

      {/* Add New Template Form */}
      {showAddForm && (
        <div className="bg-card border border-border rounded-lg p-6">
          <h3 className="text-lg font-semibold text-foreground mb-4">Tambah Template Baru</h3>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-foreground mb-1.5">
                Status
              </label>
              <Select value={newStatus} onValueChange={setNewStatus}>
                <SelectTrigger className="bg-background">
                  <SelectValue placeholder="Pilih status..." />
                </SelectTrigger>
                <SelectContent>
                  {availableStatuses.map((status) => (
                    <SelectItem key={status} value={status}>
                      {status}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-1.5">
                Template Mesej
              </label>
              <Textarea
                value={newTemplate}
                onChange={(e) => setNewTemplate(e.target.value)}
                placeholder="Masukkan template mesej dengan placeholder..."
                className="bg-background min-h-[150px] font-mono text-sm"
              />
              <div className="flex flex-wrap gap-1 mt-2">
                {PLACEHOLDERS.map((p) => (
                  <Button
                    key={p.key}
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => insertPlaceholder(p.key, false)}
                    className="text-xs"
                  >
                    {p.key}
                  </Button>
                ))}
              </div>
            </div>
            <div className="flex gap-2">
              <Button onClick={handleAddTemplate} disabled={isSaving}>
                {isSaving ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Save className="w-4 h-4 mr-2" />
                )}
                Simpan
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  setShowAddForm(false);
                  setNewStatus('');
                  setNewTemplate('');
                }}
              >
                Batal
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Templates List */}
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      ) : templates.length === 0 ? (
        <div className="bg-card border border-border rounded-lg p-12 text-center">
          <MessageSquare className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold text-foreground mb-2">Tiada Template</h3>
          <p className="text-muted-foreground mb-4">
            Belum ada template mesej. Klik butang "Tambah Template" untuk mula.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {templates.map((template) => (
            <div
              key={template.id}
              className="bg-card border border-border rounded-lg p-4"
            >
              <div className="flex items-start justify-between mb-3">
                <div>
                  <span className="inline-block px-3 py-1 bg-primary/10 text-primary text-sm font-medium rounded-full">
                    {template.status}
                  </span>
                </div>
                <div className="flex gap-2">
                  {editingTemplate?.id === template.id ? (
                    <>
                      <Button
                        size="sm"
                        onClick={() => handleUpdateTemplate(editingTemplate)}
                        disabled={isSaving}
                      >
                        {isSaving ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <Save className="w-4 h-4" />
                        )}
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setEditingTemplate(null)}
                      >
                        Batal
                      </Button>
                    </>
                  ) : (
                    <>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setEditingTemplate({ ...template })}
                      >
                        Edit
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => handleDeleteTemplate(template.id)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </>
                  )}
                </div>
              </div>
              {editingTemplate?.id === template.id ? (
                <div>
                  <Textarea
                    value={editingTemplate.template}
                    onChange={(e) =>
                      setEditingTemplate({
                        ...editingTemplate,
                        template: e.target.value,
                      })
                    }
                    className="bg-background min-h-[150px] font-mono text-sm"
                  />
                  <div className="flex flex-wrap gap-1 mt-2">
                    {PLACEHOLDERS.map((p) => (
                      <Button
                        key={p.key}
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => insertPlaceholder(p.key, true)}
                        className="text-xs"
                      >
                        {p.key}
                      </Button>
                    ))}
                  </div>
                </div>
              ) : (
                <pre className="bg-muted p-3 rounded-lg text-sm font-mono whitespace-pre-wrap overflow-x-auto">
                  {template.template}
                </pre>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default Template;
