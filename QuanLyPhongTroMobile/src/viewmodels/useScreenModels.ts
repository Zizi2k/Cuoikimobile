import { useModel } from "./useModel";
import { useSession } from "../context/AuthContext";
import { HomeViewModel } from "./HomeViewModel";
import { RoomsViewModel } from "./useRoomsViewModel";
import { InvoicesViewModel } from "./useInvoicesViewModel";
import { NotificationsViewModel } from "./useNotificationsViewModel";
import { MaintenanceViewModel } from "./MaintenanceViewModel";
import { ResourceViewModel } from "./ResourceViewModel";
import { DetailViewModel } from "./DetailViewModel";
import { ApiHomeRepository } from "../repositories/ApiHomeRepository";
import { ApiRoomRepository } from "../repositories/ApiRoomRepository";
import { ApiInvoiceRepository } from "../repositories/ApiInvoiceRepository";
import { ApiNotificationRepository } from "../repositories/ApiNotificationRepository";
import { ApiMaintenanceRepository } from "../repositories/ApiMaintenanceRepository";
import { ApiManagementRepository } from "../repositories/ApiManagementRepository";
import { scheduleLocalReminder } from "../services/notificationService";
import { ResourceName } from "../models/management";
const loadHome = (m: HomeViewModel) => m.load();
const loadRooms = (m: RoomsViewModel) => m.loadRooms();
const loadInvoices = (m: InvoicesViewModel) => m.loadInvoices();
const loadNotifications = async (m: NotificationsViewModel) => {
  await Promise.all([m.loadNotifications(), m.loadPreferences()]);
};
const loadMaintenance = (m: MaintenanceViewModel) => m.load();
const loadResource = (m: ResourceViewModel) => m.load();
const loadDetail = (m: DetailViewModel) => m.load();
export const useHomeModel = () =>
  useModel(() => new HomeViewModel(new ApiHomeRepository()), loadHome);
export const useRoomsModel = () =>
  useModel(() => new RoomsViewModel(new ApiRoomRepository()), loadRooms);
export const useInvoicesModel = () =>
  useModel(
    () => new InvoicesViewModel(new ApiInvoiceRepository()),
    loadInvoices,
  );
export const useNotificationsModel = () =>
  useModel(
    () =>
      new NotificationsViewModel(new ApiNotificationRepository(), () =>
        scheduleLocalReminder({
          title: "Nhắc thanh toán",
          body: "Kiểm tra hóa đơn tiền phòng.",
          seconds: 60,
          data: { type: "payment_reminder" },
        }),
      ),
    loadNotifications,
  );
export const useMaintenanceModel = () =>
  useModel(
    () => new MaintenanceViewModel(new ApiMaintenanceRepository()),
    loadMaintenance,
  );
export const useResourceModel = (resource: ResourceName) =>
  useModel(
    () => new ResourceViewModel(resource, new ApiManagementRepository()),
    loadResource,
  );
export function useDetailModel(kind: "invoice" | "incident", id: number) {
  const session = useSession();
  return useModel(
    () =>
      new DetailViewModel(
        id,
        kind === "invoice"
          ? {
              async find(i) {
                const item = await new ApiInvoiceRepository().getInvoiceById(i);
                if (!item) throw new Error("Không tìm thấy hóa đơn.");
                return item;
              },
              ...(session.user?.role === "admin"
                ? {
                    async pay(i: number, amount: number) {
                      await new ApiInvoiceRepository().recordPayment(i, amount);
                    },
                  }
                : {}),
              remind: (i) =>
                scheduleLocalReminder({
                  title: "Nhắc thanh toán",
                  body: `Kiểm tra hóa đơn #${i}.`,
                  seconds: 60,
                  data: { reference_type: "invoice", reference_id: i },
                }),
            }
          : { find: (i) => new ApiMaintenanceRepository().find(i) },
      ),
    loadDetail,
  );
}
