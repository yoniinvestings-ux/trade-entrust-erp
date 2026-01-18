export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      activity_logs: {
        Row: {
          action: string
          changes: Json | null
          collection: string
          document_id: string
          id: string
          metadata: Json | null
          performed_by: string | null
          performed_by_email: string | null
          timestamp: string
        }
        Insert: {
          action: string
          changes?: Json | null
          collection: string
          document_id: string
          id?: string
          metadata?: Json | null
          performed_by?: string | null
          performed_by_email?: string | null
          timestamp?: string
        }
        Update: {
          action?: string
          changes?: Json | null
          collection?: string
          document_id?: string
          id?: string
          metadata?: Json | null
          performed_by?: string | null
          performed_by_email?: string | null
          timestamp?: string
        }
        Relationships: []
      }
      bank_accounts: {
        Row: {
          account_number: string | null
          bank_name: string
          created_at: string
          currency: string
          current_balance: number | null
          id: string
          is_active: boolean | null
          is_default: boolean | null
          last_synced_at: string | null
          name: string
          notes: string | null
          updated_at: string
        }
        Insert: {
          account_number?: string | null
          bank_name: string
          created_at?: string
          currency?: string
          current_balance?: number | null
          id?: string
          is_active?: boolean | null
          is_default?: boolean | null
          last_synced_at?: string | null
          name: string
          notes?: string | null
          updated_at?: string
        }
        Update: {
          account_number?: string | null
          bank_name?: string
          created_at?: string
          currency?: string
          current_balance?: number | null
          id?: string
          is_active?: boolean | null
          is_default?: boolean | null
          last_synced_at?: string | null
          name?: string
          notes?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      cash_flow_snapshots: {
        Row: {
          ai_analysis: string | null
          balance_usd: number | null
          bank_account_id: string | null
          created_at: string
          created_by: string | null
          expected_inflows: number | null
          expected_outflows: number | null
          forecast_data: Json | null
          id: string
          snapshot_date: string
        }
        Insert: {
          ai_analysis?: string | null
          balance_usd?: number | null
          bank_account_id?: string | null
          created_at?: string
          created_by?: string | null
          expected_inflows?: number | null
          expected_outflows?: number | null
          forecast_data?: Json | null
          id?: string
          snapshot_date: string
        }
        Update: {
          ai_analysis?: string | null
          balance_usd?: number | null
          bank_account_id?: string | null
          created_at?: string
          created_by?: string | null
          expected_inflows?: number | null
          expected_outflows?: number | null
          forecast_data?: Json | null
          id?: string
          snapshot_date?: string
        }
        Relationships: [
          {
            foreignKeyName: "cash_flow_snapshots_bank_account_id_fkey"
            columns: ["bank_account_id"]
            isOneToOne: false
            referencedRelation: "bank_accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      company_settings: {
        Row: {
          address: string | null
          address_cn: string | null
          bank_account_name: string | null
          bank_account_number: string | null
          bank_address: string | null
          bank_branch: string | null
          bank_code: string | null
          bank_currency: string | null
          bank_name: string | null
          bank_swift_code: string | null
          company_name: string
          company_name_cn: string | null
          created_at: string | null
          email: string | null
          id: string
          logo_url: string | null
          phone: string | null
          updated_at: string | null
        }
        Insert: {
          address?: string | null
          address_cn?: string | null
          bank_account_name?: string | null
          bank_account_number?: string | null
          bank_address?: string | null
          bank_branch?: string | null
          bank_code?: string | null
          bank_currency?: string | null
          bank_name?: string | null
          bank_swift_code?: string | null
          company_name: string
          company_name_cn?: string | null
          created_at?: string | null
          email?: string | null
          id?: string
          logo_url?: string | null
          phone?: string | null
          updated_at?: string | null
        }
        Update: {
          address?: string | null
          address_cn?: string | null
          bank_account_name?: string | null
          bank_account_number?: string | null
          bank_address?: string | null
          bank_branch?: string | null
          bank_code?: string | null
          bank_currency?: string | null
          bank_name?: string | null
          bank_swift_code?: string | null
          company_name?: string
          company_name_cn?: string | null
          created_at?: string | null
          email?: string | null
          id?: string
          logo_url?: string | null
          phone?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      customer_ledger_entries: {
        Row: {
          created_at: string
          credit_amount: number | null
          currency: string | null
          customer_id: string
          debit_amount: number | null
          description: string
          entry_date: string
          financial_record_id: string | null
          id: string
          invoice_number: string | null
          order_id: string | null
          remark: string | null
          running_balance: number
          serial_number: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          credit_amount?: number | null
          currency?: string | null
          customer_id: string
          debit_amount?: number | null
          description: string
          entry_date: string
          financial_record_id?: string | null
          id?: string
          invoice_number?: string | null
          order_id?: string | null
          remark?: string | null
          running_balance?: number
          serial_number: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          credit_amount?: number | null
          currency?: string | null
          customer_id?: string
          debit_amount?: number | null
          description?: string
          entry_date?: string
          financial_record_id?: string | null
          id?: string
          invoice_number?: string | null
          order_id?: string | null
          remark?: string | null
          running_balance?: number
          serial_number?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "customer_ledger_entries_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customer_ledger"
            referencedColumns: ["customer_id"]
          },
          {
            foreignKeyName: "customer_ledger_entries_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customer_ledger_entries_financial_record_id_fkey"
            columns: ["financial_record_id"]
            isOneToOne: false
            referencedRelation: "financial_records"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customer_ledger_entries_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      customer_service_requests: {
        Row: {
          assigned_to: string | null
          attachments: Json | null
          created_at: string | null
          created_by: string | null
          created_on_behalf: boolean | null
          customer_id: string
          description: string | null
          id: string
          items: Json | null
          order_id: string | null
          priority: string | null
          reference_number: string | null
          request_type: string
          resolution_notes: string | null
          resolved_at: string | null
          resolved_by: string | null
          status: string | null
          updated_at: string | null
        }
        Insert: {
          assigned_to?: string | null
          attachments?: Json | null
          created_at?: string | null
          created_by?: string | null
          created_on_behalf?: boolean | null
          customer_id: string
          description?: string | null
          id?: string
          items?: Json | null
          order_id?: string | null
          priority?: string | null
          reference_number?: string | null
          request_type: string
          resolution_notes?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          status?: string | null
          updated_at?: string | null
        }
        Update: {
          assigned_to?: string | null
          attachments?: Json | null
          created_at?: string | null
          created_by?: string | null
          created_on_behalf?: boolean | null
          customer_id?: string
          description?: string | null
          id?: string
          items?: Json | null
          order_id?: string | null
          priority?: string | null
          reference_number?: string | null
          request_type?: string
          resolution_notes?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          status?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "customer_service_requests_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customer_ledger"
            referencedColumns: ["customer_id"]
          },
          {
            foreignKeyName: "customer_service_requests_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customer_service_requests_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      customer_users: {
        Row: {
          access_level: string | null
          created_at: string | null
          customer_id: string
          id: string
          invited_at: string | null
          invited_by: string | null
          is_active: boolean | null
          user_id: string
        }
        Insert: {
          access_level?: string | null
          created_at?: string | null
          customer_id: string
          id?: string
          invited_at?: string | null
          invited_by?: string | null
          is_active?: boolean | null
          user_id: string
        }
        Update: {
          access_level?: string | null
          created_at?: string | null
          customer_id?: string
          id?: string
          invited_at?: string | null
          invited_by?: string | null
          is_active?: boolean | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "customer_users_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customer_ledger"
            referencedColumns: ["customer_id"]
          },
          {
            foreignKeyName: "customer_users_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
        ]
      }
      customers: {
        Row: {
          assigned_team: string[] | null
          city: string | null
          company_name: string
          contact_person: string
          country: string | null
          created_at: string
          email: string
          id: string
          phone: string | null
          registration_number: string | null
          state: string | null
          status: string
          street: string | null
          total_orders: number | null
          total_value: number | null
          updated_at: string
          zip_code: string | null
        }
        Insert: {
          assigned_team?: string[] | null
          city?: string | null
          company_name: string
          contact_person: string
          country?: string | null
          created_at?: string
          email: string
          id?: string
          phone?: string | null
          registration_number?: string | null
          state?: string | null
          status?: string
          street?: string | null
          total_orders?: number | null
          total_value?: number | null
          updated_at?: string
          zip_code?: string | null
        }
        Update: {
          assigned_team?: string[] | null
          city?: string | null
          company_name?: string
          contact_person?: string
          country?: string | null
          created_at?: string
          email?: string
          id?: string
          phone?: string | null
          registration_number?: string | null
          state?: string | null
          status?: string
          street?: string | null
          total_orders?: number | null
          total_value?: number | null
          updated_at?: string
          zip_code?: string | null
        }
        Relationships: []
      }
      employees: {
        Row: {
          bank_account: string | null
          bank_name: string | null
          base_salary_usd: number
          created_at: string
          department: string | null
          employee_number: string | null
          full_name: string
          hire_date: string | null
          id: string
          notes: string | null
          position: string | null
          salary_currency: string | null
          status: string | null
          updated_at: string
          user_id: string | null
        }
        Insert: {
          bank_account?: string | null
          bank_name?: string | null
          base_salary_usd?: number
          created_at?: string
          department?: string | null
          employee_number?: string | null
          full_name: string
          hire_date?: string | null
          id?: string
          notes?: string | null
          position?: string | null
          salary_currency?: string | null
          status?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          bank_account?: string | null
          bank_name?: string | null
          base_salary_usd?: number
          created_at?: string
          department?: string | null
          employee_number?: string | null
          full_name?: string
          hire_date?: string | null
          id?: string
          notes?: string | null
          position?: string | null
          salary_currency?: string | null
          status?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Relationships: []
      }
      entity_updates: {
        Row: {
          attachments: Json | null
          author_id: string
          content: string
          created_at: string | null
          entity_id: string
          entity_type: string
          id: string
          is_customer_visible: boolean | null
          is_pinned: boolean | null
          is_supplier_visible: boolean | null
          mentions: string[] | null
          parent_id: string | null
          reactions: Json | null
          updated_at: string | null
        }
        Insert: {
          attachments?: Json | null
          author_id: string
          content: string
          created_at?: string | null
          entity_id: string
          entity_type: string
          id?: string
          is_customer_visible?: boolean | null
          is_pinned?: boolean | null
          is_supplier_visible?: boolean | null
          mentions?: string[] | null
          parent_id?: string | null
          reactions?: Json | null
          updated_at?: string | null
        }
        Update: {
          attachments?: Json | null
          author_id?: string
          content?: string
          created_at?: string | null
          entity_id?: string
          entity_type?: string
          id?: string
          is_customer_visible?: boolean | null
          is_pinned?: boolean | null
          is_supplier_visible?: boolean | null
          mentions?: string[] | null
          parent_id?: string | null
          reactions?: Json | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "entity_updates_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "entity_updates"
            referencedColumns: ["id"]
          },
        ]
      }
      expense_categories: {
        Row: {
          budget_currency: string | null
          budget_monthly: number | null
          created_at: string
          description: string | null
          id: string
          is_active: boolean | null
          name: string
          parent_id: string | null
          updated_at: string
        }
        Insert: {
          budget_currency?: string | null
          budget_monthly?: number | null
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          parent_id?: string | null
          updated_at?: string
        }
        Update: {
          budget_currency?: string | null
          budget_monthly?: number | null
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          parent_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "expense_categories_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "expense_categories"
            referencedColumns: ["id"]
          },
        ]
      }
      financial_records: {
        Row: {
          amount: number
          amount_local: number | null
          approved_at: string | null
          approved_by: string | null
          bank_account_id: string | null
          category_id: string | null
          created_at: string
          created_by: string | null
          currency: string | null
          customer_id: string | null
          date: string
          employee_id: string | null
          exchange_rate: number | null
          id: string
          local_currency: string | null
          notes: string | null
          order_id: string | null
          payment_method: string | null
          purchase_order_id: string | null
          purpose: string | null
          receipt_url: string | null
          reference_number: string | null
          salary_month: string | null
          status: string
          supplier_id: string | null
          type: string
        }
        Insert: {
          amount: number
          amount_local?: number | null
          approved_at?: string | null
          approved_by?: string | null
          bank_account_id?: string | null
          category_id?: string | null
          created_at?: string
          created_by?: string | null
          currency?: string | null
          customer_id?: string | null
          date?: string
          employee_id?: string | null
          exchange_rate?: number | null
          id?: string
          local_currency?: string | null
          notes?: string | null
          order_id?: string | null
          payment_method?: string | null
          purchase_order_id?: string | null
          purpose?: string | null
          receipt_url?: string | null
          reference_number?: string | null
          salary_month?: string | null
          status?: string
          supplier_id?: string | null
          type: string
        }
        Update: {
          amount?: number
          amount_local?: number | null
          approved_at?: string | null
          approved_by?: string | null
          bank_account_id?: string | null
          category_id?: string | null
          created_at?: string
          created_by?: string | null
          currency?: string | null
          customer_id?: string | null
          date?: string
          employee_id?: string | null
          exchange_rate?: number | null
          id?: string
          local_currency?: string | null
          notes?: string | null
          order_id?: string | null
          payment_method?: string | null
          purchase_order_id?: string | null
          purpose?: string | null
          receipt_url?: string | null
          reference_number?: string | null
          salary_month?: string | null
          status?: string
          supplier_id?: string | null
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "financial_records_bank_account_id_fkey"
            columns: ["bank_account_id"]
            isOneToOne: false
            referencedRelation: "bank_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "financial_records_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "expense_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "financial_records_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customer_ledger"
            referencedColumns: ["customer_id"]
          },
          {
            foreignKeyName: "financial_records_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "financial_records_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "financial_records_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "financial_records_purchase_order_id_fkey"
            columns: ["purchase_order_id"]
            isOneToOne: false
            referencedRelation: "purchase_orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "financial_records_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "supplier_ledger"
            referencedColumns: ["supplier_id"]
          },
          {
            foreignKeyName: "financial_records_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "supplier_performance"
            referencedColumns: ["supplier_id"]
          },
          {
            foreignKeyName: "financial_records_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
        ]
      }
      generated_documents: {
        Row: {
          document_number: string
          document_type: string
          file_url: string | null
          generated_at: string | null
          generated_by: string | null
          id: string
          metadata: Json | null
          order_id: string | null
          purchase_order_id: string | null
        }
        Insert: {
          document_number: string
          document_type: string
          file_url?: string | null
          generated_at?: string | null
          generated_by?: string | null
          id?: string
          metadata?: Json | null
          order_id?: string | null
          purchase_order_id?: string | null
        }
        Update: {
          document_number?: string
          document_type?: string
          file_url?: string | null
          generated_at?: string | null
          generated_by?: string | null
          id?: string
          metadata?: Json | null
          order_id?: string | null
          purchase_order_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "generated_documents_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "generated_documents_purchase_order_id_fkey"
            columns: ["purchase_order_id"]
            isOneToOne: false
            referencedRelation: "purchase_orders"
            referencedColumns: ["id"]
          },
        ]
      }
      invitation_tokens: {
        Row: {
          created_at: string | null
          email: string
          entity_id: string | null
          entity_type: string | null
          expires_at: string
          id: string
          invited_by: string | null
          role: Database["public"]["Enums"]["app_role"]
          token: string
          used_at: string | null
        }
        Insert: {
          created_at?: string | null
          email: string
          entity_id?: string | null
          entity_type?: string | null
          expires_at: string
          id?: string
          invited_by?: string | null
          role: Database["public"]["Enums"]["app_role"]
          token: string
          used_at?: string | null
        }
        Update: {
          created_at?: string | null
          email?: string
          entity_id?: string | null
          entity_type?: string | null
          expires_at?: string
          id?: string
          invited_by?: string | null
          role?: Database["public"]["Enums"]["app_role"]
          token?: string
          used_at?: string | null
        }
        Relationships: []
      }
      leads: {
        Row: {
          assigned_to: string | null
          company_name: string
          contact_person: string
          converted_at: string | null
          converted_to_customer_id: string | null
          created_at: string
          email: string
          id: string
          notes: string | null
          phone: string | null
          score: number | null
          source: string
          status: string
          updated_at: string
        }
        Insert: {
          assigned_to?: string | null
          company_name: string
          contact_person: string
          converted_at?: string | null
          converted_to_customer_id?: string | null
          created_at?: string
          email: string
          id?: string
          notes?: string | null
          phone?: string | null
          score?: number | null
          source?: string
          status?: string
          updated_at?: string
        }
        Update: {
          assigned_to?: string | null
          company_name?: string
          contact_person?: string
          converted_at?: string | null
          converted_to_customer_id?: string | null
          created_at?: string
          email?: string
          id?: string
          notes?: string | null
          phone?: string | null
          score?: number | null
          source?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "leads_converted_to_customer_id_fkey"
            columns: ["converted_to_customer_id"]
            isOneToOne: false
            referencedRelation: "customer_ledger"
            referencedColumns: ["customer_id"]
          },
          {
            foreignKeyName: "leads_converted_to_customer_id_fkey"
            columns: ["converted_to_customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
        ]
      }
      ncr_reports: {
        Row: {
          assigned_to: string | null
          category: string
          closed_at: string | null
          corrective_action: string | null
          corrective_action_cn: string | null
          cost_currency: string | null
          cost_impact: number | null
          created_at: string | null
          description: string | null
          due_date: string | null
          id: string
          ncr_number: string
          order_id: string | null
          photo_urls: string[] | null
          preventive_action: string | null
          preventive_action_cn: string | null
          purchase_order_id: string | null
          qc_inspection_id: string | null
          qc_inspection_item_id: string | null
          raised_by: string | null
          root_cause: string | null
          root_cause_cn: string | null
          severity: string
          status: string
          supplier_id: string | null
          title: string
          updated_at: string | null
          verified_by: string | null
        }
        Insert: {
          assigned_to?: string | null
          category?: string
          closed_at?: string | null
          corrective_action?: string | null
          corrective_action_cn?: string | null
          cost_currency?: string | null
          cost_impact?: number | null
          created_at?: string | null
          description?: string | null
          due_date?: string | null
          id?: string
          ncr_number: string
          order_id?: string | null
          photo_urls?: string[] | null
          preventive_action?: string | null
          preventive_action_cn?: string | null
          purchase_order_id?: string | null
          qc_inspection_id?: string | null
          qc_inspection_item_id?: string | null
          raised_by?: string | null
          root_cause?: string | null
          root_cause_cn?: string | null
          severity?: string
          status?: string
          supplier_id?: string | null
          title: string
          updated_at?: string | null
          verified_by?: string | null
        }
        Update: {
          assigned_to?: string | null
          category?: string
          closed_at?: string | null
          corrective_action?: string | null
          corrective_action_cn?: string | null
          cost_currency?: string | null
          cost_impact?: number | null
          created_at?: string | null
          description?: string | null
          due_date?: string | null
          id?: string
          ncr_number?: string
          order_id?: string | null
          photo_urls?: string[] | null
          preventive_action?: string | null
          preventive_action_cn?: string | null
          purchase_order_id?: string | null
          qc_inspection_id?: string | null
          qc_inspection_item_id?: string | null
          raised_by?: string | null
          root_cause?: string | null
          root_cause_cn?: string | null
          severity?: string
          status?: string
          supplier_id?: string | null
          title?: string
          updated_at?: string | null
          verified_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ncr_reports_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ncr_reports_purchase_order_id_fkey"
            columns: ["purchase_order_id"]
            isOneToOne: false
            referencedRelation: "purchase_orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ncr_reports_qc_inspection_id_fkey"
            columns: ["qc_inspection_id"]
            isOneToOne: false
            referencedRelation: "qc_inspections"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ncr_reports_qc_inspection_item_id_fkey"
            columns: ["qc_inspection_item_id"]
            isOneToOne: false
            referencedRelation: "qc_inspection_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ncr_reports_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "supplier_ledger"
            referencedColumns: ["supplier_id"]
          },
          {
            foreignKeyName: "ncr_reports_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "supplier_performance"
            referencedColumns: ["supplier_id"]
          },
          {
            foreignKeyName: "ncr_reports_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          action_url: string | null
          created_at: string | null
          entity_id: string | null
          entity_type: string | null
          id: string
          message: string | null
          read: boolean | null
          read_at: string | null
          title: string
          type: string
          user_id: string
        }
        Insert: {
          action_url?: string | null
          created_at?: string | null
          entity_id?: string | null
          entity_type?: string | null
          id?: string
          message?: string | null
          read?: boolean | null
          read_at?: string | null
          title: string
          type: string
          user_id: string
        }
        Update: {
          action_url?: string | null
          created_at?: string | null
          entity_id?: string | null
          entity_type?: string | null
          id?: string
          message?: string | null
          read?: boolean | null
          read_at?: string | null
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: []
      }
      order_items: {
        Row: {
          cartons: number | null
          cbm: number | null
          created_at: string
          gross_weight_kg: number | null
          id: string
          model_number: string
          order_id: string
          product_name: string
          product_number: string | null
          quantity: number
          remarks: string | null
          specifications: string | null
          supplier_id: string | null
          total_price: number
          unit_price: number
        }
        Insert: {
          cartons?: number | null
          cbm?: number | null
          created_at?: string
          gross_weight_kg?: number | null
          id?: string
          model_number: string
          order_id: string
          product_name: string
          product_number?: string | null
          quantity?: number
          remarks?: string | null
          specifications?: string | null
          supplier_id?: string | null
          total_price?: number
          unit_price?: number
        }
        Update: {
          cartons?: number | null
          cbm?: number | null
          created_at?: string
          gross_weight_kg?: number | null
          id?: string
          model_number?: string
          order_id?: string
          product_name?: string
          product_number?: string | null
          quantity?: number
          remarks?: string | null
          specifications?: string | null
          supplier_id?: string | null
          total_price?: number
          unit_price?: number
        }
        Relationships: [
          {
            foreignKeyName: "order_items_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_items_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "supplier_ledger"
            referencedColumns: ["supplier_id"]
          },
          {
            foreignKeyName: "order_items_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "supplier_performance"
            referencedColumns: ["supplier_id"]
          },
          {
            foreignKeyName: "order_items_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
        ]
      }
      order_milestones: {
        Row: {
          actual_date: string | null
          completed_by: string | null
          created_at: string
          id: string
          milestone_type: string
          notes: string | null
          order_id: string
          planned_date: string | null
          updated_at: string
        }
        Insert: {
          actual_date?: string | null
          completed_by?: string | null
          created_at?: string
          id?: string
          milestone_type: string
          notes?: string | null
          order_id: string
          planned_date?: string | null
          updated_at?: string
        }
        Update: {
          actual_date?: string | null
          completed_by?: string | null
          created_at?: string
          id?: string
          milestone_type?: string
          notes?: string | null
          order_id?: string
          planned_date?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "order_milestones_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      orders: {
        Row: {
          archived_at: string | null
          assigned_team: string[] | null
          created_at: string
          created_by: string | null
          currency: string | null
          customer_balance_amount: number | null
          customer_deposit_amount: number | null
          customer_id: string
          customer_lead_days: number | null
          customer_payment_status: string | null
          delivered_at: string | null
          delivery_date: string | null
          delivery_term_end: string | null
          delivery_term_start: string | null
          estimated_delivery_date: string | null
          estimated_ship_date: string | null
          factory_lead_days: number | null
          id: string
          is_archived: boolean | null
          notes: string | null
          order_confirmed_at: string | null
          order_number: string
          payment_terms: string | null
          po_sent_at: string | null
          production_started_at: string | null
          profit_margin: number | null
          qc_completed_at: string | null
          shipped_at: string | null
          sourcing_project_id: string | null
          status: string
          total_value: number | null
          trade_term: string | null
          updated_at: string
        }
        Insert: {
          archived_at?: string | null
          assigned_team?: string[] | null
          created_at?: string
          created_by?: string | null
          currency?: string | null
          customer_balance_amount?: number | null
          customer_deposit_amount?: number | null
          customer_id: string
          customer_lead_days?: number | null
          customer_payment_status?: string | null
          delivered_at?: string | null
          delivery_date?: string | null
          delivery_term_end?: string | null
          delivery_term_start?: string | null
          estimated_delivery_date?: string | null
          estimated_ship_date?: string | null
          factory_lead_days?: number | null
          id?: string
          is_archived?: boolean | null
          notes?: string | null
          order_confirmed_at?: string | null
          order_number: string
          payment_terms?: string | null
          po_sent_at?: string | null
          production_started_at?: string | null
          profit_margin?: number | null
          qc_completed_at?: string | null
          shipped_at?: string | null
          sourcing_project_id?: string | null
          status?: string
          total_value?: number | null
          trade_term?: string | null
          updated_at?: string
        }
        Update: {
          archived_at?: string | null
          assigned_team?: string[] | null
          created_at?: string
          created_by?: string | null
          currency?: string | null
          customer_balance_amount?: number | null
          customer_deposit_amount?: number | null
          customer_id?: string
          customer_lead_days?: number | null
          customer_payment_status?: string | null
          delivered_at?: string | null
          delivery_date?: string | null
          delivery_term_end?: string | null
          delivery_term_start?: string | null
          estimated_delivery_date?: string | null
          estimated_ship_date?: string | null
          factory_lead_days?: number | null
          id?: string
          is_archived?: boolean | null
          notes?: string | null
          order_confirmed_at?: string | null
          order_number?: string
          payment_terms?: string | null
          po_sent_at?: string | null
          production_started_at?: string | null
          profit_margin?: number | null
          qc_completed_at?: string | null
          shipped_at?: string | null
          sourcing_project_id?: string | null
          status?: string
          total_value?: number | null
          trade_term?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "orders_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customer_ledger"
            referencedColumns: ["customer_id"]
          },
          {
            foreignKeyName: "orders_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_sourcing_project_id_fkey"
            columns: ["sourcing_project_id"]
            isOneToOne: false
            referencedRelation: "sourcing_projects"
            referencedColumns: ["id"]
          },
        ]
      }
      payment_allocations: {
        Row: {
          allocated_amount: number
          created_at: string
          currency: string | null
          financial_record_id: string
          id: string
          notes: string | null
          order_id: string | null
          purchase_order_id: string | null
          updated_at: string
        }
        Insert: {
          allocated_amount: number
          created_at?: string
          currency?: string | null
          financial_record_id: string
          id?: string
          notes?: string | null
          order_id?: string | null
          purchase_order_id?: string | null
          updated_at?: string
        }
        Update: {
          allocated_amount?: number
          created_at?: string
          currency?: string | null
          financial_record_id?: string
          id?: string
          notes?: string | null
          order_id?: string | null
          purchase_order_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "payment_allocations_financial_record_id_fkey"
            columns: ["financial_record_id"]
            isOneToOne: false
            referencedRelation: "financial_records"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payment_allocations_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payment_allocations_purchase_order_id_fkey"
            columns: ["purchase_order_id"]
            isOneToOne: false
            referencedRelation: "purchase_orders"
            referencedColumns: ["id"]
          },
        ]
      }
      permission_settings: {
        Row: {
          can_assign: boolean | null
          can_create: boolean | null
          can_delete: boolean | null
          can_edit: boolean | null
          can_view: boolean | null
          created_at: string | null
          id: string
          module: string
          role: Database["public"]["Enums"]["app_role"]
          updated_at: string | null
        }
        Insert: {
          can_assign?: boolean | null
          can_create?: boolean | null
          can_delete?: boolean | null
          can_edit?: boolean | null
          can_view?: boolean | null
          created_at?: string | null
          id?: string
          module: string
          role: Database["public"]["Enums"]["app_role"]
          updated_at?: string | null
        }
        Update: {
          can_assign?: boolean | null
          can_create?: boolean | null
          can_delete?: boolean | null
          can_edit?: boolean | null
          can_view?: boolean | null
          created_at?: string | null
          id?: string
          module?: string
          role?: Database["public"]["Enums"]["app_role"]
          updated_at?: string | null
        }
        Relationships: []
      }
      product_photos: {
        Row: {
          file_name: string
          id: string
          is_main: boolean | null
          order_item_id: string | null
          photo_type: string | null
          sourcing_item_id: string | null
          uploaded_at: string
          url: string
        }
        Insert: {
          file_name: string
          id?: string
          is_main?: boolean | null
          order_item_id?: string | null
          photo_type?: string | null
          sourcing_item_id?: string | null
          uploaded_at?: string
          url: string
        }
        Update: {
          file_name?: string
          id?: string
          is_main?: boolean | null
          order_item_id?: string | null
          photo_type?: string | null
          sourcing_item_id?: string | null
          uploaded_at?: string
          url?: string
        }
        Relationships: [
          {
            foreignKeyName: "product_photos_order_item_id_fkey"
            columns: ["order_item_id"]
            isOneToOne: false
            referencedRelation: "order_items"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          department: string | null
          display_name: string
          email: string
          id: string
          is_active: boolean
          language: string | null
          notifications_enabled: boolean | null
          timezone: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          department?: string | null
          display_name: string
          email: string
          id?: string
          is_active?: boolean
          language?: string | null
          notifications_enabled?: boolean | null
          timezone?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          department?: string | null
          display_name?: string
          email?: string
          id?: string
          is_active?: boolean
          language?: string | null
          notifications_enabled?: boolean | null
          timezone?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      project_files: {
        Row: {
          file_name: string
          file_size: number | null
          file_type: string | null
          id: string
          order_id: string | null
          sourcing_project_id: string | null
          uploaded_at: string
          uploaded_by: string | null
          url: string
        }
        Insert: {
          file_name: string
          file_size?: number | null
          file_type?: string | null
          id?: string
          order_id?: string | null
          sourcing_project_id?: string | null
          uploaded_at?: string
          uploaded_by?: string | null
          url: string
        }
        Update: {
          file_name?: string
          file_size?: number | null
          file_type?: string | null
          id?: string
          order_id?: string | null
          sourcing_project_id?: string | null
          uploaded_at?: string
          uploaded_by?: string | null
          url?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_files_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_files_sourcing_project_id_fkey"
            columns: ["sourcing_project_id"]
            isOneToOne: false
            referencedRelation: "sourcing_projects"
            referencedColumns: ["id"]
          },
        ]
      }
      projects: {
        Row: {
          actual_budget: number | null
          assigned_team: string[] | null
          budget_currency: string | null
          created_at: string
          end_date: string | null
          estimated_budget: number | null
          id: string
          order_id: string | null
          project_name: string
          start_date: string | null
          status: string
          updated_at: string
        }
        Insert: {
          actual_budget?: number | null
          assigned_team?: string[] | null
          budget_currency?: string | null
          created_at?: string
          end_date?: string | null
          estimated_budget?: number | null
          id?: string
          order_id?: string | null
          project_name: string
          start_date?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          actual_budget?: number | null
          assigned_team?: string[] | null
          budget_currency?: string | null
          created_at?: string
          end_date?: string | null
          estimated_budget?: number | null
          id?: string
          order_id?: string | null
          project_name?: string
          start_date?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "projects_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      purchase_order_items: {
        Row: {
          created_at: string
          id: string
          model_number: string
          order_item_id: string | null
          product_name: string
          product_name_cn: string | null
          purchase_order_id: string
          quantity: number
          remarks: string | null
          specifications: string | null
          specifications_cn: string | null
          total_price: number | null
          unit_price: number
        }
        Insert: {
          created_at?: string
          id?: string
          model_number: string
          order_item_id?: string | null
          product_name: string
          product_name_cn?: string | null
          purchase_order_id: string
          quantity?: number
          remarks?: string | null
          specifications?: string | null
          specifications_cn?: string | null
          total_price?: number | null
          unit_price?: number
        }
        Update: {
          created_at?: string
          id?: string
          model_number?: string
          order_item_id?: string | null
          product_name?: string
          product_name_cn?: string | null
          purchase_order_id?: string
          quantity?: number
          remarks?: string | null
          specifications?: string | null
          specifications_cn?: string | null
          total_price?: number | null
          unit_price?: number
        }
        Relationships: [
          {
            foreignKeyName: "purchase_order_items_order_item_id_fkey"
            columns: ["order_item_id"]
            isOneToOne: false
            referencedRelation: "order_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "purchase_order_items_purchase_order_id_fkey"
            columns: ["purchase_order_id"]
            isOneToOne: false
            referencedRelation: "purchase_orders"
            referencedColumns: ["id"]
          },
        ]
      }
      purchase_orders: {
        Row: {
          assigned_team: string[] | null
          buyer_signed: boolean | null
          buyer_signed_at: string | null
          created_at: string
          currency: string | null
          delivery_date: string | null
          estimated_completion_date: string | null
          exchange_rate: number | null
          factory_balance_amount: number | null
          factory_balance_paid_at: string | null
          factory_confirmed_at: string | null
          factory_deposit_amount: number | null
          factory_deposit_paid_at: string | null
          factory_lead_days: number | null
          factory_payment_currency: string | null
          factory_qc_status: string | null
          factory_tracking_number: string | null
          id: string
          last_factory_message_at: string | null
          notes: string | null
          order_id: string
          packaging_requirements: string | null
          payment_status: string | null
          payment_terms: string | null
          po_number: string
          product_name_cn: string | null
          production_completed_at: string | null
          production_started_at: string | null
          qc_completed_at: string | null
          quality_inspection_terms: string | null
          shipped_at: string | null
          shipping_cost: number | null
          shipping_cost_currency: string | null
          specifications_cn: string | null
          status: string
          supplier_id: string
          supplier_signed: boolean | null
          supplier_signed_at: string | null
          total_value: number | null
          trade_term: string | null
          updated_at: string
        }
        Insert: {
          assigned_team?: string[] | null
          buyer_signed?: boolean | null
          buyer_signed_at?: string | null
          created_at?: string
          currency?: string | null
          delivery_date?: string | null
          estimated_completion_date?: string | null
          exchange_rate?: number | null
          factory_balance_amount?: number | null
          factory_balance_paid_at?: string | null
          factory_confirmed_at?: string | null
          factory_deposit_amount?: number | null
          factory_deposit_paid_at?: string | null
          factory_lead_days?: number | null
          factory_payment_currency?: string | null
          factory_qc_status?: string | null
          factory_tracking_number?: string | null
          id?: string
          last_factory_message_at?: string | null
          notes?: string | null
          order_id: string
          packaging_requirements?: string | null
          payment_status?: string | null
          payment_terms?: string | null
          po_number: string
          product_name_cn?: string | null
          production_completed_at?: string | null
          production_started_at?: string | null
          qc_completed_at?: string | null
          quality_inspection_terms?: string | null
          shipped_at?: string | null
          shipping_cost?: number | null
          shipping_cost_currency?: string | null
          specifications_cn?: string | null
          status?: string
          supplier_id: string
          supplier_signed?: boolean | null
          supplier_signed_at?: string | null
          total_value?: number | null
          trade_term?: string | null
          updated_at?: string
        }
        Update: {
          assigned_team?: string[] | null
          buyer_signed?: boolean | null
          buyer_signed_at?: string | null
          created_at?: string
          currency?: string | null
          delivery_date?: string | null
          estimated_completion_date?: string | null
          exchange_rate?: number | null
          factory_balance_amount?: number | null
          factory_balance_paid_at?: string | null
          factory_confirmed_at?: string | null
          factory_deposit_amount?: number | null
          factory_deposit_paid_at?: string | null
          factory_lead_days?: number | null
          factory_payment_currency?: string | null
          factory_qc_status?: string | null
          factory_tracking_number?: string | null
          id?: string
          last_factory_message_at?: string | null
          notes?: string | null
          order_id?: string
          packaging_requirements?: string | null
          payment_status?: string | null
          payment_terms?: string | null
          po_number?: string
          product_name_cn?: string | null
          production_completed_at?: string | null
          production_started_at?: string | null
          qc_completed_at?: string | null
          quality_inspection_terms?: string | null
          shipped_at?: string | null
          shipping_cost?: number | null
          shipping_cost_currency?: string | null
          specifications_cn?: string | null
          status?: string
          supplier_id?: string
          supplier_signed?: boolean | null
          supplier_signed_at?: string | null
          total_value?: number | null
          trade_term?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "purchase_orders_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "purchase_orders_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "supplier_ledger"
            referencedColumns: ["supplier_id"]
          },
          {
            foreignKeyName: "purchase_orders_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "supplier_performance"
            referencedColumns: ["supplier_id"]
          },
          {
            foreignKeyName: "purchase_orders_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
        ]
      }
      qc_inspection_items: {
        Row: {
          check_category: string
          check_name: string
          check_name_cn: string | null
          corrective_action: string | null
          corrective_action_cn: string | null
          created_at: string
          finding: string | null
          finding_cn: string | null
          id: string
          inspection_id: string
          photo_urls: string[] | null
          requirement: string | null
          requirement_cn: string | null
          result: string
          updated_at: string
        }
        Insert: {
          check_category: string
          check_name: string
          check_name_cn?: string | null
          corrective_action?: string | null
          corrective_action_cn?: string | null
          created_at?: string
          finding?: string | null
          finding_cn?: string | null
          id?: string
          inspection_id: string
          photo_urls?: string[] | null
          requirement?: string | null
          requirement_cn?: string | null
          result?: string
          updated_at?: string
        }
        Update: {
          check_category?: string
          check_name?: string
          check_name_cn?: string | null
          corrective_action?: string | null
          corrective_action_cn?: string | null
          created_at?: string
          finding?: string | null
          finding_cn?: string | null
          id?: string
          inspection_id?: string
          photo_urls?: string[] | null
          requirement?: string | null
          requirement_cn?: string | null
          result?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "qc_inspection_items_inspection_id_fkey"
            columns: ["inspection_id"]
            isOneToOne: false
            referencedRelation: "qc_inspections"
            referencedColumns: ["id"]
          },
        ]
      }
      qc_inspections: {
        Row: {
          aql_level: string | null
          conclusion: string | null
          created_at: string
          critical_defects: number | null
          customer_visible: boolean | null
          defect_rate: number | null
          id: string
          inspection_date: string
          inspection_type: string | null
          inspector: string | null
          location: string | null
          major_defects: number | null
          minor_defects: number | null
          order_id: string
          po_id: string | null
          quotation_id: string | null
          report: string | null
          report_generated_at: string | null
          sample_size: number | null
          scheduled_date: string | null
          sourcing_project_id: string | null
          status: string
          total_defects: number | null
          total_inspected: number | null
        }
        Insert: {
          aql_level?: string | null
          conclusion?: string | null
          created_at?: string
          critical_defects?: number | null
          customer_visible?: boolean | null
          defect_rate?: number | null
          id?: string
          inspection_date?: string
          inspection_type?: string | null
          inspector?: string | null
          location?: string | null
          major_defects?: number | null
          minor_defects?: number | null
          order_id: string
          po_id?: string | null
          quotation_id?: string | null
          report?: string | null
          report_generated_at?: string | null
          sample_size?: number | null
          scheduled_date?: string | null
          sourcing_project_id?: string | null
          status?: string
          total_defects?: number | null
          total_inspected?: number | null
        }
        Update: {
          aql_level?: string | null
          conclusion?: string | null
          created_at?: string
          critical_defects?: number | null
          customer_visible?: boolean | null
          defect_rate?: number | null
          id?: string
          inspection_date?: string
          inspection_type?: string | null
          inspector?: string | null
          location?: string | null
          major_defects?: number | null
          minor_defects?: number | null
          order_id?: string
          po_id?: string | null
          quotation_id?: string | null
          report?: string | null
          report_generated_at?: string | null
          sample_size?: number | null
          scheduled_date?: string | null
          sourcing_project_id?: string | null
          status?: string
          total_defects?: number | null
          total_inspected?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "qc_inspections_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "qc_inspections_po_id_fkey"
            columns: ["po_id"]
            isOneToOne: false
            referencedRelation: "purchase_orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "qc_inspections_quotation_id_fkey"
            columns: ["quotation_id"]
            isOneToOne: false
            referencedRelation: "quotations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "qc_inspections_sourcing_project_id_fkey"
            columns: ["sourcing_project_id"]
            isOneToOne: false
            referencedRelation: "sourcing_projects"
            referencedColumns: ["id"]
          },
        ]
      }
      quotation_items: {
        Row: {
          created_at: string
          id: string
          lead_time_days: number | null
          model_number: string | null
          photos: Json | null
          product_name: string
          quantity: number
          quotation_id: string
          remarks: string | null
          sourcing_item_id: string | null
          specifications: string | null
          supplier_id: string | null
          unit_price: number
        }
        Insert: {
          created_at?: string
          id?: string
          lead_time_days?: number | null
          model_number?: string | null
          photos?: Json | null
          product_name: string
          quantity?: number
          quotation_id: string
          remarks?: string | null
          sourcing_item_id?: string | null
          specifications?: string | null
          supplier_id?: string | null
          unit_price: number
        }
        Update: {
          created_at?: string
          id?: string
          lead_time_days?: number | null
          model_number?: string | null
          photos?: Json | null
          product_name?: string
          quantity?: number
          quotation_id?: string
          remarks?: string | null
          sourcing_item_id?: string | null
          specifications?: string | null
          supplier_id?: string | null
          unit_price?: number
        }
        Relationships: [
          {
            foreignKeyName: "quotation_items_quotation_id_fkey"
            columns: ["quotation_id"]
            isOneToOne: false
            referencedRelation: "quotations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quotation_items_sourcing_item_id_fkey"
            columns: ["sourcing_item_id"]
            isOneToOne: false
            referencedRelation: "sourcing_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quotation_items_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "supplier_ledger"
            referencedColumns: ["supplier_id"]
          },
          {
            foreignKeyName: "quotation_items_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "supplier_performance"
            referencedColumns: ["supplier_id"]
          },
          {
            foreignKeyName: "quotation_items_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
        ]
      }
      quotations: {
        Row: {
          assigned_team: string[] | null
          created_at: string
          created_by: string | null
          currency: string | null
          customer_id: string | null
          id: string
          lead_id: string | null
          notes: string | null
          quotation_number: string
          sent_at: string | null
          sent_via: string | null
          sourcing_project_id: string | null
          status: string
          total_value: number | null
          trade_term: string | null
          updated_at: string
          valid_until: string | null
        }
        Insert: {
          assigned_team?: string[] | null
          created_at?: string
          created_by?: string | null
          currency?: string | null
          customer_id?: string | null
          id?: string
          lead_id?: string | null
          notes?: string | null
          quotation_number: string
          sent_at?: string | null
          sent_via?: string | null
          sourcing_project_id?: string | null
          status?: string
          total_value?: number | null
          trade_term?: string | null
          updated_at?: string
          valid_until?: string | null
        }
        Update: {
          assigned_team?: string[] | null
          created_at?: string
          created_by?: string | null
          currency?: string | null
          customer_id?: string | null
          id?: string
          lead_id?: string | null
          notes?: string | null
          quotation_number?: string
          sent_at?: string | null
          sent_via?: string | null
          sourcing_project_id?: string | null
          status?: string
          total_value?: number | null
          trade_term?: string | null
          updated_at?: string
          valid_until?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "quotations_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customer_ledger"
            referencedColumns: ["customer_id"]
          },
          {
            foreignKeyName: "quotations_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quotations_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quotations_sourcing_project_id_fkey"
            columns: ["sourcing_project_id"]
            isOneToOne: false
            referencedRelation: "sourcing_projects"
            referencedColumns: ["id"]
          },
        ]
      }
      shipment_items: {
        Row: {
          created_at: string
          id: string
          order_item_id: string
          quantity_shipped: number
          shipment_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          order_item_id: string
          quantity_shipped?: number
          shipment_id: string
        }
        Update: {
          created_at?: string
          id?: string
          order_item_id?: string
          quantity_shipped?: number
          shipment_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "shipment_items_order_item_id_fkey"
            columns: ["order_item_id"]
            isOneToOne: false
            referencedRelation: "order_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shipment_items_shipment_id_fkey"
            columns: ["shipment_id"]
            isOneToOne: false
            referencedRelation: "shipments"
            referencedColumns: ["id"]
          },
        ]
      }
      shipment_orders: {
        Row: {
          created_at: string
          id: string
          order_id: string
          shipment_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          order_id: string
          shipment_id: string
        }
        Update: {
          created_at?: string
          id?: string
          order_id?: string
          shipment_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "shipment_orders_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shipment_orders_shipment_id_fkey"
            columns: ["shipment_id"]
            isOneToOne: false
            referencedRelation: "shipments"
            referencedColumns: ["id"]
          },
        ]
      }
      shipment_tracking_logs: {
        Row: {
          ai_summary: string | null
          carrier_response: Json | null
          created_at: string | null
          estimated_arrival: string | null
          id: string
          location: string | null
          parsed_status: string | null
          shipment_id: string
          tracking_type: string | null
        }
        Insert: {
          ai_summary?: string | null
          carrier_response?: Json | null
          created_at?: string | null
          estimated_arrival?: string | null
          id?: string
          location?: string | null
          parsed_status?: string | null
          shipment_id: string
          tracking_type?: string | null
        }
        Update: {
          ai_summary?: string | null
          carrier_response?: Json | null
          created_at?: string | null
          estimated_arrival?: string | null
          id?: string
          location?: string | null
          parsed_status?: string | null
          shipment_id?: string
          tracking_type?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "shipment_tracking_logs_shipment_id_fkey"
            columns: ["shipment_id"]
            isOneToOne: false
            referencedRelation: "shipments"
            referencedColumns: ["id"]
          },
        ]
      }
      shipments: {
        Row: {
          actual_delivery: string | null
          carrier: string | null
          created_at: string
          customer_id: string
          destination_city: string | null
          destination_country: string | null
          destination_street: string | null
          estimated_delivery: string | null
          factory_city: string | null
          id: string
          order_id: string | null
          origin_city: string | null
          origin_country: string | null
          origin_street: string | null
          status: string
          total_cbm: number | null
          tracking_number: string | null
          updated_at: string
        }
        Insert: {
          actual_delivery?: string | null
          carrier?: string | null
          created_at?: string
          customer_id: string
          destination_city?: string | null
          destination_country?: string | null
          destination_street?: string | null
          estimated_delivery?: string | null
          factory_city?: string | null
          id?: string
          order_id?: string | null
          origin_city?: string | null
          origin_country?: string | null
          origin_street?: string | null
          status?: string
          total_cbm?: number | null
          tracking_number?: string | null
          updated_at?: string
        }
        Update: {
          actual_delivery?: string | null
          carrier?: string | null
          created_at?: string
          customer_id?: string
          destination_city?: string | null
          destination_country?: string | null
          destination_street?: string | null
          estimated_delivery?: string | null
          factory_city?: string | null
          id?: string
          order_id?: string | null
          origin_city?: string | null
          origin_country?: string | null
          origin_street?: string | null
          status?: string
          total_cbm?: number | null
          tracking_number?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "shipments_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customer_ledger"
            referencedColumns: ["customer_id"]
          },
          {
            foreignKeyName: "shipments_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shipments_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      sourcing_items: {
        Row: {
          created_at: string
          factory_currency: string | null
          factory_notes: string | null
          factory_price: number | null
          id: string
          lead_time_days: number | null
          model_number: string | null
          priority: string | null
          product_name: string
          project_id: string
          remarks: string | null
          specifications: string | null
          status: string | null
          supplier_id: string | null
          target_currency: string | null
          target_price: number | null
          target_quantity: number | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string
          factory_currency?: string | null
          factory_notes?: string | null
          factory_price?: number | null
          id?: string
          lead_time_days?: number | null
          model_number?: string | null
          priority?: string | null
          product_name: string
          project_id: string
          remarks?: string | null
          specifications?: string | null
          status?: string | null
          supplier_id?: string | null
          target_currency?: string | null
          target_price?: number | null
          target_quantity?: number | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string
          factory_currency?: string | null
          factory_notes?: string | null
          factory_price?: number | null
          id?: string
          lead_time_days?: number | null
          model_number?: string | null
          priority?: string | null
          product_name?: string
          project_id?: string
          remarks?: string | null
          specifications?: string | null
          status?: string | null
          supplier_id?: string | null
          target_currency?: string | null
          target_price?: number | null
          target_quantity?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "sourcing_items_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "sourcing_projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sourcing_items_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "supplier_ledger"
            referencedColumns: ["supplier_id"]
          },
          {
            foreignKeyName: "sourcing_items_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "supplier_performance"
            referencedColumns: ["supplier_id"]
          },
          {
            foreignKeyName: "sourcing_items_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
        ]
      }
      sourcing_projects: {
        Row: {
          assigned_team: string[] | null
          created_at: string
          description: string | null
          id: string
          lead_id: string | null
          project_title: string
          status: string
          updated_at: string
        }
        Insert: {
          assigned_team?: string[] | null
          created_at?: string
          description?: string | null
          id?: string
          lead_id?: string | null
          project_title: string
          status?: string
          updated_at?: string
        }
        Update: {
          assigned_team?: string[] | null
          created_at?: string
          description?: string | null
          id?: string
          lead_id?: string | null
          project_title?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "sourcing_projects_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
        ]
      }
      supplier_ledger_entries: {
        Row: {
          created_at: string
          credit_amount: number | null
          currency: string | null
          debit_amount: number | null
          description: string
          entry_date: string
          financial_record_id: string | null
          id: string
          po_number: string | null
          purchase_order_id: string | null
          remark: string | null
          running_balance: number
          serial_number: number
          supplier_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          credit_amount?: number | null
          currency?: string | null
          debit_amount?: number | null
          description: string
          entry_date: string
          financial_record_id?: string | null
          id?: string
          po_number?: string | null
          purchase_order_id?: string | null
          remark?: string | null
          running_balance?: number
          serial_number: number
          supplier_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          credit_amount?: number | null
          currency?: string | null
          debit_amount?: number | null
          description?: string
          entry_date?: string
          financial_record_id?: string | null
          id?: string
          po_number?: string | null
          purchase_order_id?: string | null
          remark?: string | null
          running_balance?: number
          serial_number?: number
          supplier_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "supplier_ledger_entries_financial_record_id_fkey"
            columns: ["financial_record_id"]
            isOneToOne: false
            referencedRelation: "financial_records"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "supplier_ledger_entries_purchase_order_id_fkey"
            columns: ["purchase_order_id"]
            isOneToOne: false
            referencedRelation: "purchase_orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "supplier_ledger_entries_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "supplier_ledger"
            referencedColumns: ["supplier_id"]
          },
          {
            foreignKeyName: "supplier_ledger_entries_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "supplier_performance"
            referencedColumns: ["supplier_id"]
          },
          {
            foreignKeyName: "supplier_ledger_entries_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
        ]
      }
      supplier_users: {
        Row: {
          access_level: string | null
          created_at: string | null
          id: string
          invited_at: string | null
          invited_by: string | null
          is_active: boolean | null
          supplier_id: string
          user_id: string
        }
        Insert: {
          access_level?: string | null
          created_at?: string | null
          id?: string
          invited_at?: string | null
          invited_by?: string | null
          is_active?: boolean | null
          supplier_id: string
          user_id: string
        }
        Update: {
          access_level?: string | null
          created_at?: string | null
          id?: string
          invited_at?: string | null
          invited_by?: string | null
          is_active?: boolean | null
          supplier_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "supplier_users_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "supplier_ledger"
            referencedColumns: ["supplier_id"]
          },
          {
            foreignKeyName: "supplier_users_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "supplier_performance"
            referencedColumns: ["supplier_id"]
          },
          {
            foreignKeyName: "supplier_users_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
        ]
      }
      suppliers: {
        Row: {
          assigned_team: string[] | null
          bank_account_name: string | null
          bank_account_number: string | null
          bank_address: string | null
          bank_name: string | null
          bank_swift_code: string | null
          city: string | null
          contact_person: string
          country: string | null
          created_at: string
          email: string
          id: string
          phone: string | null
          preferred_currency: string | null
          rating: number | null
          reliability: string | null
          state: string | null
          street: string | null
          supplier_name: string
          total_pos: number | null
          total_value: number | null
          updated_at: string
          wechat_id: string | null
          wecom_api_connected: boolean | null
          wecom_error_count: number | null
          wecom_group_id: string | null
          wecom_integration_status: string | null
          wecom_last_error: string | null
          wecom_last_test: string | null
          wecom_webhook_token: string | null
          wecom_webhook_url: string | null
          zip_code: string | null
        }
        Insert: {
          assigned_team?: string[] | null
          bank_account_name?: string | null
          bank_account_number?: string | null
          bank_address?: string | null
          bank_name?: string | null
          bank_swift_code?: string | null
          city?: string | null
          contact_person: string
          country?: string | null
          created_at?: string
          email: string
          id?: string
          phone?: string | null
          preferred_currency?: string | null
          rating?: number | null
          reliability?: string | null
          state?: string | null
          street?: string | null
          supplier_name: string
          total_pos?: number | null
          total_value?: number | null
          updated_at?: string
          wechat_id?: string | null
          wecom_api_connected?: boolean | null
          wecom_error_count?: number | null
          wecom_group_id?: string | null
          wecom_integration_status?: string | null
          wecom_last_error?: string | null
          wecom_last_test?: string | null
          wecom_webhook_token?: string | null
          wecom_webhook_url?: string | null
          zip_code?: string | null
        }
        Update: {
          assigned_team?: string[] | null
          bank_account_name?: string | null
          bank_account_number?: string | null
          bank_address?: string | null
          bank_name?: string | null
          bank_swift_code?: string | null
          city?: string | null
          contact_person?: string
          country?: string | null
          created_at?: string
          email?: string
          id?: string
          phone?: string | null
          preferred_currency?: string | null
          rating?: number | null
          reliability?: string | null
          state?: string | null
          street?: string | null
          supplier_name?: string
          total_pos?: number | null
          total_value?: number | null
          updated_at?: string
          wechat_id?: string | null
          wecom_api_connected?: boolean | null
          wecom_error_count?: number | null
          wecom_group_id?: string | null
          wecom_integration_status?: string | null
          wecom_last_error?: string | null
          wecom_last_test?: string | null
          wecom_webhook_token?: string | null
          wecom_webhook_url?: string | null
          zip_code?: string | null
        }
        Relationships: []
      }
      tasks: {
        Row: {
          assigned_to: string | null
          created_at: string
          created_by: string | null
          description: string | null
          due_date: string | null
          id: string
          priority: string | null
          related_id: string | null
          related_type: string | null
          status: string | null
          title: string
          updated_at: string
        }
        Insert: {
          assigned_to?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          due_date?: string | null
          id?: string
          priority?: string | null
          related_id?: string | null
          related_type?: string | null
          status?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          assigned_to?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          due_date?: string | null
          id?: string
          priority?: string | null
          related_id?: string | null
          related_type?: string | null
          status?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      time_entries: {
        Row: {
          activity_type: string
          created_at: string
          date: string
          description: string | null
          hourly_rate: number | null
          hours_spent: number
          id: string
          order_id: string | null
          purchase_order_id: string | null
          user_id: string
        }
        Insert: {
          activity_type: string
          created_at?: string
          date?: string
          description?: string | null
          hourly_rate?: number | null
          hours_spent?: number
          id?: string
          order_id?: string | null
          purchase_order_id?: string | null
          user_id: string
        }
        Update: {
          activity_type?: string
          created_at?: string
          date?: string
          description?: string | null
          hourly_rate?: number | null
          hours_spent?: number
          id?: string
          order_id?: string | null
          purchase_order_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "time_entries_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "time_entries_purchase_order_id_fkey"
            columns: ["purchase_order_id"]
            isOneToOne: false
            referencedRelation: "purchase_orders"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      wecom_messages: {
        Row: {
          content: string
          created_at: string | null
          direction: string
          entity_id: string | null
          entity_type: string | null
          entity_update_id: string | null
          id: string
          message_type: string
          metadata: Json | null
          parsed_action: string | null
          parsed_data: Json | null
          processed_at: string | null
          retry_count: number | null
          status: string | null
          supplier_id: string | null
          wecom_message_id: string | null
          wecom_response: Json | null
        }
        Insert: {
          content: string
          created_at?: string | null
          direction: string
          entity_id?: string | null
          entity_type?: string | null
          entity_update_id?: string | null
          id?: string
          message_type: string
          metadata?: Json | null
          parsed_action?: string | null
          parsed_data?: Json | null
          processed_at?: string | null
          retry_count?: number | null
          status?: string | null
          supplier_id?: string | null
          wecom_message_id?: string | null
          wecom_response?: Json | null
        }
        Update: {
          content?: string
          created_at?: string | null
          direction?: string
          entity_id?: string | null
          entity_type?: string | null
          entity_update_id?: string | null
          id?: string
          message_type?: string
          metadata?: Json | null
          parsed_action?: string | null
          parsed_data?: Json | null
          processed_at?: string | null
          retry_count?: number | null
          status?: string | null
          supplier_id?: string | null
          wecom_message_id?: string | null
          wecom_response?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "wecom_messages_entity_update_id_fkey"
            columns: ["entity_update_id"]
            isOneToOne: false
            referencedRelation: "entity_updates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "wecom_messages_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "supplier_ledger"
            referencedColumns: ["supplier_id"]
          },
          {
            foreignKeyName: "wecom_messages_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "supplier_performance"
            referencedColumns: ["supplier_id"]
          },
          {
            foreignKeyName: "wecom_messages_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
        ]
      }
      workflow_progress: {
        Row: {
          assigned_to: string[] | null
          completed_at: string | null
          completed_by: string | null
          created_at: string | null
          entity_id: string
          entity_type: string
          id: string
          notes: string | null
          status: string | null
          step_key: string
          updated_at: string | null
        }
        Insert: {
          assigned_to?: string[] | null
          completed_at?: string | null
          completed_by?: string | null
          created_at?: string | null
          entity_id: string
          entity_type: string
          id?: string
          notes?: string | null
          status?: string | null
          step_key: string
          updated_at?: string | null
        }
        Update: {
          assigned_to?: string[] | null
          completed_at?: string | null
          completed_by?: string | null
          created_at?: string | null
          entity_id?: string
          entity_type?: string
          id?: string
          notes?: string | null
          status?: string | null
          step_key?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      workflow_steps: {
        Row: {
          auto_complete: boolean | null
          blocked_by_steps: string[] | null
          can_skip: boolean | null
          created_at: string | null
          entity_type: string
          id: string
          is_required: boolean | null
          responsible_roles: string[] | null
          step_key: string
          step_name: string
          step_name_cn: string | null
          step_order: number
        }
        Insert: {
          auto_complete?: boolean | null
          blocked_by_steps?: string[] | null
          can_skip?: boolean | null
          created_at?: string | null
          entity_type: string
          id?: string
          is_required?: boolean | null
          responsible_roles?: string[] | null
          step_key: string
          step_name: string
          step_name_cn?: string | null
          step_order: number
        }
        Update: {
          auto_complete?: boolean | null
          blocked_by_steps?: string[] | null
          can_skip?: boolean | null
          created_at?: string | null
          entity_type?: string
          id?: string
          is_required?: boolean | null
          responsible_roles?: string[] | null
          step_key?: string
          step_name?: string
          step_name_cn?: string | null
          step_order?: number
        }
        Relationships: []
      }
    }
    Views: {
      customer_ledger: {
        Row: {
          active_orders: number | null
          balance_due: number | null
          company_name: string | null
          contact_person: string | null
          customer_id: string | null
          total_order_value: number | null
          total_orders: number | null
          total_paid: number | null
        }
        Relationships: []
      }
      employee_workload: {
        Row: {
          active_orders: number | null
          department: string | null
          display_name: string | null
          labor_cost_this_month: number | null
          total_hours_this_month: number | null
          user_id: string | null
        }
        Relationships: []
      }
      supplier_ledger: {
        Row: {
          active_pos: number | null
          balance_owed: number | null
          contact_person: string | null
          supplier_id: string | null
          supplier_name: string | null
          total_paid: number | null
          total_po_value: number | null
          total_pos: number | null
        }
        Relationships: []
      }
      supplier_performance: {
        Row: {
          avg_defect_rate: number | null
          contact_person: string | null
          failed_inspections: number | null
          on_time_deliveries: number | null
          on_time_delivery_rate: number | null
          passed_inspections: number | null
          performance_score: number | null
          qc_pass_rate: number | null
          rating: number | null
          reliability: string | null
          supplier_id: string | null
          supplier_name: string | null
          total_inspections: number | null
          total_pos: number | null
          total_purchase_orders: number | null
          total_value: number | null
        }
        Relationships: []
      }
    }
    Functions: {
      generate_ncr_number: { Args: never; Returns: string }
      generate_order_number: { Args: never; Returns: string }
      generate_po_number: { Args: never; Returns: string }
      generate_quotation_number: { Args: never; Returns: string }
      get_user_role: {
        Args: { _user_id: string }
        Returns: Database["public"]["Enums"]["app_role"]
      }
      has_permission: {
        Args: { _action: string; _module: string; _user_id: string }
        Returns: boolean
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_privileged_user: { Args: { _user_id: string }; Returns: boolean }
    }
    Enums: {
      app_role:
        | "super_admin"
        | "manager"
        | "cfo"
        | "sales"
        | "sourcing"
        | "marketing"
        | "qc"
        | "logistics"
        | "finance"
        | "production"
        | "project_manager"
        | "hr"
        | "merchandising"
        | "customer"
        | "supplier"
      payment_purpose:
        | "customer_deposit"
        | "customer_balance"
        | "factory_deposit"
        | "factory_balance"
        | "shipping_cost"
        | "other"
      trade_term: "EXW" | "FOB" | "CIF" | "DDP" | "DAP"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: [
        "super_admin",
        "manager",
        "cfo",
        "sales",
        "sourcing",
        "marketing",
        "qc",
        "logistics",
        "finance",
        "production",
        "project_manager",
        "hr",
        "merchandising",
        "customer",
        "supplier",
      ],
      payment_purpose: [
        "customer_deposit",
        "customer_balance",
        "factory_deposit",
        "factory_balance",
        "shipping_cost",
        "other",
      ],
      trade_term: ["EXW", "FOB", "CIF", "DDP", "DAP"],
    },
  },
} as const
