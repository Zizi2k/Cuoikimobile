import type { NotificationPayload } from "./NotificationPayload";
export function notificationTarget(
  data: NotificationPayload,
): { screen: "InvoiceDetail" | "IncidentDetail"; id: number } | null {
  const kind =
    data.reference_type ||
    (data.invoice_id ? "invoice" : data.request_id ? "maintenance" : "");
  const id = Number(data.reference_id ?? data.invoice_id ?? data.request_id);
  if (!Number.isSafeInteger(id) || id < 1) return null;
  if (kind === "invoice") return { screen: "InvoiceDetail", id };
  if (kind === "maintenance") return { screen: "IncidentDetail", id };
  return null;
}
