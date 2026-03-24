import Constants from "expo-constants";
import type { DailyTriggerInput } from "expo-notifications";
import { useEffect } from "react";
import { Platform } from "react-native";

export function useDailyReminder() {
  useEffect(() => {
    let isActive = true;

    const setupDailyReminder = async () => {
      try {
        // Expo Go does not fully support expo-notifications in SDK 53+.
        // Skip registration there to avoid noisy runtime errors.
        if (Constants.appOwnership === "expo") {
          return;
        }

        const Notifications = await import("expo-notifications");

        Notifications.setNotificationHandler({
          handleNotification: async () => ({
            shouldShowAlert: true,
            shouldShowBanner: true,
            shouldShowList: true,
            shouldPlaySound: true,
            shouldSetBadge: false,
          }),
        });

        if (Platform.OS === "android") {
          await Notifications.setNotificationChannelAsync("daily-reminders", {
            name: "Daily Reminders",
            importance: Notifications.AndroidImportance.DEFAULT,
          });
        }

        const currentPermissions = await Notifications.getPermissionsAsync();
        let finalStatus = currentPermissions.status;

        if (finalStatus !== "granted") {
          const requestResult = await Notifications.requestPermissionsAsync();
          finalStatus = requestResult.status;
        }

        if (!isActive || finalStatus !== "granted") {
          return;
        }

        const dailyTrigger: DailyTriggerInput =
          Platform.OS === "android"
            ? {
                type: Notifications.SchedulableTriggerInputTypes.DAILY,
                hour: 20,
                minute: 0,
                channelId: "daily-reminders",
              }
            : {
                type: Notifications.SchedulableTriggerInputTypes.DAILY,
                hour: 20,
                minute: 0,
              };

        await Notifications.cancelAllScheduledNotificationsAsync();

        await Notifications.scheduleNotificationAsync({
          content: {
            title: "Daily Expense Tracker",
            body: "Did you spend anything today? Don't forget to add it!",
          },
          trigger: dailyTrigger,
        });
      } catch (error) {
        console.error("Failed to setup daily reminder", error);
      }
    };

    setupDailyReminder();

    return () => {
      isActive = false;
    };
  }, []);
}
