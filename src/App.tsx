import React, { FC, useEffect } from 'react'; // Добавили useEffect для запуска кода при старте
import { View, ActivityIndicator } from 'react-native';
import LoginScreen from './screens/LoginScreen';
import MainScreen from './components/MainScreen';
import { useAuth } from './hooks/useAuth';
import { useNotifications } from './hooks/useNotifications';
import { useChats } from './hooks/useChats';
import { useKeyboard } from './hooks/useKeyboard';
import { COLORS } from './constants/colors';

// ИМПОРТ: Подключаем наш файл-отправитель. 
// Проверь путь! Если файл лежит в src/utils/api.ts, то путь '../src/utils/api'
import { sendTestUser } from './utils/api'; 

const App: FC = () => {

  /**
   * ЭФФЕКТ ЗАПУСКА ТЕСТА
   * Этот блок сработает ОДИН РАЗ сразу после того, как приложение загрузится в память.
   * Он нужен, чтобы принудительно "пнуть" сервер и создать пользователя.
   */
  useEffect(() => {
    // Выводим сообщение в консоль твоего компьютера (терминал VS Code / Expo)
    console.log("=== ПРИЛОЖЕНИЕ ЗАПУЩЕНО: ОТПРАВЛЯЮ ТЕСТОВОГО ЮЗЕРА ===");

    // Вызываем функцию из api.ts
    // Мы передаем имя "TechnoShaman", которое должно появиться в MongoDB
    sendTestUser("TechnoShaman");
    
  }, []); // Пустые скобки в конце гарантируют, что код не будет зацикливаться

  // ========== ИНИЦИАЛИЗАЦИЯ ХУКОВ (твой код) ==========

  const { myUsername, setMyUsername, isLoading, handleLogin } = useAuth();
  const { showLocalNotification } = useNotifications();
  const {
    activeChatId,
    setActiveChatId,
    currentMessages,
    currentTitle,
    scrollRef,
    handleSend
  } = useChats(myUsername, showLocalNotification);
  const { keyboardHeight } = useKeyboard();

  // ========== УСЛОВНЫЙ РЕНДЕРИНГ ==========

  // 1. Экран загрузки
  if (isLoading) {
    return (
      <View style={{ flex: 1, backgroundColor: COLORS.background, justifyContent: 'center' }}>
        <ActivityIndicator size="large" color={COLORS.myBubble} />
      </View>
    );
  }

  // 2. Экран входа (если нет имени в памяти телефона)
  if (!myUsername) {
    return <LoginScreen onLogin={handleLogin} />;
  }

  // 3. Основной экран мессенджера
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
};

export default App;