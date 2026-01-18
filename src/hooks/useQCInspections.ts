import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Tables, TablesInsert, TablesUpdate } from '@/integrations/supabase/types';

export type QCInspection = Tables<'qc_inspections'> & {
  order?: Tables<'orders'> & {
    customer?: Tables<'customers'>;
    order_items?: Tables<'order_items'>[];
  };
  purchase_order?: Tables<'purchase_orders'> & {
    supplier?: Tables<'suppliers'>;
  };
  inspection_items?: QCInspectionItem[];
};

export type QCInspectionItem = {
  id: string;
  inspection_id: string;
  check_category: string;
  check_name: string;
  check_name_cn: string | null;
  requirement: string | null;
  requirement_cn: string | null;
  result: string;
  finding: string | null;
  finding_cn: string | null;
  corrective_action: string | null;
  corrective_action_cn: string | null;
  photo_urls: string[] | null;
  created_at: string;
  updated_at: string;
};

export const QC_CHECK_CATEGORIES = [
  { value: 'appearance', label: 'Appearance / 外观检查', label_cn: '外观检查' },
  { value: 'function', label: 'Function / 功能检查', label_cn: '功能检查' },
  { value: 'measurement', label: 'Measurement / 尺寸检查', label_cn: '尺寸检查' },
  { value: 'safety', label: 'Safety / 安全检查', label_cn: '安全检查' },
  { value: 'packaging', label: 'Packaging / 包装检查', label_cn: '包装检查' },
  { value: 'material', label: 'Material / 材料检查', label_cn: '材料检查' },
  { value: 'labeling', label: 'Labeling / 标签检查', label_cn: '标签检查' },
];

export const QC_RESULT_OPTIONS = [
  { value: 'pending', label: 'Pending', label_cn: '待检', color: 'bg-gray-500' },
  { value: 'pass', label: 'Pass', label_cn: '合格', color: 'bg-green-500' },
  { value: 'minor_issue', label: 'Minor Issue', label_cn: '轻微问题', color: 'bg-yellow-500' },
  { value: 'major_issue', label: 'Major Issue', label_cn: '严重问题', color: 'bg-orange-500' },
  { value: 'fail', label: 'Fail', label_cn: '不合格', color: 'bg-red-500' },
];

export const INSPECTION_TYPES = [
  { value: 'factory_audit', label: 'Factory Audit / Qualification', label_cn: '工厂审核' },
  { value: 'pps', label: 'Pre-production Sample (PPS)', label_cn: '产前样' },
  { value: 'dupro', label: 'During Production (DUPRO)', label_cn: '中期检验' },
  { value: 'final', label: 'Final Inspection', label_cn: '最终检验' },
];

export const AQL_LEVELS = [
  { value: 'S1', label: 'S1 - Special 1' },
  { value: 'S2', label: 'S2 - Special 2' },
  { value: 'S3', label: 'S3 - Special 3' },
  { value: 'S4', label: 'S4 - Special 4' },
  { value: 'G1', label: 'G1 - General 1' },
  { value: 'G2', label: 'G2 - General 2' },
  { value: 'G3', label: 'G3 - General 3' },
];

export const CONCLUSION_OPTIONS = [
  { value: 'accepted', label: 'Accepted / 合格', label_cn: '合格', color: 'bg-green-500' },
  { value: 'rejected', label: 'Rejected / 拒收', label_cn: '拒收', color: 'bg-red-500' },
  { value: 'pending_rework', label: 'Pending Rework / 待返工', label_cn: '待返工', color: 'bg-orange-500' },
  { value: 'conditional', label: 'Conditional Accept / 有条件接收', label_cn: '有条件接收', color: 'bg-yellow-500' },
];

export function useQCInspections(filters?: {
  status?: string;
  poId?: string;
  orderId?: string;
}) {
  return useQuery({
    queryKey: ['qc-inspections', filters],
    queryFn: async () => {
      let query = supabase
        .from('qc_inspections')
        .select(`
          *,
          order:orders(id, order_number, customer:customers(company_name)),
          purchase_order:purchase_orders(id, po_number, supplier:suppliers(supplier_name))
        `)
        .order('created_at', { ascending: false });

      if (filters?.status && filters.status !== 'all') {
        query = query.eq('status', filters.status);
      }
      if (filters?.poId) {
        query = query.eq('po_id', filters.poId);
      }
      if (filters?.orderId) {
        query = query.eq('order_id', filters.orderId);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as QCInspection[];
    },
  });
}

export function useQCInspection(id: string | undefined) {
  return useQuery({
    queryKey: ['qc-inspection', id],
    queryFn: async () => {
      if (!id) return null;
      
      const { data, error } = await supabase
        .from('qc_inspections')
        .select(`
          *,
          order:orders(
            id, order_number, total_value, currency, trade_term,
            customer:customers(company_name, contact_person, email, street, city, country),
            order_items(*)
          ),
          purchase_order:purchase_orders(
            id, po_number, total_value, currency,
            supplier:suppliers(supplier_name, contact_person, email, street, city, country)
          )
        `)
        .eq('id', id)
        .single();
      
      if (error) throw error;

      // Fetch inspection items
      const { data: items, error: itemsError } = await supabase
        .from('qc_inspection_items')
        .select('*')
        .eq('inspection_id', id)
        .order('created_at', { ascending: true });

      if (itemsError) throw itemsError;

      return { ...data, inspection_items: items } as QCInspection;
    },
    enabled: !!id,
  });
}

export function useCreateQCInspection() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: Omit<TablesInsert<'qc_inspections'>, 'id'>) => {
      const { data: inspection, error } = await supabase
        .from('qc_inspections')
        .insert(data)
        .select()
        .single();
      
      if (error) throw error;
      return inspection;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['qc-inspections'] });
    },
  });
}

export function useUpdateQCInspection() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...data }: TablesUpdate<'qc_inspections'> & { id: string }) => {
      const { error } = await supabase
        .from('qc_inspections')
        .update(data)
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['qc-inspections'] });
      queryClient.invalidateQueries({ queryKey: ['qc-inspection', variables.id] });
    },
  });
}

// Inspection Items hooks
export function useCreateInspectionItem() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: {
      inspection_id: string;
      check_category: string;
      check_name: string;
      check_name_cn?: string;
      requirement?: string;
      requirement_cn?: string;
      result?: string;
    }) => {
      const { data: item, error } = await supabase
        .from('qc_inspection_items')
        .insert(data)
        .select()
        .single();
      
      if (error) throw error;
      return item;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['qc-inspection', variables.inspection_id] });
    },
  });
}

export function useUpdateInspectionItem() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, inspection_id, ...data }: {
      id: string;
      inspection_id: string;
      result?: string;
      finding?: string;
      finding_cn?: string;
      corrective_action?: string;
      corrective_action_cn?: string;
      photo_urls?: string[];
    }) => {
      const { error } = await supabase
        .from('qc_inspection_items')
        .update({ ...data, updated_at: new Date().toISOString() })
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['qc-inspection', variables.inspection_id] });
    },
  });
}

export function useDeleteInspectionItem() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, inspection_id }: { id: string; inspection_id: string }) => {
      const { error } = await supabase
        .from('qc_inspection_items')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['qc-inspection', variables.inspection_id] });
    },
  });
}

// Default inspection checklist templates
export const DEFAULT_INSPECTION_CHECKS = [
  // Appearance
  { category: 'appearance', name: 'Overall Appearance', name_cn: '整体外观', requirement: 'No scratches, dents, stains or defects', requirement_cn: '无划痕、凹痕、污渍或缺陷' },
  { category: 'appearance', name: 'Color Consistency', name_cn: '颜色一致性', requirement: 'Color matches approved sample', requirement_cn: '颜色与批准样品一致' },
  { category: 'appearance', name: 'Logo/Printing', name_cn: '标志/印刷', requirement: 'Logo placement and quality correct', requirement_cn: '标志位置和质量正确' },
  
  // Function
  { category: 'function', name: 'Core Function Test', name_cn: '核心功能测试', requirement: 'All main functions work properly', requirement_cn: '所有主要功能正常工作' },
  { category: 'function', name: 'Zipper/Closure Test', name_cn: '拉链/闭合测试', requirement: 'Open/close 10 times smoothly', requirement_cn: '顺畅开合10次' },
  { category: 'function', name: 'Handle/Strap Test', name_cn: '手柄/肩带测试', requirement: 'Load test 2 minutes no damage', requirement_cn: '负重测试2分钟无损坏' },
  
  // Measurement
  { category: 'measurement', name: 'Dimensions', name_cn: '尺寸', requirement: 'Within ±2% of specification', requirement_cn: '在规格±2%范围内' },
  { category: 'measurement', name: 'Weight', name_cn: '重量', requirement: 'Within ±5% of specification', requirement_cn: '在规格±5%范围内' },
  
  // Safety
  { category: 'safety', name: 'Sharp Edges', name_cn: '锐边检查', requirement: 'No sharp edges or points', requirement_cn: '无锐边或尖角' },
  { category: 'safety', name: 'Odor Check', name_cn: '气味检查', requirement: 'No unpleasant odors', requirement_cn: '无不良气味' },
  
  // Packaging
  { category: 'packaging', name: 'Carton Quality', name_cn: '纸箱质量', requirement: 'Cartons sturdy, no damage', requirement_cn: '纸箱坚固，无损坏' },
  { category: 'packaging', name: 'Labels/Markings', name_cn: '标签/标记', requirement: 'Shipping marks correct', requirement_cn: '运输标记正确' },
  { category: 'packaging', name: 'Packing Method', name_cn: '包装方式', requirement: 'Products properly protected', requirement_cn: '产品妥善保护' },
];
