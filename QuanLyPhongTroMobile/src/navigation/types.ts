import { NavigatorScreenParams } from "@react-navigation/native";
import { ResourceName } from "../models/management";
export type TabParams = {
  Home: undefined;
  Rooms: undefined;
  Invoices: undefined;
  Incidents: undefined;
  Notifications: undefined;
  Settings: undefined;
};
export type RootParams = {
  Login: undefined;
  Register: undefined;
  Main: NavigatorScreenParams<TabParams> | undefined;
  InvoiceDetail: { id: number };
  IncidentDetail: { id: number };
  Resource: { resource: ResourceName };
  InvoiceCreate: undefined;
};
