import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { useData } from '@/context/DataContext';
import { useBundles } from '@/context/BundleContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { toast } from '@/hooks/use-toast';
import { NEGERI_OPTIONS } from '@/types';
import { ArrowLeft, Save, Loader2, CalendarIcon, Upload } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { put } from '@vercel/blob';

const PLATFORM_OPTIONS = ['Facebook', 'Tiktok', 'Shopee', 'Database', 'Google'];
const CUSTOMER_TYPE_OPTIONS = [
  { value: 'Prospect', label: 'Prospect' },
  { value: 'EC', label: 'Existing Customer' },
];
const JENIS_CLOSING_OPTIONS = ['Manual', 'WhatsappBot', 'Website', 'Call'];
const JENIS_CLOSING_MARKETPLACE_OPTIONS = ['Manual', 'WhatsappBot', 'Website', 'Call', 'Live', 'Shop'];
const CARA_BAYARAN_OPTIONS = ['CASH', 'COD'];
const JENIS_BAYARAN_OPTIONS = ['Online Transfer', 'Credit Card', 'CDM', 'CASH'];
const BANK_OPTIONS = [
  'Maybank',
  'CIMB Bank',
  'Public Bank',
  'RHB Bank',
  'Hong Leong Bank',
  'AmBank',
  'Bank Islam',
  'Bank Rakyat',
  'Affin Bank',
  'Alliance Bank',
  'OCBC Bank',
  'HSBC Bank',
  'Standard Chartered',
  'UOB Bank',
  'BSN',
];

const FormLabel: React.FC<{ required?: boolean; children: React.ReactNode }> = ({ required, children }) => (
  <label className="block text-sm font-medium text-foreground mb-1.5">
    {children}
    {required && <span className="text-red-500 ml-0.5">*</span>}
  </label>
);

const OrderForm: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { profile } = useAuth();
  const { addOrder, updateOrder, orders, refreshData } = useData();
  const { bundles, isLoading: bundlesLoading, refreshData: refreshBundles } = useBundles();
  const activeBundles = bundles.filter(b => b.isActive);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [tarikhBayaran, setTarikhBayaran] = useState<Date>();
  const [receiptFile, setReceiptFile] = useState<File | null>(null);
  const [receiptPreview, setReceiptPreview] = useState<string>('');
  // Determined customer type (NP/EP) based on lead lookup when "Prospect" is selected
  const [determinedCustomerType, setDeterminedCustomerType] = useState<'NP' | 'EP' | ''>('');
  const [isCheckingLead, setIsCheckingLead] = useState(false);

  // Edit mode state
  const editOrder = location.state?.editOrder;
  const isEditMode = !!editOrder;

  const [formData, setFormData] = useState({
    namaPelanggan: '',
    noPhone: '',
    jenisPlatform: '',
    jenisClosing: '',
    jenisCustomer: '',
    poskod: '',
    daerah: '',
    negeri: '',
    alamat: '',
    produk: '',
    hargaJualan: 0,
    caraBayaran: '',
    jenisBayaran: '',
    pilihBank: '',
    nota: '',
    trackingNumber: '',
  });
  const [waybillFile, setWaybillFile] = useState<File | null>(null);
  const [waybillFileName, setWaybillFileName] = useState<string>('');

  // Populate form if editing
  useEffect(() => {
    if (editOrder) {
      // Convert old NP/EP values to "Prospect" for display, and store the original type
      const originalType = editOrder.jenisCustomer || '';
      let displayType = originalType;
      if (originalType === 'NP' || originalType === 'EP') {
        displayType = 'Prospect';
        setDeterminedCustomerType(originalType as 'NP' | 'EP');
      }

      setFormData({
        namaPelanggan: editOrder.marketerName || '',
        noPhone: editOrder.noPhone || '',
        jenisPlatform: editOrder.jenisPlatform || '',
        jenisClosing: editOrder.jenisClosing || '',
        jenisCustomer: displayType,
        poskod: editOrder.poskod || '',
        daerah: editOrder.bandar || '',
        negeri: editOrder.negeri || '',
        alamat: editOrder.alamat || '',
        produk: editOrder.produk || '',
        hargaJualan: editOrder.hargaJualanSebenar || 0,
        caraBayaran: editOrder.caraBayaran || '',
        jenisBayaran: editOrder.jenisBayaran || '',
        pilihBank: editOrder.bank || '',
        nota: editOrder.notaStaff || '',
        trackingNumber: editOrder.noTracking || '',
      });
      // Set tarikh bayaran if exists
      if (editOrder.tarikhBayaran) {
        setTarikhBayaran(new Date(editOrder.tarikhBayaran));
      }
    }
  }, [editOrder]);

  // Refresh bundles when component mounts to ensure fresh data
  useEffect(() => {
    refreshBundles();
  }, []);

  // Check lead when phone number changes and customer type is "Prospect"
  useEffect(() => {
    const checkLead = async () => {
      // Only check if customer type is "Prospect" and phone number is valid
      if (formData.jenisCustomer === 'Prospect' && formData.noPhone && formData.noPhone.startsWith('6') && formData.noPhone.length >= 10) {
        setIsCheckingLead(true);
        try {
          const result = await checkLeadAndDetermineType(formData.noPhone);
          setDeterminedCustomerType(result.type);

          // Update price based on determined type
          if (formData.produk) {
            const newPrice = getMinimumPrice(formData.produk, formData.jenisPlatform, 'Prospect');
            setFormData(prev => ({ ...prev, hargaJualan: newPrice }));
          }

          toast({
            title: result.type === 'NP' ? 'Lead Ditemui (NP)' : 'Lead Ditemui (EP)',
            description: result.isNewLead
              ? 'Lead baru akan dicipta secara automatik.'
              : result.hasExistingType
                ? `Lead sedia ada - Jenis: ${result.type} (dari rekod)`
                : `Lead sedia ada - ${result.type === 'NP' ? 'Tarikh sama (New Prospect)' : 'Tarikh berbeza (Existing Prospect)'}`,
          });
        } catch (err) {
          console.error('Error checking lead:', err);
          // Default to EP if error
          setDeterminedCustomerType('EP');
        } finally {
          setIsCheckingLead(false);
        }
      } else if (formData.jenisCustomer === 'EC') {
        // Clear determined type for EC customers
        setDeterminedCustomerType('');
      }
    };

    // Debounce the check
    const timeoutId = setTimeout(checkLead, 500);
    return () => clearTimeout(timeoutId);
  }, [formData.noPhone, formData.jenisCustomer]);

  const generateOrderNumber = () => {
    // Generate unique order number using timestamp + random suffix
    const timestamp = Date.now();
    const randomSuffix = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
    return `ORD${timestamp}${randomSuffix}`;
  };

  const generateSaleId = async (): Promise<string> => {
    // Call database function to get next sale ID
    const { data, error } = await (supabase as any).rpc('generate_sale_id');
    if (error) {
      console.error('Error generating sale ID:', error);
      // Fallback: generate based on timestamp
      const ts = Date.now().toString().slice(-5);
      return `DF${ts}`;
    }
    return data as string;
  };

  // Check lead by phone number and determine NP/EP
  const checkLeadAndDetermineType = async (phoneNumber: string): Promise<{ type: 'NP' | 'EP'; leadId?: string; isNewLead?: boolean; hasExistingType?: boolean }> => {
    const marketerIdStaff = profile?.username || '';
    const today = new Date().toISOString().split('T')[0];

    // Search for existing lead by phone number for this marketer
    const { data: existingLead } = await supabase
      .from('prospects')
      .select('id, tarikh_phone_number, jenis_prospek')
      .eq('marketer_id_staff', marketerIdStaff)
      .eq('no_telefon', phoneNumber)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (existingLead) {
      // Lead exists - first check if it already has NP or EP set
      const existingType = existingLead.jenis_prospek?.toUpperCase();
      if (existingType === 'NP' || existingType === 'EP') {
        // Keep existing NP/EP value
        return { type: existingType as 'NP' | 'EP', leadId: existingLead.id, hasExistingType: true };
      }

      // No existing type - determine based on date logic
      if (existingLead.tarikh_phone_number === today) {
        // Same date = NP (New Prospect)
        return { type: 'NP', leadId: existingLead.id };
      } else {
        // Different date = EP (Existing Prospect)
        return { type: 'EP', leadId: existingLead.id };
      }
    } else {
      // Lead doesn't exist - set as EP and will auto-create with yesterday's date
      return { type: 'EP', isNewLead: true };
    }
  };

  // Auto-create lead with yesterday's date
  const autoCreateLead = async (phoneNumber: string, customerName: string, productName: string) => {
    const marketerIdStaff = profile?.username || '';

    // Calculate yesterday's date
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayDate = yesterday.toISOString().split('T')[0];

    const { error } = await supabase
      .from('prospects')
      .insert({
        nama_prospek: customerName.toUpperCase(),
        no_telefon: phoneNumber,
        niche: productName,
        jenis_prospek: 'EP', // Auto-determined as EP since lead didn't exist
        tarikh_phone_number: yesterdayDate,
        marketer_id_staff: marketerIdStaff,
        admin_id_staff: '',
        status_closed: '',
        price_closed: 0,
      });

    if (error) {
      console.error('Error auto-creating lead:', error);
    }
  };

  // Get minimum price based on platform, customer type and selected bundle
  const getMinimumPrice = (bundleName: string, platform: string, customerType: string): number => {
    const bundle = activeBundles.find(b => b.name === bundleName);
    if (!bundle) return 0;

    // If customer type is "Prospect", use the determined type (NP/EP)
    const effectiveType = customerType === 'Prospect' ? (determinedCustomerType || 'NP') : customerType;

    // Determine price based on platform and customer type
    if (platform === 'Shopee') {
      if (effectiveType === 'NP') return bundle.priceShopeeNp;
      if (effectiveType === 'EP') return bundle.priceShopeeEp;
      if (effectiveType === 'EC') return bundle.priceShopeeEc;
      return bundle.priceShopeeNp; // Default to NP
    } else if (platform === 'Tiktok') {
      if (effectiveType === 'NP') return bundle.priceTiktokNp;
      if (effectiveType === 'EP') return bundle.priceTiktokEp;
      if (effectiveType === 'EC') return bundle.priceTiktokEc;
      return bundle.priceTiktokNp; // Default to NP
    } else {
      // Normal price (Facebook, Database, Google)
      if (effectiveType === 'NP') return bundle.priceNormalNp;
      if (effectiveType === 'EP') return bundle.priceNormalEp;
      if (effectiveType === 'EC') return bundle.priceNormalEc;
      return bundle.priceNormalNp; // Default to NP
    }
  };

  // Get effective customer type for price calculation
  const effectiveCustomerType = formData.jenisCustomer === 'Prospect' ? determinedCustomerType : formData.jenisCustomer;
  const currentMinPrice = getMinimumPrice(formData.produk, formData.jenisPlatform, formData.jenisCustomer);
  const isPriceBelowMinimum = formData.hargaJualan > 0 && formData.hargaJualan < currentMinPrice;

  const handleChange = (field: string, value: string | number) => {
    setFormData((prev) => {
      // Auto uppercase for text fields (except dropdowns)
      let processedValue = value;
      if (typeof value === 'string' && !['jenisPlatform', 'jenisCustomer', 'caraBayaran', 'jenisBayaran', 'pilihBank', 'produk', 'negeri'].includes(field)) {
        processedValue = value.toUpperCase();
      }

      const newData = { ...prev, [field]: processedValue };

      // Auto-populate price when product, platform, or customer type changes (only for new orders)
      if ((field === 'produk' || field === 'jenisPlatform' || field === 'jenisCustomer') && !isEditMode) {
        const bundleName = field === 'produk' ? value as string : prev.produk;
        const platform = field === 'jenisPlatform' ? value as string : prev.jenisPlatform;
        const customerType = field === 'jenisCustomer' ? value as string : prev.jenisCustomer;

        if (bundleName && customerType) {
          const minPrice = getMinimumPrice(bundleName, platform, customerType);
          // Auto-populate if current price is 0 or if switching products/customer type
          if (field === 'produk' || field === 'jenisCustomer' || prev.hargaJualan === 0) {
            newData.hargaJualan = minPrice;
          }
        }
      }

      return newData;
    });
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setReceiptFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setReceiptPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleWaybillChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.type !== 'application/pdf') {
        toast({
          title: 'Error',
          description: 'Sila muat naik fail PDF sahaja.',
          variant: 'destructive',
        });
        return;
      }
      setWaybillFile(file);
      setWaybillFileName(file.name);
    }
  };

  const cancelNinjavanOrder = async (trackingNumber: string) => {
    try {
      const { data: cancelResult, error: cancelError } = await supabase.functions.invoke('ninjavan-cancel', {
        body: { trackingNumber }
      });

      if (cancelError) {
        console.error('Ninjavan cancel error:', cancelError);
        return false;
      } else if (cancelResult?.error) {
        console.error('Ninjavan cancel API error:', cancelResult.error);
        return false;
      }
      return true;
    } catch (err) {
      console.error('Cancel API call failed:', err);
      return false;
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validation
    if (!formData.namaPelanggan || !formData.noPhone || !formData.poskod || !formData.daerah || !formData.negeri || !formData.alamat || !formData.produk || !formData.jenisClosing || !formData.caraBayaran || !formData.jenisCustomer) {
      toast({
        title: 'Error',
        description: 'Sila lengkapkan semua medan yang diperlukan.',
        variant: 'destructive',
      });
      return;
    }

    // Validate that Prospect has a determined type
    if (formData.jenisCustomer === 'Prospect' && !determinedCustomerType && !isEditMode) {
      toast({
        title: 'Error',
        description: 'Sila tunggu semakan lead selesai sebelum submit.',
        variant: 'destructive',
      });
      return;
    }

    // Validate payment details for CASH (non-Shopee/TikTok)
    const isShopeeOrTiktokPlatform = formData.jenisPlatform === 'Shopee' || formData.jenisPlatform === 'Tiktok';
    if (!isShopeeOrTiktokPlatform && formData.caraBayaran === 'CASH') {
      if (!tarikhBayaran) {
        toast({
          title: 'Error',
          description: 'Sila pilih Tarikh Bayaran.',
          variant: 'destructive',
        });
        return;
      }
      if (!formData.jenisBayaran) {
        toast({
          title: 'Error',
          description: 'Sila pilih Jenis Bayaran.',
          variant: 'destructive',
        });
        return;
      }
      if (!formData.pilihBank) {
        toast({
          title: 'Error',
          description: 'Sila pilih Bank.',
          variant: 'destructive',
        });
        return;
      }
      if (!receiptFile && !isEditMode) {
        toast({
          title: 'Error',
          description: 'Sila muat naik Resit Bayaran.',
          variant: 'destructive',
        });
        return;
      }
    }

    // Validate minimum price
    const minPrice = getMinimumPrice(formData.produk, formData.jenisPlatform, formData.jenisCustomer);
    if (formData.hargaJualan < minPrice) {
      const effectiveType = formData.jenisCustomer === 'Prospect' ? determinedCustomerType : formData.jenisCustomer;
      toast({
        title: 'Error',
        description: `Harga jualan minimum untuk ${effectiveType || formData.jenisCustomer} (${formData.jenisPlatform || 'produk ini'}) adalah RM${minPrice.toFixed(2)}.`,
        variant: 'destructive',
      });
      return;
    }

    // Validate phone starts with 6
    if (!formData.noPhone.toString().startsWith('6')) {
      toast({
        title: 'Error',
        description: 'No. Telefon mesti bermula dengan 6.',
        variant: 'destructive',
      });
      return;
    }

    setIsSubmitting(true);

    const now = new Date();
    const tarikhTempahan = now.toLocaleString('en-GB', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    });

    // Set kurier based on platform and cara bayaran
    let kurier = '';
    const isShopeeOrTiktokOrder = formData.jenisPlatform === 'Shopee' || formData.jenisPlatform === 'Tiktok';
    if (isShopeeOrTiktokOrder) {
      kurier = formData.jenisPlatform; // "Shopee" or "Tiktok"
    } else {
      kurier = formData.caraBayaran === 'COD' ? 'Ninjavan COD' : 'Ninjavan CASH';
    }
    
    // Set date_order to today's date
    const dateOrder = new Date().toISOString().split('T')[0];

    try {
      let orderNumber = isEditMode ? editOrder.noTempahan : generateOrderNumber();
      let idSale = isEditMode ? editOrder.idSale : '';
      let trackingNumber = isShopeeOrTiktokOrder ? formData.trackingNumber : '';

      // Generate new sale ID for new orders (non-Shopee/TikTok)
      if (!isEditMode && !isShopeeOrTiktokOrder) {
        idSale = await generateSaleId();
        console.log('Generated Sale ID:', idSale);
      }

      // Handle edit mode
      if (isEditMode) {
        const wasNinjavanOrder = editOrder.jenisPlatform !== 'Shopee' && editOrder.jenisPlatform !== 'Tiktok';
        const isNowNinjavanOrder = !isShopeeOrTiktokOrder;

        // If it was a Ninjavan order, cancel the old tracking first
        if (wasNinjavanOrder && editOrder.noTracking) {
          console.log('Cancelling old Ninjavan tracking:', editOrder.noTracking);
          const cancelled = await cancelNinjavanOrder(editOrder.noTracking);
          if (cancelled) {
            toast({
              title: 'Info',
              description: 'Order Ninjavan lama telah dibatalkan.',
            });
          }
        }

        if (isNowNinjavanOrder) {
          // Generate new sale ID for edit mode
          idSale = await generateSaleId();
          console.log('Generated new Sale ID for edit:', idSale);
          
          try {
            const { data: ninjavanResult, error: ninjavanError } = await supabase.functions.invoke('ninjavan-order', {
              body: {
                orderId: orderNumber,
                idSale: idSale,
                customerName: formData.namaPelanggan,
                phone: formData.noPhone,
                address: formData.alamat,
                postcode: formData.poskod,
                city: formData.daerah,
                state: formData.negeri,
                price: formData.hargaJualan,
                caraBayaran: formData.caraBayaran,
                produk: formData.produk,
                marketerIdStaff: profile?.username || '',
              }
            });

            if (ninjavanError) {
              console.error('Ninjavan API error:', ninjavanError);
              toast({
                title: 'Amaran',
                description: 'Order dikemaskini tetapi gagal hantar ke Ninjavan.',
                variant: 'destructive',
              });
            } else if (ninjavanResult?.error) {
              console.error('Ninjavan error:', ninjavanResult.error);
              toast({
                title: 'Amaran',
                description: ninjavanResult.error,
                variant: 'destructive',
              });
            } else if (ninjavanResult?.trackingNumber) {
              trackingNumber = ninjavanResult.trackingNumber;
              toast({
                title: 'Ninjavan Berjaya',
                description: `Tracking Number Baru: ${trackingNumber}`,
              });
            }
          } catch (ninjavanErr) {
            console.error('Ninjavan call failed:', ninjavanErr);
          }
        }

        // Helper function to delete from Vercel Blob
        const deleteFromBlob = async (url: string) => {
          try {
            const response = await fetch('/api/delete-blob', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ url }),
            });
            if (!response.ok) {
              console.error('Failed to delete from Blob:', url);
            }
          } catch (err) {
            console.error('Blob delete error:', err);
          }
        };

        // Helper function to upload to Vercel Blob (client-side)
        const uploadToVercelBlob = async (file: File, folder: string): Promise<string> => {
          const token = import.meta.env.VITE_BLOB_READ_WRITE_TOKEN;
          if (!token) {
            throw new Error('Blob storage token not configured');
          }
          const timestamp = Date.now();
          const cleanFileName = file.name.replace(/[^a-zA-Z0-9.-]/g, '-');
          const filename = `${folder}/${timestamp}-${cleanFileName}`;
          const blob = await put(filename, file, { access: 'public', token });
          return blob.url;
        };

        // Handle receipt image upload/replacement for edit mode
        let newReceiptUrl = editOrder.receiptImageUrl || '';
        if (receiptFile && showPaymentDetails) {
          // Delete old receipt if exists
          if (editOrder.receiptImageUrl) {
            await deleteFromBlob(editOrder.receiptImageUrl);
          }
          try {
            newReceiptUrl = await uploadToVercelBlob(receiptFile, 'receipts');
          } catch (uploadError) {
            console.error('Receipt upload error:', uploadError);
            toast({
              title: 'Amaran',
              description: 'Gagal memuat naik resit baru.',
              variant: 'destructive',
            });
          }
        }

        // Handle waybill upload/replacement for edit mode (Shopee/Tiktok)
        let newWaybillUrl = editOrder.waybillUrl || '';
        if (waybillFile && isShopeeOrTiktokOrder) {
          // Delete old waybill if exists
          if (editOrder.waybillUrl) {
            await deleteFromBlob(editOrder.waybillUrl);
          }
          try {
            newWaybillUrl = await uploadToVercelBlob(waybillFile, 'waybills');
          } catch (uploadError) {
            console.error('Waybill upload error:', uploadError);
            toast({
              title: 'Amaran',
              description: 'Gagal memuat naik waybill baru.',
              variant: 'destructive',
            });
          }
        }

        // Get units from selected bundle for edit mode
        const editBundleUnits = activeBundles.find(b => b.name === formData.produk)?.units || 1;

        // Determine final customer type to save for edit mode
        const editFinalCustomerType = formData.jenisCustomer === 'Prospect' ? determinedCustomerType : formData.jenisCustomer;

        // Update existing order in database
        const { error: updateError } = await supabase
          .from('customer_orders')
          .update({
            marketer_name: formData.namaPelanggan,
            no_phone: formData.noPhone,
            alamat: formData.alamat,
            poskod: formData.poskod,
            bandar: formData.daerah,
            negeri: formData.negeri,
            produk: formData.produk,
            sku: formData.produk,
            kuantiti: editBundleUnits,
            harga_jualan_produk: formData.hargaJualan,
            harga_jualan_sebenar: formData.hargaJualan,
            profit: formData.hargaJualan,
            kurier,
            no_tracking: trackingNumber,
            jenis_platform: formData.jenisPlatform,
            jenis_customer: editFinalCustomerType, // Save as NP/EP/EC, not "Prospect"
            cara_bayaran: formData.caraBayaran,
            nota_staff: formData.nota,
            // Payment details
            tarikh_bayaran: showPaymentDetails && tarikhBayaran ? format(tarikhBayaran, 'yyyy-MM-dd') : null,
            jenis_bayaran: showPaymentDetails ? formData.jenisBayaran : null,
            bank: showPaymentDetails ? formData.pilihBank : null,
            receipt_image_url: newReceiptUrl || null,
            waybill_url: newWaybillUrl || null,
          })
          .eq('id', editOrder.id);

        if (updateError) {
          throw updateError;
        }

        await refreshData();

        toast({
          title: 'Order Dikemaskini',
          description: 'Tempahan pelanggan telah berjaya dikemaskini.',
        });
      } else {
        // New order flow
        // If platform is NOT Shopee or Tiktok, call Ninjavan API
        const shouldCallNinjavan = !isShopeeOrTiktokOrder;
        
        if (shouldCallNinjavan) {
          try {
            const { data: ninjavanResult, error: ninjavanError } = await supabase.functions.invoke('ninjavan-order', {
              body: {
                orderId: orderNumber,
                idSale: idSale,
                customerName: formData.namaPelanggan,
                phone: formData.noPhone,
                address: formData.alamat,
                postcode: formData.poskod,
                city: formData.daerah,
                state: formData.negeri,
                price: formData.hargaJualan,
                caraBayaran: formData.caraBayaran,
                produk: formData.produk,
                marketerIdStaff: profile?.username || '',
              }
            });

            if (ninjavanError) {
              console.error('Ninjavan API error:', ninjavanError);
              toast({
                title: 'Amaran',
                description: 'Order disimpan tetapi gagal hantar ke Ninjavan. Sila hubungi logistik.',
                variant: 'destructive',
              });
            } else if (ninjavanResult?.error) {
              console.error('Ninjavan error:', ninjavanResult.error);
              toast({
                title: 'Amaran',
                description: ninjavanResult.error,
                variant: 'destructive',
              });
            } else if (ninjavanResult?.trackingNumber) {
              trackingNumber = ninjavanResult.trackingNumber;
              toast({
                title: 'Ninjavan Berjaya',
                description: `Tracking Number: ${trackingNumber}`,
              });
            }
          } catch (ninjavanErr) {
            console.error('Ninjavan call failed:', ninjavanErr);
            // Continue to save order even if Ninjavan fails
          }
        }

        // Helper function to upload to Vercel Blob (client-side)
        const uploadToVercelBlob = async (file: File, folder: string): Promise<string> => {
          const token = import.meta.env.VITE_BLOB_READ_WRITE_TOKEN;
          if (!token) {
            throw new Error('Blob storage token not configured');
          }

          // Create clean filename
          const timestamp = Date.now();
          const cleanFileName = file.name.replace(/[^a-zA-Z0-9.-]/g, '-');
          const filename = `${folder}/${timestamp}-${cleanFileName}`;

          const blob = await put(filename, file, {
            access: 'public',
            token,
          });

          return blob.url;
        };

        // Upload receipt image if provided
        let receiptUrl = '';
        if (receiptFile && showPaymentDetails) {
          try {
            receiptUrl = await uploadToVercelBlob(receiptFile, 'receipts');
          } catch (uploadError) {
            console.error('Receipt upload error:', uploadError);
            toast({
              title: 'Amaran',
              description: 'Gagal memuat naik resit. Order tetap disimpan.',
              variant: 'destructive',
            });
          }
        }

        // Upload waybill PDF if provided (for Shopee/Tiktok)
        let waybillUrl = '';
        if (waybillFile && isShopeeOrTiktokOrder) {
          try {
            waybillUrl = await uploadToVercelBlob(waybillFile, 'waybills');
          } catch (uploadError) {
            console.error('Waybill upload error:', uploadError);
            toast({
              title: 'Amaran',
              description: 'Gagal memuat naik waybill. Order tetap disimpan.',
              variant: 'destructive',
            });
          }
        }

        // Get units from selected bundle
        const selectedBundle = activeBundles.find(b => b.name === formData.produk);
        const bundleUnits = selectedBundle?.units || 1;

        // Determine final customer type to save: use determined type for Prospect, otherwise use EC
        const finalCustomerType = formData.jenisCustomer === 'Prospect' ? determinedCustomerType : formData.jenisCustomer;

        await addOrder({
          noTempahan: orderNumber,
          idSale: idSale,
          marketerIdStaff: profile?.username || '',
          marketerName: formData.namaPelanggan,
          noPhone: formData.noPhone,
          alamat: formData.alamat,
          poskod: formData.poskod,
          bandar: formData.daerah,
          negeri: formData.negeri,
          sku: formData.produk,
          produk: formData.produk,
          kuantiti: bundleUnits,
          hargaJualanProduk: formData.hargaJualan,
          hargaJualanSebenar: formData.hargaJualan,
          kosPos: 0,
          kosProduk: 0,
          profit: formData.hargaJualan,
          hargaJualanAgen: 0,
          tarikhTempahan,
          kurier,
          noTracking: trackingNumber,
          statusParcel: 'Pending',
          deliveryStatus: 'Pending',
          dateOrder,
          dateProcessed: '',
          jenisPlatform: formData.jenisPlatform,
          jenisCustomer: finalCustomerType, // Save as NP/EP/EC, not "Prospect"
          caraBayaran: formData.caraBayaran,
          notaStaff: formData.nota,
          beratParcel: 0,
          tarikhBayaran: showPaymentDetails && tarikhBayaran ? format(tarikhBayaran, 'yyyy-MM-dd') : '',
          jenisBayaran: showPaymentDetails ? formData.jenisBayaran : '',
          bank: showPaymentDetails ? formData.pilihBank : '',
          receiptImageUrl: receiptUrl,
          waybillUrl: waybillUrl,
        });

        // Send WhatsApp notification to customer
        try {
          const notificationResponse = await fetch('/api/send-order-notification', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              order: {
                marketer_name: formData.namaPelanggan,
                no_phone: formData.noPhone,
                produk: formData.produk,
                tarikh_tempahan: tarikhTempahan,
                no_tracking: trackingNumber,
                harga_jualan_sebenar: formData.hargaJualan,
                cara_bayaran: formData.caraBayaran,
              },
              marketer_id: profile?.id,
            }),
          });
          const notificationResult = await notificationResponse.json();
          if (notificationResult.whatsapp_sent) {
            console.log('WhatsApp notification sent to customer');
          }
        } catch (notifyErr) {
          console.error('Failed to send notification:', notifyErr);
        }

        // Handle lead update/creation for Prospect customer type
        if (formData.jenisCustomer === 'Prospect') {
          try {
            const marketerIdStaff = profile?.username || '';

            // Check if lead exists
            const { data: matchingLead } = await supabase
              .from('prospects')
              .select('id')
              .eq('marketer_id_staff', marketerIdStaff)
              .eq('no_telefon', formData.noPhone)
              .order('created_at', { ascending: false })
              .limit(1)
              .single();

            if (matchingLead) {
              // Update existing lead with determined type and mark as closed
              await supabase
                .from('prospects')
                .update({
                  jenis_prospek: finalCustomerType, // Set the determined NP/EP type
                  status_closed: 'closed',
                  price_closed: formData.hargaJualan,
                  updated_at: new Date().toISOString(),
                })
                .eq('id', matchingLead.id);
            } else {
              // Auto-create lead with last month's date (for EP cases where lead doesn't exist)
              await autoCreateLead(formData.noPhone, formData.namaPelanggan, formData.produk);

              // Then update the newly created lead as closed
              const { data: newLead } = await supabase
                .from('prospects')
                .select('id')
                .eq('marketer_id_staff', marketerIdStaff)
                .eq('no_telefon', formData.noPhone)
                .order('created_at', { ascending: false })
                .limit(1)
                .single();

              if (newLead) {
                await supabase
                  .from('prospects')
                  .update({
                    status_closed: 'closed',
                    price_closed: formData.hargaJualan,
                    updated_at: new Date().toISOString(),
                  })
                  .eq('id', newLead.id);
              }
            }
          } catch (err) {
            console.error('Error updating/creating prospect:', err);
          }
        }

        toast({
          title: 'Order Berjaya',
          description: 'Tempahan pelanggan telah berjaya disimpan.',
        });
      }

      navigate('/dashboard/orders');
    } catch (error) {
      console.error('Error creating/updating order:', error);
      toast({
        title: 'Error',
        description: 'Gagal menyimpan tempahan. Sila cuba lagi.',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const isShopeeOrTiktok = formData.jenisPlatform === 'Shopee' || formData.jenisPlatform === 'Tiktok';
  const showPaymentDetails = formData.caraBayaran === 'CASH' && !isShopeeOrTiktok;

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => navigate('/dashboard/orders')}
        >
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold text-foreground">
            {isEditMode ? 'Edit Tempahan' : 'Tempahan Baru'}
          </h1>
          <p className="text-muted-foreground">
            {isEditMode ? 'Kemaskini butiran tempahan' : 'Isi butiran untuk membuat tempahan baru'}
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Customer & Order Information */}
        <div className="bg-card border border-border rounded-lg p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {/* Nama Pelanggan */}
            <div>
              <FormLabel required>Nama Pelanggan</FormLabel>
              <Input
                placeholder="Masukkan nama pelanggan"
                value={formData.namaPelanggan}
                onChange={(e) => handleChange('namaPelanggan', e.target.value)}
                className="bg-background"
              />
            </div>

            {/* No. Telefon */}
            <div>
              <FormLabel required>No. Telefon (digit start with 6)</FormLabel>
              <Input
                type="number"
                placeholder="60123456789"
                value={formData.noPhone}
                onChange={(e) => handleChange('noPhone', e.target.value)}
                className="bg-background"
              />
            </div>

            {/* Jenis Platform */}
            <div>
              <FormLabel required>Jenis Platform</FormLabel>
              <Select
                value={formData.jenisPlatform}
                onValueChange={(value) => handleChange('jenisPlatform', value)}
                disabled={isEditMode && profile?.role === 'marketer'}
              >
                <SelectTrigger className={cn("bg-background", isEditMode && profile?.role === 'marketer' && "opacity-60 cursor-not-allowed")}>
                  <SelectValue placeholder="Pilih Platform" />
                </SelectTrigger>
                <SelectContent>
                  {PLATFORM_OPTIONS.map((opt) => (
                    <SelectItem key={opt} value={opt}>{opt}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Jenis Closing */}
            <div>
              <FormLabel required>Jenis Closing</FormLabel>
              <Select
                value={formData.jenisClosing}
                onValueChange={(value) => handleChange('jenisClosing', value)}
                disabled={isEditMode && profile?.role === 'marketer'}
              >
                <SelectTrigger className={cn("bg-background", isEditMode && profile?.role === 'marketer' && "opacity-60 cursor-not-allowed")}>
                  <SelectValue placeholder="Pilih Jenis Closing" />
                </SelectTrigger>
                <SelectContent>
                  {(formData.jenisPlatform === 'Shopee' || formData.jenisPlatform === 'Tiktok'
                    ? JENIS_CLOSING_MARKETPLACE_OPTIONS
                    : JENIS_CLOSING_OPTIONS
                  ).map((opt) => (
                    <SelectItem key={opt} value={opt}>{opt}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Jenis Customer */}
            <div>
              <FormLabel required>Jenis Customer</FormLabel>
              <Select
                value={formData.jenisCustomer}
                onValueChange={(value) => handleChange('jenisCustomer', value)}
                disabled={isEditMode && profile?.role === 'marketer'}
              >
                <SelectTrigger className={cn("bg-background", isEditMode && profile?.role === 'marketer' && "opacity-60 cursor-not-allowed")}>
                  <SelectValue placeholder="Pilih Jenis Customer" />
                </SelectTrigger>
                <SelectContent>
                  {CUSTOMER_TYPE_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {/* Show determined type when Prospect is selected */}
              {formData.jenisCustomer === 'Prospect' && (
                <div className="mt-1.5">
                  {isCheckingLead ? (
                    <p className="text-xs text-muted-foreground flex items-center gap-1">
                      <Loader2 className="w-3 h-3 animate-spin" />
                      Menyemak lead...
                    </p>
                  ) : determinedCustomerType ? (
                    <p className={cn(
                      "text-xs font-medium",
                      determinedCustomerType === 'NP' ? "text-green-600" : "text-purple-600"
                    )}>
                      Auto: {determinedCustomerType === 'NP' ? 'New Prospect (NP)' : 'Existing Prospect (EP)'}
                    </p>
                  ) : formData.noPhone && formData.noPhone.length >= 10 ? null : (
                    <p className="text-xs text-muted-foreground">
                      Masukkan no. telefon untuk menyemak lead
                    </p>
                  )}
                </div>
              )}
            </div>

            {/* Poskod */}
            <div>
              <FormLabel required>Poskod</FormLabel>
              <Input
                type="number"
                placeholder="Masukkan poskod"
                value={formData.poskod}
                onChange={(e) => handleChange('poskod', e.target.value)}
                className="bg-background"
              />
            </div>

            {/* Daerah */}
            <div>
              <FormLabel required>Daerah</FormLabel>
              <Input
                placeholder="Masukkan daerah"
                value={formData.daerah}
                onChange={(e) => handleChange('daerah', e.target.value)}
                className="bg-background"
              />
            </div>

            {/* Negeri */}
            <div>
              <FormLabel required>Negeri</FormLabel>
              <Select
                value={formData.negeri}
                onValueChange={(value) => handleChange('negeri', value)}
              >
                <SelectTrigger className="bg-background">
                  <SelectValue placeholder="Pilih Negeri" />
                </SelectTrigger>
                <SelectContent>
                  {NEGERI_OPTIONS.map((state) => (
                    <SelectItem key={state} value={state}>{state}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Alamat */}
            <div className="lg:col-span-4">
              <FormLabel required>Alamat</FormLabel>
              <Textarea
                placeholder="Masukkan alamat penuh"
                value={formData.alamat}
                onChange={(e) => handleChange('alamat', e.target.value)}
                className="bg-background resize-none"
                rows={3}
              />
            </div>

            {/* Produk */}
            <div>
              <FormLabel required>Produk</FormLabel>
              <Select
                value={formData.produk}
                onValueChange={(value) => handleChange('produk', value)}
                disabled={bundlesLoading || (isEditMode && profile?.role === 'marketer')}
              >
                <SelectTrigger className={cn("bg-background", isEditMode && profile?.role === 'marketer' && "opacity-60 cursor-not-allowed")}>
                  <SelectValue placeholder={bundlesLoading ? "Loading..." : "Pilih Produk"} />
                </SelectTrigger>
                <SelectContent>
                  {bundlesLoading ? (
                    <SelectItem value="loading" disabled>Loading bundles...</SelectItem>
                  ) : activeBundles.length === 0 ? (
                    <SelectItem value="empty" disabled>No active bundles available</SelectItem>
                  ) : (
                    activeBundles.map((bundle) => (
                      <SelectItem key={bundle.id} value={bundle.name}>{bundle.name}</SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>


            {/* Harga Jualan */}
            <div>
              <FormLabel required>Harga Jualan (RM)</FormLabel>
              <Input
                type="number"
                step="0.01"
                placeholder="0.00"
                value={formData.hargaJualan || ''}
                onChange={(e) => handleChange('hargaJualan', parseFloat(e.target.value) || 0)}
                disabled={isEditMode && profile?.role === 'marketer'}
                className={cn("bg-background", isPriceBelowMinimum && "border-red-500 focus-visible:ring-red-500", isEditMode && profile?.role === 'marketer' && "opacity-60 cursor-not-allowed")}
              />
              {currentMinPrice > 0 && (
                <p className={cn("text-xs mt-1", isPriceBelowMinimum ? "text-red-500" : "text-muted-foreground")}>
                  Harga minimum: RM{currentMinPrice.toFixed(2)}
                  {isPriceBelowMinimum && " - Harga terlalu rendah!"}
                </p>
              )}
            </div>

            {/* Cara Bayaran */}
            <div>
              <FormLabel required>Cara Bayaran</FormLabel>
              <Select
                value={formData.caraBayaran}
                onValueChange={(value) => handleChange('caraBayaran', value)}
                disabled={isEditMode && profile?.role === 'marketer'}
              >
                <SelectTrigger className={cn("bg-background", isEditMode && profile?.role === 'marketer' && "opacity-60 cursor-not-allowed")}>
                  <SelectValue placeholder="Pilih Cara Bayaran" />
                </SelectTrigger>
                <SelectContent>
                  {CARA_BAYARAN_OPTIONS.map((opt) => (
                    <SelectItem key={opt} value={opt}>{opt}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Tracking Number - Only for Shopee/Tiktok */}
            {isShopeeOrTiktok && (
              <div>
                <FormLabel required>No. Tracking</FormLabel>
                <Input
                  placeholder="Masukkan tracking number"
                  value={formData.trackingNumber}
                  onChange={(e) => handleChange('trackingNumber', e.target.value)}
                  className="bg-background"
                />
              </div>
            )}

            {/* Waybill Attachment - Only for Shopee/Tiktok */}
            {isShopeeOrTiktok && (
              <div>
                <FormLabel required>Waybill Attachment (PDF)</FormLabel>
                <div className="relative">
                  <input
                    type="file"
                    accept="application/pdf"
                    onChange={handleWaybillChange}
                    className="hidden"
                    id="waybill-upload"
                  />
                  <label
                    htmlFor="waybill-upload"
                    className="flex items-center justify-center gap-2 w-full px-4 py-2 border border-dashed border-border rounded-lg cursor-pointer hover:bg-muted/50 transition-colors bg-background"
                  >
                    <Upload className="w-4 h-4" />
                    <span className="text-sm text-muted-foreground">
                      {waybillFileName || (isEditMode && editOrder.noTracking ? 'PDF sudah dimuat naik' : 'Upload PDF Waybill')}
                    </span>
                  </label>
                </div>
              </div>
            )}

            {/* Nota - Always visible */}
            <div className="lg:col-span-2">
              <FormLabel>Nota</FormLabel>
              <Textarea
                placeholder="Masukkan nota tambahan (optional)"
                value={formData.nota}
                onChange={(e) => handleChange('nota', e.target.value)}
                className="bg-background resize-none"
                rows={3}
              />
            </div>
          </div>
        </div>

        {/* Payment Details - Only show if CASH is selected */}
        {showPaymentDetails && (
          <div className="bg-card border border-border rounded-lg p-6 border-l-4 border-l-emerald-500">
            <h3 className="text-lg font-semibold text-foreground mb-4">Butiran Bayaran</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {/* Tarikh Bayaran */}
              <div>
                <FormLabel required>Tarikh Bayaran</FormLabel>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-full justify-start text-left font-normal bg-background",
                        !tarikhBayaran && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {tarikhBayaran ? format(tarikhBayaran, "dd/MM/yyyy") : "Pilih tarikh"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={tarikhBayaran}
                      onSelect={setTarikhBayaran}
                      initialFocus
                      className={cn("p-3 pointer-events-auto")}
                    />
                  </PopoverContent>
                </Popover>
              </div>

              {/* Jenis Bayaran */}
              <div>
                <FormLabel required>Jenis Bayaran</FormLabel>
                <Select
                  value={formData.jenisBayaran}
                  onValueChange={(value) => handleChange('jenisBayaran', value)}
                >
                  <SelectTrigger className="bg-background">
                    <SelectValue placeholder="Pilih Jenis Bayaran" />
                  </SelectTrigger>
                  <SelectContent>
                    {JENIS_BAYARAN_OPTIONS.map((opt) => (
                      <SelectItem key={opt} value={opt}>{opt}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Pilih Bank */}
              <div>
                <FormLabel required>Pilih Bank</FormLabel>
                <Select
                  value={formData.pilihBank}
                  onValueChange={(value) => handleChange('pilihBank', value)}
                >
                  <SelectTrigger className="bg-background">
                    <SelectValue placeholder="Pilih Bank" />
                  </SelectTrigger>
                  <SelectContent>
                    {BANK_OPTIONS.map((opt) => (
                      <SelectItem key={opt} value={opt}>{opt}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Resit Bayaran */}
              <div>
                <FormLabel required>Resit Bayaran</FormLabel>
                <div className="relative">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleFileChange}
                    className="hidden"
                    id="receipt-upload"
                  />
                  <label
                    htmlFor="receipt-upload"
                    className="flex items-center justify-center gap-2 w-full px-4 py-2 border border-dashed border-border rounded-lg cursor-pointer hover:bg-muted/50 transition-colors bg-background"
                  >
                    <Upload className="w-4 h-4" />
                    <span className="text-sm text-muted-foreground">
                      {receiptFile ? receiptFile.name : (isEditMode ? 'Resit sudah dimuat naik' : 'Upload Resit')}
                    </span>
                  </label>
                  {receiptPreview && (
                    <img
                      src={receiptPreview}
                      alt="Receipt preview"
                      className="mt-2 w-full h-32 object-cover rounded-lg border border-border"
                    />
                  )}
                </div>
              </div>

            </div>
          </div>
        )}

        {/* Submit Button */}
        <div className="flex justify-end gap-4">
          <Button
            type="button"
            variant="outline"
            onClick={() => navigate('/dashboard/orders')}
          >
            Batal
          </Button>
          <Button
            type="submit"
            disabled={isSubmitting}
            className="bg-primary hover:bg-primary/90"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                {isEditMode ? 'Mengemaskini...' : 'Menyimpan...'}
              </>
            ) : (
              <>
                <Save className="w-4 h-4 mr-2" />
                {isEditMode ? 'Kemaskini' : 'Submit'}
              </>
            )}
          </Button>
        </div>
      </form>
    </div>
  );
};

export default OrderForm;
