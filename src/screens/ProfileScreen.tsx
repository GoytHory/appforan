import React, { FC, useState, useEffect } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  Image,
  StyleSheet,
  TextInput,
  Alert,
} from "react-native";
import * as ImagePicker from "expo-image-picker";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { COLORS } from "../constants/colors";
import { ProfileScreenProps } from "../types";
import { getMe, updateMyAvatar, uploadImageToServer } from "../utils/api";

/**
 * ProfileScreen — экран профиля пользователя.
 *
 * ЧТО ДЕЛАЕТ:
 * 1. Показывает аватар пользователя (или плейсхолдер)
 * 2. Позволяет выбрать новый аватар из галереи
 * 3. Показывает имя пользователя (пока только для чтения)
 * 4. Показывает кнопку "Настройки оформления" (пока заглушка)
 *
 * ПАРАМЕТРЫ (Props):
 * - myUsername: имя пользователя
 * - setMyUsername: функция для изменения имени
 */
const ProfileScreen: FC<ProfileScreenProps> = ({
  myUsername,
  logout,
  setMyUsername,
}) => {
  // Состояние: URL аватара
  // Может быть строкой (URL) или null (если нет)
  const [avatar, setAvatar] = useState<string | null>(null);
  const [status, setStatus] = useState<"online" | "offline">("offline");
  const [isSavingAvatar, setIsSavingAvatar] = useState<boolean>(false);

  /**
   * Эффект: загрузка профиля при монтировании компонента
   * [] пустой массив = выполнить один раз
   */
  useEffect(() => {
    loadProfile();
  }, []);

  /**
   * loadProfile — загружает данные профиля из AsyncStorage
   *
   * ЧТО ДЕЛАЕТ:
   * 1. Получает сохранённый аватар из хранилища
   * 2. Если аватар есть, устанавливает его в состояние
   */
  const loadProfile = async (): Promise<void> => {
    try {
      const token = await AsyncStorage.getItem("auth_token");
      if (!token) return;

      const { user } = await getMe(token);
      setAvatar(user.avatar || null);
      setStatus(user.status || "offline");
    } catch (e) {
      console.log("Ошибка загрузки профиля:", e);
    }
  };



  /**
   * pickImage — функция для выбора фото из галереи
   *
   * ЧТО ДЕЛАЕТ:
   * 1. Запрашивает разрешение на доступ к галереи
   * 2. Открывает галерею для выбора изображения
   * 3. Обрезает изображение (square)
   * 4. Сжимает изображение (quality: 0.5)
   * 5. Сохраняет выбранное изображение
   * 6. Сохраняет в AsyncStorage
   */
  const pickImage = async (): Promise<void> => {
    const { status: permStatus } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (permStatus !== "granted") {
      Alert.alert("Ошибка", "Нужен доступ к фото!");
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.5,
      base64: true,
    });

    if (result.canceled || !result.assets?.length) {
      return;
    }

    const asset = result.assets[0];
    if (!asset.base64) {
      Alert.alert("Ошибка", "Не удалось прочитать изображение");
      return;
    }

    try {
      setIsSavingAvatar(true);
      const token = await AsyncStorage.getItem("auth_token");
      if (!token) {
        Alert.alert("Сессия истекла", "Войди заново");
        return;
      }

      const uploaded = await uploadImageToServer(token, {
        base64: asset.base64,
        mimeType: asset.mimeType || "image/jpeg",
        context: "avatar",
      });

      const { user } = await updateMyAvatar(token, uploaded.url);
      setAvatar(user.avatar || uploaded.url);
      setStatus(user.status || "offline");
      Alert.alert("Готово", "Аватар обновлён");
    } catch (e) {
      console.log("Ошибка загрузки аватара:", e);
      Alert.alert("Ошибка", "Не удалось загрузить аватар");
    } finally {
      setIsSavingAvatar(false);
    }
  };

  return (
    <View style={styles.container}>
      {/* АВАТАР: Кнопка для выбора фото */}
      <TouchableOpacity onPress={isSavingAvatar ? undefined : pickImage} style={styles.avatarWrapper}>
        {avatar ? (
          <Image source={{ uri: avatar }} style={styles.avatar} />
        ) : (
          <View style={[styles.avatar, styles.placeholder]}>
            <Text style={{ color: "#fff" }}>{isSavingAvatar ? "Загрузка..." : "Загрузить фото"}</Text>
          </View>
        )}
      </TouchableOpacity>

      {/* ИМЯ ПОЛЬЗОВАТЕЛЯ */}
      <Text style={styles.label}>Твой никнейм:</Text>
      <View style={styles.inputContainer}>
        <TextInput
          style={styles.input}
          value={myUsername}
          editable={false}
        />
      </View>

      <Text style={styles.statusText}>
        Статус: {status === "online" ? "В сети" : "Не в сети"}
      </Text>

      {/* КНОПКА НАСТРОЕК (заглушка) */}
      <TouchableOpacity
        style={styles.btn}
        onPress={() => Alert.alert("Настройки", "Тут будут темы оформления")}
      >
        <Text style={styles.btnText}>Настройки оформления</Text>
      </TouchableOpacity>
      <TouchableOpacity
        style={[styles.btn, { backgroundColor: "#b43a3a", marginTop: 12 }]}
        onPress={() =>
          Alert.alert("Выход", "Выйти из аккаунта?", [
            { text: "Отмена", style: "cancel" },
            {
              text: "Выйти",
              style: "destructive",
              onPress: () => {
                void logout();
              },
            },
          ])
        }
      >
        <Text style={styles.btnText}>Выйти из аккаунта</Text>
      </TouchableOpacity>
    </View>
  );
};

// Стили для компонента
const styles = StyleSheet.create({
  container: {
    flex: 1, // Занимает весь экран
    backgroundColor: COLORS.background,
    alignItems: "center", // Центрируем по горизонтали
    paddingTop: 50, // Отступ сверху
  },
  avatarWrapper: {
    marginBottom: 30, // Отступ снизу
  },
  avatar: {
    width: 150, // Размер аватара
    height: 150,
    borderRadius: 75, // Круглый (половина ширины)
    borderWidth: 2, // Граница
    borderColor: COLORS.myBubble,
  },
  placeholder: {
    backgroundColor: "#444", // Тёмный фон для плейсхолдера
    justifyContent: "center", // Центрируем текст
    alignItems: "center",
  },
  label: {
    color: "#888", // Серый цвет
    alignSelf: "flex-start", // Прижимаем влево
    marginLeft: "10%", // Отступ слева
    marginBottom: 5, // Отступ снизу
  },
  inputContainer: {
    width: "85%", // 85% ширины
    backgroundColor: "#333", // Тёмный фон
    borderRadius: 10, // Закруглённые углы
    padding: 15, // Внутренний отступ
    marginBottom: 20, // Отступ снизу
  },
  input: {
    color: "#fff", // Белый текст
    fontSize: 18, // Большой размер
  },
  statusText: {
    color: "#c0c8d8",
    marginBottom: 14,
  },
  btn: {
    width: "85%", // 85% ширины
    padding: 15, // Внутренний отступ
    backgroundColor: COLORS.myBubble,
    borderRadius: 10, // Закруглённые углы
    alignItems: "center", // Центрируем текст
  },
  btnText: {
    color: "#fff",
    fontWeight: "bold",
  },
});

export default ProfileScreen;
