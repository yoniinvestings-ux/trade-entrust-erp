import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface SendRequest {
  supplier_id: string
  message_type: 
    | 'po_created' 
    | 'po_updated' 
    | 'payment_sent' 
    | 'document_shared' 
    | 'general' 
    | 'test'
    // New automated push notification types
    | 'production_reminder'
    | 'production_start_reminder'
    | 'production_progress_check'
    | 'production_deadline_warning'
    | 'production_overdue'
    | 'qc_scheduled'
    | 'shipping_reminder'
    | 'request_shipping_docs'
  entity_type?: string
  entity_id?: string
  content?: string
  metadata?: Record<string, unknown>
}

interface PurchaseOrderData {
  po_number: string
  total_value: number
  currency: string
  delivery_date: string
  payment_terms: string
  notes?: string
  order?: {
    order_number: string
    sourcing_project?: {
      project_title: string
    }
  }
  items?: Array<{
    product_name: string
    product_name_cn?: string
    quantity: number
    unit_price: number
    specifications?: string
  }>
}

// Helper function to format currency with thousands separator
function formatAmount(amount: number | undefined | null, currency: string = 'CNY'): string {
  if (!amount) return `${currency} 0.00`
  return `${currency} ${amount.toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

// Message templates in Chinese
function formatMessage(
  messageType: string,
  supplierName: string,
  data?: PurchaseOrderData | Record<string, unknown>
): string {
  const now = new Date().toLocaleDateString('zh-CN')
  
  switch (messageType) {
    case 'test':
      return `### 🔗 连接测试 - Trade Entrust\n\n**供应商:** ${supplierName}\n**测试时间:** ${now}\n\n✅ 连接成功！您的企业微信已与 Trade Entrust ERP 系统对接。\n\n---\n**回复格式说明:**\n• \`CONFIRMED PO-xxx\` - 确认订单\n• \`PRODUCTION_START PO-xxx\` - 开始生产\n• \`PRODUCTION_COMPLETE PO-xxx\` - 生产完成\n• \`QC_PASS PO-xxx\` - 质检通过\n• \`QC_FAIL PO-xxx [原因]\` - 质检失败\n• \`SHIPPED PO-xxx [运单号]\` - 已发货\n• \`DELAY PO-xxx [天数] [原因]\` - 生产延期`

    case 'po_created':
      const poData = data as PurchaseOrderData
      const projectTitle = poData?.order?.sourcing_project?.project_title || '未指定'
      const itemsList = poData?.items?.map((item, i) => 
        `${i + 1}. ${item.product_name_cn || item.product_name} x ${item.quantity} @ ¥${item.unit_price}`
      ).join('\n') || '详见附件'
      
      return `### 🛒 新采购订单 - ${supplierName}\n\n**订单号:** \`${poData?.po_number}\`\n**项目:** ${projectTitle}\n**客户订单:** ${poData?.order?.order_number || '-'}\n**总金额:** ${poData?.currency || 'CNY'} ${poData?.total_value?.toLocaleString() || 0}\n**交货日期:** ${poData?.delivery_date || '待定'}\n**付款条款:** ${poData?.payment_terms || '待定'}\n\n**产品明细:**\n${itemsList}\n\n${poData?.notes ? `**备注:** ${poData.notes}\n\n` : ''}---\n**请回复确认:**\n\`CONFIRMED ${poData?.po_number}\``

    case 'po_updated':
      const updatedPo = data as PurchaseOrderData
      return `### 📝 订单变更通知 - ${supplierName}\n\n**订单号:** \`${updatedPo?.po_number}\`\n**更新时间:** ${now}\n\n订单信息已更新，请查看最新订单详情。\n\n**如有疑问请回复此消息。**`

    case 'payment_sent': {
      const paymentData = data as Record<string, unknown>
      const amount = paymentData?.amount as number || 0
      const currency = paymentData?.currency as string || 'CNY'
      const paymentType = paymentData?.payment_type as string
      const receiptUrl = paymentData?.receipt_url as string
      
      const formattedAmount = formatAmount(amount, currency)
      const receiptLink = receiptUrl 
        ? `\n\n📎 **[点击查看付款凭证](${receiptUrl})**` 
        : ''
      const paymentLabel = paymentType === 'deposit' ? '定金' : 
                          paymentType === 'balance' ? '尾款' : '付款'
        
      return `### 💰 付款通知 - ${supplierName}\n\n**订单号:** \`${paymentData?.po_number || '-'}\`\n**付款金额:** ${formattedAmount}\n**付款类型:** ${paymentLabel}\n**付款时间:** ${now}\n\n请查收并确认。${receiptLink}\n\n---\n**回复确认:** \`PAYMENT_RECEIVED ${paymentData?.po_number}\``
    }

    case 'document_shared':
      const docData = data as Record<string, unknown>
      return `### 📄 文件分享 - ${supplierName}\n\n**文件名:** ${docData?.file_name || '文件'}\n**类型:** ${docData?.document_type || '文档'}\n**订单号:** \`${docData?.po_number || '-'}\`\n\n请查收附件。`

    // ===== New Automated Push Notification Templates =====
    
    case 'production_reminder': {
      const reminderData = data as Record<string, unknown>
      const daysSinceCreated = reminderData?.days_since_created || 0
      return `### 📢 订单确认提醒 - Trade Entrust\n\n**订单号:** \`${reminderData?.po_number || '-'}\`\n**发送时间:** ${daysSinceCreated}天前\n**订单金额:** ${formatAmount(reminderData?.total_value as number, reminderData?.currency as string)}\n\n您尚未确认此订单，请尽快回复确认。\n\n---\n**请回复:** \`CONFIRMED ${reminderData?.po_number}\``
    }

    case 'production_start_reminder': {
      const startData = data as Record<string, unknown>
      return `### 🏭 生产开始提醒 - Trade Entrust\n\n**订单号:** \`${startData?.po_number || '-'}\`\n**订单金额:** ${formatAmount(startData?.total_value as number, startData?.currency as string)}\n**交货日期:** ${startData?.delivery_date || '待定'}\n\n订单已确认，请开始生产并回复。\n\n---\n**请回复:** \`PRODUCTION_START ${startData?.po_number}\``
    }

    case 'production_progress_check': {
      const progressData = data as Record<string, unknown>
      const daysInProduction = progressData?.days_in_production || 0
      return `### 📊 生产进度查询 - Trade Entrust\n\n**订单号:** \`${progressData?.po_number || '-'}\`\n**生产天数:** ${daysInProduction}天\n**交货日期:** ${progressData?.delivery_date || '待定'}\n\n请更新生产进度:\n• 已完成百分比\n• 预计完成日期\n• 是否有问题\n\n---\n**回复格式:** \`PROGRESS ${progressData?.po_number} [完成%] [备注]\``
    }

    case 'production_deadline_warning': {
      const warningData = data as Record<string, unknown>
      const daysRemaining = warningData?.days_remaining || 0
      return `### ⚠️ 交期临近提醒 - Trade Entrust\n\n**订单号:** \`${warningData?.po_number || '-'}\`\n**交货日期:** ${warningData?.delivery_date}\n**剩余天数:** ${daysRemaining}天\n\n请确认能否按时交货。如有延期风险，请立即回复。\n\n---\n**回复格式:**\n• \`ON_TRACK ${warningData?.po_number}\` - 按时交货\n• \`DELAY ${warningData?.po_number} [天数] [原因]\` - 延期`
    }

    case 'production_overdue': {
      const overdueData = data as Record<string, unknown>
      const daysOverdue = overdueData?.days_overdue || 0
      return `### 🚨 紧急 - 订单已超期！\n\n**订单号:** \`${overdueData?.po_number || '-'}\`\n**原定交期:** ${overdueData?.delivery_date}\n**已超期:** ${daysOverdue}天\n\n请立即回复生产状态和新的预计交货日期！\n\n---\n**请回复:** \`STATUS ${overdueData?.po_number} [状态] [新交期]\``
    }

    case 'qc_scheduled': {
      const qcData = data as Record<string, unknown>
      return `### 📋 质检安排通知 - Trade Entrust\n\n**订单号:** \`${qcData?.po_number || '-'}\`\n**质检日期:** ${qcData?.inspection_date || '待定'}\n**质检类型:** ${qcData?.inspection_type || '成品检验'}\n**检验员:** ${qcData?.inspector || '待定'}\n\n请做好质检准备工作。\n\n---\n**收到请回复:** \`QC_READY ${qcData?.po_number}\``
    }

    case 'shipping_reminder': {
      const shipData = data as Record<string, unknown>
      return `### 🚚 发货提醒 - Trade Entrust\n\n**订单号:** \`${shipData?.po_number || '-'}\`\n**质检状态:** ${shipData?.qc_status || '已通过'}\n\n生产已完成，请尽快安排发货。\n\n---\n**发货后请回复:** \`SHIPPED ${shipData?.po_number} [运单号]\``
    }

    case 'request_shipping_docs': {
      const docsData = data as Record<string, unknown>
      return `### 📄 请提供发货文件 - Trade Entrust\n\n**订单号:** \`${docsData?.po_number || '-'}\`\n\n请提供以下文件:\n• 装箱单 (Packing List)\n• 商业发票 (Commercial Invoice)\n• 运单/提单 (B/L)\n\n可直接发送图片或PDF文件。`
    }

    case 'general':
    default:
      return (data as Record<string, unknown>)?.content as string || '您好，请查看最新消息。'
  }
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

    const body: SendRequest = await req.json()
    const { supplier_id, message_type, entity_type, entity_id, content, metadata } = body

    console.log(`[wecom-send] Processing ${message_type} message for supplier ${supplier_id}`)
    console.log(`[wecom-send] Original metadata:`, JSON.stringify(metadata))

    // Get supplier info including webhook URL
    const { data: supplier, error: supplierError } = await supabase
      .from('suppliers')
      .select('id, supplier_name, wecom_webhook_url, wecom_webhook_token, wecom_integration_status, wecom_error_count')
      .eq('id', supplier_id)
      .single()

    if (supplierError || !supplier) {
      console.error('[wecom-send] Supplier not found:', supplierError)
      return new Response(
        JSON.stringify({ error: 'Supplier not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (!supplier.wecom_webhook_url) {
      console.error('[wecom-send] No webhook URL configured for supplier')
      return new Response(
        JSON.stringify({ error: 'No WeCom webhook configured for this supplier' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Preserve original metadata for payment messages
    const paymentMetadata = metadata

    // Get additional data based on entity type
    let entityData: PurchaseOrderData | Record<string, unknown> | undefined = undefined
    
    if (entity_type === 'purchase_order' && entity_id) {
      const { data: po } = await supabase
        .from('purchase_orders')
        .select(`
          po_number, total_value, currency, delivery_date, payment_terms, notes,
          order:orders(order_number, sourcing_project:sourcing_projects(project_title)),
          items:purchase_order_items(product_name, product_name_cn, quantity, unit_price, specifications)
        `)
        .eq('id', entity_id)
        .single()
      
      if (po) {
        // For payment messages, MERGE PO data with payment metadata to preserve amount
        if (message_type === 'payment_sent' && paymentMetadata) {
          entityData = {
            po_number: po.po_number,
            currency: paymentMetadata.currency || po.currency,
            total_value: po.total_value,
            order: po.order,
            // Payment-specific fields from metadata - PRESERVE THESE
            amount: paymentMetadata.amount,
            payment_type: paymentMetadata.payment_type,
            receipt_url: paymentMetadata.receipt_url,
          }
          console.log(`[wecom-send] Payment merged data:`, JSON.stringify(entityData))
        } else {
          entityData = po as unknown as PurchaseOrderData
        }
      }
    } else if (metadata) {
      entityData = metadata
    }

    console.log(`[wecom-send] Final entity data:`, JSON.stringify(entityData))

    // Format the message
    const formattedContent = content || formatMessage(message_type, supplier.supplier_name, entityData)

    // Create message record BEFORE sending
    const { data: messageRecord, error: insertError } = await supabase
      .from('wecom_messages')
      .insert({
        direction: 'outbound',
        entity_type,
        entity_id,
        supplier_id,
        message_type,
        content: formattedContent,
        status: 'pending',
        metadata: { ...metadata, formatted_at: new Date().toISOString() }
      })
      .select()
      .single()

    if (insertError) {
      console.error('[wecom-send] Failed to create message record:', insertError)
    }

    // Send to WeCom webhook
    console.log(`[wecom-send] Sending to webhook: ${supplier.wecom_webhook_url}`)
    
    const wecomPayload = {
      msgtype: 'markdown',
      markdown: {
        content: formattedContent
      }
    }

    let wecomResponse: Response
    let retryCount = 0
    const maxRetries = 3

    while (retryCount < maxRetries) {
      try {
        wecomResponse = await fetch(supplier.wecom_webhook_url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(wecomPayload)
        })

        if (wecomResponse.ok) {
          break
        }
        
        retryCount++
        if (retryCount < maxRetries) {
          await new Promise(resolve => setTimeout(resolve, 1000 * retryCount))
        }
      } catch (fetchError) {
        console.error(`[wecom-send] Fetch attempt ${retryCount + 1} failed:`, fetchError)
        retryCount++
        if (retryCount < maxRetries) {
          await new Promise(resolve => setTimeout(resolve, 1000 * retryCount))
        }
      }
    }

    const responseData = await wecomResponse!.json().catch(() => ({}))
    const success = wecomResponse!.ok && responseData.errcode === 0

    console.log(`[wecom-send] WeCom response:`, responseData)

    // Update message record with result
    if (messageRecord) {
      await supabase
        .from('wecom_messages')
        .update({
          status: success ? 'sent' : 'failed',
          wecom_response: responseData,
          retry_count: retryCount,
          wecom_message_id: responseData.msgid || null
        })
        .eq('id', messageRecord.id)
    }

    // Update supplier status
    if (success) {
      await supabase
        .from('suppliers')
        .update({
          wecom_integration_status: 'active',
          wecom_last_test: message_type === 'test' ? new Date().toISOString() : undefined,
          wecom_error_count: 0,
          wecom_last_error: null
        })
        .eq('id', supplier_id)

      // Update PO last message time if applicable
      if (entity_type === 'purchase_order' && entity_id) {
        await supabase
          .from('purchase_orders')
          .update({ last_factory_message_at: new Date().toISOString() })
          .eq('id', entity_id)
      }
    } else {
      // Increment error count
      await supabase
        .from('suppliers')
        .update({
          wecom_integration_status: 'failed',
          wecom_error_count: (supplier.wecom_error_count || 0) + 1,
          wecom_last_error: responseData.errmsg || 'Unknown error'
        })
        .eq('id', supplier_id)
    }

    // Determine user-friendly error message for WeCom errors
    let errorMessage = null
    if (!success && responseData.errcode) {
      const wecomErrors: Record<number, string> = {
        48002: 'WeCom API forbidden - IP not whitelisted. Please add webhook URL without IP restrictions.',
        45009: 'API call frequency limit exceeded. Please wait and try again.',
        40014: 'Invalid access token. Please check your webhook URL.',
        93000: 'Webhook URL is invalid or disabled.',
      }
      errorMessage = wecomErrors[responseData.errcode] || responseData.errmsg
    }

    return new Response(
      JSON.stringify({
        success,
        message_id: messageRecord?.id,
        wecom_response: responseData,
        error_message: errorMessage
      }),
      { 
        status: 200, // Always return 200 so frontend can handle the response
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )

  } catch (error) {
    console.error('[wecom-send] Error:', error)
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
