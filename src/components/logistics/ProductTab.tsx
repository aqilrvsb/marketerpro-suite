import React, { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Plus, Package, TrendingUp, CheckCircle, XCircle, Edit, Trash2, Calendar, Loader2 } from 'lucide-react';
import { useBundles } from '@/context/BundleContext';
import { supabase } from '@/integrations/supabase/client';

interface FilteredStock {
  productId: string;
  stockIn: number;
  stockOut: number;
}

const ProductTab: React.FC = () => {
  const { products, isLoading, addProduct, updateProduct, deleteProduct } = useBundles();
  
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<typeof products[0] | null>(null);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [filteredStocks, setFilteredStocks] = useState<FilteredStock[]>([]);
  const [isFilterLoading, setIsFilterLoading] = useState(false);

  const [formData, setFormData] = useState({
    name: '',
    sku: '',
    baseCost: '',
  });

  // Fetch filtered stock movements when date filters change
  useEffect(() => {
    const fetchFilteredStocks = async () => {
      if (!startDate && !endDate) {
        setFilteredStocks([]);
        return;
      }

      setIsFilterLoading(true);
      try {
        let query = supabase
          .from('stock_movements' as any)
          .select('product_id, type, quantity, date');

        if (startDate) {
          query = query.gte('date', startDate);
        }
        if (endDate) {
          query = query.lte('date', endDate);
        }

        const { data, error } = await query;

        if (error) throw error;

        // Aggregate by product
        const stockMap = new Map<string, { stockIn: number; stockOut: number }>();
        
        ((data as any[]) || []).forEach((movement: any) => {
          const existing = stockMap.get(movement.product_id) || { stockIn: 0, stockOut: 0 };
          if (movement.type === 'in') {
            existing.stockIn += movement.quantity;
          } else if (movement.type === 'out') {
            existing.stockOut += movement.quantity;
          }
          stockMap.set(movement.product_id, existing);
        });

        const result: FilteredStock[] = Array.from(stockMap.entries()).map(([productId, stocks]) => ({
          productId,
          stockIn: stocks.stockIn,
          stockOut: stocks.stockOut,
        }));

        setFilteredStocks(result);
      } catch (error) {
        console.error('Error fetching filtered stocks:', error);
      } finally {
        setIsFilterLoading(false);
      }
    };

    fetchFilteredStocks();
  }, [startDate, endDate]);

  const hasDateFilter = startDate || endDate;

  // Get stock values - filtered if date filter applied, otherwise original
  const getStockIn = (productId: string, originalStockIn: number) => {
    if (!hasDateFilter) return originalStockIn;
    const filtered = filteredStocks.find(f => f.productId === productId);
    return filtered?.stockIn || 0;
  };

  const getStockOut = (productId: string, originalStockOut: number) => {
    if (!hasDateFilter) return originalStockOut;
    const filtered = filteredStocks.find(f => f.productId === productId);
    return filtered?.stockOut || 0;
  };

  // Stats - stock in/out filtered by date, quantity always shows current total
  const stats = {
    totalProducts: products.length,
    totalQuantity: products.reduce((sum, p) => sum + p.quantity, 0), // Always current
    activeProducts: products.filter((p) => p.isActive).length,
    inactiveProducts: products.filter((p) => !p.isActive).length,
    stockIn: hasDateFilter 
      ? filteredStocks.reduce((sum, f) => sum + f.stockIn, 0)
      : products.reduce((sum, p) => sum + p.stockIn, 0),
    stockOut: hasDateFilter 
      ? filteredStocks.reduce((sum, f) => sum + f.stockOut, 0)
      : products.reduce((sum, p) => sum + p.stockOut, 0),
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (editingProduct) {
      await updateProduct(editingProduct.id, {
        name: formData.name,
        sku: formData.sku,
        baseCost: parseFloat(formData.baseCost) || 0,
      });
    } else {
      await addProduct({
        sku: formData.sku,
        name: formData.name,
        baseCost: parseFloat(formData.baseCost) || 0,
        stockIn: 0,
        stockOut: 0,
        quantity: 0,
        isActive: true,
      });
    }

    setFormData({ name: '', sku: '', baseCost: '' });
    setEditingProduct(null);
    setIsDialogOpen(false);
  };

  const handleEdit = (product: typeof products[0]) => {
    setEditingProduct(product);
    setFormData({
      name: product.name,
      sku: product.sku,
      baseCost: product.baseCost.toString(),
    });
    setIsDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    await deleteProduct(id);
  };

  const openNewDialog = () => {
    setEditingProduct(null);
    setFormData({ name: '', sku: '', baseCost: '' });
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
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-primary">Inventory Management</h2>
        <p className="text-muted-foreground">Manage your inventory quantities and stock levels</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <Card className="border">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Products</p>
                <p className="text-2xl font-bold">{stats.totalProducts}</p>
              </div>
              <Package className="w-8 h-8 text-primary" />
            </div>
          </CardContent>
        </Card>

        <Card className="border">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Quantity</p>
                <p className="text-2xl font-bold">{stats.totalQuantity.toLocaleString()}</p>
              </div>
              <TrendingUp className="w-8 h-8 text-purple-500" />
            </div>
          </CardContent>
        </Card>

        <Card className="border">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Active Products</p>
                <p className="text-2xl font-bold">{stats.activeProducts}</p>
              </div>
              <CheckCircle className="w-8 h-8 text-success" />
            </div>
          </CardContent>
        </Card>

        <Card className="border">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Inactive Products</p>
                <p className="text-2xl font-bold">{stats.inactiveProducts}</p>
              </div>
              <XCircle className="w-8 h-8 text-orange-500" />
            </div>
          </CardContent>
        </Card>

        <Card className="border">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Stock In {hasDateFilter && '(Filtered)'}</p>
                <p className="text-2xl font-bold">{stats.stockIn.toLocaleString()}</p>
              </div>
              <TrendingUp className="w-8 h-8 text-success" />
            </div>
          </CardContent>
        </Card>

        <Card className="border">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Stock Out {hasDateFilter && '(Filtered)'}</p>
                <p className="text-2xl font-bold">{stats.stockOut.toLocaleString()}</p>
              </div>
              <TrendingUp className="w-8 h-8 text-destructive rotate-180" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Date Filters */}
      <Card className="border">
        <CardContent className="p-4">
          <h3 className="font-semibold mb-4">Date Filters (Stock In/Out only)</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Start Date</Label>
              <div className="relative">
                <Input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="pr-10"
                />
                <Calendar className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
              </div>
            </div>
            <div className="space-y-2">
              <Label>End Date</Label>
              <div className="relative">
                <Input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="pr-10"
                />
                <Calendar className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
              </div>
            </div>
          </div>
          {hasDateFilter && (
            <Button 
              variant="outline" 
              size="sm" 
              className="mt-3"
              onClick={() => { setStartDate(''); setEndDate(''); }}
            >
              Clear Filter
            </Button>
          )}
        </CardContent>
      </Card>

      {/* Inventory Table */}
      <Card className="border">
        <CardContent className="p-4">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-lg">Inventory Management</h3>
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button onClick={openNewDialog} className="bg-primary hover:bg-primary/90">
                  <Plus className="w-4 h-4 mr-2" />
                  Add Product
                </Button>
              </DialogTrigger>
              <DialogContent className="bg-background">
                <DialogHeader>
                  <DialogTitle>{editingProduct ? 'Edit Product' : 'Add New Product'}</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Product Name</Label>
                      <Input
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>SKU</Label>
                      <Input
                        value={formData.sku}
                        onChange={(e) => setFormData({ ...formData, sku: e.target.value })}
                        required
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Base Cost</Label>
                    <Input
                      type="number"
                      step="0.01"
                      value={formData.baseCost}
                      onChange={(e) => setFormData({ ...formData, baseCost: e.target.value })}
                      required
                    />
                  </div>
                  <Button type="submit" className="w-full bg-primary hover:bg-primary/90">
                    {editingProduct ? 'Update Product' : 'Create Product'}
                  </Button>
                </form>
              </DialogContent>
            </Dialog>
          </div>

          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>SKU</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Base Cost</TableHead>
                  <TableHead>Stock In {hasDateFilter && '(Filtered)'}</TableHead>
                  <TableHead>Stock Out {hasDateFilter && '(Filtered)'}</TableHead>
                  <TableHead>Quantity</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {products.length > 0 ? (
                  products.map((product) => (
                    <TableRow key={product.id}>
                      <TableCell className="font-medium">{product.sku}</TableCell>
                      <TableCell>{product.name}</TableCell>
                      <TableCell>RM {product.baseCost.toFixed(2)}</TableCell>
                      <TableCell className="text-success">
                        {isFilterLoading ? '...' : getStockIn(product.id, product.stockIn).toLocaleString()}
                      </TableCell>
                      <TableCell className="text-destructive">
                        {isFilterLoading ? '...' : getStockOut(product.id, product.stockOut).toLocaleString()}
                      </TableCell>
                      <TableCell className="font-bold">{product.quantity.toLocaleString()}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleEdit(product)}
                          >
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="text-destructive hover:text-destructive"
                            onClick={() => handleDelete(product.id)}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                      No products found. Add your first product.
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

export default ProductTab;
