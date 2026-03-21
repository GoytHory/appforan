import React, { FC, useState } from 'react';
import { View, SafeAreaView, Modal, TouchableOpacity, Text, Platform } from 'react-native';
import { Header } from './Header';
import { Bottom } from './Bottom';
import { Midler } from './Midler';
import { ChatListMenu } from './ChatListMenu';
import { FloatingButton } from './FloatingButton';
import ProfileScreen from '../screens/ProfileScreen';
import { COLORS } from '../constants/colors';
import { MainScreenProps } from '../types';

/**
 * MainScreen — главный экран приложения с чатом.
 * 
 * ЧТО ДЕЛАЕТ:
 * 1. Собирает все компоненты: Header, Midler, Bottom, FloatingButton, меню, профиль
 * 2. Управляет локальным состоянием (видимость меню, профиля, текст ввода)
 * 3. Обрабатывает взаимодействие между компонентами
 * 
 * ПАРАМЕТРЫ (Props): все приходят из App.tsx
 * - myUsername, setMyUsername: данные пользователя
 * - currentTitle, currentMessages: данные чата
 * - scrollRef: ссылка для скролла
 * - keyboardHeight: высота клавиатуры (для Android)
 * - activeChatId, setActiveChatId: активный чат
 * - handleSend: функция отправки сообщения
 */
const MainScreen: FC<MainScreenProps> = ({
  myUsername,
  setMyUsername,
  currentTitle,
  currentMessages,
  scrollRef,
  keyboardHeight,
  activeChatId,
  setActiveChatId,
  handleSend
}) => {
  // Состояние: открито ли модальное окно профиля
  const [isProfileOpen, setIsProfileOpen] = useState<boolean>(false);

  // Состояние: открито ли меню чатов
  const [isMenuOpen, setIsMenuOpen] = useState<boolean>(false);

  // Состояние: текущий текст в поле ввода
  const [inputText, setInputText] = useState<string>('');

  /**
   * Функция отправки сообщения
   * 
   * ЧТО ДЕЛАЕТ:
   * 1. Вызывает handleSend с текстом, ID чата и именем
   * 2. Очищает поле ввода
   */
  const onSend = (): void => {
    handleSend(inputText, activeChatId, myUsername);
    setInputText('');  // Очищаем поле
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: COLORS.background }}>
      {/* HEADER: Заголовок с названием чата и кнопкой профиля */}
      <Header
        title={currentTitle}
        myUsername={myUsername}
        setMyUsername={setMyUsername}
        onOpenProfile={() => setIsProfileOpen(true)}  // Открытие профиля
      />

      {/* MIDLER: Область сообщений */}
      <View style={{ flex: 1 }}>
        <Midler
          chatMessages={currentMessages}
          scrollRef={scrollRef}
        />
      </View>

      {/* BOTTOM: Панель ввода */}
      <Bottom
        value={inputText}
        onTextChange={setInputText}
        onSend={onSend}
      />

      {/* Android отступ для клавиатуры */}
      {Platform.OS === 'android' && <View style={{ height: keyboardHeight }} />}

      {/* FLOATING BUTTON: Плавающая кнопка меню */}
      <FloatingButton onPress={() => setIsMenuOpen(true)} />

      {/* CHAT MENU: Меню списка чатов */}
      <ChatListMenu
        visible={isMenuOpen}
        onClose={() => setIsMenuOpen(false)}
        onSelectChat={(id: string) => {
          setActiveChatId(id);      // Меняем активный чат
          setIsMenuOpen(false);      // Закрываем меню
        }}
      />

      {/* PROFILE MODAL: Модальное окно профиля */}
      <Modal
        visible={isProfileOpen}
        animationType="slide"
        onRequestClose={() => setIsProfileOpen(false)}
      >
        <SafeAreaView style={{ flex: 1, backgroundColor: COLORS.background }}>
          {/* Кнопка закрытия профиля */}
          <TouchableOpacity
            onPress={() => setIsProfileOpen(false)}
            style={{ padding: 20, backgroundColor: COLORS.myBubble }}
          >
            <Text style={{ color: '#fff', fontWeight: 'bold' }}>← Назад в чат</Text>
          </TouchableOpacity>

          {/* Профиль пользователя */}
          <ProfileScreen
            myUsername={myUsername}
            setMyUsername={setMyUsername}
          />
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
};

export default MainScreen;
