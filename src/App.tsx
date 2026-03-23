import React, { FC } from 'react';
import { View, ActivityIndicator } from 'react-native'; // Добавили Platform
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context'; // Добавили сейф-зоны
import LoginScreen from './screens/LoginScreen';
import MainScreen from './components/MainScreen';
import { useAuth } from './hooks/useAuth';
import { useNotifications } from './hooks/useNotifications';
import { useChats } from './hooks/useChats';
import { useKeyboard } from './hooks/useKeyboard';
import { COLORS } from './constants/colors';

const AppContent: FC = () => {
  const { myUsername, setMyUsername, isLoading, handleLogin, logout } = useAuth();
  const { showLocalNotification } = useNotifications();
  
  // Достаем всё из useChats, включая allChats (если понадобится для меню)
  const {
    activeChatId,
    setActiveChatId,
    currentMessages,
    currentTitle,
    scrollRef,
    handleSend,
    allChats // Добавили, чтобы прокидывать в MainScreen если нужно
  } = useChats(myUsername, showLocalNotification, () => {
    void logout();
  });
  
  const { keyboardHeight } = useKeyboard();

  if (isLoading) {
    return (
      <View style={{ flex: 1, backgroundColor: COLORS.background, justifyContent: 'center' }}>
        <ActivityIndicator size="large" color={COLORS.myBubble} />
      </View>
    );
  }

  if (!myUsername) {
    return <LoginScreen onLogin={handleLogin} />;
  }

  // Обертка SafeAreaView внутри контента, чтобы она знала о контексте провайдера
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: COLORS.background }} edges={['top', 'bottom']}>
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
    </SafeAreaView>
  );
};

// ГЛАВНЫЙ КОМПОНЕНТ: Обязательно оборачиваем в Provider
const App: FC = () => {
  return (
    <SafeAreaProvider>
      <AppContent />
    </SafeAreaProvider>
  );
};

export default App;