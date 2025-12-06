import React, { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Plus, Trash2, Loader2 } from 'lucide-react';
import { useBundles } from '@/context/BundleContext';

const BundleTab: React.FC = () => {
  const { bundles, products, isLoading, addBundle, updateBundle, deleteBundle, toggleBundleActive } = useBundles();

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingBundle, setEditingBundle] = useState<typeof bundles[0] | null>(null);

  const [formData, setFormData] = useState({
    name: '',
    productId: '',
    units: '1',
    priceNormal: '0.00',
    priceShopee: '0.00',
    priceTiktok: '0.00',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (editingBundle) {
      await updateBundle(editingBundle.id, {
        name: formData.name,
        productId: formData.productId,
        units: parseInt(formData.units) || 1,
        priceNormal: parseFloat(formData.priceNormal) || 0,
        priceShopee: parseFloat(formData.priceShopee) || 0,
        priceTiktok: parseFloat(formData.priceTiktok) || 0,
      });
    } else {
      await addBundle({
        name: formData.name,
        productId: formData.productId,
        units: parseInt(formData.units) || 1,
        priceNormal: parseFloat(formData.priceNormal) || 0,
        priceShopee: parseFloat(formData.priceShopee) || 0,
        priceTiktok: parseFloat(formData.priceTiktok) || 0,
        isActive: true,
      });
    }

    resetForm();
    setIsDialogOpen(false);
  };

  const resetForm = () => {
    setFormData({
      name: '',
      productId: '',
      units: '1',
      priceNormal: '0.00',
      priceShopee: '0.00',
      priceTiktok: '0.00',
    });
    setEditingBundle(null);
  };

  const handleEdit = (bundle: typeof bundles[0]) => {
    setEditingBundle(bundle);
    setFormData({
      name: bundle.name,
      productId: bundle.productId,
      units: bundle.units.toString(),
      priceNormal: bundle.priceNormal.toFixed(2),
      priceShopee: bundle.priceShopee.toFixed(2),
      priceTiktok: bundle.priceTiktok.toFixed(2),
    });
    setIsDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    await deleteBundle(id);
  };

  const handleToggleActive = async (id: string) => {
    await toggleBundleActive(id);
  };

  const openNewDialog = () => {
    resetForm();
    setIsDialogOpen(true);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Bundle Table */}
      <Card className="border">
        <CardContent className="p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="font-semibold text-xl">Bundle Pricing Management</h3>
              <p className="text-sm text-muted-foreground">
                Create and manage product bundles with tiered pricing for agents
              </p>
            </div>
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button onClick={openNewDialog} className="bg-primary hover:bg-primary/90">
                  <Plus className="w-4 h-4 mr-2" />
                  Add Bundle
                </Button>
              </DialogTrigger>
              <DialogContent className="bg-background max-w-md">
                <DialogHeader>
                  <DialogTitle>{editingBundle ? 'Edit Bundle' : 'Create New Bundle'}</DialogTitle>
                  <DialogDescription>
                    Set up a product bundle with pricing for different agent levels
                  </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="space-y-2">
                    <Label>Bundle Name</Label>
                    <Input
                      placeholder="e.g., Premium Pack"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Select Product</Label>
                    <Select
                      value={formData.productId}
                      onValueChange={(value) => setFormData({ ...formData, productId: value })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Choose a product" />
                      </SelectTrigger>
                      <SelectContent className="bg-background">
                        {products.map((product) => (
                          <SelectItem key={product.id} value={product.id}>
                            {product.name} ({product.sku})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>Units in Bundle</Label>
                    <Input
                      type="number"
                      min="1"
                      value={formData.units}
                      onChange={(e) => setFormData({ ...formData, units: e.target.value })}
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Normal Price</Label>
                    <Input
                      type="number"
                      step="0.01"
                      placeholder="0.00"
                      value={formData.priceNormal}
                      onChange={(e) => setFormData({ ...formData, priceNormal: e.target.value })}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Shopee Price</Label>
                    <Input
                      type="number"
                      step="0.01"
                      placeholder="0.00"
                      value={formData.priceShopee}
                      onChange={(e) => setFormData({ ...formData, priceShopee: e.target.value })}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Tiktok Price</Label>
                    <Input
                      type="number"
                      step="0.01"
                      placeholder="0.00"
                      value={formData.priceTiktok}
                      onChange={(e) => setFormData({ ...formData, priceTiktok: e.target.value })}
                    />
                  </div>

                  <Button type="submit" className="w-full bg-primary hover:bg-primary/90">
                    {editingBundle ? 'Update Bundle' : 'Create Bundle'}
                  </Button>
                </form>
              </DialogContent>
            </Dialog>
          </div>

          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Bundle Name</TableHead>
                  <TableHead>Product</TableHead>
                  <TableHead>Units</TableHead>
                  <TableHead>Normal</TableHead>
                  <TableHead>Shopee</TableHead>
                  <TableHead>Tiktok</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {bundles.length > 0 ? (
                  bundles.map((bundle) => (
                    <TableRow key={bundle.id}>
                      <TableCell className="font-medium">{bundle.name}</TableCell>
                      <TableCell>
                        {bundle.productName} ({bundle.productSku})
                      </TableCell>
                      <TableCell>{bundle.units.toLocaleString()}</TableCell>
                      <TableCell>RM {bundle.priceNormal.toFixed(2)}</TableCell>
                      <TableCell>RM {bundle.priceShopee.toFixed(2)}</TableCell>
                      <TableCell>RM {bundle.priceTiktok.toFixed(2)}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Switch
                            checked={bundle.isActive}
                            onCheckedChange={() => handleToggleActive(bundle.id)}
                          />
                          <Badge variant={bundle.isActive ? 'default' : 'secondary'}>
                            {bundle.isActive ? 'Active' : 'Inactive'}
                          </Badge>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleEdit(bundle)}
                          >
                            Edit
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="text-destructive hover:text-destructive"
                            onClick={() => handleDelete(bundle.id)}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                      No bundles found. Create your first bundle.
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

export default BundleTab;
