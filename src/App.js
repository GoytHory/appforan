import React from 'react';
import { View, ActivityIndicator } from 'react-native';
import LoginScreen from './screens/LoginScreen'; // Импорт экрана логина
import { MainScreen } from './components/MainScreen'; // Импорт основного экрана
import { useAuth } from './hooks/useAuth'; // Хук аутентификации
import { useNotifications } from './hooks/useNotifications'; // Хук уведомлений
import { useChats } from './hooks/useChats'; // Хук чатов
import { useKeyboard } from './hooks/useKeyboard'; // Хук клавиатуры
import { COLORS } from './constants/colors'; // Импорт цветов
import { SafeAreaProvider } from 'react-native-safe-area-context';

/**
 * Главный компонент приложения (App).
 * Оркестратор: собирает хуки и компоненты, управляет общим состоянием.
 * Отображает экран загрузки, логин или основной чат в зависимости от состояния.
 */
export default function App() {
  // Хук аутентификации: имя, загрузка, логин
  const { myUsername, setMyUsername, isLoading, handleLogin } = useAuth();
  // Хук уведомлений: функция показа уведомлений
  const { showLocalNotification } = useNotifications();
  // Хук чатов: активный чат, сообщения, отправка
  const {
    activeChatId,
    setActiveChatId,
    currentMessages,
    currentTitle,
    scrollRef,
    handleSend
  } = useChats(myUsername, showLocalNotification);
  // Хук клавиатуры: высота для Android
  const { keyboardHeight } = useKeyboard();

  // Если загружаемся, показываем индикатор
  if (isLoading) {
    return (
      <View style={{ flex: 1, backgroundColor: COLORS.background, justifyContent: 'center' }}>
        <ActivityIndicator size="large" color={COLORS.myBubble} />
      </View>
    );
  }

  // Если нет имени, показываем логин
  if (!myUsername) {
    return <LoginScreen onLogin={handleLogin} />;
  }

  // Основной экран чата
  return (
    <MainScreen
      myUsername={myUsername}
      setMyUsername={setMyUsername}
      currentTitle={currentTitle}
      currentMessages={currentMessages}
      scrollRef={scrollRef}
      keyboardHeight={keyboardHeight}
      activeChatId={activeChatId}
      setActiveChatId={setActiveChatId}
      handleSend={handleSend}
    />
  );
}