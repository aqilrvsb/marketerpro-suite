import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { toast } from '@/hooks/use-toast';
import { ArrowLeft, Save, Loader2, Truck } from 'lucide-react';
import { NEGERI_OPTIONS } from '@/types';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface NinjavanConfig {
  id?: string;
  client_id: string;
  client_secret: string;
  sender_name: string;
  sender_phone: string;
  sender_email: string;
  sender_address1: string;
  sender_address2: string;
  sender_postcode: string;
  sender_city: string;
  sender_state: string;
}

const FormLabel: React.FC<{ required?: boolean; children: React.ReactNode }> = ({ required, children }) => (
  <label className="block text-sm font-medium text-foreground mb-1.5">
    {children}
    {required && <span className="text-red-500 ml-0.5">*</span>}
  </label>
);

const NinjavanSettings: React.FC = () => {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [configId, setConfigId] = useState<string | null>(null);
  
  const [formData, setFormData] = useState<NinjavanConfig>({
    client_id: '',
    client_secret: '',
    sender_name: '',
    sender_phone: '',
    sender_email: '',
    sender_address1: '',
    sender_address2: '',
    sender_postcode: '',
    sender_city: '',
    sender_state: '',
  });

  useEffect(() => {
    loadConfig();
  }, []);

  const loadConfig = async () => {
    try {
      // Use raw SQL query via rpc or direct fetch to bypass type checking
      const { data, error } = await supabase
        .from('ninjavan_config' as any)
        .select('*')
        .limit(1)
        .maybeSingle();

      if (error) throw error;

      if (data) {
        const configData = data as any;
        setConfigId(configData.id);
        setFormData({
          client_id: configData.client_id || '',
          client_secret: configData.client_secret || '',
          sender_name: configData.sender_name || '',
          sender_phone: configData.sender_phone || '',
          sender_email: configData.sender_email || '',
          sender_address1: configData.sender_address1 || '',
          sender_address2: configData.sender_address2 || '',
          sender_postcode: configData.sender_postcode || '',
          sender_city: configData.sender_city || '',
          sender_state: configData.sender_state || '',
        });
      }
    } catch (error) {
      console.error('Error loading config:', error);
      toast({
        title: 'Error',
        description: 'Failed to load Ninjavan configuration.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleChange = (field: keyof NinjavanConfig, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validation
    if (!formData.client_id || !formData.client_secret || !formData.sender_name || 
        !formData.sender_phone || !formData.sender_email || !formData.sender_address1 ||
        !formData.sender_postcode || !formData.sender_city || !formData.sender_state) {
      toast({
        title: 'Error',
        description: 'Please fill in all required fields.',
        variant: 'destructive',
      });
      return;
    }

    setIsSaving(true);

    try {
      if (configId) {
        // Update existing config
        const { error } = await supabase
          .from('ninjavan_config' as any)
          .update({
            ...formData,
            updated_at: new Date().toISOString(),
          })
          .eq('id', configId);

        if (error) throw error;
      } else {
        // Insert new config
        const { data, error } = await supabase
          .from('ninjavan_config' as any)
          .insert([formData])
          .select()
          .single();

        if (error) throw error;
        setConfigId((data as any).id);
      }

      toast({
        title: 'Success',
        description: 'Ninjavan configuration saved successfully.',
      });
    } catch (error) {
      console.error('Error saving config:', error);
      toast({
        title: 'Error',
        description: 'Failed to save Ninjavan configuration.',
        variant: 'destructive',
      });
    } finally {
      setIsSaving(false);
    }
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
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => navigate('/dashboard/logistics/order')}
        >
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <div className="flex items-center gap-3">
          <div className="p-2 bg-primary/10 rounded-lg">
            <Truck className="w-6 h-6 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground">Ninjavan Settings</h1>
            <p className="text-muted-foreground">
              Configure Ninjavan API credentials and sender information
            </p>
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* API Credentials */}
        <div className="bg-card border border-border rounded-lg p-6">
          <h3 className="text-lg font-semibold text-foreground mb-4">API Credentials</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <FormLabel required>Client ID</FormLabel>
              <Input
                type="password"
                placeholder="Enter Client ID"
                value={formData.client_id}
                onChange={(e) => handleChange('client_id', e.target.value)}
                className="bg-background"
              />
            </div>
            <div>
              <FormLabel required>Client Secret</FormLabel>
              <Input
                type="password"
                placeholder="Enter Client Secret"
                value={formData.client_secret}
                onChange={(e) => handleChange('client_secret', e.target.value)}
                className="bg-background"
              />
            </div>
          </div>
        </div>

        {/* Sender Information */}
        <div className="bg-card border border-border rounded-lg p-6">
          <h3 className="text-lg font-semibold text-foreground mb-4">Sender Information (From)</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <div>
              <FormLabel required>Sender Name</FormLabel>
              <Input
                placeholder="e.g. Role Vision Sdn. Bhd"
                value={formData.sender_name}
                onChange={(e) => handleChange('sender_name', e.target.value)}
                className="bg-background"
              />
            </div>
            <div>
              <FormLabel required>Sender Phone</FormLabel>
              <Input
                placeholder="e.g. 60123456789"
                value={formData.sender_phone}
                onChange={(e) => handleChange('sender_phone', e.target.value)}
                className="bg-background"
              />
            </div>
            <div>
              <FormLabel required>Sender Email</FormLabel>
              <Input
                type="email"
                placeholder="e.g. logistic@company.com"
                value={formData.sender_email}
                onChange={(e) => handleChange('sender_email', e.target.value)}
                className="bg-background"
              />
            </div>
            <div className="lg:col-span-3">
              <FormLabel required>Address Line 1</FormLabel>
              <Textarea
                placeholder="Enter full address (max 100 characters)"
                value={formData.sender_address1}
                onChange={(e) => handleChange('sender_address1', e.target.value)}
                className="bg-background resize-none"
                rows={2}
                maxLength={100}
              />
            </div>
            <div className="lg:col-span-3">
              <FormLabel>Address Line 2 (Optional)</FormLabel>
              <Input
                placeholder="Additional address info"
                value={formData.sender_address2}
                onChange={(e) => handleChange('sender_address2', e.target.value)}
                className="bg-background"
              />
            </div>
            <div>
              <FormLabel required>Postcode</FormLabel>
              <Input
                placeholder="e.g. 22200"
                value={formData.sender_postcode}
                onChange={(e) => handleChange('sender_postcode', e.target.value)}
                className="bg-background"
              />
            </div>
            <div>
              <FormLabel required>City</FormLabel>
              <Input
                placeholder="e.g. Besut"
                value={formData.sender_city}
                onChange={(e) => handleChange('sender_city', e.target.value)}
                className="bg-background"
              />
            </div>
            <div>
              <FormLabel required>State</FormLabel>
              <Select
                value={formData.sender_state}
                onValueChange={(value) => handleChange('sender_state', value)}
              >
                <SelectTrigger className="bg-background">
                  <SelectValue placeholder="Select State" />
                </SelectTrigger>
                <SelectContent>
                  {NEGERI_OPTIONS.map((state) => (
                    <SelectItem key={state} value={state}>{state}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        {/* Submit Button */}
        <div className="flex justify-end">
          <Button type="submit" disabled={isSaving} className="gap-2">
            {isSaving ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="w-4 h-4" />
                Save Configuration
              </>
            )}
          </Button>
        </div>
      </form>
    </div>
  );
};

export default NinjavanSettings;