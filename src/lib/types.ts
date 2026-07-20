export type WeighingType = 'customer' | 'supplier'
export type WeighingStatus = 'in_progress' | 'completed'

export interface Weighing {
  id: string
  type: WeighingType
  ticket_no: string
  partner_code: string
  partner_name: string
  product_code: string
  product_name: string
  truck_no: string
  gross_kg: number
  tare_kg: number
  netto_kg: number
  date_in: string // YYYY-MM-DD
  time_in: string // HH:mm:ss
  date_out: string | null
  time_out: string | null
  operator: string
  status: WeighingStatus
}
