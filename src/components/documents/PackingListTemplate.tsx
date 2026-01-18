import { CompanySettings } from '@/hooks/useCompanySettings';
import { format } from 'date-fns';

interface OrderItem {
  id: string;
  product_name: string;
  model_number: string;
  specifications: string | null;
  quantity: number;
  unit_price: number;
  total_price: number;
  product_number?: string | null;
  cartons?: number | null;
  gross_weight_kg?: number | null;
  cbm?: number | null;
}

interface Customer {
  company_name: string;
  contact_person: string;
  street: string | null;
  city: string | null;
  state: string | null;
  country: string | null;
  zip_code: string | null;
}

interface Order {
  order_number: string;
  trade_term: string | null;
}

interface PackingListTemplateProps {
  company: CompanySettings;
  customer: Customer;
  order: Order;
  items: OrderItem[];
  documentNumber: string;
}

export function PackingListTemplate({
  company,
  customer,
  order,
  items,
  documentNumber,
}: PackingListTemplateProps) {
  const customerAddress = [
    customer.street,
    customer.city,
    customer.state,
    customer.country,
    customer.zip_code,
  ].filter(Boolean).join(', ');

  // Calculate totals
  const totals = items.reduce(
    (acc, item) => ({
      quantity: acc.quantity + item.quantity,
      cartons: acc.cartons + (item.cartons || 0),
      grossWeight: acc.grossWeight + (item.gross_weight_kg || 0),
      cbm: acc.cbm + (item.cbm || 0),
    }),
    { quantity: 0, cartons: 0, grossWeight: 0, cbm: 0 }
  );

  return (
    <div className="text-sm" style={{ fontFamily: 'Inter, system-ui, sans-serif' }}>
      {/* Header */}
      <div className="mb-6 border-b-2 border-gray-300">
        <div className="flex items-center justify-between pb-4">
          <div className="flex items-center gap-4">
            <img src="/images/logo.png" alt="Trade Entrust" className="h-14 w-14 object-contain" />
            <div>
              <h1 className="text-2xl font-bold">
                {company.company_name}
              </h1>
              {company.company_name_cn && <p className="text-base">{company.company_name_cn}</p>}
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
        <h2 className="text-xl font-bold pb-2 inline-block px-8 border-b-2 border-gray-400">
          PACKING LIST
        </h2>
      </div>

      {/* Document Info */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        <div>
          <p className="font-bold">Consignee:</p>
          <p className="font-bold">{customer.company_name}</p>
          <p>Attn: {customer.contact_person}</p>
          {customerAddress && <p className="text-xs">{customerAddress}</p>}
        </div>
        <div className="text-right">
          <p><span className="font-bold">P/L No:</span> {documentNumber}</p>
          <p><span className="font-bold">Date:</span> {format(new Date(), 'MMMM d, yyyy')}</p>
          <p><span className="font-bold">Order Ref:</span> {order.order_number}</p>
          <p><span className="font-bold">Terms:</span> {order.trade_term || 'FOB'}</p>
        </div>
      </div>

      {/* Items Table */}
      <table className="w-full mb-6">
        <thead>
          <tr className="bg-gray-100">
            <th className="border border-gray-300 p-2 text-left w-12">No.</th>
            <th className="border border-gray-300 p-2 text-left">PN</th>
            <th className="border border-gray-300 p-2 text-left">Description</th>
            <th className="border border-gray-300 p-2 text-center w-16">Qty</th>
            <th className="border border-gray-300 p-2 text-center w-20">Cartons</th>
            <th className="border border-gray-300 p-2 text-right w-24">G.W. (kg)</th>
            <th className="border border-gray-300 p-2 text-right w-20">CBM</th>
          </tr>
        </thead>
        <tbody>
          {items.map((item, index) => (
            <tr key={item.id}>
              <td className="border border-gray-300 p-2">{index + 1}</td>
              <td className="border border-gray-300 p-2">{item.product_number || item.model_number}</td>
              <td className="border border-gray-300 p-2">
                <p className="font-medium">{item.product_name}</p>
                {item.specifications && (
                  <p className="text-xs text-gray-600 whitespace-pre-line">{item.specifications}</p>
                )}
              </td>
              <td className="border border-gray-300 p-2 text-center">{item.quantity}</td>
              <td className="border border-gray-300 p-2 text-center">{item.cartons || '-'}</td>
              <td className="border border-gray-300 p-2 text-right">
                {item.gross_weight_kg ? item.gross_weight_kg.toFixed(2) : '-'}
              </td>
              <td className="border border-gray-300 p-2 text-right">
                {item.cbm ? item.cbm.toFixed(3) : '-'}
              </td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr className="font-bold bg-gray-100">
            <td colSpan={3} className="border border-gray-300 p-2 text-right">TOTAL:</td>
            <td className="border border-gray-300 p-2 text-center">{totals.quantity}</td>
            <td className="border border-gray-300 p-2 text-center">{totals.cartons || '-'}</td>
            <td className="border border-gray-300 p-2 text-right">
              {totals.grossWeight ? totals.grossWeight.toFixed(2) : '-'}
            </td>
            <td className="border border-gray-300 p-2 text-right">
              {totals.cbm ? totals.cbm.toFixed(3) : '-'}
            </td>
          </tr>
        </tfoot>
      </table>

      {/* Summary */}
      <div className="mb-6 p-4 border border-gray-300 bg-gray-50">
        <p className="font-bold mb-2">Shipping Summary:</p>
        <div className="grid grid-cols-3 gap-4 text-sm">
          <p><span className="font-medium">Total Cartons:</span> {totals.cartons || 'TBD'}</p>
          <p><span className="font-medium">Gross Weight:</span> {totals.grossWeight ? `${totals.grossWeight.toFixed(2)} kg` : 'TBD'}</p>
          <p><span className="font-medium">Total CBM:</span> {totals.cbm ? totals.cbm.toFixed(3) : 'TBD'}</p>
        </div>
      </div>

      {/* Signatures */}
      <div className="mt-8 flex justify-between">
        <div>
          <p className="font-bold mb-1">For {company.company_name}</p>
          <div className="w-48 mt-12 mb-1 border-b-2 border-gray-400"></div>
          <p className="text-xs">Authorized Signature</p>
        </div>
        <div>
          <p className="font-bold mb-1">For {customer.company_name}</p>
          <div className="w-48 mt-12 mb-1 border-b-2 border-gray-400"></div>
          <p className="text-xs">Customer Signature</p>
        </div>
      </div>
    </div>
  );
}
