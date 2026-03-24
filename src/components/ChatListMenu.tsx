import React, { FC, useState } from "react";
import {
  StyleSheet,
  View,
  Modal,
  TouchableWithoutFeedback,
  FlatList,
  Text,
  TouchableOpacity,
  Image,
  TextInput,
  Alert,
} from "react-native";
import { COLORS } from "../constants/colors";
import { ChatListMenuProps, SearchUser, ChatListItem } from "../types";

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

export const ChatListMenu: FC<ChatListMenuProps> = ({
  visible, // Видимо ли меню
  onClose, // Функция закрытия
  onSelectChat, // Функция выбора чата
  chats,
  searchUsers,
  createDirectChat,
}) => {
  const [query, setQuery] = useState<string>("");
  const [foundUsers, setFoundUsers] = useState<SearchUser[]>([]);
  const [isSearching, setIsSearching] = useState<boolean>(false);

  const runSearch = async (): Promise<void> => {
    const trimmed = query.trim();
    if (trimmed.length < 2) {
      setFoundUsers([]);
      return;
    }

    try {
      setIsSearching(true);
      const users = await searchUsers(trimmed);
      setFoundUsers(users);
    } catch (err) {
      console.log("Ошибка поиска:", err);
      setFoundUsers([]);
    } finally {
      setIsSearching(false);
    }
  };

  const handleCreateDirect = async (userId: string): Promise<void> => {
    if (!userId) {
      Alert.alert("Ошибка", "Не удалось определить ID пользователя");
      return;
    }

    try {
      const chatId = await createDirectChat(userId);
      onSelectChat(chatId);
      setQuery("");
      setFoundUsers([]);
      onClose();
    } catch (err) {
      console.log("Ошибка создания персонального чата:", err);
      const message =
        err instanceof Error
          ? err.message
          : "Не удалось создать персональный чат";
      Alert.alert("Ошибка", message);
    }
  };

  /**
   * renderChatItem — функция рендеринга одного элемента чата
   *
   * Эту функцию вызывает FlatList для каждого элемента в DATA.
   *
   * ПАРАМЕТР item: объект с данными чата
   */
  const renderChatItem = ({ item }: { item: ChatListItem }) => (
    <TouchableOpacity
      style={styles.chatItem} // Стили элемента
      onPress={() => {
        console.log("Выбран чат:", item.name); // Лог для отладки
        onSelectChat(item.id); // Передаём ID чата в родителя
        onClose(); // Закрываем меню
      }}
    >
      {/* Аватар чата */}
      <View style={styles.avatarContainer}>
        {item.avatarUrl ? (
          // Если есть URL аватара, показываем изображение
          <Image source={{ uri: item.avatarUrl }} style={styles.avatarImage} />
        ) : (
          // Если нет, показываем плейсхолдер с первой буквой имени
          <View style={styles.avatarPlaceholder}>
            <Text style={styles.avatarLetter}>{item.name[0]}</Text>
          </View>
        )}
      </View>

      {/* Информация о чате (название, время, последнее сообщение) */}
      <View style={styles.chatInfo}>
        {/* Название и время рядом */}
        <View style={styles.chatHeader}>
          <View style={styles.chatNameRow}>
            <Text style={styles.chatName}>{item.name}</Text>
            {item.status && (
              <View
                style={[
                  styles.statusDot,
                  item.status === "online"
                    ? styles.statusOnline
                    : styles.statusOffline,
                ]}
              />
            )}
          </View>
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
      transparent={true} // Прозрачный фон
      visible={visible} // Показывать, если true
      animationType="slide" // Анимация: появление снизу
      onRequestClose={onClose} // Закрыть по системной кнопке (Android)
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

              <View style={styles.searchRow}>
                <TextInput
                  style={styles.searchInput}
                  value={query}
                  placeholder="Найти пользователя"
                  placeholderTextColor="rgba(255,255,255,0.5)"
                  onChangeText={setQuery}
                  autoCapitalize="none"
                />
                <TouchableOpacity
                  style={styles.searchBtn}
                  onPress={() => void runSearch()}
                >
                  <Text style={styles.searchBtnText}>
                    {isSearching ? "..." : "Найти"}
                  </Text>
                </TouchableOpacity>
              </View>

              {foundUsers.length > 0 && (
                <View style={styles.searchResultsBlock}>
                  {foundUsers.map((user) => (
                    <View key={user.id} style={styles.searchResultRow}>
                      <View style={styles.searchUserInfo}>
                        {user.avatar ? (
                          <Image
                            source={{ uri: user.avatar }}
                            style={styles.searchAvatarImage}
                          />
                        ) : (
                          <View style={styles.searchAvatarPlaceholder}>
                            <Text style={styles.searchAvatarLetter}>
                              {user.username.slice(0, 1).toUpperCase()}
                            </Text>
                          </View>
                        )}
                        <View style={styles.statusDotWrap}>
                          <View
                            style={[
                              styles.statusDot,
                              user.status === "online"
                                ? styles.statusOnline
                                : styles.statusOffline,
                            ]}
                          />
                        </View>
                        <Text style={styles.searchUsername}>
                          {user.username}
                        </Text>
                      </View>
                      <TouchableOpacity
                        style={styles.startChatBtn}
                        onPress={() =>
                          void handleCreateDirect(user.id || user._id || "")
                        }
                      >
                        <Text style={styles.startChatText}>Написать</Text>
                      </TouchableOpacity>
                    </View>
                  ))}
                </View>
              )}

              {/* Список чатов используя FlatList (эффективен для больших списков) */}
              <FlatList
                data={chats} // Данные для списка
                renderItem={renderChatItem} // Функция рендеринга каждого элемента
                keyExtractor={(item) => item.id} // Функция получения уникального ключа
                contentContainerStyle={{ paddingBottom: 20 }} // Отступ снизу списка
                showsVerticalScrollIndicator={false} // Скрываем скроллбар
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
    flex: 1, // Занимает весь экран
    backgroundColor: "transparent", // Прозрачный фон
    justifyContent: "flex-end", // Меню внизу
  },
  menuContainer: {
    height: "75%", // 3/4 высоты экрана
    backgroundColor: COLORS.background,
    borderTopLeftRadius: 30, // Закруглённые углы сверху
    borderTopRightRadius: 30,
    padding: 20, // Внутренние отступы
    elevation: 24, // Тень для Android
    shadowColor: "#ffffff", // Цвет тени для iOS
    shadowOffset: { width: 0, height: -15 }, // Смещение тени вверх
    shadowOpacity: 0.6,
    shadowRadius: 20, // Размытие тени
  },
  dragHandle: {
    width: 50, // Ширина полоски
    height: 4, // Высота
    backgroundColor: "rgba(255,255,255,0.1)", // Полупрозрачная белая полоска
    borderRadius: 2, // Закруглённые края
    alignSelf: "center", // Центрируем
    marginBottom: 15, // Отступ снизу
  },
  menuTitle: {
    fontSize: 22, // Размер шрифта
    fontWeight: "bold",
    color: "white",
    marginBottom: 20, // Отступ снизу
    marginLeft: 5, // Маленький отступ слева
  },
  chatItem: {
    backgroundColor: "#191a22ab", // Полупрозрачный тёмный цвет
    flexDirection: "row", // Элементы в ряд
    alignItems: "center", // Центрируем по вертикали
    borderRadius: 20, // Закруглённые углы
    padding: 10, // Внутренние отступы
    borderWidth: 0.5, // Тонкая граница
    borderBottomWidth: 1.5, // Нижняя граница толще
    borderColor: "#40475fab",
    marginBottom: 5, // Отступ между элементами
  },
  avatarContainer: {
    marginRight: 15, // Отступ от информации
  },
  avatarImage: {
    width: 55, // Размер аватара
    height: 55,
    borderRadius: 27.5, // Круглый аватар (половина ширины)
  },
  avatarPlaceholder: {
    width: 55,
    height: 55,
    borderRadius: 27.5,
    backgroundColor: "#4d799c", // Голубой фон
    justifyContent: "center",
    alignItems: "center",
  },
  avatarLetter: {
    color: "white",
    fontSize: 20,
    fontWeight: "bold",
  },
  chatInfo: {
    flex: 1, // Занимает оставшееся место
  },
  searchRow: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 12,
  },
  searchInput: {
    flex: 1,
    backgroundColor: "#232934",
    borderColor: "#3c4558",
    borderWidth: 1,
    color: "#fff",
    borderRadius: 10,
    paddingHorizontal: 12,
    height: 42,
  },
  searchBtn: {
    backgroundColor: COLORS.myBubble,
    borderRadius: 10,
    minWidth: 72,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 10,
  },
  searchBtnText: {
    color: "#fff",
    fontWeight: "700",
  },
  searchResultsBlock: {
    marginBottom: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#3c4558",
    overflow: "hidden",
  },
  searchResultRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "#232934",
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#2f3644",
  },
  searchUserInfo: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  searchAvatarImage: {
    width: 26,
    height: 26,
    borderRadius: 13,
  },
  searchAvatarPlaceholder: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: "#4d799c",
    justifyContent: "center",
    alignItems: "center",
  },
  searchAvatarLetter: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 12,
  },
  statusDotWrap: {
    width: 12,
    height: 12,
    justifyContent: "center",
    alignItems: "center",
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  statusOnline: {
    backgroundColor: "#4ad97d",
  },
  statusOffline: {
    backgroundColor: "#78839a",
  },
  searchUsername: {
    color: "#fff",
  },
  startChatBtn: {
    backgroundColor: "#304b6d",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  startChatText: {
    color: "#fff",
    fontWeight: "600",
  },
  chatHeader: {
    flexDirection: "row", // Название и время в ряд
    justifyContent: "space-between", // Первое влево, второе вправо
    marginBottom: 5, // Отступ снизу
  },
  chatNameRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  chatName: {
    color: "white",
    fontSize: 16,
    fontWeight: "600",
  },
  chatTime: {
    color: "rgba(255,255,255,0.4)", // Полупрозрачный белый
    fontSize: 12,
  },
  lastMsg: {
    color: "rgba(255,255,255,0.5)", // Полупрозрачный белый
    fontSize: 14,
  },
});
