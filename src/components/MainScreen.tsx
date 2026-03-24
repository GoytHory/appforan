import React, { FC, useState } from "react";
import {
  View,
  Modal,
  TouchableOpacity,
  Text,
  Platform,
  Alert,
} from "react-native";
import * as ImagePicker from "expo-image-picker";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Header } from "./Header";
import { Bottom } from "./Bottom";
import { Midler } from "./Midler";
import { ChatListMenu } from "./ChatListMenu";
import { FloatingButton } from "./FloatingButton";
import ProfileScreen from "../screens/ProfileScreen";
import { COLORS } from "../constants/colors";
import { MainScreenProps } from "../types";
import { SafeAreaView } from "react-native-safe-area-context";
import { uploadImageToServer } from "../utils/api";

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
  logout,
  myUsername,
  setMyUsername,
  currentTitle,
  currentMessages,
  currentChatAvatar,
  currentParticipantUserId,
  currentChatHasMoreMessages,
  currentChatIsLoadingOlderMessages,
  currentChatStatus,
  currentChatIsDirect,
  scrollRef,
  keyboardHeight,
  activeChatId,
  setActiveChatId,
  loadOlderMessages,
  handleSend,
  handleSendMedia,
  chatList,
  searchUsers,
  createDirectChat,
}) => {
  // Состояние: открито ли модальное окно профиля
  const [isProfileOpen, setIsProfileOpen] = useState<boolean>(false);

  // Состояние: открито ли меню чатов
  const [isMenuOpen, setIsMenuOpen] = useState<boolean>(false);

  // Состояние: текущий текст в поле ввода
  const [inputText, setInputText] = useState<string>("");

  /**
   * Функция отправки сообщения
   *
   * ЧТО ДЕЛАЕТ:
   * 1. Вызывает handleSend с текстом, ID чата и именем
   * 2. Очищает поле ввода
   */
  const onSend = (): void => {
    handleSend(inputText, activeChatId, myUsername);
    setInputText(""); // Очищаем поле
  };

  const sendImage = async (fromCamera: boolean): Promise<void> => {
    if (!activeChatId) {
      Alert.alert("Чат не выбран", "Сначала выбери чат");
      return;
    }

    try {
      const permission = fromCamera
        ? await ImagePicker.requestCameraPermissionsAsync()
        : await ImagePicker.requestMediaLibraryPermissionsAsync();

      if (!permission.granted) {
        Alert.alert(
          "Нет доступа",
          fromCamera ? "Нужен доступ к камере" : "Нужен доступ к галерее",
        );
        return;
      }

      const pickerResult = fromCamera
        ? await ImagePicker.launchCameraAsync({
            allowsEditing: true,
            quality: 0.65,
            base64: true,
            mediaTypes: ["images"],
          })
        : await ImagePicker.launchImageLibraryAsync({
            allowsEditing: true,
            quality: 0.65,
            base64: true,
            mediaTypes: ["images"],
          });

      if (pickerResult.canceled || !pickerResult.assets?.length) {
        return;
      }

      const asset = pickerResult.assets[0];
      if (!asset.base64) {
        Alert.alert("Ошибка", "Не удалось прочитать изображение");
        return;
      }

      const token = await AsyncStorage.getItem("auth_token");
      if (!token) {
        Alert.alert("Сессия истекла", "Войди заново");
        return;
      }

      const uploaded = await uploadImageToServer(token, {
        base64: asset.base64,
        mimeType: asset.mimeType || "image/jpeg",
        context: "chat",
      });

      handleSendMedia(
        activeChatId,
        {
          type: "image",
          url: uploaded.url,
          mimeType: asset.mimeType || "image/jpeg",
        },
        inputText.trim() || undefined,
      );

      if (inputText.trim()) {
        setInputText("");
      }
    } catch (error) {
      console.log("Ошибка отправки изображения:", error);
      Alert.alert("Ошибка", "Не удалось отправить изображение");
    }
  };

  const openMediaPicker = (): void => {
    Alert.alert("Отправка фото", "Выбери источник изображения", [
      { text: "Камера", onPress: () => void sendImage(true) },
      { text: "Галерея", onPress: () => void sendImage(false) },
      { text: "Отмена", style: "cancel" },
    ]);
  };

  return (
    <View style={{ flex: 1, backgroundColor: COLORS.background }}>
      {/* HEADER: Заголовок с названием чата и кнопкой профиля */}
      <Header
        title={currentTitle}
        chatAvatar={currentChatAvatar}
        myUsername={myUsername}
        setMyUsername={setMyUsername}
        chatStatus={currentChatStatus}
        isDirectChat={currentChatIsDirect}
        onPressTitle={() => {
          if (currentParticipantUserId) {
            Alert.alert("Скоро", "Здесь откроется профиль собеседника");
          }
        }}
        onOpenProfile={() => setIsProfileOpen(true)} // Открытие профиля
      />

      {/* MIDLER: Область сообщений */}
      <View style={{ flex: 1 }}>
        <Midler
          chatMessages={currentMessages}
          scrollRef={scrollRef}
          onReachTop={loadOlderMessages}
          isLoadingOlderMessages={currentChatIsLoadingOlderMessages}
          hasMoreMessages={currentChatHasMoreMessages}
        />
      </View>

      {/* BOTTOM: Панель ввода */}
      <Bottom
        value={inputText}
        onTextChange={setInputText}
        onSend={onSend}
        onOpenMediaPicker={openMediaPicker}
      />

      {/* Android отступ для клавиатуры */}
      {Platform.OS === "android" && <View style={{ height: keyboardHeight }} />}

      {/* FLOATING BUTTON: Плавающая кнопка меню */}
      <FloatingButton onPress={() => setIsMenuOpen(true)} />

      {/* CHAT MENU: Меню списка чатов */}
      <ChatListMenu
        visible={isMenuOpen}
        onClose={() => setIsMenuOpen(false)}
        chats={chatList}
        searchUsers={searchUsers}
        createDirectChat={createDirectChat}
        onSelectChat={(id: string) => {
          setActiveChatId(id); // Меняем активный чат
          setIsMenuOpen(false); // Закрываем меню
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
            <Text style={{ color: "#fff", fontWeight: "bold" }}>
              ← Назад в чат
            </Text>
          </TouchableOpacity>

          {/* Профиль пользователя */}
          <ProfileScreen
            myUsername={myUsername}
            setMyUsername={setMyUsername}
            logout={logout}
          />
        </SafeAreaView>
      </Modal>
    </View>
  );
};

export default MainScreen;
