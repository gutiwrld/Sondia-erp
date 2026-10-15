
export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export type Database = {
  
  "graphql_public": {
          Tables: {
            [_ in never]: never
          }
          Views: {
            [_ in never]: never
          }
          Functions: {
            "graphql":
{ Args: { "extensions"?: Json,"operationName"?: string,"query"?: string,"variables"?: Json }; Returns: Json
                           }
          }
          Enums: {
            [_ in never]: never
          }
          CompositeTypes: {
            [_ in never]: never
          }
        },"public": {
          Tables: {
            "client_events": {
                  Row: {
                    "body": string,"client_id": string,"created_at": string,"from_stage": Database["public"]['Enums']["client_stage"] | null,"id": string,"member_id": string | null,"occurred_at": string,"to_stage": Database["public"]['Enums']["client_stage"] | null,"type": Database["public"]['Enums']["client_event_type"]
                  }
                  ComputedFields: never
                  Insert: {
                    "body"?: string,"client_id": string,"created_at"?: string,"from_stage"?: Database["public"]['Enums']["client_stage"] | null,"id"?: string,"member_id"?: string | null,"occurred_at"?: string,"to_stage"?: Database["public"]['Enums']["client_stage"] | null,"type": Database["public"]['Enums']["client_event_type"]
                  }
                  Update: {
                    "body"?: string,"client_id"?: string,"created_at"?: string,"from_stage"?: Database["public"]['Enums']["client_stage"] | null,"id"?: string,"member_id"?: string | null,"occurred_at"?: string,"to_stage"?: Database["public"]['Enums']["client_stage"] | null,"type"?: Database["public"]['Enums']["client_event_type"]
                  }
                  Relationships: [
                    {
      foreignKeyName: "client_events_client_id_fkey"
      columns: ["client_id"]
isOneToOne: false
      referencedRelation: "clients"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "client_events_member_id_fkey"
      columns: ["member_id"]
isOneToOne: false
      referencedRelation: "members"
      referencedColumns: ["id"]
    }
                  ]
                },"client_owners": {
                  Row: {
                    "client_id": string,"member_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "client_id": string,"member_id": string
                  }
                  Update: {
                    "client_id"?: string,"member_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "client_owners_client_id_fkey"
      columns: ["client_id"]
isOneToOne: false
      referencedRelation: "clients"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "client_owners_member_id_fkey"
      columns: ["member_id"]
isOneToOne: false
      referencedRelation: "members"
      referencedColumns: ["id"]
    }
                  ]
                },"clients": {
                  Row: {
                    "batch": string,"city": string,"contact_name": string,"created_at": string,"do_not_contact": boolean,"do_not_contact_at": string | null,"do_not_contact_reason": string,"email": string,"email_bounced": boolean,"email_subject": string,"id": string,"lost_reason": string,"name": string,"next_action": string,"next_action_date": string | null,"notes": string,"phone": string,"pricing": Database["public"]['Enums']["pricing_model"] | null,"province": string,"sector": string,"send_account": string,"service": string,"source": string,"stage": Database["public"]['Enums']["client_stage"],"updated_at": string,"value_eur": number | null,"website": string
                  }
                  ComputedFields: never
                  Insert: {
                    "batch"?: string,"city"?: string,"contact_name"?: string,"created_at"?: string,"do_not_contact"?: boolean,"do_not_contact_at"?: string | null,"do_not_contact_reason"?: string,"email"?: string,"email_bounced"?: boolean,"email_subject"?: string,"id"?: string,"lost_reason"?: string,"name": string,"next_action"?: string,"next_action_date"?: string | null,"notes"?: string,"phone"?: string,"pricing"?: Database["public"]['Enums']["pricing_model"] | null,"province"?: string,"sector"?: string,"send_account"?: string,"service"?: string,"source"?: string,"stage"?: Database["public"]['Enums']["client_stage"],"updated_at"?: string,"value_eur"?: number | null,"website"?: string
                  }
                  Update: {
                    "batch"?: string,"city"?: string,"contact_name"?: string,"created_at"?: string,"do_not_contact"?: boolean,"do_not_contact_at"?: string | null,"do_not_contact_reason"?: string,"email"?: string,"email_bounced"?: boolean,"email_subject"?: string,"id"?: string,"lost_reason"?: string,"name"?: string,"next_action"?: string,"next_action_date"?: string | null,"notes"?: string,"phone"?: string,"pricing"?: Database["public"]['Enums']["pricing_model"] | null,"province"?: string,"sector"?: string,"send_account"?: string,"service"?: string,"source"?: string,"stage"?: Database["public"]['Enums']["client_stage"],"updated_at"?: string,"value_eur"?: number | null,"website"?: string
                  }
                  Relationships: [
                    
                  ]
                },"learning_paths": {
                  Row: {
                    "created_at": string,"doc_url": string,"due_date": string | null,"id": string,"notes": string,"number": number | null,"owner_id": string,"status": Database["public"]['Enums']["lp_status"],"title": string,"updated_at": string,"validators": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"doc_url"?: string,"due_date"?: string | null,"id"?: string,"notes"?: string,"number"?: number | null,"owner_id": string,"status"?: Database["public"]['Enums']["lp_status"],"title": string,"updated_at"?: string,"validators"?: string
                  }
                  Update: {
                    "created_at"?: string,"doc_url"?: string,"due_date"?: string | null,"id"?: string,"notes"?: string,"number"?: number | null,"owner_id"?: string,"status"?: Database["public"]['Enums']["lp_status"],"title"?: string,"updated_at"?: string,"validators"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "learning_paths_owner_id_fkey"
      columns: ["owner_id"]
isOneToOne: false
      referencedRelation: "members"
      referencedColumns: ["id"]
    }
                  ]
                },"members": {
                  Row: {
                    "active": boolean,"created_at": string,"email": string,"id": string,"initials": string,"name": string,"short_name": string,"updated_at": string,"user_id": string | null,"weekly_hours_goal": number
                  }
                  ComputedFields: never
                  Insert: {
                    "active"?: boolean,"created_at"?: string,"email": string,"id"?: string,"initials": string,"name": string,"short_name": string,"updated_at"?: string,"user_id"?: string | null,"weekly_hours_goal"?: number
                  }
                  Update: {
                    "active"?: boolean,"created_at"?: string,"email"?: string,"id"?: string,"initials"?: string,"name"?: string,"short_name"?: string,"updated_at"?: string,"user_id"?: string | null,"weekly_hours_goal"?: number
                  }
                  Relationships: [
                    
                  ]
                },"obvs": {
                  Row: {
                    "client_id": string | null,"company": string,"created_at": string,"doc_url": string,"id": string,"interviewee": string,"learning_path_id": string | null,"meeting_date": string,"notes": string,"number": number | null,"owner_id": string,"type": Database["public"]['Enums']["obv_type"],"updated_at": string,"written_date": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "client_id"?: string | null,"company"?: string,"created_at"?: string,"doc_url"?: string,"id"?: string,"interviewee"?: string,"learning_path_id"?: string | null,"meeting_date": string,"notes"?: string,"number"?: number | null,"owner_id": string,"type": Database["public"]['Enums']["obv_type"],"updated_at"?: string,"written_date"?: string | null
                  }
                  Update: {
                    "client_id"?: string | null,"company"?: string,"created_at"?: string,"doc_url"?: string,"id"?: string,"interviewee"?: string,"learning_path_id"?: string | null,"meeting_date"?: string,"notes"?: string,"number"?: number | null,"owner_id"?: string,"type"?: Database["public"]['Enums']["obv_type"],"updated_at"?: string,"written_date"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "obvs_client_id_fkey"
      columns: ["client_id"]
isOneToOne: false
      referencedRelation: "clients"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "obvs_learning_path_id_fkey"
      columns: ["learning_path_id"]
isOneToOne: false
      referencedRelation: "learning_paths"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "obvs_owner_id_fkey"
      columns: ["owner_id"]
isOneToOne: false
      referencedRelation: "members"
      referencedColumns: ["id"]
    }
                  ]
                },"payments": {
                  Row: {
                    "amount_eur": number,"client_id": string,"concept": string,"created_at": string,"id": string,"invoice_ref": string | null,"member_id": string | null,"paid_on": string,"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "amount_eur": number,"client_id": string,"concept"?: string,"created_at"?: string,"id"?: string,"invoice_ref"?: string | null,"member_id"?: string | null,"paid_on": string,"updated_at"?: string
                  }
                  Update: {
                    "amount_eur"?: number,"client_id"?: string,"concept"?: string,"created_at"?: string,"id"?: string,"invoice_ref"?: string | null,"member_id"?: string | null,"paid_on"?: string,"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "payments_client_id_fkey"
      columns: ["client_id"]
isOneToOne: false
      referencedRelation: "clients"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "payments_member_id_fkey"
      columns: ["member_id"]
isOneToOne: false
      referencedRelation: "members"
      referencedColumns: ["id"]
    }
                  ]
                },"task_owners": {
                  Row: {
                    "member_id": string,"task_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "member_id": string,"task_id": string
                  }
                  Update: {
                    "member_id"?: string,"task_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "task_owners_member_id_fkey"
      columns: ["member_id"]
isOneToOne: false
      referencedRelation: "members"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "task_owners_task_id_fkey"
      columns: ["task_id"]
isOneToOne: false
      referencedRelation: "tasks"
      referencedColumns: ["id"]
    }
                  ]
                },"tasks": {
                  Row: {
                    "client_id": string | null,"completed_at": string | null,"created_at": string,"created_by": string | null,"description": string,"due_date": string | null,"id": string,"learning_path_id": string | null,"position": number,"priority": Database["public"]['Enums']["task_priority"],"status": Database["public"]['Enums']["task_status"],"title": string,"updated_at": string,"weekly_goal_id": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "client_id"?: string | null,"completed_at"?: string | null,"created_at"?: string,"created_by"?: string | null,"description"?: string,"due_date"?: string | null,"id"?: string,"learning_path_id"?: string | null,"position"?: number,"priority"?: Database["public"]['Enums']["task_priority"],"status"?: Database["public"]['Enums']["task_status"],"title": string,"updated_at"?: string,"weekly_goal_id"?: string | null
                  }
                  Update: {
                    "client_id"?: string | null,"completed_at"?: string | null,"created_at"?: string,"created_by"?: string | null,"description"?: string,"due_date"?: string | null,"id"?: string,"learning_path_id"?: string | null,"position"?: number,"priority"?: Database["public"]['Enums']["task_priority"],"status"?: Database["public"]['Enums']["task_status"],"title"?: string,"updated_at"?: string,"weekly_goal_id"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "tasks_client_id_fkey"
      columns: ["client_id"]
isOneToOne: false
      referencedRelation: "clients"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "tasks_created_by_fkey"
      columns: ["created_by"]
isOneToOne: false
      referencedRelation: "members"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "tasks_learning_path_id_fkey"
      columns: ["learning_path_id"]
isOneToOne: false
      referencedRelation: "learning_paths"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "tasks_weekly_goal_id_fkey"
      columns: ["weekly_goal_id"]
isOneToOne: false
      referencedRelation: "weekly_goals"
      referencedColumns: ["id"]
    }
                  ]
                },"time_entries": {
                  Row: {
                    "category": Database["public"]['Enums']["hour_category"],"client_id": string | null,"created_at": string,"created_by": string | null,"date": string,"ended_at": string | null,"id": string,"member_id": string,"minutes": number,"note": string,"started_at": string | null,"task_id": string | null,"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "category": Database["public"]['Enums']["hour_category"],"client_id"?: string | null,"created_at"?: string,"created_by"?: string | null,"date": string,"ended_at"?: string | null,"id"?: string,"member_id": string,"minutes": number,"note"?: string,"started_at"?: string | null,"task_id"?: string | null,"updated_at"?: string
                  }
                  Update: {
                    "category"?: Database["public"]['Enums']["hour_category"],"client_id"?: string | null,"created_at"?: string,"created_by"?: string | null,"date"?: string,"ended_at"?: string | null,"id"?: string,"member_id"?: string,"minutes"?: number,"note"?: string,"started_at"?: string | null,"task_id"?: string | null,"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "time_entries_client_id_fkey"
      columns: ["client_id"]
isOneToOne: false
      referencedRelation: "clients"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "time_entries_created_by_fkey"
      columns: ["created_by"]
isOneToOne: false
      referencedRelation: "members"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "time_entries_member_id_fkey"
      columns: ["member_id"]
isOneToOne: false
      referencedRelation: "members"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "time_entries_task_id_fkey"
      columns: ["task_id"]
isOneToOne: false
      referencedRelation: "tasks"
      referencedColumns: ["id"]
    }
                  ]
                },"timers": {
                  Row: {
                    "category": Database["public"]['Enums']["hour_category"] | null,"client_id": string | null,"created_at": string,"member_id": string,"note": string,"started_at": string,"task_id": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "category"?: Database["public"]['Enums']["hour_category"] | null,"client_id"?: string | null,"created_at"?: string,"member_id": string,"note"?: string,"started_at"?: string,"task_id"?: string | null
                  }
                  Update: {
                    "category"?: Database["public"]['Enums']["hour_category"] | null,"client_id"?: string | null,"created_at"?: string,"member_id"?: string,"note"?: string,"started_at"?: string,"task_id"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "timers_client_id_fkey"
      columns: ["client_id"]
isOneToOne: false
      referencedRelation: "clients"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "timers_member_id_fkey"
      columns: ["member_id"]
isOneToOne: true
      referencedRelation: "members"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "timers_task_id_fkey"
      columns: ["task_id"]
isOneToOne: false
      referencedRelation: "tasks"
      referencedColumns: ["id"]
    }
                  ]
                },"weekly_goal_owners": {
                  Row: {
                    "member_id": string,"weekly_goal_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "member_id": string,"weekly_goal_id": string
                  }
                  Update: {
                    "member_id"?: string,"weekly_goal_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "weekly_goal_owners_member_id_fkey"
      columns: ["member_id"]
isOneToOne: false
      referencedRelation: "members"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "weekly_goal_owners_weekly_goal_id_fkey"
      columns: ["weekly_goal_id"]
isOneToOne: false
      referencedRelation: "weekly_goals"
      referencedColumns: ["id"]
    }
                  ]
                },"weekly_goals": {
                  Row: {
                    "carried_from_id": string | null,"created_at": string,"days": (number)[],"id": string,"position": number,"status": Database["public"]['Enums']["goal_status"],"title": string,"updated_at": string,"week_start": string
                  }
                  ComputedFields: never
                  Insert: {
                    "carried_from_id"?: string | null,"created_at"?: string,"days"?: (number)[],"id"?: string,"position"?: number,"status"?: Database["public"]['Enums']["goal_status"],"title": string,"updated_at"?: string,"week_start": string
                  }
                  Update: {
                    "carried_from_id"?: string | null,"created_at"?: string,"days"?: (number)[],"id"?: string,"position"?: number,"status"?: Database["public"]['Enums']["goal_status"],"title"?: string,"updated_at"?: string,"week_start"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "weekly_goals_carried_from_id_fkey"
      columns: ["carried_from_id"]
isOneToOne: false
      referencedRelation: "weekly_goals"
      referencedColumns: ["id"]
    }
                  ]
                }
          }
          Views: {
            [_ in never]: never
          }
          Functions: {
            "current_member_id":
{ Args: Record<PropertyKey, never>; Returns: string
                           },
"is_member":
{ Args: Record<PropertyKey, never>; Returns: boolean
                           }
          }
          Enums: {
            "client_event_type": "nota"|"cambio_etapa"|"email"|"llamada"|"reunion"|"maqueta"|"propuesta"|"cobro"|"importacion"|"no_contactar","client_stage": "lead"|"contactado"|"respondio"|"reunion"|"maqueta_enviada"|"propuesta_enviada"|"negociacion"|"ganado"|"perdido","goal_status": "pendiente"|"en_curso"|"hecho"|"no_hecho"|"arrastrado","hour_category": "ventas"|"desarrollo"|"clientes"|"lp_obv"|"gestion"|"formacion","lp_status": "idea"|"en_curso"|"entregada"|"validada","obv_type": "investigacion"|"validacion"|"seguimiento"|"venta_positiva"|"venta_negativa","pricing_model": "fijo"|"fijo_comision"|"solo_comision","task_priority": "baja"|"media"|"alta","task_status": "por_hacer"|"en_curso"|"hecha"
          }
          CompositeTypes: {
            [_ in never]: never
          }
        }
}

type DatabaseWithoutInternals = Omit<Database, '__InternalSupabase'>

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
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
  ? (DefaultSchema["Tables"] & DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
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
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
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
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
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
    : never = never
> = DefaultSchemaEnumNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
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
    : never = never
> = PublicCompositeTypeNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
  ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
  : never

export const Constants = {
  "graphql_public": {
          Enums: {
            
          }
        },"public": {
          Enums: {
            "client_event_type": ["nota", "cambio_etapa", "email", "llamada", "reunion", "maqueta", "propuesta", "cobro", "importacion", "no_contactar"],"client_stage": ["lead", "contactado", "respondio", "reunion", "maqueta_enviada", "propuesta_enviada", "negociacion", "ganado", "perdido"],"goal_status": ["pendiente", "en_curso", "hecho", "no_hecho", "arrastrado"],"hour_category": ["ventas", "desarrollo", "clientes", "lp_obv", "gestion", "formacion"],"lp_status": ["idea", "en_curso", "entregada", "validada"],"obv_type": ["investigacion", "validacion", "seguimiento", "venta_positiva", "venta_negativa"],"pricing_model": ["fijo", "fijo_comision", "solo_comision"],"task_priority": ["baja", "media", "alta"],"task_status": ["por_hacer", "en_curso", "hecha"]
          }
        }
} as const
