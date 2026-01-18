import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-wecom-token, x-wecom-signature',
}

interface WeComMessage {
  supplier_id: string
  token: string
  content: string
  from_user?: string
  timestamp?: string
}

// Message patterns the factory can send
const MESSAGE_PATTERNS = {
  CONFIRMED: /^CONFIRMED\s+(PO-[\w-]+)/i,
  PRODUCTION_START: /^PRODUCTION_START\s+(PO-[\w-]+)/i,
  PRODUCTION_COMPLETE: /^PRODUCTION_COMPLETE\s+(PO-[\w-]+)/i,
  QC_PASS: /^QC_PASS\s+(PO-[\w-]+)/i,
  QC_FAIL: /^QC_FAIL\s+(PO-[\w-]+)(?:\s+(.+))?/i,
  SHIPPED: /^SHIPPED\s+(PO-[\w-]+)(?:\s+(.+))?/i,
  DELAY: /^DELAY\s+(PO-[\w-]+)\s+(\d+)(?:\s+(.+))?/i,
}

// Map actions to PO status updates
const ACTION_STATUS_MAP: Record<string, { status?: string, field?: string, value?: unknown }> = {
  CONFIRMED: { field: 'factory_confirmed_at', value: 'NOW' },
  PRODUCTION_START: { status: 'in_production', field: 'production_started_at', value: 'NOW' },
  PRODUCTION_COMPLETE: { status: 'production_complete', field: 'production_completed_at', value: 'NOW' },
  QC_PASS: { field: 'factory_qc_status', value: 'passed' },
  QC_FAIL: { field: 'factory_qc_status', value: 'failed' },
  SHIPPED: { status: 'shipped', field: 'shipped_at', value: 'NOW' },
}

// Map actions to team mentions
const ACTION_MENTIONS: Record<string, string[]> = {
  CONFIRMED: ['purchase_manager'],
  PRODUCTION_START: ['project_manager'],
  PRODUCTION_COMPLETE: ['quality_team', 'logistics'],
  QC_PASS: ['logistics', 'customer_service'],
  QC_FAIL: ['quality_team', 'production_manager', 'project_manager'],
  SHIPPED: ['logistics', 'customer_service'],
  DELAY: ['project_manager', 'customer_service', 'sales_manager'],
}

function parseMessage(content: string): { action: string | null, poNumber: string | null, extra: string | null } {
  const trimmed = content.trim().toUpperCase()
  
  for (const [action, pattern] of Object.entries(MESSAGE_PATTERNS)) {
    const match = content.trim().match(pattern)
    if (match) {
      return {
        action,
        poNumber: match[1],
        extra: match[2] || match[3] || null
      }
    }
  }
  
  return { action: null, poNumber: null, extra: null }
}

function formatActionMessage(action: string, poNumber: string, extra: string | null, supplierName: string): string {
  const messages: Record<string, string> = {
    CONFIRMED: `🏭 **工厂确认** - ${supplierName}\n\n订单 \`${poNumber}\` 已确认接收。`,
    PRODUCTION_START: `🔧 **开始生产** - ${supplierName}\n\n订单 \`${poNumber}\` 已开始生产。`,
    PRODUCTION_COMPLETE: `✅ **生产完成** - ${supplierName}\n\n订单 \`${poNumber}\` 生产已完成，等待质检。`,
    QC_PASS: `✅ **质检通过** - ${supplierName}\n\n订单 \`${poNumber}\` 质检通过，可以发货。`,
    QC_FAIL: `❌ **质检失败** - ${supplierName}\n\n订单 \`${poNumber}\` 质检未通过。\n${extra ? `原因: ${extra}` : ''}`,
    SHIPPED: `🚚 **已发货** - ${supplierName}\n\n订单 \`${poNumber}\` 已发货。\n${extra ? `运单号: ${extra}` : ''}`,
    DELAY: `⚠️ **生产延期** - ${supplierName}\n\n订单 \`${poNumber}\` 延期 ${extra} 天。`,
  }
  
  return messages[action] || `📩 工厂消息 - ${supplierName}: ${action}`
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

    const body: WeComMessage = await req.json()
    const { supplier_id, token, content, from_user, timestamp } = body

    console.log(`[wecom-receive] Received message from supplier ${supplier_id}`)
    console.log(`[wecom-receive] Content: ${content}`)

    // Validate supplier and token
    const { data: supplier, error: supplierError } = await supabase
      .from('suppliers')
      .select('id, name, wecom_webhook_token')
      .eq('id', supplier_id)
      .single()

    if (supplierError || !supplier) {
      console.error('[wecom-receive] Supplier not found:', supplierError)
      return new Response(
        JSON.stringify({ error: 'Supplier not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Verify token
    if (token !== supplier.wecom_webhook_token) {
      console.error('[wecom-receive] Invalid token')
      return new Response(
        JSON.stringify({ error: 'Invalid token' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Parse the message
    const { action, poNumber, extra } = parseMessage(content)
    
    console.log(`[wecom-receive] Parsed: action=${action}, poNumber=${poNumber}, extra=${extra}`)

    // Create initial message record
    const { data: messageRecord, error: insertError } = await supabase
      .from('wecom_messages')
      .insert({
        direction: 'inbound',
        supplier_id,
        message_type: action || 'unknown',
        content,
        status: 'pending',
        parsed_action: action,
        parsed_data: { poNumber, extra, from_user, timestamp },
        metadata: { raw_content: content, from_user, received_at: new Date().toISOString() }
      })
      .select()
      .single()

    if (insertError) {
      console.error('[wecom-receive] Failed to create message record:', insertError)
    }

    let poId: string | null = null
    let orderId: string | null = null
    let processed = false

    // If we have a valid action and PO number, update the PO
    if (action && poNumber) {
      // Find the PO
      const { data: po, error: poError } = await supabase
        .from('purchase_orders')
        .select('id, order_id, status, assigned_team')
        .eq('po_number', poNumber)
        .single()

      if (po && !poError) {
        poId = po.id
        orderId = po.order_id

        // Build update object
        const updateData: Record<string, unknown> = {
          last_factory_message_at: new Date().toISOString()
        }

        const actionConfig = ACTION_STATUS_MAP[action]
        if (actionConfig) {
          if (actionConfig.status) {
            updateData.status = actionConfig.status
          }
          if (actionConfig.field) {
            updateData[actionConfig.field] = actionConfig.value === 'NOW' 
              ? new Date().toISOString() 
              : actionConfig.value
          }
        }

        // Handle special cases
        if (action === 'SHIPPED' && extra) {
          updateData.factory_tracking_number = extra
        }
        if (action === 'QC_FAIL' && extra) {
          updateData.factory_qc_status = `failed: ${extra}`
        }

        // Update the PO
        const { error: updateError } = await supabase
          .from('purchase_orders')
          .update(updateData)
          .eq('id', poId)

        if (updateError) {
          console.error('[wecom-receive] Failed to update PO:', updateError)
        } else {
          processed = true
          console.log(`[wecom-receive] Updated PO ${poNumber} with:`, updateData)
        }

        // Create an entity update for team visibility
        const formattedMessage = formatActionMessage(action, poNumber, extra, supplier.name)
        
        // Get team members to mention based on action
        const mentionRoles = ACTION_MENTIONS[action] || []
        let mentionUserIds: string[] = []
        
        if (mentionRoles.length > 0 && po.assigned_team?.length) {
          // Use assigned team from PO
          mentionUserIds = po.assigned_team
        }

        // Get a system user ID for the author (first admin or use service)
        const { data: adminUser } = await supabase
          .from('user_roles')
          .select('user_id')
          .eq('role', 'super_admin')
          .limit(1)
          .single()

        if (adminUser) {
          const { data: entityUpdate, error: updateInsertError } = await supabase
            .from('entity_updates')
            .insert({
              entity_type: 'purchase_order',
              entity_id: poId,
              author_id: adminUser.user_id,
              content: formattedMessage,
              mentions: mentionUserIds.length > 0 ? mentionUserIds : null,
              is_supplier_visible: true,
              attachments: null
            })
            .select()
            .single()

          if (entityUpdate && !updateInsertError) {
            // Link entity update to message
            await supabase
              .from('wecom_messages')
              .update({ 
                entity_update_id: entityUpdate.id,
                entity_type: 'purchase_order',
                entity_id: poId
              })
              .eq('id', messageRecord?.id)

            // Create notifications for mentioned users
            if (mentionUserIds.length > 0) {
              const notifications = mentionUserIds.map(userId => ({
                user_id: userId,
                type: 'wecom',
                title: `工厂消息: ${action}`,
                message: `${supplier.name} - ${poNumber}`,
                entity_type: 'purchase_order',
                entity_id: poId,
                action_url: `/dashboard/purchase-orders/${poId}`
              }))

              await supabase.from('notifications').insert(notifications)
            }
          }
        }
      } else {
        console.log(`[wecom-receive] PO not found: ${poNumber}`)
      }
    }

    // Update message status
    if (messageRecord) {
      await supabase
        .from('wecom_messages')
        .update({
          status: processed ? 'delivered' : 'read',
          processed_at: processed ? new Date().toISOString() : null,
          entity_type: poId ? 'purchase_order' : null,
          entity_id: poId
        })
        .eq('id', messageRecord.id)
    }

    return new Response(
      JSON.stringify({
        success: true,
        message_id: messageRecord?.id,
        processed,
        action,
        po_number: poNumber,
        po_id: poId
      }),
      { 
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )

  } catch (error) {
    console.error('[wecom-receive] Error:', error)
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})