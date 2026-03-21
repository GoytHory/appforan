import React, { FC, useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, Image, StyleSheet, TextInput, Alert } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { COLORS } from '../constants/colors';
import { ProfileScreenProps } from '../types';

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
const ProfileScreen: FC<ProfileScreenProps> = ({ myUsername, setMyUsername }) => {
  // Состояние: URL аватара
  // Может быть строкой (URL) или null (если нет)
  const [avatar, setAvatar] = useState<string | null>(null);

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
      // Получаем аватар из хранилища
      const savedAvatar = await AsyncStorage.getItem('user_avatar');
      // Если аватар есть, устанавливаем его
      if (savedAvatar) setAvatar(savedAvatar);
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
    // Шаг 1: Запрашиваем разрешение на доступ к медиа
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      // Если пользователь не дал разрешение
      Alert.alert('Ошибка', 'Нужен доступ к фото!');
      return;  // Выходим из функции
    }

    // Шаг 2: Открываем галерею для выбора изображения
    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,  // Только изображения
      allowsEditing: true,                              // Разрешаем редактирование (обрезку)
      aspect: [1, 1],                                   // Квадратное изображение
      quality: 0.5,                                     // Сжимаем до 50% качества (экономим место)
    });

    // Шаг 3: Если пользователь не отменил выбор
    if (!result.canceled) {
      // Получаем URI первого выбранного изображения
      const uri = result.assets[0].uri;

      // Обновляем состояние
      setAvatar(uri);

      // Сохраняем в AsyncStorage
      try {
        await AsyncStorage.setItem('user_avatar', uri);
      } catch (e) {
        console.log("Ошибка сохранения аватара:", e);
      }

      // TODO: Отправить на сервер через Socket.IO
      // socket.emit('update_avatar', uri);
    }
  };

  return (
    <View style={styles.container}>
      {/* АВАТАР: Кнопка для выбора фото */}
      <TouchableOpacity onPress={pickImage} style={styles.avatarWrapper}>
        {avatar ? (
          // Если аватар есть, показываем изображение
          <Image source={{ uri: avatar }} style={styles.avatar} />
        ) : (
          // Если аватара нет, показываем плейсхолдер
          <View style={[styles.avatar, styles.placeholder]}>
            <Text style={{ color: '#fff' }}>Загрузить фото</Text>
          </View>
        )}
      </TouchableOpacity>

      {/* ИМЯ ПОЛЬЗОВАТЕЛЯ */}
      <Text style={styles.label}>Твой никнейм:</Text>
      <View style={styles.inputContainer}>
        <TextInput
          style={styles.input}
          value={myUsername}              // Текущее имя
          editable={false}                // Пока не позволяем редактировать (может ломать логику)
        />
      </View>

      {/* КНОПКА НАСТРОЕК (заглушка) */}
      <TouchableOpacity
        style={styles.btn}
        onPress={() => Alert.alert("Настройки", "Тут будут темы оформления")}
      >
        <Text style={styles.btnText}>Настройки оформления</Text>
      </TouchableOpacity>
    </View>
  );
};

// Стили для компонента
const styles = StyleSheet.create({
  container: {
    flex: 1,                                      // Занимает весь экран
    backgroundColor: COLORS.background,
    alignItems: 'center',                         // Центрируем по горизонтали
    paddingTop: 50,                               // Отступ сверху
  },
  avatarWrapper: {
    marginBottom: 30,                             // Отступ снизу
  },
  avatar: {
    width: 150,                                   // Размер аватара
    height: 150,
    borderRadius: 75,                             // Круглый (половина ширины)
    borderWidth: 2,                               // Граница
    borderColor: COLORS.myBubble,
  },
  placeholder: {
    backgroundColor: '#444',                      // Тёмный фон для плейсхолдера
    justifyContent: 'center',                     // Центрируем текст
    alignItems: 'center',
  },
  label: {
    color: '#888',                                // Серый цвет
    alignSelf: 'flex-start',                      // Прижимаем влево
    marginLeft: '10%',                            // Отступ слева
    marginBottom: 5,                              // Отступ снизу
  },
  inputContainer: {
    width: '85%',                                 // 85% ширины
    backgroundColor: '#333',                      // Тёмный фон
    borderRadius: 10,                             // Закруглённые углы
    padding: 15,                                  // Внутренний отступ
    marginBottom: 20,                             // Отступ снизу
  },
  input: {
    color: '#fff',                                // Белый текст
    fontSize: 18,                                 // Большой размер
  },
  btn: {
    width: '85%',                                 // 85% ширины
    padding: 15,                                  // Внутренний отступ
    backgroundColor: COLORS.myBubble,
    borderRadius: 10,                             // Закруглённые углы
    alignItems: 'center',                         // Центрируем текст
  },
  btnText: {
    color: '#fff',
    fontWeight: 'bold',
  }
});

export default ProfileScreen;
