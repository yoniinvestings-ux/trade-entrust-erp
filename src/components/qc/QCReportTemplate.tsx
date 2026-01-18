import { format } from 'date-fns';
import { QCInspection, QC_CHECK_CATEGORIES, QC_RESULT_OPTIONS, CONCLUSION_OPTIONS, INSPECTION_TYPES } from '@/hooks/useQCInspections';
import { useCompanySettings } from '@/hooks/useCompanySettings';

interface QCReportTemplateProps {
  inspection: QCInspection;
}

export function QCReportTemplate({ inspection }: QCReportTemplateProps) {
  const { data: company } = useCompanySettings();

  const inspectionType = INSPECTION_TYPES.find(t => t.value === (inspection as any).inspection_type)?.label || 'Final Inspection';
  const conclusion = CONCLUSION_OPTIONS.find(c => c.value === (inspection as any).conclusion);

  // Calculate statistics
  const items = inspection.inspection_items || [];
  const passCount = items.filter(i => i.result === 'pass').length;
  const minorCount = items.filter(i => i.result === 'minor_issue').length;
  const majorCount = items.filter(i => i.result === 'major_issue').length;
  const failCount = items.filter(i => i.result === 'fail').length;
  const totalChecks = items.length;
  const passRate = totalChecks > 0 ? ((passCount / totalChecks) * 100).toFixed(1) : '0';

  // Group items by category
  const groupedItems = items.reduce((acc, item) => {
    if (!acc[item.check_category]) acc[item.check_category] = [];
    acc[item.check_category].push(item);
    return acc;
  }, {} as Record<string, typeof items>);

  // Get issues only (non-pass items)
  const issues = items.filter(i => i.result !== 'pass' && i.result !== 'pending');

  return (
    <div className="bg-white text-black p-8 max-w-4xl mx-auto" style={{ fontFamily: 'Arial, sans-serif' }}>
      {/* Header */}
      <div className="border-b-4 border-primary pb-4 mb-6">
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-2xl font-bold text-primary">QUALITY INSPECTION REPORT</h1>
            <h2 className="text-xl font-bold text-gray-600">质量检验报告</h2>
          </div>
          <div className="text-right">
            <p className="font-bold text-lg">{company?.company_name || 'TRADE ENTRUST'}</p>
            {company?.company_name_cn && <p className="text-gray-600">{company.company_name_cn}</p>}
          </div>
        </div>
      </div>

      {/* Report Info */}
      <div className="grid grid-cols-2 gap-8 mb-6">
        <div className="space-y-2">
          <div className="flex">
            <span className="w-32 text-gray-600">Report No. / 报告编号:</span>
            <span className="font-mono font-bold">QC-{inspection.order?.order_number?.replace('ORD-', '')}-{format(new Date(inspection.inspection_date), 'yyyyMMdd')}</span>
          </div>
          <div className="flex">
            <span className="w-32 text-gray-600">Inspection Type:</span>
            <span className="font-medium">{inspectionType}</span>
          </div>
          <div className="flex">
            <span className="w-32 text-gray-600">Inspection Date:</span>
            <span>{format(new Date(inspection.inspection_date), 'MMMM d, yyyy')}</span>
          </div>
          <div className="flex">
            <span className="w-32 text-gray-600">AQL Level:</span>
            <span>{(inspection as any).aql_level || 'S4'}</span>
          </div>
        </div>
        <div className="space-y-2">
          <div className="flex">
            <span className="w-32 text-gray-600">Order No.:</span>
            <span className="font-mono font-bold">{inspection.order?.order_number}</span>
          </div>
          {inspection.purchase_order && (
            <div className="flex">
              <span className="w-32 text-gray-600">PO No.:</span>
              <span className="font-mono">{inspection.purchase_order.po_number}</span>
            </div>
          )}
          <div className="flex">
            <span className="w-32 text-gray-600">Sample Size:</span>
            <span>{(inspection as any).sample_size || '-'} pcs</span>
          </div>
          <div className="flex">
            <span className="w-32 text-gray-600">Defect Rate:</span>
            <span className={`font-bold ${(inspection.defect_rate || 0) > 5 ? 'text-red-600' : 'text-green-600'}`}>
              {(inspection.defect_rate || 0).toFixed(1)}%
            </span>
          </div>
        </div>
      </div>

      {/* Customer & Supplier Info */}
      <div className="grid grid-cols-2 gap-8 mb-6 border rounded-lg p-4 bg-gray-50">
        <div>
          <h3 className="font-bold text-sm text-gray-500 uppercase mb-2">Customer / 客户</h3>
          <p className="font-bold">{inspection.order?.customer?.company_name}</p>
          <p className="text-sm text-gray-600">{inspection.order?.customer?.contact_person}</p>
          <p className="text-sm text-gray-600">{inspection.order?.customer?.email}</p>
        </div>
        {inspection.purchase_order?.supplier && (
          <div>
            <h3 className="font-bold text-sm text-gray-500 uppercase mb-2">Supplier / 供应商</h3>
            <p className="font-bold">{inspection.purchase_order.supplier.supplier_name}</p>
            <p className="text-sm text-gray-600">{inspection.purchase_order.supplier.contact_person}</p>
            {(inspection as any).location && (
              <p className="text-sm text-gray-600">📍 {(inspection as any).location}</p>
            )}
          </div>
        )}
      </div>

      {/* Conclusion Banner */}
      <div className={`rounded-lg p-4 mb-6 text-center ${
        (inspection as any).conclusion === 'accepted' ? 'bg-green-100 border-2 border-green-500' :
        (inspection as any).conclusion === 'rejected' ? 'bg-red-100 border-2 border-red-500' :
        'bg-yellow-100 border-2 border-yellow-500'
      }`}>
        <h3 className="text-lg font-bold uppercase">
          INSPECTION RESULT / 检验结果: {' '}
          <span className={
            (inspection as any).conclusion === 'accepted' ? 'text-green-700' :
            (inspection as any).conclusion === 'rejected' ? 'text-red-700' :
            'text-yellow-700'
          }>
            {conclusion?.label || 'PENDING'}
          </span>
        </h3>
      </div>

      {/* Summary Statistics */}
      <div className="grid grid-cols-5 gap-4 mb-6">
        <div className="text-center p-3 bg-gray-100 rounded-lg">
          <p className="text-2xl font-bold">{totalChecks}</p>
          <p className="text-xs text-gray-600">Total Checks<br/>检验项目</p>
        </div>
        <div className="text-center p-3 bg-green-100 rounded-lg">
          <p className="text-2xl font-bold text-green-600">{passCount}</p>
          <p className="text-xs text-gray-600">Passed<br/>合格</p>
        </div>
        <div className="text-center p-3 bg-yellow-100 rounded-lg">
          <p className="text-2xl font-bold text-yellow-600">{minorCount}</p>
          <p className="text-xs text-gray-600">Minor Issues<br/>轻微问题</p>
        </div>
        <div className="text-center p-3 bg-orange-100 rounded-lg">
          <p className="text-2xl font-bold text-orange-600">{majorCount}</p>
          <p className="text-xs text-gray-600">Major Issues<br/>严重问题</p>
        </div>
        <div className="text-center p-3 bg-red-100 rounded-lg">
          <p className="text-2xl font-bold text-red-600">{failCount}</p>
          <p className="text-xs text-gray-600">Failed<br/>不合格</p>
        </div>
      </div>

      {/* Detailed Checklist */}
      <div className="mb-6">
        <h3 className="text-lg font-bold mb-3 border-b pb-2">Inspection Checklist / 检验清单</h3>
        
        {QC_CHECK_CATEGORIES.map((category) => {
          const categoryItems = groupedItems[category.value];
          if (!categoryItems || categoryItems.length === 0) return null;

          return (
            <div key={category.value} className="mb-4">
              <h4 className="font-bold text-sm bg-gray-200 px-2 py-1 rounded">
                {category.label}
              </h4>
              <table className="w-full text-sm mt-1">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-1 w-1/3">Check Item / 检验项</th>
                    <th className="text-left py-1 w-1/3">Requirement / 要求</th>
                    <th className="text-center py-1 w-1/6">Result / 结果</th>
                  </tr>
                </thead>
                <tbody>
                  {categoryItems.map((item) => {
                    const resultOption = QC_RESULT_OPTIONS.find(r => r.value === item.result);
                    return (
                      <tr key={item.id} className="border-b border-gray-100">
                        <td className="py-1">
                          {item.check_name}
                          {item.check_name_cn && <span className="text-gray-500 text-xs block">{item.check_name_cn}</span>}
                        </td>
                        <td className="py-1 text-gray-600">
                          {item.requirement}
                          {item.requirement_cn && <span className="text-gray-400 text-xs block">{item.requirement_cn}</span>}
                        </td>
                        <td className="py-1 text-center">
                          <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                            item.result === 'pass' ? 'bg-green-100 text-green-700' :
                            item.result === 'minor_issue' ? 'bg-yellow-100 text-yellow-700' :
                            item.result === 'major_issue' ? 'bg-orange-100 text-orange-700' :
                            item.result === 'fail' ? 'bg-red-100 text-red-700' :
                            'bg-gray-100 text-gray-700'
                          }`}>
                            {resultOption?.label} / {resultOption?.label_cn}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          );
        })}
      </div>

      {/* Issues & Corrective Actions */}
      {issues.length > 0 && (
        <div className="mb-6">
          <h3 className="text-lg font-bold mb-3 border-b pb-2 text-red-600">
            Issues Found & Corrective Actions / 发现问题及整改措施
          </h3>
          
          {issues.map((item, index) => {
            const resultOption = QC_RESULT_OPTIONS.find(r => r.value === item.result);
            const photos = item.photo_urls || [];
            
            return (
              <div key={item.id} className="border rounded-lg p-4 mb-4 bg-gray-50">
                {/* Issue Header */}
                <div className="flex items-center justify-between mb-3 border-b pb-2">
                  <div className="flex items-center gap-3">
                    <span className="bg-gray-800 text-white w-7 h-7 rounded-full flex items-center justify-center font-bold text-sm">
                      {index + 1}
                    </span>
                    <div>
                      <span className="font-bold">{item.check_name}</span>
                      {item.check_name_cn && (
                        <span className="text-gray-500 text-sm ml-2">({item.check_name_cn})</span>
                      )}
                    </div>
                  </div>
                  <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                    item.result === 'minor_issue' ? 'bg-yellow-100 text-yellow-700 border border-yellow-300' :
                    item.result === 'major_issue' ? 'bg-orange-100 text-orange-700 border border-orange-300' :
                    'bg-red-100 text-red-700 border border-red-300'
                  }`}>
                    {resultOption?.label} / {resultOption?.label_cn}
                  </span>
                </div>

                {/* Issue Details */}
                <div className="grid grid-cols-2 gap-4 mb-3">
                  <div>
                    <p className="text-xs font-bold text-gray-500 uppercase mb-1">Issue Found / 发现问题</p>
                    <p className="text-sm bg-white p-2 rounded border min-h-[40px]">
                      {item.finding || '-'}
                      {item.finding_cn && (
                        <span className="text-gray-500 block text-xs mt-1">{item.finding_cn}</span>
                      )}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs font-bold text-gray-500 uppercase mb-1">Corrective Action / 整改措施</p>
                    <p className="text-sm bg-white p-2 rounded border min-h-[40px]">
                      {item.corrective_action || '-'}
                      {item.corrective_action_cn && (
                        <span className="text-gray-500 block text-xs mt-1">{item.corrective_action_cn}</span>
                      )}
                    </p>
                  </div>
                </div>

                {/* Defect Photos */}
                {photos.length > 0 && (
                  <div className="mt-3 pt-3 border-t">
                    <p className="text-xs font-bold text-gray-500 uppercase mb-2">
                      Evidence Photos / 证据照片 ({photos.length})
                    </p>
                    <div className="grid grid-cols-4 gap-3">
                      {photos.map((photoUrl, photoIndex) => (
                        <div key={photoIndex} className="relative">
                          <div className="aspect-square bg-white rounded-lg border overflow-hidden shadow-sm">
                            <img
                              src={photoUrl}
                              alt={`Defect ${index + 1} - Photo ${photoIndex + 1}`}
                              className="w-full h-full object-cover"
                              onError={(e) => {
                                (e.target as HTMLImageElement).src = '/placeholder.svg';
                              }}
                            />
                          </div>
                          <p className="text-xs text-center text-gray-600 mt-1 truncate">
                            Photo {photoIndex + 1} / 照片 {photoIndex + 1}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Inspector Notes */}
      {inspection.report && (
        <div className="mb-6">
          <h3 className="text-lg font-bold mb-2 border-b pb-2">Inspector Notes / 检验员备注</h3>
          <p className="whitespace-pre-wrap text-gray-700">{inspection.report}</p>
        </div>
      )}

      {/* Footer */}
      <div className="border-t-2 pt-4 mt-8">
        <div className="grid grid-cols-2 gap-8">
          <div>
            <p className="text-sm text-gray-600 mb-2">Inspector Signature / 检验员签名:</p>
            <div className="border-b border-gray-400 h-8 mb-1"></div>
            <p className="text-xs text-gray-500">Date: {format(new Date(inspection.inspection_date), 'yyyy-MM-dd')}</p>
          </div>
          <div>
            <p className="text-sm text-gray-600 mb-2">Reviewed By / 审核人:</p>
            <div className="border-b border-gray-400 h-8 mb-1"></div>
            <p className="text-xs text-gray-500">Date: _______________</p>
          </div>
        </div>
        <p className="text-xs text-gray-400 text-center mt-4">
          This report was generated by {company?.company_name || 'Trade Entrust'} Quality Control System
        </p>
      </div>
    </div>
  );
}
