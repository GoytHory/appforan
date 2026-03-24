import React, { FC, useEffect, useRef } from "react";
import {
  ActivityIndicator,
  Image,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { COLORS } from "../constants/colors";
import { MidlerProps, Message } from "../types";

/**
 * Midler — компонент для отображения списка сообщений.
 *
 * ЧТО ДЕЛАЕТ:
 * 1. Показывает все сообщения в виде пузырей (как в Telegram)
 * 2. Разные стили для своих сообщений (справа, голубые) и чужих (слева, серые)
 * 3. Показывает имя отправителя для чужих сообщений
 * 4. Показывает время отправки под каждым сообщением
 * 5. Автоматически прокручивается вниз при новых сообщениях
 *
 * ПАРАМЕТРЫ (Props):
 * - chatMessages: массив сообщений
 * - scrollRef: ссылка на ScrollView для программной прокрутки
 */
export const Midler: FC<MidlerProps> = ({
  chatMessages, // Массив сообщений
  scrollRef, // Ссылка для скролла
  onReachTop,
  isLoadingOlderMessages,
  hasMoreMessages,
}) => {
  const contentHeightRef = useRef(0);
  const shouldPreservePositionRef = useRef(false);
  const topRequestLockedRef = useRef(false);

  useEffect(() => {
    if (isLoadingOlderMessages) {
      shouldPreservePositionRef.current = true;
    }
  }, [isLoadingOlderMessages]);

  return (
    <ScrollView
      ref={scrollRef} // Ассоциируем с ссылкой
      style={styles.middleField}
      scrollEventThrottle={16}
      onContentSizeChange={(_, height) => {
        if (shouldPreservePositionRef.current && height > contentHeightRef.current) {
          const delta = height - contentHeightRef.current;
          scrollRef.current?.scrollTo({ y: delta, animated: false });
          shouldPreservePositionRef.current = false;
        }

        contentHeightRef.current = height;
      }}
      onScroll={(event) => {
        const offsetY = event.nativeEvent.contentOffset.y;

        if (offsetY > 120) {
          topRequestLockedRef.current = false;
        }

        if (
          offsetY <= 40 &&
          hasMoreMessages &&
          !isLoadingOlderMessages &&
          !topRequestLockedRef.current
        ) {
          topRequestLockedRef.current = true;
          onReachTop();
        }
      }}
    >
      {isLoadingOlderMessages ? (
        <View style={styles.loaderWrap}>
          <ActivityIndicator size="small" color={COLORS.myBubble} />
        </View>
      ) : null}

      {/* Рендерим каждое сообщение */}
      {chatMessages.map((msg: Message) => {
        // Определяем: это своё сообщение или чужое
        const isMe = msg.sender === "me";

        return (
          <View
            key={msg.id} // Уникальный ключ для списка React
            style={[
              styles.bubble, // Общие стили пузыря
              isMe ? styles.myBubble : styles.otherBubble, // Свои стили в зависимости от type
            ]}
          >
            {/* Показываем автора только для чужих сообщений */}
            {!isMe && msg.author && (
              <Text style={styles.authorText}>{msg.author}</Text>
            )}

            {msg.media?.type === "image" && msg.media.url ? (
              <Image
                source={{ uri: msg.media.url }}
                style={styles.messageImage}
              />
            ) : null}

            {/* Текст сообщения */}
            {msg.text ? (
              <Text style={styles.bubbleText}>{msg.text}</Text>
            ) : null}

            {/* Время отправки */}
            <Text style={styles.timeText}>{msg.time}</Text>
          </View>
        );
      })}
    </ScrollView>
  );
};

// Стили для компонента
const styles = StyleSheet.create({
  middleField: {
    flex: 1, // Занимает всё доступное место
    backgroundColor: COLORS.background,
  },
  bubble: {
    padding: 10, // Внутренний отступ
    borderRadius: 25, // Закруглённые углы
    marginBottom: 10, // Отступ между сообщениями
    maxWidth: "90%", // Максимальная ширина (не займёт весь экран)
  },
  bubbleText: {
    color: "white", // Белый текст
    fontSize: 16, // Размер текста
  },
  messageImage: {
    width: 220,
    height: 220,
    borderRadius: 14,
    marginBottom: 8,
    backgroundColor: "#1d2430",
  },
  authorText: {
    fontSize: 12, // Маленький шрифт для автора
    fontWeight: "bold",
    color: "#76a6b8", // Голубой цвет (как в Telegram)
    marginBottom: 4, // Отступ снизу
  },
  myBubble: {
    // Стили для своих сообщений
    marginRight: 5, // Отступ справа
    backgroundColor: COLORS.myBubble, // Цвет фона
    alignSelf: "flex-end", // Выравнивание вправо
    borderBottomRightRadius: 2, // "Хвостик" справа (уголок не закруглён)
    borderColor: COLORS.myBubbleBorder,
    borderWidth: 0.5, // Тонкая граница
    borderBottomWidth: 1.5, // Нижняя граница толще
  },
  otherBubble: {
    // Стили для чужих сообщений
    marginLeft: 5, // Отступ слева
    backgroundColor: COLORS.otherBubble, // Цвет фона
    alignSelf: "flex-start", // Выравнивание влево
    borderBottomLeftRadius: 2, // "Хвостик" слева
    borderColor: COLORS.otherBubbleBorder,
    borderWidth: 0.5,
    borderBottomWidth: 1.5,
  },
  timeText: {
    fontSize: 10, // Маленький шрифт для времени
    color: COLORS.time, // Полупрозрачный цвет
    alignSelf: "flex-end", // Прижимаем вправо
    marginTop: 1, // Маленький отступ от текста
  },
  loaderWrap: {
    paddingVertical: 10,
    alignItems: "center",
  },
});
