import React from 'react';
import { View, ActivityIndicator } from 'react-native';
import LoginScreen from './LoginScreen';
import { MainScreen } from './components/MainScreen';
import { useAuth } from './hooks/useAuth';
import { useNotifications } from './hooks/useNotifications';
import { useChats } from './hooks/useChats';
import { useKeyboard } from './hooks/useKeyboard';
import { COLORS } from './Colorsi';

export default function App() {
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