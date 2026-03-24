import { useCallback, useEffect, useRef, useState } from "react";
import { Platform } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import Constants from "expo-constants";
import * as Notifications from "expo-notifications";
import { UseNotificationsReturnType } from "../types"; // Импорт типов
import { updateMyPushToken } from "../utils/api";

/**
 * useNotifications — кастомный хук для управления push-уведомлениями.
 *
 * ЧТО ДЕЛАЕТ:
 * 1. При загрузке запрашивает разрешение на уведомления
 * 2. На Android создаёт канал для уведомлений (обязательно)
 * 3. Предоставляет функцию showLocalNotification для показа уведомлений
 *
 * ПАРАМЕТРЫ: нет
 *
 * ВОЗВРАЩАЕТ:
 * - showLocalNotification: функция для показа уведомления
 */

// Настройка обработчика для всех уведомлений (не для веб-версии)
// Это говорит приложению: показывай алерты, проигрывай звук, но не ставь счётчик
if (Platform.OS !== "web") {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true, // Показывать визуальное уведомление
      shouldPlaySound: true, // Проигрывать звуковой сигнал
      shouldSetBadge: false, // Не добавлять число на иконку
      shouldShowBanner: true, // Показывать баннер уведомления
      shouldShowList: true, // Показывать в списке уведомлений
    }),
  });
}

export function useNotifications(): UseNotificationsReturnType {
  const [pendingChatIdFromNotification, setPendingChatIdFromNotification] =
    useState<string | null>(null);
  const lastSyncedPushTokenRef = useRef("");
  const syncingPushTokenRef = useRef(false);

  const logNotifications = useCallback((message: string, payload?: unknown) => {
    if (payload === undefined) {
      console.log(`[notifications] ${message}`);
      return;
    }

    console.log(`[notifications] ${message}`, payload);
  }, []);

  const extractChatId = (data: unknown): string | null => {
    if (!data || typeof data !== "object") {
      return null;
    }

    const chatId = (data as { chatId?: unknown }).chatId;
    if (typeof chatId !== "string") {
      return null;
    }

    const normalized = chatId.trim();
    return normalized.length > 0 ? normalized : null;
  };

  const syncPushTokenWithServer = useCallback(async (): Promise<void> => {
    if (Platform.OS === "web" || syncingPushTokenRef.current) {
      if (Platform.OS === "web") {
        logNotifications("sync skipped on web");
      } else {
        logNotifications("sync skipped because previous sync is still running");
      }
      return;
    }

    syncingPushTokenRef.current = true;
    try {
      logNotifications("starting push token sync");

      const { status: existingStatus } =
        await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;

      logNotifications("current notification permission", existingStatus);

      if (existingStatus !== "granted") {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
        logNotifications("permission requested, new status", status);
      }

      if (finalStatus !== "granted") {
        logNotifications("push token sync aborted because permission was not granted");
        return;
      }

      const projectId =
        Constants?.expoConfig?.extra?.eas?.projectId ||
        Constants?.easConfig?.projectId;

      logNotifications("resolved Expo projectId", projectId || "missing");

      const tokenData = projectId
        ? await Notifications.getExpoPushTokenAsync({ projectId })
        : await Notifications.getExpoPushTokenAsync();

      logNotifications("received Expo push token response", tokenData);

      const pushToken = (tokenData?.data || "").trim();
      if (!pushToken) {
        logNotifications("push token sync aborted because token is empty");
        return;
      }

      logNotifications("resolved Expo push token", pushToken);

      if (lastSyncedPushTokenRef.current === pushToken) {
        logNotifications("push token sync skipped because token is already synced");
        return;
      }

      const authToken = await AsyncStorage.getItem("auth_token");
      if (!authToken) {
        logNotifications("push token sync aborted because auth token is missing");
        return;
      }

      logNotifications("sending Expo push token to server");
      await updateMyPushToken(authToken, pushToken);
      lastSyncedPushTokenRef.current = pushToken;
      logNotifications("Expo push token synced successfully");
    } catch (e) {
      console.log("[notifications] Ошибка синхронизации push токена:", e);
    } finally {
      syncingPushTokenRef.current = false;
      logNotifications("push token sync finished");
    }
  }, [logNotifications]);

  const clearPendingChatIdFromNotification = useCallback(() => {
    setPendingChatIdFromNotification(null);
  }, []);

  const clearNotificationsForChat = useCallback(
    async (chatId: string): Promise<void> => {
      if (Platform.OS === "web" || !chatId) {
        return;
      }

      try {
        const presented = await Notifications.getPresentedNotificationsAsync();
        logNotifications("presented notifications before clear", presented);

        const idsToDismiss = presented
          .filter((notification) => {
            const notificationChatId = extractChatId(
              notification.request.content.data,
            );
            return notificationChatId === chatId;
          })
          .map((notification) => notification.request.identifier);

        await Promise.all(
          idsToDismiss.map((id) =>
            Notifications.dismissNotificationAsync(id).catch(() => undefined),
          ),
        );

        logNotifications("notification ids selected for dismiss", idsToDismiss);

        await Notifications.setBadgeCountAsync(0).catch(() => undefined);
      } catch (e) {
        console.log("Ошибка очистки уведомлений чата:", e);
      }
    },
    [logNotifications],
  );

  /**
   * Эффект: инициализация уведомлений при загрузке
   * Выполняется один раз при монтировании компонента
   */
  useEffect(() => {
    // Асинхронная функция инициализации
    const initNotifications = async (): Promise<void> => {
      // Только для мобильных приложений (не для веба)
      if (Platform.OS !== "web") {
        try {
          logNotifications("notifications init started");

          /**
           * Шаг 1: Проверяем, есть ли уже разрешение на уведомления
           * getPermissionsAsync() возвращает объект вида { status: 'granted', ... }
           */
          const { status: existingStatus } =
            await Notifications.getPermissionsAsync();

          // Устанавливаем переменную finalStatus в текущий статус
          let finalStatus = existingStatus;

          logNotifications("init permission status", existingStatus);

          /**
           * Шаг 2: Если разрешение не дано ('granted'), просим разрешение
           * requestPermissionsAsync() показывает диалог пользователю
           */
          if (existingStatus !== "granted") {
            const { status } = await Notifications.requestPermissionsAsync();
            finalStatus = status;
            logNotifications("init requested permission, new status", status);
          }

          if (finalStatus !== "granted") {
            logNotifications("notifications init aborted because permission was not granted");
            return;
          }

          /**
           * Шаг 3: Для Android создаём канал уведомлений
           * Канал — это категория уведомлений с определёнными настройками
           * На iOS каналов нет, поэтому проверяем платформу
           */
          if (Platform.OS === "android") {
            await Notifications.setNotificationChannelAsync("chat-messages", {
              name: "Сообщения чата", // Название канала
              importance: Notifications.AndroidImportance.MAX, // Максимальный приоритет (показывать сверху)
              vibrationPattern: [0, 250, 250, 250], // Вибрация: пауза, 250мс, пауза, 250мс
              lightColor: "#FF231F7C", // Цвет индикатора
            });

            logNotifications("Android notification channel configured", "chat-messages");
          }
        } catch (e) {
          // Если что-то пошло не так, логируем ошибку
          console.log("[notifications] Ошибка уведомлений:", e);
        }
      }
    };

    // Запускаем инициализацию
    initNotifications();
    void syncPushTokenWithServer();
  }, []); // Пустой массив = выполнить один раз

  useEffect(() => {
    if (Platform.OS === "web") {
      return;
    }

    const subscription = Notifications.addNotificationResponseReceivedListener(
      (response) => {
        logNotifications("notification response received", response.notification.request.content.data);
        const chatId = extractChatId(
          response.notification.request.content.data,
        );
        if (chatId) {
          logNotifications("chatId extracted from notification response", chatId);
          setPendingChatIdFromNotification(chatId);
        }
      },
    );

    void Notifications.getLastNotificationResponseAsync()
      .then((response) => {
        if (!response) {
          logNotifications("no last notification response found");
          return;
        }

        logNotifications("last notification response restored", response.notification.request.content.data);

        const chatId = extractChatId(
          response.notification.request.content.data,
        );
        if (chatId) {
          logNotifications("chatId extracted from last notification response", chatId);
          setPendingChatIdFromNotification(chatId);
        }
      })
      .catch((e) => {
        console.log("[notifications] Ошибка чтения последнего ответа уведомления:", e);
      });

    return () => {
      subscription.remove();
    };
  }, []);

  /**
   * showLocalNotification — функция для показа уведомления
   *
   * ПАРАМЕТРЫ:
   * - title: заголовок уведомления (строка, например "Иван")
   * - body: содержание уведомления (строка, например "Привет!")
   *
   * ЧТО ДЕЛАЕТ:
   * 1. Проверяет, не веб ли это
   * 2. Отправляет на устройство немедленное уведомление с настройками
   *
   * ВОЗВРАЩАЕТ: Promise (асинхронная операция)
   */
  const showLocalNotification = async (
    title: string, // Заголовок
    body: string, // Текст
    options?: { chatId?: string; senderAvatar?: string },
  ): Promise<void> => {
    // Не показываем уведомления на веба (нет смысла)
    if (Platform.OS === "web") return;

    try {
      logNotifications("scheduling local notification", {
        title,
        body,
        options,
      });

      /**
       * scheduleNotificationAsync — отправляет уведомление
       *
       * content: что показывать в уведомлении
       * trigger: когда показывать (null = сразу же)
       */
      await Notifications.scheduleNotificationAsync({
        content: {
          title: title, // Заголовок (имя отправителя)
          body: body, // Текст сообщения
          sound: true, // Проигрывать звук
          data: {
            chatId: options?.chatId,
            senderAvatar: options?.senderAvatar,
          },
        },
        trigger: null, // null = показать сразу же
      });

      logNotifications("local notification scheduled successfully");
    } catch (e) {
      // Если ошибка при отправке уведомления
      console.log("[notifications] Ошибка уведомления:", e);
    }
  };

  // Возвращаем объект с функцией
  return {
    showLocalNotification,
    syncPushTokenWithServer,
    pendingChatIdFromNotification,
    clearPendingChatIdFromNotification,
    clearNotificationsForChat,
  };
}
