import React, { useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from '@/hooks/use-toast';
import { UserCircle, Lock, Phone, Loader2, Eye, EyeOff } from 'lucide-react';

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
      // Directly update password in profiles table
      const { error } = await supabase
        .from('profiles')
        .update({ password_hash: passwordForm.newPassword.toUpperCase() })
        .eq('id', profile?.id);

      if (error) {
        throw error;
      }

      toast({
        title: 'Berjaya',
        description: 'Kata laluan telah berjaya ditukar.',
      });

      setPasswordForm({
        newPassword: '',
        confirmPassword: '',
      });
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

      if (error) {
        throw error;
      }

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
    </div>
  );
};

export default Profile;
