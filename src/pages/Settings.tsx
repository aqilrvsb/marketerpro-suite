import React from 'react';
import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { User, Shield, Building2 } from 'lucide-react';

const Settings: React.FC = () => {
  const { profile } = useAuth();

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case 'admin': return 'bg-destructive/10 text-destructive';
      case 'bod': return 'bg-warning/10 text-warning';
      case 'marketer': return 'bg-success/10 text-success';
      case 'logistic': return 'bg-info/10 text-info';
      case 'account': return 'bg-primary/10 text-primary';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Settings</h1>
        <p className="text-muted-foreground">Manage system settings and user accounts</p>
      </div>

      <div className="form-section">
        <div className="flex items-center gap-2 mb-4">
          <User className="w-5 h-5 text-primary" />
          <h2 className="text-lg font-semibold text-foreground">Current Session</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Username</Label>
            <Input value={profile?.username || ''} disabled />
          </div>
          <div className="space-y-2">
            <Label>Full Name</Label>
            <Input value={profile?.fullName || ''} disabled />
          </div>
          <div className="space-y-2">
            <Label>Role</Label>
            <div className={`px-4 py-2 rounded-lg text-center font-medium capitalize ${getRoleBadgeColor(profile?.role || '')}`}>
              {profile?.role || 'Loading...'}
            </div>
          </div>
        </div>
      </div>

      <div className="form-section">
        <div className="flex items-center gap-2 mb-4">
          <Building2 className="w-5 h-5 text-accent" />
          <h2 className="text-lg font-semibold text-foreground">Company Information</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Company Name</Label>
            <Input value="DFR Empire Enterprise" disabled />
          </div>
          <div className="space-y-2">
            <Label>Registration No.</Label>
            <Input value="SA0123456-X" disabled />
          </div>
        </div>
      </div>

      <div className="form-section bg-muted/30">
        <h3 className="font-semibold text-foreground mb-2">System Information</h3>
        <div className="text-sm text-muted-foreground space-y-1">
          <p>Version: 1.0.0</p>
          <p>© 2025 DFR Empire Enterprise. All rights reserved.</p>
        </div>
      </div>
    </div>
  );
};

export default Settings;
