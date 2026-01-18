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
  product_photos?: ProductPhoto[];
}

interface Supplier {
  supplier_name: string;
  contact_person: string;
  email: string;
  phone: string | null;
  wechat_id: string | null;
  street: string | null;
  city: string | null;
  state: string | null;
  country: string | null;
  bank_account_name?: string | null;
  bank_account_number?: string | null;
  bank_name?: string | null;
  bank_address?: string | null;
  bank_swift_code?: string | null;
}

interface PurchaseOrder {
  po_number: string;
  created_at: string;
  currency: string | null;
  trade_term: string | null;
  payment_terms: string | null;
  total_value: number | null;
  delivery_date: string | null;
  factory_deposit_amount: number | null;
  factory_balance_amount: number | null;
  factory_payment_currency: string | null;
  packaging_requirements: string | null;
  quality_inspection_terms: string | null;
  notes: string | null;
  product_name_cn: string | null;
  specifications_cn: string | null;
}

interface FactoryPOTemplateProps {
  company: CompanySettings;
  supplier: Supplier;
  purchaseOrder: PurchaseOrder;
  items: OrderItem[];
}

export function FactoryPOTemplate({
  company,
  supplier,
  purchaseOrder,
  items,
}: FactoryPOTemplateProps) {
  const currency = purchaseOrder.factory_payment_currency || purchaseOrder.currency || 'RMB';
  
  const formatCurrency = (amount: number) => {
    if (currency === 'RMB' || currency === 'CNY') {
      return `¥${amount.toLocaleString()}`;
    }
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency,
    }).format(amount);
  };

  const supplierAddress = [
    supplier.street,
    supplier.city,
    supplier.state,
    supplier.country,
  ].filter(Boolean).join(', ');

  const depositAmount = purchaseOrder.factory_deposit_amount || 0;
  const balanceAmount = purchaseOrder.factory_balance_amount || 0;
  const totalValue = purchaseOrder.total_value || 0;

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
      {/* Header - Bilingual with Brand */}
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
        <h2 className="text-xl font-bold border-b-2 border-black pb-2 inline-block px-8">
          采购订单 / PURCHASE ORDER
        </h2>
      </div>

      {/* Document Info */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        <div>
          <p className="font-bold">供应商 / Supplier:</p>
          <p className="font-bold">{supplier.supplier_name}</p>
          <p>联系人 / Contact: {supplier.contact_person}</p>
          {supplierAddress && <p className="text-xs">{supplierAddress}</p>}
          <p>Email: {supplier.email}</p>
          {supplier.phone && <p>电话 / Tel: {supplier.phone}</p>}
          {supplier.wechat_id && <p>微信 / WeChat: {supplier.wechat_id}</p>}
        </div>
        <div className="text-right">
          <p><span className="font-bold">订单号 / PO No:</span> {purchaseOrder.po_number}</p>
          <p><span className="font-bold">日期 / Date:</span> {format(new Date(purchaseOrder.created_at), 'yyyy-MM-dd')}</p>
          <p><span className="font-bold">交货期 / Delivery:</span> {purchaseOrder.delivery_date ? format(new Date(purchaseOrder.delivery_date), 'yyyy-MM-dd') : 'TBD'}</p>
          <p><span className="font-bold">贸易条款 / Terms:</span> {purchaseOrder.trade_term || 'EXW'}</p>
        </div>
      </div>

      {/* Items Table with Photos */}
      <table className="w-full mb-6">
        <thead>
          <tr style={{ backgroundColor: '#1D7BE6' }}>
            <th className="border border-gray-300 p-2 text-left w-12 text-white">序号</th>
            <th className="border border-gray-300 p-2 text-center w-20 text-white">图片</th>
            <th className="border border-gray-300 p-2 text-left text-white">产品名称 / Description</th>
            <th className="border border-gray-300 p-2 text-left text-white">规格 / Specifications</th>
            <th className="border border-gray-300 p-2 text-center w-16 text-white">数量</th>
            <th className="border border-gray-300 p-2 text-right w-24 text-white">单价</th>
            <th className="border border-gray-300 p-2 text-right w-28 text-white">金额</th>
          </tr>
        </thead>
        <tbody>
          {items.map((item, index) => {
            const mainPhoto = getMainPhoto(item);
            return (
              <tr key={item.id}>
                <td className="border border-gray-300 p-2">{index + 1}</td>
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
                  <p>{purchaseOrder.product_name_cn || item.product_name}</p>
                  <p className="text-xs text-gray-500">{item.product_name}</p>
                </td>
                <td className="border border-gray-300 p-2 text-xs">
                  {purchaseOrder.specifications_cn || item.specifications || '-'}
                </td>
                <td className="border border-gray-300 p-2 text-center">{item.quantity}</td>
                <td className="border border-gray-300 p-2 text-right">{formatCurrency(item.unit_price)}</td>
                <td className="border border-gray-300 p-2 text-right">{formatCurrency(item.total_price)}</td>
              </tr>
            );
          })}
        </tbody>
        <tfoot>
          <tr className="font-bold" style={{ backgroundColor: '#FFB636' }}>
            <td colSpan={6} className="border border-gray-300 p-2 text-right">合计 / TOTAL:</td>
            <td className="border border-gray-300 p-2 text-right">{formatCurrency(totalValue)}</td>
          </tr>
        </tfoot>
      </table>

      {/* Payment Terms */}
      <div className="mb-4 p-4 bg-gray-50 border">
        <p className="font-bold mb-2">付款条款 / Payment Terms:</p>
        <p className="mb-2">{purchaseOrder.payment_terms || '30% 订金, 70% 发货前付清 / 30% deposit, 70% before shipment'}</p>
        <div className="grid grid-cols-2 gap-4 text-sm">
          <p><span className="font-medium">订金 / Deposit:</span> {formatCurrency(depositAmount)} ({totalValue > 0 ? ((depositAmount / totalValue) * 100).toFixed(0) : 0}%)</p>
          <p><span className="font-medium">尾款 / Balance:</span> {formatCurrency(balanceAmount)} ({totalValue > 0 ? ((balanceAmount / totalValue) * 100).toFixed(0) : 0}%)</p>
        </div>
      </div>

      {/* Supplier Bank Details */}
      {supplier.bank_account_number && (
        <div className="mb-4 p-4 bg-gray-50 border">
          <p className="font-bold mb-2">供应商银行信息 / Supplier Bank Details:</p>
          <div className="grid grid-cols-2 gap-2 text-xs">
            <p><span className="font-medium">户名 / Account Name:</span> {supplier.bank_account_name}</p>
            <p><span className="font-medium">账号 / Account No:</span> {supplier.bank_account_number}</p>
            <p><span className="font-medium">银行 / Bank:</span> {supplier.bank_name}</p>
            {supplier.bank_address && (
              <p><span className="font-medium">地址 / Address:</span> {supplier.bank_address}</p>
            )}
          </div>
        </div>
      )}

      {/* Quality & Packaging Requirements */}
      <div className="mb-4">
        <p className="font-bold mb-1">质量要求 / Quality Requirements:</p>
        <p className="text-xs whitespace-pre-line">
          {purchaseOrder.quality_inspection_terms || 
            '产品必须符合样品标准，接受第三方验货。\nProducts must meet sample standards. Third-party inspection accepted.'}
        </p>
      </div>

      {purchaseOrder.packaging_requirements && (
        <div className="mb-4">
          <p className="font-bold mb-1">包装要求 / Packaging Requirements:</p>
          <p className="text-xs whitespace-pre-line">{purchaseOrder.packaging_requirements}</p>
        </div>
      )}

      {purchaseOrder.notes && (
        <div className="mb-4">
          <p className="font-bold mb-1">备注 / Remarks:</p>
          <p className="text-xs whitespace-pre-line">{purchaseOrder.notes}</p>
        </div>
      )}

      {/* Signature Areas */}
      <div className="mt-8 grid grid-cols-2 gap-8">
        <div className="text-center">
          <p className="font-bold mb-1">买方 / Buyer</p>
          <p className="text-sm">{company.company_name}</p>
          <div className="border-b border-gray-400 mt-16 mb-1"></div>
          <p className="text-xs">授权签字 / Authorized Signature</p>
          <p className="text-xs mt-2">日期 / Date: _______________</p>
        </div>
        <div className="text-center">
          <p className="font-bold mb-1">卖方 / Supplier</p>
          <p className="text-sm">{supplier.supplier_name}</p>
          <div className="border-b border-gray-400 mt-16 mb-1"></div>
          <p className="text-xs">授权签字盖章 / Authorized Signature & Stamp</p>
          <p className="text-xs mt-2">日期 / Date: _______________</p>
        </div>
      </div>
    </div>
  );
}
