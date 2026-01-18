import { CompanySettings } from '@/hooks/useCompanySettings';
import { format } from 'date-fns';
import { Package } from 'lucide-react';

interface ProductPhoto {
  id: string;
  url: string;
  is_main: boolean | null;
  file_name: string;
}

interface OrderItem {
  id: string;
  product_name: string;
  model_number: string;
  specifications: string | null;
  quantity: number;
  unit_price: number;
  total_price: number;
  product_number?: string | null;
  product_photos?: ProductPhoto[];
}

interface Customer {
  company_name: string;
  contact_person: string;
  email: string;
  phone: string | null;
  street: string | null;
  city: string | null;
  state: string | null;
  country: string | null;
  zip_code: string | null;
}

interface Order {
  order_number: string;
  created_at: string;
  currency: string | null;
  trade_term: string | null;
  payment_terms: string | null;
  delivery_term_start: string | null;
  delivery_term_end: string | null;
  total_value: number | null;
  notes: string | null;
}

interface ProformaInvoiceTemplateProps {
  company: CompanySettings;
  customer: Customer;
  order: Order;
  items: OrderItem[];
  documentNumber: string;
}

export function ProformaInvoiceTemplate({
  company,
  customer,
  order,
  items,
  documentNumber,
}: ProformaInvoiceTemplateProps) {
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: order.currency || 'USD',
    }).format(amount);
  };

  const getDeliveryTerms = () => {
    if (order.delivery_term_start && order.delivery_term_end) {
      return `${format(new Date(order.delivery_term_start), 'MMM d')} - ${format(new Date(order.delivery_term_end), 'MMM d, yyyy')}`;
    }
    return 'To be confirmed';
  };

  const customerAddress = [
    customer.street,
    customer.city,
    customer.state,
    customer.country,
    customer.zip_code,
  ].filter(Boolean).join(', ');

  // Get main photo for an item
  const getMainPhoto = (item: OrderItem) => {
    if (!item.product_photos || item.product_photos.length === 0) return null;
    return item.product_photos.find(p => p.is_main) || item.product_photos[0];
  };

  // Collect all photos for gallery section
  const allPhotos: { item: OrderItem; photo: ProductPhoto }[] = [];
  items.forEach(item => {
    item.product_photos?.forEach(photo => {
      allPhotos.push({ item, photo });
    });
  });

  return (
    <div className="text-sm" style={{ fontFamily: 'Inter, system-ui, sans-serif' }}>
      {/* Header with Brand Colors */}
      <div className="mb-6" style={{ borderBottom: '3px solid #1D7BE6' }}>
        <div className="flex items-center justify-between pb-4">
          <div className="flex items-center gap-4">
            <img src="/images/logo.png" alt="Trade Entrust" className="h-14 w-14 object-contain" />
            <div>
              <h1 className="text-2xl font-bold" style={{ color: '#1D7BE6', fontFamily: 'Poppins, sans-serif' }}>
                {company.company_name}
              </h1>
              {company.company_name_cn && <p className="text-base" style={{ color: '#1D7BE6' }}>{company.company_name_cn}</p>}
            </div>
          </div>
          <div className="text-right text-xs text-gray-600">
            <p>{company.address}</p>
            {company.address_cn && <p>{company.address_cn}</p>}
            <p>Tel: {company.phone}</p>
            <p>Email: {company.email}</p>
          </div>
        </div>
      </div>

      {/* Document Title */}
      <div className="text-center mb-6">
        <h2 className="text-xl font-bold pb-2 inline-block px-8" style={{ 
          color: '#1D7BE6', 
          borderBottom: '2px solid #FFB636',
          fontFamily: 'Poppins, sans-serif' 
        }}>
          PROFORMA INVOICE
        </h2>
      </div>

      {/* Document Info */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        <div>
          <p className="font-bold" style={{ color: '#1D7BE6' }}>To:</p>
          <p className="font-bold">{customer.company_name}</p>
          <p>Attn: {customer.contact_person}</p>
          {customerAddress && <p className="text-xs">{customerAddress}</p>}
          <p>Email: {customer.email}</p>
          {customer.phone && <p>Tel: {customer.phone}</p>}
        </div>
        <div className="text-right">
          <p><span className="font-bold">PI No:</span> {documentNumber}</p>
          <p><span className="font-bold">Date:</span> {format(new Date(), 'MMMM d, yyyy')}</p>
          <p><span className="font-bold">Ref:</span> {order.order_number}</p>
          <p><span className="font-bold">Terms:</span> {order.trade_term || 'FOB'}</p>
          <p><span className="font-bold">Payment:</span> {order.payment_terms || '30% T/T deposit, 70% before shipment'}</p>
        </div>
      </div>

      {/* Items Table with Photos */}
      <table className="w-full mb-6">
        <thead>
          <tr style={{ backgroundColor: '#1D7BE6' }}>
            <th className="border border-gray-300 p-2 text-left w-12 text-white">No.</th>
            <th className="border border-gray-300 p-2 text-left text-white">Model #</th>
            <th className="border border-gray-300 p-2 text-left text-white">Product Name</th>
            <th className="border border-gray-300 p-2 text-center w-20 text-white">Photo</th>
            <th className="border border-gray-300 p-2 text-left text-white">Specifications</th>
            <th className="border border-gray-300 p-2 text-center w-16 text-white">Qty</th>
            <th className="border border-gray-300 p-2 text-right w-24 text-white">Unit Price</th>
            <th className="border border-gray-300 p-2 text-right w-28 text-white">Amount</th>
          </tr>
        </thead>
        <tbody>
          {items.map((item, index) => {
            const mainPhoto = getMainPhoto(item);
            return (
              <tr key={item.id}>
                <td className="border border-gray-300 p-2">{index + 1}</td>
                <td className="border border-gray-300 p-2 font-mono text-sm">{item.product_number || item.model_number}</td>
                <td className="border border-gray-300 p-2 font-medium">{item.product_name}</td>
                <td className="border border-gray-300 p-2">
                  <div className="w-16 h-16 mx-auto flex items-center justify-center bg-gray-100 rounded">
                    {mainPhoto ? (
                      <img 
                        src={mainPhoto.url} 
                        alt={item.product_name}
                        className="w-full h-full object-cover rounded"
                      />
                    ) : (
                      <Package className="h-6 w-6 text-gray-400" />
                    )}
                  </div>
                </td>
                <td className="border border-gray-300 p-2">
                  <p className="text-xs text-gray-600 whitespace-pre-line">{item.specifications || '-'}</p>
                </td>
                <td className="border border-gray-300 p-2 text-center">{item.quantity}</td>
                <td className="border border-gray-300 p-2 text-right">{formatCurrency(item.unit_price)}</td>
                <td className="border border-gray-300 p-2 text-right">{formatCurrency(item.total_price)}</td>
              </tr>
            );
          })}
        </tbody>
        <tfoot>
          <tr className="font-bold">
            <td colSpan={7} className="border border-gray-300 p-2 text-right" style={{ backgroundColor: '#FFB636' }}>TOTAL:</td>
            <td className="border border-gray-300 p-2 text-right">{formatCurrency(order.total_value || 0)}</td>
          </tr>
        </tfoot>
      </table>

      {/* Delivery Terms */}
      <div className="mb-4">
        <p><span className="font-bold" style={{ color: '#1D7BE6' }}>Delivery:</span> {getDeliveryTerms()}</p>
      </div>

      {/* Bank Details */}
      <div className="mb-6 p-4 border" style={{ backgroundColor: '#f8fafc', borderColor: '#1D7BE6' }}>
        <p className="font-bold mb-2" style={{ color: '#1D7BE6' }}>Bank Details:</p>
        <div className="grid grid-cols-2 gap-2 text-xs">
          <p><span className="font-medium">Account Name:</span> {company.bank_account_name}</p>
          <p><span className="font-medium">Account No:</span> {company.bank_account_number}</p>
          <p><span className="font-medium">Bank Name:</span> {company.bank_name}</p>
          <p><span className="font-medium">SWIFT Code:</span> {company.bank_swift_code}</p>
          {company.bank_address && (
            <p className="col-span-2"><span className="font-medium">Bank Address:</span> {company.bank_address}</p>
          )}
        </div>
      </div>

      {/* Notes */}
      {order.notes && (
        <div className="mb-6">
          <p className="font-bold mb-1" style={{ color: '#1D7BE6' }}>Remarks:</p>
          <p className="text-xs whitespace-pre-line">{order.notes}</p>
        </div>
      )}

      {/* Product Photo Gallery */}
      {allPhotos.length > 0 && (
        <div className="mb-6 page-break-before">
          <p className="font-bold mb-3 text-lg pb-2" style={{ color: '#1D7BE6', borderBottom: '2px solid #FFB636' }}>Product Photos</p>
          <div className="grid grid-cols-3 gap-4">
            {allPhotos.map(({ item, photo }, idx) => (
              <div key={photo.id || idx} className="border rounded-lg p-2" style={{ borderColor: '#1D7BE6' }}>
                <img 
                  src={photo.url} 
                  alt={`${item.product_name} - ${idx + 1}`}
                  className="w-full h-32 object-cover rounded mb-2"
                />
                <p className="text-xs font-medium truncate">{item.product_name}</p>
                <p className="text-xs text-gray-500 truncate">{item.product_number || item.model_number}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Signature */}
      <div className="mt-8">
        <p className="font-bold mb-1" style={{ color: '#1D7BE6' }}>For {company.company_name}</p>
        <div className="w-48 mt-12 mb-1" style={{ borderBottom: '2px solid #1D7BE6' }}></div>
        <p className="text-xs">Authorized Signature</p>
      </div>
    </div>
  );
}
