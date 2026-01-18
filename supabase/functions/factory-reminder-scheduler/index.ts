import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface ReminderRule {
  status: string
  daysThreshold: number
  messageType: string
  field: string // The date field to check against
}

// Define reminder rules based on PO status and time thresholds
const REMINDER_RULES: ReminderRule[] = [
  // PO sent but not confirmed after 3 days
  { status: 'sent', daysThreshold: 3, messageType: 'production_reminder', field: 'created_at' },
  
  // PO confirmed but production not started after 2 days
  { status: 'confirmed', daysThreshold: 2, messageType: 'production_start_reminder', field: 'factory_confirmed_at' },
  
  // In production - weekly progress check (every 7 days)
  { status: 'production', daysThreshold: 7, messageType: 'production_progress_check', field: 'production_started_at' },
  
  // 7 days before delivery date - send deadline warning
  { status: 'production', daysThreshold: -7, messageType: 'production_deadline_warning', field: 'delivery_date' },
  
  // Overdue - delivery date passed
  { status: 'production', daysThreshold: 0, messageType: 'production_overdue', field: 'delivery_date' },
]

function daysBetween(date1: Date, date2: Date): number {
  const oneDay = 24 * 60 * 60 * 1000
  return Math.round((date1.getTime() - date2.getTime()) / oneDay)
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    console.log('[factory-reminder-scheduler] Starting daily reminder check...')

    const today = new Date()
    const remindersSent: Array<{ po_number: string; message_type: string }> = []
    const errors: Array<{ po_number: string; error: string }> = []

    // Fetch all active POs with supplier info
    const { data: purchaseOrders, error: poError } = await supabase
      .from('purchase_orders')
      .select(`
        id,
        po_number,
        status,
        created_at,
        factory_confirmed_at,
        production_started_at,
        delivery_date,
        last_factory_message_at,
        total_value,
        currency,
        supplier_id
      `)
      .in('status', ['sent', 'confirmed', 'production'])
      .not('supplier_id', 'is', null)

    if (poError) {
      console.error('[factory-reminder-scheduler] Failed to fetch POs:', poError)
      throw poError
    }

    console.log(`[factory-reminder-scheduler] Found ${purchaseOrders?.length || 0} active POs to check`)

    // Fetch suppliers with WeCom configured
    const supplierIds = [...new Set((purchaseOrders || []).map(po => po.supplier_id).filter(Boolean))]
    
    const { data: suppliers } = await supabase
      .from('suppliers')
      .select('id, supplier_name, wecom_webhook_url, wecom_integration_status')
      .in('id', supplierIds)
      .not('wecom_webhook_url', 'is', null)

    const supplierMap = new Map((suppliers || []).map(s => [s.id, s]))

    for (const po of purchaseOrders || []) {
      const supplier = supplierMap.get(po.supplier_id)
      
      // Skip if supplier doesn't have WeCom configured
      if (!supplier || !supplier.wecom_webhook_url || supplier.wecom_integration_status === 'failed') {
        continue
      }

      // Check if we sent a reminder recently (within 24 hours) to avoid spam
      if (po.last_factory_message_at) {
        const lastMessageDate = new Date(po.last_factory_message_at)
        const hoursSinceLastMessage = (today.getTime() - lastMessageDate.getTime()) / (1000 * 60 * 60)
        if (hoursSinceLastMessage < 24) {
          console.log(`[factory-reminder-scheduler] Skipping ${po.po_number} - message sent ${hoursSinceLastMessage.toFixed(1)} hours ago`)
          continue
        }
      }

      // Find applicable reminder rule
      for (const rule of REMINDER_RULES) {
        if (po.status !== rule.status) continue

        const checkDate = po[rule.field as keyof typeof po] as string | null
        if (!checkDate) continue

        const referenceDate = new Date(checkDate)
        const daysDiff = daysBetween(today, referenceDate)

        let shouldSendReminder = false
        let metadata: Record<string, unknown> = {
          po_number: po.po_number,
          total_value: po.total_value,
          currency: po.currency,
          delivery_date: po.delivery_date,
        }

        // For deadline warnings, check if we're within the threshold days BEFORE delivery
        if (rule.messageType === 'production_deadline_warning') {
          // daysDiff will be negative if today is before delivery_date
          const daysRemaining = -daysDiff
          if (daysRemaining > 0 && daysRemaining <= 7) {
            shouldSendReminder = true
            metadata.days_remaining = daysRemaining
          }
        }
        // For overdue, check if delivery date has passed
        else if (rule.messageType === 'production_overdue') {
          if (daysDiff > 0) {
            shouldSendReminder = true
            metadata.days_overdue = daysDiff
          }
        }
        // For other reminders, check if enough days have passed
        else {
          if (daysDiff >= rule.daysThreshold) {
            shouldSendReminder = true
            metadata.days_since_created = daysDiff
            if (rule.messageType === 'production_progress_check') {
              metadata.days_in_production = daysDiff
            }
          }
        }

        if (shouldSendReminder) {
          console.log(`[factory-reminder-scheduler] Sending ${rule.messageType} for ${po.po_number}`)

          try {
            // Call wecom-send function
            const { data: sendResult, error: sendError } = await supabase.functions.invoke('wecom-send', {
              body: {
                supplier_id: po.supplier_id,
                message_type: rule.messageType,
                entity_type: 'purchase_order',
                entity_id: po.id,
                metadata
              }
            })

            if (sendError) {
              console.error(`[factory-reminder-scheduler] Failed to send reminder for ${po.po_number}:`, sendError)
              errors.push({ po_number: po.po_number, error: sendError.message })
            } else if (sendResult?.success) {
              remindersSent.push({ po_number: po.po_number, message_type: rule.messageType })
            } else {
              errors.push({ po_number: po.po_number, error: sendResult?.error_message || 'Unknown error' })
            }
          } catch (err) {
            console.error(`[factory-reminder-scheduler] Exception sending reminder for ${po.po_number}:`, err)
            errors.push({ po_number: po.po_number, error: err instanceof Error ? err.message : 'Unknown error' })
          }

          // Only send one reminder per PO per day
          break
        }
      }
    }

    console.log(`[factory-reminder-scheduler] Completed. Sent ${remindersSent.length} reminders, ${errors.length} errors`)

    return new Response(
      JSON.stringify({
        success: true,
        reminders_sent: remindersSent.length,
        reminders: remindersSent,
        errors_count: errors.length,
        errors: errors,
        checked_at: today.toISOString()
      }),
      { 
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )

  } catch (error) {
    console.error('[factory-reminder-scheduler] Error:', error)
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
