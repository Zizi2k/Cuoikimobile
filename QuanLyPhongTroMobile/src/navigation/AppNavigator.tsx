import React, { useEffect } from "react";
import { Text } from "react-native";
import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { RootParams, TabParams } from "./types";
import { navigationRef, flushNotification } from "./notificationRouting";
import { useSession } from "../context/AuthContext";
import { Page, State, Title } from "../views/components/ui";
import { LoginScreen, RegisterScreen } from "../views/screens/AuthScreens";
import HomeScreen from "../views/screens/HomeScreen";
import RoomsView from "../views/RoomsView";
import InvoicesView from "../views/InvoicesView";
import NotificationsView from "../views/NotificationsView";
import MaintenanceScreen from "../views/screens/MaintenanceScreen";
import SettingsScreen from "../views/screens/SettingsScreen";
import ResourceScreen from "../views/screens/ResourceScreen";
import InvoiceCreateScreen from "../views/screens/InvoiceCreateScreen";
import {
  InvoiceDetailScreen,
  IncidentDetailScreen,
} from "../views/screens/DetailScreen";
const Stack = createNativeStackNavigator<RootParams>();
const Tab = createBottomTabNavigator<TabParams>();
function MainTabs() {
  const session = useSession();
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: "#176b77",
        tabBarIcon: ({ color }) => (
          <Text style={{ color, fontSize: 12, fontWeight: "700" }}>
            {
              {
                Home: "TQ",
                Rooms: "P",
                Invoices: "HĐ",
                Incidents: "SC",
                Notifications: "TB",
                Settings: "TK",
              }[route.name]
            }
          </Text>
        ),
      })}
    >
      <Tab.Screen
        name="Home"
        component={HomeScreen}
        options={{ title: "Tổng quan" }}
      />
      {session.user?.role === "admin" && (
        <Tab.Screen
          name="Rooms"
          component={RoomsView}
          options={{ title: "Phòng" }}
        />
      )}
      <Tab.Screen
        name="Invoices"
        component={InvoicesView}
        options={{ title: "Hóa đơn" }}
      />
      <Tab.Screen
        name="Incidents"
        component={MaintenanceScreen}
        options={{ title: "Sự cố" }}
      />
      <Tab.Screen
        name="Notifications"
        component={NotificationsView}
        options={{ title: "Thông báo" }}
      />
      <Tab.Screen
        name="Settings"
        component={SettingsScreen}
        options={{ title: "Tài khoản" }}
      />
    </Tab.Navigator>
  );
}
export default function AppNavigator() {
  const session = useSession();
  useEffect(() => {
    const timer = setTimeout(flushNotification, 0);
    return () => clearTimeout(timer);
  }, [session.token]);
  if (session.restoring)
    return (
      <SafeAreaProvider>
        <Page>
          <Title>Khôi phục phiên đăng nhập</Title>
          <State loading />
        </Page>
      </SafeAreaProvider>
    );
  return (
    <SafeAreaProvider>
      <NavigationContainer
        ref={navigationRef}
        onReady={flushNotification}
        onStateChange={flushNotification}
      >
        <Stack.Navigator
          screenOptions={{
            headerTintColor: "#17344b",
            headerStyle: { backgroundColor: "#fff" },
          }}
        >
          {session.token ? (
            <>
              <Stack.Screen
                name="Main"
                component={MainTabs}
                options={{ title: "Quản lý phòng trọ" }}
              />
              <Stack.Screen
                name="InvoiceDetail"
                getId={({ params }) => String(params.id)}
                component={InvoiceDetailScreen}
                options={{ title: "Chi tiết hóa đơn" }}
              />
              <Stack.Screen
                name="IncidentDetail"
                getId={({ params }) => String(params.id)}
                component={IncidentDetailScreen}
                options={{ title: "Chi tiết sự cố" }}
              />
              {session.user?.role === "admin" && (
                <>
                  <Stack.Screen
                    name="Resource"
                    getId={({ params }) => params.resource}
                    component={ResourceScreen}
                    options={{ title: "Quản lý danh mục" }}
                  />
                  <Stack.Screen
                    name="InvoiceCreate"
                    component={InvoiceCreateScreen}
                    options={{ title: "Lập hóa đơn" }}
                  />
                </>
              )}
            </>
          ) : (
            <>
              <Stack.Screen
                name="Login"
                component={LoginScreen}
                options={{ headerShown: false }}
              />
              <Stack.Screen
                name="Register"
                component={RegisterScreen}
                options={{ title: "Đăng ký" }}
              />
            </>
          )}
        </Stack.Navigator>
      </NavigationContainer>
    </SafeAreaProvider>
  );
}
