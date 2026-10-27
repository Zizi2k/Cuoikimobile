import React from "react";
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { RootParams } from "../../navigation/types";
import { useSession } from "../../context/AuthContext";
import { useHomeModel } from "../../viewmodels/useScreenModels";
import { resources, ResourceName } from "../../models/management";
import {
  Page,
  Card,
  Title,
  Info,
  Button,
  State,
  money,
} from "../components/ui";
export default function HomeScreen() {
  const vm = useHomeModel();
  const session = useSession();
  const navigation = useNavigation<NativeStackNavigationProp<RootParams>>();
  const d = vm.data;
  return (
    <Page>
      <Title>Xin chào, {session.user?.fullname}</Title>
      <Info>
        {session.user?.role === "admin" ? "Chủ trọ" : "Người thuê"} · Realtime:{" "}
        {session.socketStatus}
      </Info>
      <State
        loading={vm.loading}
        error={vm.error}
        retry={() => {
          void vm.load();
        }}
      />
      {d && (
        <>
          {session.user?.role === "admin" ? (
            <>
              <Card>
                <Title>Tổng quan</Title>
                <Info>
                  Tổng phòng: {d.stats?.rooms?.total ?? 0} · Đang thuê:{" "}
                  {d.stats?.rooms?.rented ?? 0}
                </Info>
                <Info>Công nợ: {money(d.stats?.unpaid_invoices_total)}</Info>
                <Info>
                  Sự cố chờ xử lý: {d.stats?.pending_maintenance_count ?? 0}
                </Info>
              </Card>
              <Card>
                <Title>Danh mục quản lý</Title>
                {(Object.keys(resources) as ResourceName[]).map((resource) => (
                  <Button
                    key={resource}
                    title={resources[resource].title}
                    onPress={() =>
                      navigation.navigate("Resource", { resource })
                    }
                  />
                ))}
              </Card>
            </>
          ) : (
            <Card>
              <Title>Phòng và hợp đồng</Title>
              {d.room ? (
                <>
                  <Info>
                    Phòng: {d.room.room_number} · {d.room.area_name}
                  </Info>
                  <Info>Địa chỉ: {d.room.address}</Info>
                  <Info>Giá thuê: {money(d.room.rent_price)}</Info>
                  <Info>Hợp đồng {d.room.contract_code}</Info>
                  <Info>
                    {d.room.start_date} đến {d.room.end_date}
                  </Info>
                </>
              ) : (
                <Info>Bạn chưa có hợp đồng đang hoạt động.</Info>
              )}
            </Card>
          )}
          <Card>
            <Title>Hóa đơn gần đây</Title>
            {(d.invoices || []).map((item: any) => (
              <Button
                key={item.id}
                title={`${item.invoice_code} · ${money(item.remaining_amount)}`}
                onPress={() =>
                  navigation.navigate("InvoiceDetail", { id: Number(item.id) })
                }
              />
            ))}
            {!d.invoices?.length && <Info>Chưa có hóa đơn.</Info>}
          </Card>
        </>
      )}
      <Button
        title="Cập nhật tổng quan"
        onPress={() => {
          void vm.load();
        }}
      />
    </Page>
  );
}
