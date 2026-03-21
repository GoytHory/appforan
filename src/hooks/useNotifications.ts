import { useEffect } from 'react';
import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import { COLORS } from '../constants/colors';
import { UseNotificationsReturnType } from '../types'; // Импорт типов

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
if (Platform.OS !== 'web') {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,      // Показывать визуальное уведомление
      shouldPlaySound: true,      // Проигрывать звуковой сигнал
      shouldSetBadge: false,      // Не добавлять число на иконку
      shouldShowBanner: true,     // Показывать баннер уведомления
      shouldShowList: true,       // Показывать в списке уведомлений
    }),
  });
}

export function useNotifications(): UseNotificationsReturnType {
  /**
   * Эффект: инициализация уведомлений при загрузке
   * Выполняется один раз при монтировании компонента
   */
  useEffect(() => {
    // Асинхронная функция инициализации
    const initNotifications = async (): Promise<void> => {
      // Только для мобильных приложений (не для веба)
      if (Platform.OS !== 'web') {
        try {
          /**
           * Шаг 1: Проверяем, есть ли уже разрешение на уведомления
           * getPermissionsAsync() возвращает объект вида { status: 'granted', ... }
           */
          const { status: existingStatus } = await Notifications.getPermissionsAsync();

          // Устанавливаем переменную finalStatus в текущий статус
          let finalStatus = existingStatus;

          /**
           * Шаг 2: Если разрешение не дано ('granted'), просим разрешение
           * requestPermissionsAsync() показывает диалог пользователю
           */
          if (existingStatus !== 'granted') {
            const { status } = await Notifications.requestPermissionsAsync();
            finalStatus = status;
          }

          /**
           * Шаг 3: Для Android создаём канал уведомлений
           * Канал — это категория уведомлений с определёнными настройками
           * На iOS каналов нет, поэтому проверяем платформу
           */
          if (Platform.OS === 'android') {
            await Notifications.setNotificationChannelAsync('chat-messages', {
              name: 'Сообщения чата',                        // Название канала
              importance: Notifications.AndroidImportance.MAX, // Максимальный приоритет (показывать сверху)
              vibrationPattern: [0, 250, 250, 250],         // Вибрация: пауза, 250мс, пауза, 250мс
              lightColor: '#FF231F7C',                       // Цвет индикатора
            });
          }
        } catch (e) {
          // Если что-то пошло не так, логируем ошибку
          console.log("Ошибка уведомлений:", e);
        }
      }
    };

    // Запускаем инициализацию
    initNotifications();
  }, []); // Пустой массив = выполнить один раз

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
    title: string,    // Заголовок
    body: string      // Текст
  ): Promise<void> => {
    // Не показываем уведомления на веба (нет смысла)
    if (Platform.OS === 'web') return;

    try {
      /**
       * scheduleNotificationAsync — отправляет уведомление
       * 
       * content: что показывать в уведомлении
       * trigger: когда показывать (null = сразу же)
       */
      await Notifications.scheduleNotificationAsync({
        content: {
          title: title,                    // Заголовок (имя отправителя)
          body: body,                      // Текст сообщения
          sound: true,                     // Проигрывать звук
        },
        trigger: null,                     // null = показать сразу же
      });
    } catch (e) {
      // Если ошибка при отправке уведомления
      console.log("Ошибка уведомления:", e);
    }
  };

  // Возвращаем объект с функцией
  return { showLocalNotification };
}
