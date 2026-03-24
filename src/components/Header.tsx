import React, { FC } from "react";
import { StyleSheet, View, Text, TouchableOpacity, Image } from "react-native";
import { COLORS } from "../constants/colors";
import { HeaderProps } from "../types";

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
  title, // Название чата
  chatAvatar,
  myUsername, // Имя пользователя
  setMyUsername, // Функция изменения имени
  chatStatus,
  isDirectChat,
  onPressTitle,
  onOpenProfile, // Функция открытия профиля (может быть не передана)
}) => {
  const statusText = chatStatus === "online" ? "В сети" : "Не в сети";

  return (
    <View style={styles.topBar}>
      {/* Основной контент хедера */}
      <View style={styles.content}>
        <View style={styles.leftBlock}>
          {isDirectChat ? (
            chatAvatar ? (
              <Image source={{ uri: chatAvatar }} style={styles.avatar} />
            ) : (
              <View style={styles.avatarPlaceholder}>
                <Text style={styles.avatarLetter}>
                  {(title || "?").slice(0, 1).toUpperCase()}
                </Text>
              </View>
            )
          ) : null}

          <View>
            <TouchableOpacity activeOpacity={0.7} onPress={onPressTitle}>
              <Text style={styles.text}>∈ {title || "Сообщения"}</Text>
            </TouchableOpacity>
            {isDirectChat && (
              <View style={styles.statusRow}>
                <View
                  style={[
                    styles.statusDot,
                    chatStatus === "online"
                      ? styles.statusOnline
                      : styles.statusOffline,
                  ]}
                />
                <Text style={styles.statusText}>{statusText}</Text>
              </View>
            )}
          </View>
        </View>

        {/* Кнопка профиля */}
        <TouchableOpacity
          onPress={onOpenProfile} // При нажатии открываем профиль из MainScreen
          style={styles.profileBtn}
        >
          <Text style={{ color: "#fff", fontWeight: "bold" }}>Настройки</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

// Стили для компонента
const styles = StyleSheet.create({
  topBar: {
    marginTop: 0,
    height: 70, // Высота хедера
    backgroundColor: COLORS.header,
    // Отступ от статус-бара (часы, батарея)
    justifyContent: "center", // Центрируем вертикально
    paddingHorizontal: 15, // Боковые отступы
  },
  content: {
    flexDirection: "row", // Элементы в ряд (горизонтально)
    justifyContent: "space-between", // Первый элемент влево, второй вправо
    alignItems: "center", // Центрируем по вертикали
  },
  leftBlock: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    flexShrink: 1,
  },
  avatar: {
    width: 42,
    height: 42,
    borderRadius: 21,
    borderWidth: 1,
    borderColor: "#5a6482",
  },
  avatarPlaceholder: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: "#3c4762",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#5a6482",
  },
  avatarLetter: {
    color: "#fff",
    fontWeight: "700",
  },
  text: {
    fontSize: 24, // Размер шрифта
    fontWeight: "600", // Полужирный
    color: COLORS.otherText,
    maxWidth: 220,
  },
  profileBtn: {
    backgroundColor: COLORS.myBubble,
    paddingVertical: 6, // Отступы сверху и снизу
    paddingHorizontal: 15, // Отступы слева и справа
    borderRadius: 10, // Закруглённые углы
  },
  statusRow: {
    marginTop: 2,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
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
    backgroundColor: "#8890a3",
  },
  statusText: {
    color: "#c4c9d8",
    fontSize: 12,
  },
});
