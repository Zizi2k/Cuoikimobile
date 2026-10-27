export interface NotificationPayload {
  [key: string]: unknown;
  notification_id?: number | string;
  reference_type?: string;
  reference_id?: number | string;
  invoice_id?: number | string;
  request_id?: number | string;
  type?: string;
}
