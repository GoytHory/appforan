import React, { FC, useState } from "react";
import { StyleSheet, View, Text, Modal, TouchableOpacity } from 'react-native';
import { COLORS } from '../constants/colors';
import ProfileScreen from '../screens/ProfileScreen';
import { HeaderProps } from '../types';
import { SafeAreaView } from 'react-native-safe-area-context';

/**
 * Header — компонент заголовка чата.
 * 
 * ЧТО ДЕЛАЕТ:
 * 1. Отображает название текущего чата в верхней части
 * 2. Показывает кнопку "Профиль"
 * 3. При нажатии на "Профиль" открывает модальное окно с полным профилем пользователя
 * 
 * ПАРАМЕТРЫ (Props):
 * - title: название чата (строка)
 * - myUsername: имя пользователя (строка)
 * - setMyUsername: функция для изменения имени
 * - onOpenProfile: функция, которая вызывается при нажатии на профиль (опционально)
 * 
 * FC<HeaderProps> означает:
 * "Это функциональный компонент (Function Component) с типом пропсов HeaderProps"
 */
export const Header: FC<HeaderProps> = ({
  title,                // Название чата
  myUsername,           // Имя пользователя
  setMyUsername,        // Функция изменения имени
  onOpenProfile         // Функция открытия профиля (может быть не передана)
}) => {
  // Состояние: открито ли модальное окно профиля
  // true = окно видно, false = закрыто
  const [isProfileOpen, setIsProfileOpen] = useState<boolean>(false);

  return (
    <View style={styles.topBar}>
      {/* Модальное окно профиля */}
      <Modal
        visible={isProfileOpen}                    // Показывать, если true
        animationType="slide"                      // Анимация: пришёл снизу
        onRequestClose={() => setIsProfileOpen(false)}  // Закрыть по системной кнопке (Android)
      >
        <SafeAreaView style={{ flex: 1, backgroundColor: COLORS.background }}>
          {/* Кнопка закрытия модалки */}
          <TouchableOpacity
            onPress={() => setIsProfileOpen(false)}  // При нажатии закрываем
            style={styles.closeBtn}
          >
            <Text style={{ color: COLORS.text, fontSize: 18, fontWeight: 'bold'}}> 
              ← Назад
            </Text> 
          </TouchableOpacity> 

          {/* Профиль внутри модалки */}
          <ProfileScreen myUsername={myUsername} setMyUsername={setMyUsername} />
        </SafeAreaView>
      </Modal>

      {/* Основной контент хедера */}
      <View style={styles.content}>
        {/* Название текущего чата */}
        <Text style={styles.text}>∈ {title || "Сообщения"}</Text>

        {/* Кнопка профиля */}
        <TouchableOpacity
          onPress={() => setIsProfileOpen(true)}  // При нажатии открываем модалку
          style={styles.profileBtn}
        >
          <Text style={{ color: '#fff', fontWeight: 'bold' }}>Настройки</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

// Стили для компонента
const styles = StyleSheet.create({
  topBar: {
    marginTop: 0,
    height: 70,                                   // Высота хедера
    backgroundColor: COLORS.header,
                                    // Отступ от статус-бара (часы, батарея)
    justifyContent: 'center',                     // Центрируем вертикально
    paddingHorizontal: 15,                        // Боковые отступы
  },
  content: {
    flexDirection: 'row',                         // Элементы в ряд (горизонтально)
    justifyContent: 'space-between',              // Первый элемент влево, второй вправо
    alignItems: 'center'                          // Центрируем по вертикали
  },
  text: {
    fontSize: 24,                                 // Размер шрифта
    fontWeight: '600',                            // Полужирный
    color: COLORS.otherText,
  },
  profileBtn: {
    backgroundColor: COLORS.myBubble,
    paddingVertical: 6,                           // Отступы сверху и снизу
    paddingHorizontal: 15,                        // Отступы слева и справа
    borderRadius: 10,                             // Закруглённые углы
  },
  closeBtn: {
    height: 30,
    marginTop: 30,
    justifyContent: 'center',                                // Отступ сверху
    //padding: 0,                                  // Внутренние отступы
    borderBottomWidth: 1,                         // Линия снизу
    borderBottomColor: '#333',
  }
});
