import React, { FC, useState } from "react";
import { View, Modal, TouchableOpacity, Text, Platform } from "react-native";
import * as ImagePicker from "expo-image-picker";
import * as FileSystem from "expo-file-system/legacy";
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
import { uploadAudioToServer, uploadImageToServer } from "../utils/api";
import { showActions, showInfo } from "../utils/dialog";

const getExpoAudioModule = (): { Audio: any } | null => {
  try {
    return require("expo-av");
  } catch {
    return null;
  }
};

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
  currentChatIsLoadingInitialMessages,
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
  const [recording, setRecording] = useState<any | null>(null);
  const [isRecordingAudio, setIsRecordingAudio] = useState<boolean>(false);

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
      showInfo("Чат не выбран", "Сначала выбери чат");
      return;
    }

    try {
      const permission = fromCamera
        ? await ImagePicker.requestCameraPermissionsAsync()
        : await ImagePicker.requestMediaLibraryPermissionsAsync();

      if (!permission.granted) {
        showInfo(
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
        showInfo("Ошибка", "Не удалось прочитать изображение");
        return;
      }

      const token = await AsyncStorage.getItem("auth_token");
      if (!token) {
        showInfo("Сессия истекла", "Войди заново");
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
          objectKey: uploaded.objectKey,
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
      showInfo("Ошибка", "Не удалось отправить изображение");
    }
  };

  const openMediaPicker = (): void => {
    showActions("Отправка фото", "Выбери источник изображения", [
      { text: "Камера", onPress: () => void sendImage(true) },
      { text: "Галерея", onPress: () => void sendImage(false) },
      { text: "Отмена", style: "cancel" },
    ]);
  };

  const startAudioRecording = async (): Promise<void> => {
    if (!activeChatId) {
      showInfo("Чат не выбран", "Сначала выбери чат");
      return;
    }

    const expoAudio = getExpoAudioModule();
    if (!expoAudio?.Audio) {
      showInfo(
        "Голосовые недоступны",
        "В этом клиенте нет native-модуля expo-av. Открой через Expo Go или пересобери Dev Client.",
      );
      return;
    }

    const permission = await expoAudio.Audio.requestPermissionsAsync();
    if (!permission.granted) {
      showInfo("Нет доступа", "Нужен доступ к микрофону");
      return;
    }

    try {
      await expoAudio.Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
      });

      const created = new expoAudio.Audio.Recording();
      await created.prepareToRecordAsync(
        expoAudio.Audio.RecordingOptionsPresets.HIGH_QUALITY,
      );
      await created.startAsync();

      setRecording(created);
      setIsRecordingAudio(true);
    } catch (error) {
      console.log("Ошибка старта записи:", error);
      showInfo("Ошибка", "Не удалось начать запись");
      setRecording(null);
      setIsRecordingAudio(false);
    }
  };

  const cancelAudioRecording = async (): Promise<void> => {
    if (!recording) return;

    try {
      await recording.stopAndUnloadAsync();
      const uri = recording.getURI();

      if (uri) {
        await FileSystem.deleteAsync(uri, { idempotent: true });
      }
    } catch (e) {
      console.log("Ошибка отмены записи:", e);
    } finally {
      setRecording(null);
      setIsRecordingAudio(false);
    }
  };

  const stopAudioRecordingAndSend = async (): Promise<void> => {
    if (!recording) {
      return;
    }

    try {
      await recording.stopAndUnloadAsync();
      const status = await recording.getStatusAsync();
      const uri = recording.getURI();

      setRecording(null);
      setIsRecordingAudio(false);

      if (!uri) {
        showInfo("Ошибка", "Не удалось получить аудио файл");
        return;
      }

      const token = await AsyncStorage.getItem("auth_token");
      if (!token) {
        showInfo("Сессия истекла", "Войди заново");
        return;
      }

      const base64 = await FileSystem.readAsStringAsync(uri, {
        encoding: FileSystem.EncodingType.Base64,
      });
      if (!base64) {
        showInfo("Ошибка", "Не удалось прочитать аудио файл");
        return;
      }

      const uploaded = await uploadAudioToServer(token, {
        base64,
        mimeType: "audio/mp4",
        durationSec:
          typeof status.durationMillis === "number"
            ? Math.round(status.durationMillis / 1000)
            : undefined,
      });

      handleSendMedia(
        activeChatId,
        {
          type: "audio",
          objectKey: uploaded.objectKey,
          url: uploaded.url,
          mimeType: uploaded.mimeType || "audio/mp4",
          durationSec: uploaded.durationSec,
        },
        inputText.trim() || undefined,
      );

      if (inputText.trim()) {
        setInputText("");
      }
    } catch (error) {
      console.log("Ошибка завершения записи:", error);
      showInfo("Ошибка", "Не удалось отправить голосовое");
      setRecording(null);
      setIsRecordingAudio(false);
    }
  };

  const toggleAudioRecording = (): void => {
    if (isRecordingAudio) {
      void stopAudioRecordingAndSend();
      return;
    }

    void startAudioRecording();
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
            showInfo("Скоро", "Здесь откроется профиль собеседника");
          }
        }}
        onOpenProfile={() => setIsProfileOpen(true)} // Открытие профиля
      />

      {/* MIDLER: Область сообщений */}
      <View style={{ flex: 1 }}>
        <Midler
          key={`midler-${activeChatId || "empty"}`}
          chatMessages={currentMessages}
          scrollRef={scrollRef}
          isLoadingInitialMessages={currentChatIsLoadingInitialMessages}
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
        onToggleAudioRecording={toggleAudioRecording} // Новая функция для управления записью аудио
        isRecordingAudio={isRecordingAudio} // Передаем состояние записи в Bottom для отображения индикатора или изменения иконки
        onCancelAudioRecording={cancelAudioRecording} // Функция для отмены записи аудио
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

export default MainScreen; // Функция для отправки изображения в чат
