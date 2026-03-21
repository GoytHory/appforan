import React, { FC } from 'react';
import { View, ActivityIndicator } from 'react-native';
import LoginScreen from './screens/LoginScreen';
import MainScreen from './components/MainScreen';
import { useAuth } from './hooks/useAuth';
import { useNotifications } from './hooks/useNotifications';
import { useChats } from './hooks/useChats';
import { useKeyboard } from './hooks/useKeyboard';
import { COLORS } from './constants/colors';

/**
 * App — главный компонент приложения.
 * 
 * ЧТО ДЕЛАЕТ:
 * 1. Инициализирует все хуки (аутентификация, уведомления, чаты, клавиатура)
 * 2. Управляет потоком приложения:
 *    - Если загружается → показывает индикатор загрузки
 *    - Если нет пользователя → показывает экран логина
 *    - Если пользователь есть → показывает основной экран
 * 
 * АРХИТЕКТУРА:
 * App.tsx:
 * ├── useAuth() — получаем имя и функцию логина
 * ├── useNotifications() — получаем функцию уведомлений
 * ├── useChats() — получаем состояние чатов и функцию отправки
 * ├── useKeyboard() — получаем высоту клавиатуры
 * └── Выбираем, что показать:
 *     ├── LoadingScreen (если isLoading)
 *     ├── LoginScreen (если нет пользователя)
 *     └── MainScreen (если пользователь авторизован)
 */
const App: FC = () => {
  // ========== ИНИЦИАЛИЗАЦИЯ ХУКОВ ==========

  /**
   * useAuth — управление аутентификацией
   * Возвращает:
   * - myUsername: текущее имя пользователя (строка)
   * - setMyUsername: функция для установки имени
   * - isLoading: загружаемся ли мы в данный момент (true/false)
   * - handleLogin: функция для сохранения имени при входе
   */
  const { myUsername, setMyUsername, isLoading, handleLogin } = useAuth();

  /**
   * useNotifications — управление push-уведомлениями
   * Возвращает:
   * - showLocalNotification: функция для показа уведомления на устройстве
   */
  const { showLocalNotification } = useNotifications();

  /**
   * useChats — управление чатами и сообщениями
   * Параметры:
   * - myUsername: имя пользователя (для определения своих сообщений)
   * - showLocalNotification: функция (для показа уведомлений о новых сообщениях)
   * 
   * Возвращает:
   * - activeChatId: ID активно открытого чата
   * - setActiveChatId: функция для смены чата
   * - allChats: все чаты и их сообщения (объект)
   * - currentMessages: сообщения активного чата
   * - currentTitle: название активного чата
   * - scrollRef: ссылка на ScrollView для прокрутки
   * - handleSend: функция отправки сообщения на сервер
   */
  const {
    activeChatId,
    setActiveChatId,
    currentMessages,
    currentTitle,
    scrollRef,
    handleSend
  } = useChats(myUsername, showLocalNotification);

  /**
   * useKeyboard — управление клавиатурой
   * Возвращает:
   * - keyboardHeight: высота клавиатуры (для Android, чтобы поднять контент)
   */
  const { keyboardHeight } = useKeyboard();

  // ========== УСЛОВНЫЙ РЕНДЕРИНГ ==========

  /**
   * Если идёт загрузка данных из AsyncStorage,
   * показываем индикатор загрузки (spinning wheel)
   */
  if (isLoading) {
    return (
      <View style={{ flex: 1, backgroundColor: COLORS.background, justifyContent: 'center' }}>
        {/* Индикатор загрузки: круговой спиннер */}
        <ActivityIndicator size="large" color={COLORS.myBubble} />
      </View>
    );
  }

  /**
   * Если пользователь не авторизован (нет имени),
   * показываем экран логина
   * 
   * При нажатии "ВОЙТИ", вызывается handleLogin,
   * который сохраняет имя и обновляет состояние
   */
  if (!myUsername) {
    return <LoginScreen onLogin={handleLogin} />;
  }

  /**
   * Если пользователь авторизован, показываем основной экран с чатом
   * Передаём все необходимые параметры компоненту
   */
  return (
    <MainScreen
      myUsername={myUsername}                     // Имя пользователя
      setMyUsername={setMyUsername}               // Функция изменения имени
      currentTitle={currentTitle}                 // Название текущего чата
      currentMessages={currentMessages}           // Сообщения текущего чата
      scrollRef={scrollRef}                       // Ссылка для скролла
      keyboardHeight={keyboardHeight}             // Высота клавиатуры
      activeChatId={activeChatId}                 // ID активного чата
      setActiveChatId={setActiveChatId}           // Функция смены чата
      handleSend={handleSend}                     // Функция отправки сообщения
    />
  );
};

export default App;
