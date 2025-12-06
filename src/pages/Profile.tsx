import React, { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from '@/hooks/use-toast';
import {
  UserCircle, Lock, Phone, Loader2, Eye, EyeOff, Smartphone,
  RefreshCw, QrCode, Wifi, WifiOff, Plus, Trash2, Copy, CheckCircle2
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

interface DeviceSetting {
  id: string;
  device_id: string | null;
  instance: string | null;
  webhook_id: string | null;
  provider: string;
  api_key: string | null;
  id_device: string | null;
  phone_number: string | null;
  status_wa: string;
  created_at: string;
}

const WHACENTER_API_URL = 'https://api.whacenter.com/api';
const DEFAULT_WHACENTER_API_KEY = 'd44ac50f-0bd8-4ed0-b85f-55465e08d7cf';

const Profile: React.FC = () => {
  const { profile } = useAuth();
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [isUpdatingWhatsApp, setIsUpdatingWhatsApp] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [passwordForm, setPasswordForm] = useState({
    newPassword: '',
    confirmPassword: '',
  });

  const [whatsappNumber, setWhatsappNumber] = useState('');

  // Device state (for marketers only)
  const [device, setDevice] = useState<DeviceSetting | null>(null);
  const [isLoadingDevice, setIsLoadingDevice] = useState(false);
  const [isGeneratingDevice, setIsGeneratingDevice] = useState(false);
  const [isCheckingStatus, setIsCheckingStatus] = useState(false);
  const [qrCode, setQrCode] = useState<string | null>(null);
  const [showQrModal, setShowQrModal] = useState(false);
  const [deviceForm, setDeviceForm] = useState({
    phoneNumber: '',
  });

  const isMarketer = profile?.role === 'marketer';

  // Load device for marketer
  useEffect(() => {
    if (isMarketer && profile?.id) {
      loadDevice();
    }
  }, [isMarketer, profile?.id]);

  const loadDevice = async () => {
    if (!profile?.id) return;
    setIsLoadingDevice(true);
    try {
      const { data, error } = await (supabase as any)
        .from('device_setting')
        .select('*')
        .eq('user_id', profile.id)
        .single();

      if (error && error.code !== 'PGRST116') {
        console.error('Error loading device:', error);
      }
      setDevice(data || null);
      if (data) {
        setDeviceForm({
          phoneNumber: data.phone_number || '',
        });
      }
    } catch (err) {
      console.error('Error:', err);
    } finally {
      setIsLoadingDevice(false);
    }
  };

  const generateWebhookId = () => {
    return crypto.randomUUID();
  };

  const handleCreateDevice = async () => {
    if (!profile?.id) return;

    if (!deviceForm.phoneNumber || !deviceForm.phoneNumber.startsWith('6')) {
      toast({
        title: 'Error',
        description: 'No. telefon mesti bermula dengan 6.',
        variant: 'destructive',
      });
      return;
    }

    setIsGeneratingDevice(true);
    try {
      const webhookId = generateWebhookId();
      const idDevice = `DFR_${profile.idstaff}`;

      // Create device in database using default API key
      const { data: newDevice, error } = await (supabase as any)
        .from('device_setting')
        .insert({
          user_id: profile.id,
          provider: 'whacenter',
          api_key: DEFAULT_WHACENTER_API_KEY,
          id_device: idDevice,
          phone_number: deviceForm.phoneNumber,
          webhook_id: webhookId,
          status_wa: 'disconnected',
        })
        .select()
        .single();

      if (error) throw error;

      setDevice(newDevice);
      toast({
        title: 'Berjaya',
        description: 'Device berjaya dicipta. Klik "Generate Device" untuk sambung ke WhatsApp.',
      });
    } catch (error: any) {
      console.error('Create device error:', error);
      toast({
        title: 'Error',
        description: error.message || 'Gagal mencipta device.',
        variant: 'destructive',
      });
    } finally {
      setIsGeneratingDevice(false);
    }
  };

  const handleGenerateDevice = async () => {
    if (!device) {
      toast({
        title: 'Error',
        description: 'Sila cipta device dahulu.',
        variant: 'destructive',
      });
      return;
    }

    const apiKey = device.api_key || DEFAULT_WHACENTER_API_KEY;

    setIsGeneratingDevice(true);
    try {
      // Step 1: Add device to Whacenter
      const addDeviceUrl = `${WHACENTER_API_URL}/addDevice?api_key=${apiKey}&name=${device.id_device}&number=${device.phone_number}`;
      const addResponse = await fetch(addDeviceUrl);
      const addResult = await addResponse.json();

      if (!addResult.status) {
        throw new Error(addResult.message || 'Gagal menambah device ke Whacenter');
      }

      const instanceId = addResult.data?.device_id || addResult.device_id;

      // Step 2: Update device with instance ID
      const { error: updateError } = await (supabase as any)
        .from('device_setting')
        .update({
          instance: instanceId,
          device_id: instanceId,
          updated_at: new Date().toISOString(),
        })
        .eq('id', device.id);

      if (updateError) throw updateError;

      // Reload device
      await loadDevice();

      toast({
        title: 'Berjaya',
        description: 'Device berjaya digenerate. Klik "Scan QR" untuk sambung WhatsApp.',
      });
    } catch (error: any) {
      console.error('Generate device error:', error);
      toast({
        title: 'Error',
        description: error.message || 'Gagal generate device.',
        variant: 'destructive',
      });
    } finally {
      setIsGeneratingDevice(false);
    }
  };

  const handleCheckStatus = async () => {
    if (!device || !device.instance) {
      toast({
        title: 'Error',
        description: 'Device belum digenerate.',
        variant: 'destructive',
      });
      return;
    }

    const apiKey = device.api_key || DEFAULT_WHACENTER_API_KEY;

    setIsCheckingStatus(true);
    setQrCode(null);
    try {
      const statusUrl = `${WHACENTER_API_URL}/getStatus?api_key=${apiKey}&device_id=${device.instance}`;
      const response = await fetch(statusUrl);
      const result = await response.json();

      const status = result.data?.status || result.status || 'disconnected';
      const isConnected = status.toLowerCase() === 'connected' || status.toLowerCase() === 'working';

      // Update status in database
      await (supabase as any)
        .from('device_setting')
        .update({
          status_wa: isConnected ? 'connected' : 'disconnected',
          updated_at: new Date().toISOString(),
        })
        .eq('id', device.id);

      // If not connected and QR code available, show it
      if (!isConnected && result.data?.qr) {
        setQrCode(result.data.qr);
        setShowQrModal(true);
      }

      await loadDevice();

      toast({
        title: isConnected ? 'Connected' : 'Disconnected',
        description: isConnected
          ? 'WhatsApp berjaya disambung!'
          : 'WhatsApp tidak disambung. Sila scan QR code.',
        variant: isConnected ? 'default' : 'destructive',
      });
    } catch (error: any) {
      console.error('Check status error:', error);
      toast({
        title: 'Error',
        description: error.message || 'Gagal semak status.',
        variant: 'destructive',
      });
    } finally {
      setIsCheckingStatus(false);
    }
  };

  const handleScanQR = async () => {
    if (!device || !device.instance) {
      toast({
        title: 'Error',
        description: 'Device belum digenerate.',
        variant: 'destructive',
      });
      return;
    }

    const apiKey = device.api_key || DEFAULT_WHACENTER_API_KEY;

    setIsCheckingStatus(true);
    try {
      const qrUrl = `${WHACENTER_API_URL}/getQr?api_key=${apiKey}&device_id=${device.instance}`;
      const response = await fetch(qrUrl);
      const result = await response.json();

      if (result.data?.qr || result.qr) {
        setQrCode(result.data?.qr || result.qr);
        setShowQrModal(true);
      } else if (result.data?.status === 'connected') {
        toast({
          title: 'Connected',
          description: 'WhatsApp sudah disambung!',
        });
        // Update status
        await (supabase as any)
          .from('device_setting')
          .update({ status_wa: 'connected', updated_at: new Date().toISOString() })
          .eq('id', device.id);
        await loadDevice();
      } else {
        toast({
          title: 'Info',
          description: 'QR code tidak tersedia. Cuba refresh status.',
        });
      }
    } catch (error: any) {
      console.error('Get QR error:', error);
      toast({
        title: 'Error',
        description: error.message || 'Gagal mendapatkan QR code.',
        variant: 'destructive',
      });
    } finally {
      setIsCheckingStatus(false);
    }
  };

  const handleDeleteDevice = async () => {
    if (!device) return;

    if (!confirm('Adakah anda pasti mahu padam device ini?')) return;

    try {
      const { error } = await (supabase as any)
        .from('device_setting')
        .delete()
        .eq('id', device.id);

      if (error) throw error;

      setDevice(null);
      setDeviceForm({ phoneNumber: '' });
      toast({
        title: 'Berjaya',
        description: 'Device berjaya dipadam.',
      });
    } catch (error: any) {
      console.error('Delete device error:', error);
      toast({
        title: 'Error',
        description: error.message || 'Gagal memadam device.',
        variant: 'destructive',
      });
    }
  };

  const copyWebhookUrl = () => {
    if (device?.webhook_id) {
      const webhookUrl = `${window.location.origin}/api/webhook/${device.webhook_id}`;
      navigator.clipboard.writeText(webhookUrl);
      toast({
        title: 'Copied',
        description: 'Webhook URL telah disalin.',
      });
    }
  };

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();

    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      toast({
        title: 'Error',
        description: 'Kata laluan baru tidak sepadan.',
        variant: 'destructive',
      });
      return;
    }

    if (passwordForm.newPassword.length < 4) {
      toast({
        title: 'Error',
        description: 'Kata laluan baru mesti sekurang-kurangnya 4 aksara.',
        variant: 'destructive',
      });
      return;
    }

    setIsChangingPassword(true);

    try {
      const { error } = await supabase
        .from('profiles')
        .update({ password_hash: passwordForm.newPassword.toUpperCase() })
        .eq('id', profile?.id);

      if (error) throw error;

      toast({
        title: 'Berjaya',
        description: 'Kata laluan telah berjaya ditukar.',
      });

      setPasswordForm({ newPassword: '', confirmPassword: '' });
    } catch (error: any) {
      console.error('Password change error:', error);
      toast({
        title: 'Error',
        description: error.message || 'Gagal menukar kata laluan.',
        variant: 'destructive',
      });
    } finally {
      setIsChangingPassword(false);
    }
  };

  const handleWhatsAppUpdate = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!whatsappNumber || !whatsappNumber.startsWith('6')) {
      toast({
        title: 'Error',
        description: 'No. WhatsApp mesti bermula dengan 6 (contoh: 60123456789).',
        variant: 'destructive',
      });
      return;
    }

    setIsUpdatingWhatsApp(true);

    try {
      const { error } = await supabase
        .from('profiles')
        .update({ whatsapp_number: whatsappNumber })
        .eq('id', profile?.id);

      if (error) throw error;

      toast({
        title: 'Berjaya',
        description: 'No. WhatsApp telah dikemaskini.',
      });
    } catch (error: any) {
      console.error('WhatsApp update error:', error);
      toast({
        title: 'Error',
        description: error.message || 'Gagal mengemaskini No. WhatsApp.',
        variant: 'destructive',
      });
    } finally {
      setIsUpdatingWhatsApp(false);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-primary">Profile</h1>
        <p className="text-muted-foreground">
          Urus maklumat akaun anda
        </p>
      </div>

      {/* User Info Card */}
      <div className="bg-card border border-border rounded-lg p-6">
        <div className="flex items-center gap-4 mb-6">
          <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
            <UserCircle className="w-10 h-10 text-primary" />
          </div>
          <div>
            <h2 className="text-xl font-semibold text-foreground">{profile?.fullName}</h2>
            <p className="text-muted-foreground">ID Staff: {profile?.idstaff}</p>
            <p className="text-sm text-muted-foreground capitalize">Role: {profile?.role}</p>
          </div>
        </div>
      </div>

      {/* Device Settings - Marketers Only */}
      {isMarketer && (
        <div className="bg-card border border-border rounded-lg p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <Smartphone className="w-5 h-5 text-primary" />
              <h3 className="text-lg font-semibold text-foreground">WhatsApp Device</h3>
            </div>
            {device && (
              <div className="flex items-center gap-2">
                {device.status_wa === 'connected' ? (
                  <span className="flex items-center gap-1 text-sm text-green-600">
                    <Wifi className="w-4 h-4" />
                    Connected
                  </span>
                ) : (
                  <span className="flex items-center gap-1 text-sm text-red-500">
                    <WifiOff className="w-4 h-4" />
                    Disconnected
                  </span>
                )}
              </div>
            )}
          </div>

          {isLoadingDevice ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-primary" />
            </div>
          ) : !device ? (
            // Create Device Form
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Masukkan nombor telefon WhatsApp anda untuk mencipta device.
              </p>
              <div>
                <label className="block text-sm font-medium text-foreground mb-1.5">
                  No. Telefon WhatsApp *
                </label>
                <Input
                  type="text"
                  placeholder="60123456789"
                  value={deviceForm.phoneNumber}
                  onChange={(e) => setDeviceForm({ ...deviceForm, phoneNumber: e.target.value })}
                  className="bg-background"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Format: 60123456789 (bermula dengan 6)
                </p>
              </div>
              <Button
                onClick={handleCreateDevice}
                disabled={isGeneratingDevice}
                className="w-full"
              >
                {isGeneratingDevice ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Mencipta...
                  </>
                ) : (
                  <>
                    <Plus className="w-4 h-4 mr-2" />
                    Cipta Device
                  </>
                )}
              </Button>
            </div>
          ) : (
            // Device Info & Actions
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-muted-foreground">ID Device</p>
                  <p className="text-sm font-medium text-foreground">{device.id_device || '-'}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">No. Telefon</p>
                  <p className="text-sm font-medium text-foreground">{device.phone_number || '-'}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Instance ID</p>
                  <p className="text-sm font-medium text-foreground font-mono">{device.instance || 'Belum generate'}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Provider</p>
                  <p className="text-sm font-medium text-foreground capitalize">{device.provider}</p>
                </div>
              </div>

              {device.webhook_id && (
                <div className="p-3 bg-muted/50 rounded-lg">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs text-muted-foreground">Webhook URL</p>
                      <p className="text-xs font-mono text-foreground truncate max-w-xs">
                        {`${window.location.origin}/api/webhook/${device.webhook_id}`}
                      </p>
                    </div>
                    <Button variant="ghost" size="sm" onClick={copyWebhookUrl}>
                      <Copy className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              )}

              <div className="flex flex-wrap gap-2">
                {!device.instance ? (
                  <Button
                    onClick={handleGenerateDevice}
                    disabled={isGeneratingDevice}
                    className="flex-1"
                  >
                    {isGeneratingDevice ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Generating...
                      </>
                    ) : (
                      <>
                        <Plus className="w-4 h-4 mr-2" />
                        Generate Device
                      </>
                    )}
                  </Button>
                ) : (
                  <>
                    <Button
                      variant="outline"
                      onClick={handleCheckStatus}
                      disabled={isCheckingStatus}
                    >
                      {isCheckingStatus ? (
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      ) : (
                        <RefreshCw className="w-4 h-4 mr-2" />
                      )}
                      Refresh Status
                    </Button>
                    <Button
                      variant="outline"
                      onClick={handleScanQR}
                      disabled={isCheckingStatus}
                    >
                      <QrCode className="w-4 h-4 mr-2" />
                      Scan QR
                    </Button>
                  </>
                )}
                <Button
                  variant="destructive"
                  size="icon"
                  onClick={handleDeleteDevice}
                  title="Padam Device"
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            </div>
          )}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Change Password Card */}
        <div className="bg-card border border-border rounded-lg p-6">
          <div className="flex items-center gap-3 mb-4">
            <Lock className="w-5 h-5 text-primary" />
            <h3 className="text-lg font-semibold text-foreground">Tukar Kata Laluan</h3>
          </div>

          <form onSubmit={handlePasswordChange} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-foreground mb-1.5">
                Kata Laluan Baru
              </label>
              <div className="relative">
                <Input
                  type={showNewPassword ? "text" : "password"}
                  placeholder="Masukkan kata laluan baru"
                  value={passwordForm.newPassword}
                  onChange={(e) => setPasswordForm({ ...passwordForm, newPassword: e.target.value })}
                  className="bg-background pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowNewPassword(!showNewPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-foreground mb-1.5">
                Sahkan Kata Laluan Baru
              </label>
              <div className="relative">
                <Input
                  type={showConfirmPassword ? "text" : "password"}
                  placeholder="Masukkan semula kata laluan baru"
                  value={passwordForm.confirmPassword}
                  onChange={(e) => setPasswordForm({ ...passwordForm, confirmPassword: e.target.value })}
                  className="bg-background pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <Button
              type="submit"
              disabled={isChangingPassword}
              className="w-full"
            >
              {isChangingPassword ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Menukar...
                </>
              ) : (
                'Tukar Kata Laluan'
              )}
            </Button>
          </form>
        </div>

        {/* Update WhatsApp Card */}
        <div className="bg-card border border-border rounded-lg p-6">
          <div className="flex items-center gap-3 mb-4">
            <Phone className="w-5 h-5 text-green-600" />
            <h3 className="text-lg font-semibold text-foreground">No. WhatsApp</h3>
          </div>

          <form onSubmit={handleWhatsAppUpdate} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-foreground mb-1.5">
                No. WhatsApp (bermula dengan 6)
              </label>
              <Input
                type="text"
                placeholder="60123456789"
                value={whatsappNumber}
                onChange={(e) => setWhatsappNumber(e.target.value)}
                className="bg-background"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Contoh: 60123456789
              </p>
            </div>

            <Button
              type="submit"
              disabled={isUpdatingWhatsApp}
              className="w-full bg-green-600 hover:bg-green-700"
            >
              {isUpdatingWhatsApp ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Mengemaskini...
                </>
              ) : (
                'Kemaskini WhatsApp'
              )}
            </Button>
          </form>
        </div>
      </div>

      {/* QR Code Modal */}
      <Dialog open={showQrModal} onOpenChange={setShowQrModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <QrCode className="w-5 h-5" />
              Scan QR Code
            </DialogTitle>
          </DialogHeader>
          <div className="flex flex-col items-center py-4">
            {qrCode ? (
              <>
                <img src={qrCode} alt="QR Code" className="w-64 h-64 border rounded-lg" />
                <p className="text-sm text-muted-foreground mt-4 text-center">
                  Buka WhatsApp &gt; Linked Devices &gt; Link a Device
                  <br />
                  Kemudian scan QR code ini.
                </p>
              </>
            ) : (
              <div className="flex items-center justify-center w-64 h-64 bg-muted rounded-lg">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
              </div>
            )}
          </div>
          <div className="flex gap-2">
            <Button variant="outline" className="flex-1" onClick={() => setShowQrModal(false)}>
              Tutup
            </Button>
            <Button className="flex-1" onClick={handleCheckStatus} disabled={isCheckingStatus}>
              {isCheckingStatus ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <RefreshCw className="w-4 h-4 mr-2" />
              )}
              Refresh
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Profile;
