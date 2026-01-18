import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface DepartmentData {
  finance?: any;
  orders?: any;
  sales?: any;
  logistics?: any;
  qc?: any;
  sourcing?: any;
  hr?: any;
}

interface Alert {
  id: string;
  type: 'critical' | 'urgent' | 'warning' | 'info';
  department: string;
  title: string;
  message: string;
  action?: string;
  actionUrl?: string;
  data?: any;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { department = 'all', aggressiveness = 'aggressive' } = await req.json();
    
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const threeDaysAgo = new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000);

    const alerts: Alert[] = [];
    const departmentScores: Record<string, number> = {};
    const departmentData: DepartmentData = {};

    // FINANCE ANALYSIS
    if (department === 'all' || department === 'finance') {
      const [paymentsRes, expensesRes, salariesRes, bankRes] = await Promise.all([
        supabase.from('financial_records').select('*').eq('type', 'customer_payment'),
        supabase.from('financial_records').select('*, category:expense_categories(name)').eq('type', 'expense'),
        supabase.from('financial_records').select('*, employee:employees(full_name)').eq('type', 'salary'),
        supabase.from('bank_accounts').select('*').eq('is_active', true),
      ]);

      const [ordersWithPayment] = await Promise.all([
        supabase.from('orders').select('id, order_number, customer:customers(company_name), total_value, customer_deposit_amount, customer_balance_amount, customer_payment_status, created_at'),
      ]);

      // Check overdue payments
      const overdueOrders = (ordersWithPayment.data || []).filter((o: any) => {
        if (o.customer_payment_status === 'paid') return false;
        const createdDate = new Date(o.created_at);
        const daysSinceCreated = Math.floor((now.getTime() - createdDate.getTime()) / (1000 * 60 * 60 * 24));
        return daysSinceCreated > 7 && (!o.customer_deposit_amount || o.customer_deposit_amount === 0);
      });

      overdueOrders.forEach((order: any) => {
        const daysSinceCreated = Math.floor((now.getTime() - new Date(order.created_at).getTime()) / (1000 * 60 * 60 * 24));
        const amount = order.total_value || 0;
        
        if (daysSinceCreated > 30) {
          alerts.push({
            id: `finance-overdue-${order.id}`,
            type: 'critical',
            department: 'finance',
            title: '🚨 CRITICAL OVERDUE PAYMENT',
            message: `${order.customer?.company_name || 'Customer'} owes $${amount.toLocaleString()} - ${daysSinceCreated} DAYS OVERDUE! CALL NOW!`,
            action: 'Call Customer',
            actionUrl: `/dashboard/orders/${order.id}`,
            data: { orderId: order.id, amount, days: daysSinceCreated }
          });
        } else if (daysSinceCreated > 14) {
          alerts.push({
            id: `finance-overdue-${order.id}`,
            type: 'urgent',
            department: 'finance',
            title: '⚠️ URGENT: Payment Overdue',
            message: `${order.customer?.company_name || 'Customer'} - $${amount.toLocaleString()} pending ${daysSinceCreated} days. Follow up TODAY!`,
            action: 'Send Reminder',
            actionUrl: `/dashboard/orders/${order.id}`,
            data: { orderId: order.id, amount, days: daysSinceCreated }
          });
        }
      });

      // Check unpaid salaries
      const currentMonth = now.toISOString().slice(0, 7);
      const { data: employees } = await supabase.from('employees').select('*').eq('status', 'active');
      const paidThisMonth = (salariesRes.data || []).filter((s: any) => s.salary_month === currentMonth);
      const unpaidCount = (employees?.length || 0) - paidThisMonth.length;
      
      if (unpaidCount > 0 && now.getDate() > 5) {
        alerts.push({
          id: 'finance-unpaid-salaries',
          type: now.getDate() > 15 ? 'critical' : 'urgent',
          department: 'finance',
          title: now.getDate() > 15 ? '🚨 SALARIES UNPAID!' : '💰 Pending Salaries',
          message: `${unpaidCount} employee(s) awaiting ${currentMonth} salary - PAY IMMEDIATELY!`,
          action: 'Pay Salaries',
          actionUrl: '/dashboard/finance/salaries',
          data: { unpaidCount, month: currentMonth }
        });
      }

      // Calculate bank balance
      const totalBalance = (bankRes.data || []).reduce((sum: number, acc: any) => sum + (acc.current_balance || 0), 0);
      if (totalBalance < 10000) {
        alerts.push({
          id: 'finance-low-cash',
          type: 'critical',
          department: 'finance',
          title: '📉 CRITICAL: Low Cash Balance',
          message: `Total balance only $${totalBalance.toLocaleString()} - DELAY non-essential purchases!`,
          action: 'Review Cash Flow',
          actionUrl: '/dashboard/finance',
          data: { balance: totalBalance }
        });
      }

      // Calculate score
      let financeScore = 100;
      financeScore -= overdueOrders.length * 10;
      financeScore -= unpaidCount * 5;
      if (totalBalance < 10000) financeScore -= 20;
      departmentScores.finance = Math.max(0, Math.min(100, financeScore));

      departmentData.finance = {
        overduePayments: overdueOrders.length,
        overdueAmount: overdueOrders.reduce((sum: number, o: any) => sum + (o.total_value || 0), 0),
        unpaidSalaries: unpaidCount,
        totalBalance,
        expensesThisMonth: (expensesRes.data || []).filter((e: any) => e.date?.startsWith(currentMonth)).reduce((sum: number, e: any) => sum + (e.amount || 0), 0),
      };
    }

    // ORDERS ANALYSIS
    if (department === 'all' || department === 'orders') {
      const { data: orders } = await supabase
        .from('orders')
        .select('*, customer:customers(company_name), purchase_orders(id)')
        .neq('status', 'delivered')
        .neq('status', 'cancelled');

      const { data: purchaseOrders } = await supabase
        .from('purchase_orders')
        .select('*')
        .neq('status', 'shipped')
        .neq('status', 'cancelled');

      // Orders without PO
      const ordersWithoutPO = (orders || []).filter((o: any) => 
        (!o.purchase_orders || o.purchase_orders.length === 0) && o.status !== 'quotation'
      );

      ordersWithoutPO.forEach((order: any) => {
        const daysSinceCreated = Math.floor((now.getTime() - new Date(order.created_at).getTime()) / (1000 * 60 * 60 * 24));
        if (daysSinceCreated > 3) {
          alerts.push({
            id: `orders-no-po-${order.id}`,
            type: daysSinceCreated > 7 ? 'critical' : 'urgent',
            department: 'orders',
            title: '🚨 ORDER WITHOUT PO!',
            message: `Order ${order.order_number} for ${order.customer?.company_name || 'Customer'} - NO PURCHASE ORDER created for ${daysSinceCreated} days!`,
            action: 'Create PO',
            actionUrl: `/dashboard/purchase-orders/new?orderId=${order.id}`,
            data: { orderId: order.id, days: daysSinceCreated }
          });
        }
      });

      // Stuck orders (same status too long)
      const stuckOrders = (orders || []).filter((o: any) => {
        const updatedDate = new Date(o.updated_at);
        const daysSinceUpdate = Math.floor((now.getTime() - updatedDate.getTime()) / (1000 * 60 * 60 * 24));
        return daysSinceUpdate > 7 && o.status !== 'quotation';
      });

      stuckOrders.forEach((order: any) => {
        const daysSinceUpdate = Math.floor((now.getTime() - new Date(order.updated_at).getTime()) / (1000 * 60 * 60 * 24));
        alerts.push({
          id: `orders-stuck-${order.id}`,
          type: 'warning',
          department: 'orders',
          title: '⏰ Order Stuck',
          message: `Order ${order.order_number} in "${order.status}" for ${daysSinceUpdate} days - CHECK STATUS!`,
          action: 'View Order',
          actionUrl: `/dashboard/orders/${order.id}`,
          data: { orderId: order.id, status: order.status, days: daysSinceUpdate }
        });
      });

      // Orders approaching deadline
      const urgentDeadlines = (orders || []).filter((o: any) => {
        if (!o.delivery_date) return false;
        const deliveryDate = new Date(o.delivery_date);
        const daysUntilDeadline = Math.floor((deliveryDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
        return daysUntilDeadline > 0 && daysUntilDeadline <= 7;
      });

      if (urgentDeadlines.length > 0) {
        alerts.push({
          id: 'orders-deadline-warning',
          type: 'urgent',
          department: 'orders',
          title: '⚠️ Deadlines Approaching',
          message: `${urgentDeadlines.length} order(s) due within 7 days - Confirm shipping status NOW!`,
          action: 'View Orders',
          actionUrl: '/dashboard/orders?status=in_production',
          data: { count: urgentDeadlines.length }
        });
      }

      let ordersScore = 100;
      ordersScore -= ordersWithoutPO.length * 15;
      ordersScore -= stuckOrders.length * 5;
      ordersScore -= urgentDeadlines.length * 3;
      departmentScores.orders = Math.max(0, Math.min(100, ordersScore));

      departmentData.orders = {
        totalActive: (orders || []).length,
        withoutPO: ordersWithoutPO.length,
        stuck: stuckOrders.length,
        urgentDeadlines: urgentDeadlines.length,
        pendingPOs: (purchaseOrders || []).filter((po: any) => po.status === 'pending').length,
      };
    }

    // SALES ANALYSIS
    if (department === 'all' || department === 'sales') {
      const { data: leads } = await supabase
        .from('leads')
        .select('*')
        .neq('status', 'converted')
        .neq('status', 'lost');

      const { data: quotations } = await supabase
        .from('quotations')
        .select('*, customer:customers(company_name), lead:leads(company_name)')
        .neq('status', 'accepted')
        .neq('status', 'rejected');

      // Cold leads
      const coldLeads = (leads || []).filter((l: any) => {
        const updatedDate = new Date(l.updated_at);
        const daysSinceUpdate = Math.floor((now.getTime() - updatedDate.getTime()) / (1000 * 60 * 60 * 24));
        return daysSinceUpdate > 3;
      });

      coldLeads.forEach((lead: any) => {
        const daysSinceUpdate = Math.floor((now.getTime() - new Date(lead.updated_at).getTime()) / (1000 * 60 * 60 * 24));
        if (daysSinceUpdate > 7) {
          alerts.push({
            id: `sales-cold-lead-${lead.id}`,
            type: 'urgent',
            department: 'sales',
            title: '❄️ LEAD GOING COLD!',
            message: `${lead.company_name} - No contact for ${daysSinceUpdate} days! CALL NOW before they go to competition!`,
            action: 'Contact Lead',
            actionUrl: '/dashboard/leads',
            data: { leadId: lead.id, days: daysSinceUpdate, score: lead.score }
          });
        }
      });

      // New leads not contacted
      const newLeads = (leads || []).filter((l: any) => {
        const createdDate = new Date(l.created_at);
        const hoursSinceCreated = (now.getTime() - createdDate.getTime()) / (1000 * 60 * 60);
        return hoursSinceCreated > 24 && l.status === 'new';
      });

      newLeads.forEach((lead: any) => {
        alerts.push({
          id: `sales-new-lead-${lead.id}`,
          type: 'critical',
          department: 'sales',
          title: '🔥 NEW LEAD WAITING!',
          message: `${lead.company_name} waiting for contact! First response wins - CALL NOW!`,
          action: 'Call Now',
          actionUrl: '/dashboard/leads',
          data: { leadId: lead.id }
        });
      });

      // Quotations pending response
      const pendingQuotes = (quotations || []).filter((q: any) => {
        if (q.status !== 'sent') return false;
        const sentDate = new Date(q.sent_at || q.created_at);
        const daysSinceSent = Math.floor((now.getTime() - sentDate.getTime()) / (1000 * 60 * 60 * 24));
        return daysSinceSent > 3;
      });

      pendingQuotes.forEach((quote: any) => {
        const daysSinceSent = Math.floor((now.getTime() - new Date(quote.sent_at || quote.created_at).getTime()) / (1000 * 60 * 60 * 24));
        alerts.push({
          id: `sales-quote-${quote.id}`,
          type: daysSinceSent > 7 ? 'urgent' : 'warning',
          department: 'sales',
          title: '📧 Quote Needs Follow-up',
          message: `Quote ${quote.quotation_number} ($${(quote.total_value || 0).toLocaleString()}) sent ${daysSinceSent} days ago - FOLLOW UP!`,
          action: 'Follow Up',
          actionUrl: '/dashboard/quotations',
          data: { quoteId: quote.id, value: quote.total_value, days: daysSinceSent }
        });
      });

      let salesScore = 100;
      salesScore -= newLeads.length * 20;
      salesScore -= coldLeads.length * 5;
      salesScore -= pendingQuotes.length * 5;
      departmentScores.sales = Math.max(0, Math.min(100, salesScore));

      departmentData.sales = {
        totalLeads: (leads || []).length,
        newLeads: newLeads.length,
        coldLeads: coldLeads.length,
        pendingQuotes: pendingQuotes.length,
        pipelineValue: (quotations || []).reduce((sum: number, q: any) => sum + (q.total_value || 0), 0),
      };
    }

    // LOGISTICS ANALYSIS
    if (department === 'all' || department === 'logistics') {
      const { data: shipments } = await supabase
        .from('shipments')
        .select('*, customer:customers(company_name)')
        .neq('status', 'delivered')
        .neq('status', 'cancelled');

      // Delayed shipments
      const delayedShipments = (shipments || []).filter((s: any) => {
        if (!s.estimated_delivery) return false;
        const etaDate = new Date(s.estimated_delivery);
        return now > etaDate;
      });

      delayedShipments.forEach((shipment: any) => {
        const daysDelayed = Math.floor((now.getTime() - new Date(shipment.estimated_delivery).getTime()) / (1000 * 60 * 60 * 24));
        alerts.push({
          id: `logistics-delayed-${shipment.id}`,
          type: daysDelayed > 3 ? 'critical' : 'urgent',
          department: 'logistics',
          title: '🚨 SHIPMENT DELAYED!',
          message: `Shipment to ${shipment.customer?.company_name || 'Customer'} delayed ${daysDelayed} days! Contact carrier NOW!`,
          action: 'Track Shipment',
          actionUrl: '/dashboard/shipments',
          data: { shipmentId: shipment.id, days: daysDelayed }
        });
      });

      // Missing tracking
      const noTracking = (shipments || []).filter((s: any) => 
        !s.tracking_number && s.status === 'in_transit'
      );

      if (noTracking.length > 0) {
        alerts.push({
          id: 'logistics-no-tracking',
          type: 'warning',
          department: 'logistics',
          title: '📦 Missing Tracking',
          message: `${noTracking.length} shipment(s) in transit with NO tracking number - UPDATE NOW!`,
          action: 'Add Tracking',
          actionUrl: '/dashboard/shipments',
          data: { count: noTracking.length }
        });
      }

      let logisticsScore = 100;
      logisticsScore -= delayedShipments.length * 15;
      logisticsScore -= noTracking.length * 5;
      departmentScores.logistics = Math.max(0, Math.min(100, logisticsScore));

      departmentData.logistics = {
        totalActive: (shipments || []).length,
        delayed: delayedShipments.length,
        noTracking: noTracking.length,
        inTransit: (shipments || []).filter((s: any) => s.status === 'in_transit').length,
      };
    }

    // QC ANALYSIS
    if (department === 'all' || department === 'qc') {
      const { data: inspections } = await supabase
        .from('qc_inspections')
        .select('*, order:orders(order_number)')
        .neq('status', 'completed');

      const { data: ncrs } = await supabase
        .from('ncr_reports')
        .select('*')
        .neq('status', 'closed');

      const { data: serviceRequests } = await supabase
        .from('customer_service_requests')
        .select('*, customer:customers(company_name)')
        .neq('status', 'resolved')
        .neq('status', 'closed');

      // Overdue inspections
      const overdueInspections = (inspections || []).filter((i: any) => {
        if (!i.scheduled_date) return false;
        const scheduledDate = new Date(i.scheduled_date);
        return now > scheduledDate && i.status === 'scheduled';
      });

      overdueInspections.forEach((inspection: any) => {
        const daysOverdue = Math.floor((now.getTime() - new Date(inspection.scheduled_date).getTime()) / (1000 * 60 * 60 * 24));
        alerts.push({
          id: `qc-overdue-${inspection.id}`,
          type: 'critical',
          department: 'qc',
          title: '🔍 QC INSPECTION OVERDUE!',
          message: `Inspection for ${inspection.order?.order_number || 'Order'} overdue by ${daysOverdue} days - SCHEDULE NOW!`,
          action: 'Schedule',
          actionUrl: `/dashboard/qc/${inspection.id}`,
          data: { inspectionId: inspection.id, days: daysOverdue }
        });
      });

      // Failed inspections
      const failedInspections = (inspections || []).filter((i: any) => i.status === 'failed');
      failedInspections.forEach((inspection: any) => {
        alerts.push({
          id: `qc-failed-${inspection.id}`,
          type: 'critical',
          department: 'qc',
          title: '🚨 QC FAILED!',
          message: `${inspection.order?.order_number || 'Order'} FAILED inspection - STOP SHIPMENT and fix issues!`,
          action: 'View Report',
          actionUrl: `/dashboard/qc/${inspection.id}`,
          data: { inspectionId: inspection.id }
        });
      });

      // Open NCRs
      const urgentNCRs = (ncrs || []).filter((n: any) => {
        const createdDate = new Date(n.created_at);
        const daysSinceCreated = Math.floor((now.getTime() - createdDate.getTime()) / (1000 * 60 * 60 * 24));
        return daysSinceCreated > 7;
      });

      if (urgentNCRs.length > 0) {
        alerts.push({
          id: 'qc-ncr-urgent',
          type: 'urgent',
          department: 'qc',
          title: '⚠️ NCRs Need Attention',
          message: `${urgentNCRs.length} NCR(s) open for 7+ days - RESOLVE or escalate!`,
          action: 'View NCRs',
          actionUrl: '/dashboard/qc/corrective-actions',
          data: { count: urgentNCRs.length }
        });
      }

      // Unresolved service requests
      const urgentServiceRequests = (serviceRequests || []).filter((sr: any) => {
        const createdDate = new Date(sr.created_at);
        const daysSinceCreated = Math.floor((now.getTime() - createdDate.getTime()) / (1000 * 60 * 60 * 24));
        return daysSinceCreated > 3;
      });

      urgentServiceRequests.forEach((sr: any) => {
        const daysSinceCreated = Math.floor((now.getTime() - new Date(sr.created_at).getTime()) / (1000 * 60 * 60 * 24));
        alerts.push({
          id: `qc-service-${sr.id}`,
          type: daysSinceCreated > 7 ? 'critical' : 'urgent',
          department: 'qc',
          title: '📞 Customer Complaint Open',
          message: `${sr.customer?.company_name || 'Customer'} complaint open ${daysSinceCreated} days - RESPOND NOW!`,
          action: 'Respond',
          actionUrl: `/dashboard/service-requests/${sr.id}`,
          data: { requestId: sr.id, days: daysSinceCreated }
        });
      });

      let qcScore = 100;
      qcScore -= overdueInspections.length * 15;
      qcScore -= failedInspections.length * 20;
      qcScore -= urgentNCRs.length * 5;
      qcScore -= urgentServiceRequests.length * 5;
      departmentScores.qc = Math.max(0, Math.min(100, qcScore));

      departmentData.qc = {
        pendingInspections: (inspections || []).filter((i: any) => i.status === 'scheduled').length,
        overdueInspections: overdueInspections.length,
        failedInspections: failedInspections.length,
        openNCRs: (ncrs || []).length,
        openServiceRequests: (serviceRequests || []).length,
      };
    }

    // SOURCING ANALYSIS
    if (department === 'all' || department === 'sourcing') {
      const { data: sourcingProjects } = await supabase
        .from('sourcing_projects')
        .select('*, customer:customers(company_name)')
        .neq('status', 'completed')
        .neq('status', 'cancelled');

      const { data: suppliers } = await supabase
        .from('suppliers')
        .select('*')
        .eq('status', 'active');

      const { data: pendingPOs } = await supabase
        .from('purchase_orders')
        .select('*, supplier:suppliers(name)')
        .eq('status', 'pending');

      // Stalled sourcing projects
      const stalledProjects = (sourcingProjects || []).filter((p: any) => {
        const updatedDate = new Date(p.updated_at);
        const daysSinceUpdate = Math.floor((now.getTime() - updatedDate.getTime()) / (1000 * 60 * 60 * 24));
        return daysSinceUpdate > 7;
      });

      stalledProjects.forEach((project: any) => {
        const daysSinceUpdate = Math.floor((now.getTime() - new Date(project.updated_at).getTime()) / (1000 * 60 * 60 * 24));
        alerts.push({
          id: `sourcing-stalled-${project.id}`,
          type: 'warning',
          department: 'sourcing',
          title: '🔍 Sourcing Project Stalled',
          message: `${project.project_name} - No update for ${daysSinceUpdate} days - Push suppliers!`,
          action: 'View Project',
          actionUrl: `/dashboard/sourcing/${project.id}`,
          data: { projectId: project.id, days: daysSinceUpdate }
        });
      });

      // POs not confirmed
      const unconfirmedPOs = (pendingPOs || []).filter((po: any) => {
        const createdDate = new Date(po.created_at);
        const daysSinceCreated = Math.floor((now.getTime() - createdDate.getTime()) / (1000 * 60 * 60 * 24));
        return daysSinceCreated > 2;
      });

      unconfirmedPOs.forEach((po: any) => {
        const daysSinceCreated = Math.floor((now.getTime() - new Date(po.created_at).getTime()) / (1000 * 60 * 60 * 24));
        alerts.push({
          id: `sourcing-po-${po.id}`,
          type: daysSinceCreated > 5 ? 'critical' : 'urgent',
          department: 'sourcing',
          title: '📋 PO Not Confirmed',
          message: `PO ${po.po_number} to ${po.supplier?.name || 'Supplier'} - Not confirmed for ${daysSinceCreated} days - CALL FACTORY!`,
          action: 'Contact Supplier',
          actionUrl: `/dashboard/purchase-orders/${po.id}`,
          data: { poId: po.id, days: daysSinceCreated }
        });
      });

      let sourcingScore = 100;
      sourcingScore -= stalledProjects.length * 5;
      sourcingScore -= unconfirmedPOs.length * 10;
      departmentScores.sourcing = Math.max(0, Math.min(100, sourcingScore));

      departmentData.sourcing = {
        activeProjects: (sourcingProjects || []).length,
        stalledProjects: stalledProjects.length,
        unconfirmedPOs: unconfirmedPOs.length,
        activeSuppliers: (suppliers || []).length,
      };
    }

    // HR ANALYSIS
    if (department === 'all' || department === 'hr') {
      const { data: employees } = await supabase
        .from('employees')
        .select('*')
        .eq('status', 'active');

      const currentMonth = now.toISOString().slice(0, 7);
      const { data: salaries } = await supabase
        .from('financial_records')
        .select('employee_id')
        .eq('type', 'salary')
        .eq('salary_month', currentMonth);

      const paidEmployeeIds = new Set((salaries || []).map((s: any) => s.employee_id));
      const unpaidEmployees = (employees || []).filter((e: any) => !paidEmployeeIds.has(e.id));

      if (unpaidEmployees.length > 0 && now.getDate() > 5) {
        const totalUnpaidSalary = unpaidEmployees.reduce((sum: number, e: any) => sum + (e.base_salary_usd || 0), 0);
        alerts.push({
          id: 'hr-unpaid-salaries',
          type: now.getDate() > 15 ? 'critical' : 'urgent',
          department: 'hr',
          title: now.getDate() > 15 ? '🚨 SALARIES OVERDUE!' : '💰 Pending Salaries',
          message: `${unpaidEmployees.length} employee(s) unpaid for ${currentMonth} - Total ~$${totalUnpaidSalary.toLocaleString()}. PAY NOW!`,
          action: 'Process Payroll',
          actionUrl: '/dashboard/finance/salaries',
          data: { count: unpaidEmployees.length, total: totalUnpaidSalary }
        });
      }

      let hrScore = 100;
      if (unpaidEmployees.length > 0 && now.getDate() > 5) {
        hrScore -= unpaidEmployees.length * 10;
        if (now.getDate() > 15) hrScore -= 20;
      }
      departmentScores.hr = Math.max(0, Math.min(100, hrScore));

      departmentData.hr = {
        totalEmployees: (employees || []).length,
        unpaidThisMonth: unpaidEmployees.length,
      };
    }

    // Calculate overall score
    const scores = Object.values(departmentScores);
    const overallScore = scores.length > 0 
      ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length)
      : 0;

    // Sort alerts by priority
    const priorityOrder = { critical: 0, urgent: 1, warning: 2, info: 3 };
    alerts.sort((a, b) => priorityOrder[a.type] - priorityOrder[b.type]);

    // Generate AI analysis using Lovable AI
    let aiAnalysis = null;
    if (department === 'all' && alerts.length > 0) {
      try {
        const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
        if (LOVABLE_API_KEY) {
          const criticalCount = alerts.filter(a => a.type === 'critical').length;
          const urgentCount = alerts.filter(a => a.type === 'urgent').length;
          
          const prompt = `You are an aggressive operations commander AI. Analyze this business situation and give 3-5 SHORT, DIRECT action commands (each max 15 words). Be pushy and urgent!

Current Status:
- Overall Score: ${overallScore}%
- Critical Alerts: ${criticalCount}
- Urgent Alerts: ${urgentCount}
- Department Scores: ${JSON.stringify(departmentScores)}

Key Issues:
${alerts.slice(0, 10).map(a => `- [${a.type.toUpperCase()}] ${a.department}: ${a.message}`).join('\n')}

Give commands like a military commander. Use action verbs. Be direct. Format as numbered list.`;

          const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
            method: "POST",
            headers: {
              Authorization: `Bearer ${LOVABLE_API_KEY}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              model: "google/gemini-3-flash-preview",
              messages: [
                { role: "system", content: "You are an aggressive operations commander. Give SHORT, DIRECT orders. Max 15 words per command. Be pushy!" },
                { role: "user", content: prompt }
              ],
            }),
          });

          if (aiResponse.ok) {
            const aiData = await aiResponse.json();
            aiAnalysis = aiData.choices?.[0]?.message?.content;
          }
        }
      } catch (error) {
        console.error("AI analysis error:", error);
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        overallScore,
        departmentScores,
        alerts,
        departmentData,
        aiAnalysis,
        analyzedAt: now.toISOString(),
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Operations advisor error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
