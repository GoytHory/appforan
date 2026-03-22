import React, { FC } from 'react';
import { StyleSheet, View, Modal, TouchableWithoutFeedback, FlatList, Text, TouchableOpacity, Image } from 'react-native';
import { COLORS } from '../constants/colors';
import { ChatListMenuProps } from '../types';

/**
 * ChatListMenu — компонент меню списка чатов.
 * 
 * ЧТО ДЕЛАЕТ:
 * 1. Отображает модальное окно внизу экрана
 * 2. Показывает список всех доступных чатов (FlatList для эффективности)
 * 3. Каждый чат показывает: аватар, название, последнее сообщение, время
 * 4. При нажатии на чат вызывает onSelectChat и закрывает меню
 * 
 * ПАРАМЕТРЫ (Props):
 * - visible: видимо ли меню (true/false)
 * - onClose: функция для закрытия меню
 * - onSelectChat: функция при выборе чата (получает ID чата)
 */

// Временные данные чатов (в реальном приложении это бы приходило с сервера)
const DATA = [
  {id: '1',name: 'Лохи',lastMsg: 'Связь установлена...',time: '20:15',avatarUrl: 'https://i.pinimg.com/736x/4c/47/62/4c4762da4696eb9c67cc902095a58470.jpg'},
  //{ id: '2', name: 'болталк', lastMsg: 'Нужно поправить стили', time: '18:40', avatarUrl: 'https://zefirka.club/uploads/posts/2022-09/1663072734_1-zefirka-club-p-ava-dlya-tt-bravl-2.jpg' },
  //{ id: '3', name: 'личный чат', lastMsg: 'Привет, как успехи?', time: 'Вчера', avatarUrl: 'https://i.pinimg.com/736x/e9/5c/b6/e95cb69be980ce54c33272ea9e02b7da.jpg'},
  //{ id: '4', name: 'товарпищ майор', lastMsg: 'слежка за вами прошла успешно', time: '14:20' , avatarUrl: 'https://i.pinimg.com/236x/c8/ae/1d/c8ae1d580b82ff0224af632df5db771b.jpg'},
];

export const ChatListMenu: FC<ChatListMenuProps> = ({
  visible,              // Видимо ли меню
  onClose,              // Функция закрытия
  onSelectChat          // Функция выбора чата
}) => {

  /**
   * renderChatItem — функция рендеринга одного элемента чата
   * 
   * Эту функцию вызывает FlatList для каждого элемента в DATA.
   * 
   * ПАРАМЕТР item: объект с данными чата
   */
  const renderChatItem = ({ item }: any) => (
    <TouchableOpacity
      style={styles.chatItem}                    // Стили элемента
      onPress={() => {
        console.log("Выбран чат:", item.name);   // Лог для отладки
        onSelectChat(item.id);                   // Передаём ID чата в родителя
        onClose();                               // Закрываем меню
      }}
    >
      {/* Аватар чата */}
      <View style={styles.avatarContainer}>
        {item.avatarUrl ? (
          // Если есть URL аватара, показываем изображение
          <Image
            source={{ uri: item.avatarUrl }}
            style={styles.avatarImage}
          />
        ) : (
          // Если нет, показываем плейсхолдер с первой буквой имени
          <View style={styles.avatarPlaceholder}>
            <Text style={styles.avatarLetter}>
              {item.name[0]}
            </Text>
          </View>
        )}
      </View>

      {/* Информация о чате (название, время, последнее сообщение) */}
      <View style={styles.chatInfo}>
        {/* Название и время рядом */}
        <View style={styles.chatHeader}>
          <Text style={styles.chatName}>{item.name}</Text>
          <Text style={styles.chatTime}>{item.time}</Text>
        </View>
        {/* Последнее сообщение */}
        <Text style={styles.lastMsg} numberOfLines={1}>
          {item.lastMsg}
        </Text>
      </View>
    </TouchableOpacity>
  );

  return (
    <Modal
      transparent={true}                         // Прозрачный фон
      visible={visible}                           // Показывать, если true
      animationType="slide"                       // Анимация: появление снизу
      onRequestClose={onClose}                   // Закрыть по системной кнопке (Android)
    >
      {/* Прозрачный фон, при нажатии на который меню закрывается */}
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={styles.overlay}>
          {/* Внутренняя обёртка, чтобы клики внутри меню не закрывали его */}
          <TouchableWithoutFeedback>
            <View style={styles.menuContainer}>
              {/* Полоска для перетаскивания (визуальный элемент для мобильного) */}
              <View style={styles.dragHandle} />

              {/* Заголовок меню */}
              <Text style={styles.menuTitle}>Ваши переписки</Text>

              {/* Список чатов используя FlatList (эффективен для больших списков) */}
              <FlatList
                data={DATA}                       // Данные для списка
                renderItem={renderChatItem}       // Функция рендеринга каждого элемента
                keyExtractor={item => item.id}   // Функция получения уникального ключа
                contentContainerStyle={{ paddingBottom: 20 }}  // Отступ снизу списка
                showsVerticalScrollIndicator={false}  // Скрываем скроллбар
              />
            </View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
};

// Стили для компонента
const styles = StyleSheet.create({
  overlay: {
    flex: 1,                                      // Занимает весь экран
    backgroundColor: 'transparent',               // Прозрачный фон
    justifyContent: 'flex-end',                  // Меню внизу
  },
  menuContainer: {
    height: '75%',                                // 3/4 высоты экрана
    backgroundColor: COLORS.background,
    borderTopLeftRadius: 30,                      // Закруглённые углы сверху
    borderTopRightRadius: 30,
    padding: 20,                                  // Внутренние отступы
    elevation: 24,                                // Тень для Android
    shadowColor: "#ffffff",                       // Цвет тени для iOS
    shadowOffset: { width: 0, height: -15 },      // Смещение тени вверх
    shadowOpacity: 0.6,
    shadowRadius: 20,                             // Размытие тени
  },
  dragHandle: {
    width: 50,                                    // Ширина полоски
    height: 4,                                    // Высота
    backgroundColor: 'rgba(255,255,255,0.1)',    // Полупрозрачная белая полоска
    borderRadius: 2,                              // Закруглённые края
    alignSelf: 'center',                          // Центрируем
    marginBottom: 15,                             // Отступ снизу
  },
  menuTitle: {
    fontSize: 22,                                 // Размер шрифта
    fontWeight: 'bold',
    color: 'white',
    marginBottom: 20,                             // Отступ снизу
    marginLeft: 5,                                // Маленький отступ слева
  },
  chatItem: {
    backgroundColor: '#191a22ab',                 // Полупрозрачный тёмный цвет
    flexDirection: 'row',                         // Элементы в ряд
    alignItems: 'center',                         // Центрируем по вертикали
    borderRadius: 20,                             // Закруглённые углы
    padding: 10,                                  // Внутренние отступы
    borderWidth: 0.5,                             // Тонкая граница
    borderBottomWidth: 1.5,                       // Нижняя граница толще
    borderColor: '#40475fab',
    marginBottom: 5,                              // Отступ между элементами
  },
  avatarContainer: {
    marginRight: 15,                              // Отступ от информации
  },
  avatarImage: {
    width: 55,                                    // Размер аватара
    height: 55,
    borderRadius: 27.5,                           // Круглый аватар (половина ширины)
  },
  avatarPlaceholder: {
    width: 55,
    height: 55,
    borderRadius: 27.5,
    backgroundColor: '#4d799c',                   // Голубой фон
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarLetter: {
    color: 'white',
    fontSize: 20,
    fontWeight: 'bold',
  },
  chatInfo: {
    flex: 1,                                      // Занимает оставшееся место
  },
  chatHeader: {
    flexDirection: 'row',                         // Название и время в ряд
    justifyContent: 'space-between',              // Первое влево, второе вправо
    marginBottom: 5,                              // Отступ снизу
  },
  chatName: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  chatTime: {
    color: 'rgba(255,255,255,0.4)',             // Полупрозрачный белый
    fontSize: 12,
  },
  lastMsg: {
    color: 'rgba(255,255,255,0.5)',             // Полупрозрачный белый
    fontSize: 14,
  },
});
