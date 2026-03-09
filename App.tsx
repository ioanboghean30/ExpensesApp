import AsyncStorage from "@react-native-async-storage/async-storage";
import {
    createDrawerNavigator,
    DrawerContentScrollView,
    DrawerItem,
    DrawerItemList,
} from "@react-navigation/drawer";
import { NavigationContainer } from "@react-navigation/native";
import { createStackNavigator } from "@react-navigation/stack";
import React, { useEffect, useState } from "react";
import { Text, View } from "react-native"; // Used for the loading screen.
import "react-native-gesture-handler"; // Must be the first import.
import { SafeAreaProvider } from "react-native-safe-area-context";

// Screen imports
import AddExpenseScreen from "./src/screens/AddExpenseScreen";
import HomeScreen from "./src/screens/HomeScreen";
import InitialSetupScreen from "./src/screens/InitialSetupScreen";
import LoginScreen from "./src/screens/LoginScreen";
import SettingsScreen from "./src/screens/SettingsScreen";
import SignupScreen from "./src/screens/SignupScreen";
import StatisticsScreen from "./src/screens/StatisticsScreen";
import UpdateScreen from "./src/screens/UpdateScreen";
import { useAppStore } from "./src/store/useAppStore";

// Navigator initialization
const Drawer = createDrawerNavigator();
const Stack = createStackNavigator();

// Custom drawer content component.
function CustomDrawerContent(props: any) {
  const authStatus = useAppStore((state) => state.authStatus);
  const handleLogout = useAppStore((state) => state.handleLogout);

  return (
    <DrawerContentScrollView {...props}>
      {/* Show standard drawer links */}
      <DrawerItemList {...props} />

      {/* Show logout when authenticated */}
      {authStatus === "loggedIn" && (
        <DrawerItem label="Logout" onPress={handleLogout} />
      )}
      {/* Show logout for guest mode as well */}
      {authStatus === "guest" && (
        <DrawerItem label="Logout" onPress={handleLogout} />
      )}
    </DrawerContentScrollView>
  );
}

// Drawer used after login/guest entry.
function AppDrawer() {
  return (
    <Drawer.Navigator
      initialRouteName="Home"
      // Use the custom drawer content above.
      drawerContent={(props) => <CustomDrawerContent {...props} />}
      // Shared header styling for drawer screens.
      screenOptions={{
        headerTintColor: "#007AAF", // Blue back arrow.
        headerTitleAlign: "center", // Centered title.
        headerStyle: { backgroundColor: "#fff" },
        headerTitleStyle: { fontWeight: "bold" },
      }}
    >
      <Drawer.Screen
        name="Home"
        component={HomeScreen}
        options={{ title: "Home" }}
      />

      <Drawer.Screen
        name="SettingsScreen"
        component={SettingsScreen}
        options={{ title: "Settings" }}
      />
      <Drawer.Screen
        name="AddExpenseScreen"
        component={AddExpenseScreen}
        options={{
          title: "Add Expense",
          drawerItemStyle: { display: "none" }, // Hide from drawer list.
        }}
      />
      <Drawer.Screen
        name="UpdateScreen"
        component={UpdateScreen}
        options={{
          title: "Update Expense",
          drawerItemStyle: { display: "none" }, // Hide from drawer list.
        }}
      />

      <Drawer.Screen
        name="StatisticsScreen"
        component={StatisticsScreen}
        options={{
          title: "Statistics",
          drawerItemStyle: { display: "none" }, // Hide from drawer list.
        }}
      />

      <Drawer.Screen
        name="InitialSetupScreen"
        component={InitialSetupScreen}
        options={{
          title: "Welcome",
          drawerItemStyle: { display: "none" }, // Hide from side menu.
          headerShown: false, // No top header.
        }}
      />
    </Drawer.Navigator>
  );
}

// Main app component.
function App() {
  const authStatus = useAppStore((state) => state.authStatus);
  const hydrateFromStorage = useAppStore((state) => state.hydrateFromStorage);
  const [isLoadingAuth, setIsLoadingAuth] = useState(true);

  useEffect(() => {
    const hydrateStore = async () => {
      try {
        await hydrateFromStorage();
      } catch (e) {
        console.error("Error:", e);
      } finally {
        setIsLoadingAuth(false);
      }
    };
    hydrateStore();
  }, [hydrateFromStorage]);

  useEffect(() => {
    const saveAuthStatus = async () => {
      try {
        await AsyncStorage.setItem("authStatus", authStatus);
      } catch (e) {
        console.error("Saving error:", e);
      }
    };
    // Do not persist while hydration is still loading.
    if (!isLoadingAuth) {
      saveAuthStatus();
    }
  }, [authStatus, isLoadingAuth]);

  // Render tree
  return (
    <SafeAreaProvider>
      <NavigationContainer>
        {isLoadingAuth ? (
          // Loading screen
          <View
            style={{ flex: 1, justifyContent: "center", alignItems: "center" }}
          >
            <Text>Loading...</Text>
          </View>
        ) : authStatus === "loggedIn" || authStatus === "guest" ? (
          // Logged in or guest: show drawer.
          <AppDrawer />
        ) : (
          // Logged out: show auth stack.
          <Stack.Navigator>
            <Stack.Screen
              name="Login"
              component={LoginScreen}
              options={{ headerShown: false }}
            />
            <Stack.Screen name="Signup" component={SignupScreen} />
          </Stack.Navigator>
        )}
      </NavigationContainer>
    </SafeAreaProvider>
  );
}

export default App;
