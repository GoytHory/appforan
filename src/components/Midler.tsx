import React, { FC } from "react";
import { ScrollView, StyleSheet, View, Text } from 'react-native';
import { COLORS } from '../constants/colors';
import { MidlerProps, Message } from '../types';

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
  chatMessages,         // Массив сообщений
  scrollRef             // Ссылка для скролла
}) => {
  return (
    <ScrollView
      ref={scrollRef}                            // Ассоциируем с ссылкой
      style={styles.middleField}
      onContentSizeChange={() => {
        // Когда контент изменяется (например, добавилось сообщение),
        // автоматически прокручиваем вниз
        scrollRef.current?.scrollToEnd({ animated: true });
      }}
    >
      {/* Рендерим каждое сообщение */}
      {chatMessages.map((msg: Message) => {
        // Определяем: это своё сообщение или чужое
        const isMe = msg.sender === 'me';

        return (
          <View
            key={msg.id}                          // Уникальный ключ для списка React
            style={[
              styles.bubble,                      // Общие стили пузыря
              isMe ? styles.myBubble : styles.otherBubble  // Свои стили в зависимости от type
            ]}
          >
            {/* Показываем автора только для чужих сообщений */}
            {!isMe && msg.author && (
              <Text style={styles.authorText}>{msg.author}</Text>
            )}

            {/* Текст сообщения */}
            <Text style={styles.bubbleText}>{msg.text}</Text>

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
    flex: 1,                                      // Занимает всё доступное место
    backgroundColor: COLORS.background,
  },
  bubble: {
    padding: 10,                                  // Внутренний отступ
    borderRadius: 25,                             // Закруглённые углы
    marginBottom: 10,                             // Отступ между сообщениями
    maxWidth: '90%',                              // Максимальная ширина (не займёт весь экран)
  },
  bubbleText: {
    color: 'white',                               // Белый текст
    fontSize: 16,                                 // Размер текста
  },
  authorText: {
    fontSize: 12,                                 // Маленький шрифт для автора
    fontWeight: 'bold',
    color: '#76a6b8',                             // Голубой цвет (как в Telegram)
    marginBottom: 4,                              // Отступ снизу
  },
  myBubble: {
    // Стили для своих сообщений
    marginRight: 5,                               // Отступ справа
    backgroundColor: COLORS.myBubble,            // Цвет фона
    alignSelf: 'flex-end',                        // Выравнивание вправо
    borderBottomRightRadius: 2,                   // "Хвостик" справа (уголок не закруглён)
    borderColor: COLORS.myBubbleBorder,
    borderWidth: 0.5,                             // Тонкая граница
    borderBottomWidth: 1.5,                       // Нижняя граница толще
  },
  otherBubble: {
    // Стили для чужих сообщений
    marginLeft: 5,                                // Отступ слева
    backgroundColor: COLORS.otherBubble,         // Цвет фона
    alignSelf: 'flex-start',                      // Выравнивание влево
    borderBottomLeftRadius: 2,                    // "Хвостик" слева
    borderColor: COLORS.otherBubbleBorder,
    borderWidth: 0.5,
    borderBottomWidth: 1.5,
  },
  timeText: {
    fontSize: 10,                                 // Маленький шрифт для времени
    color: COLORS.time,                           // Полупрозрачный цвет
    alignSelf: 'flex-end',                        // Прижимаем вправо
    marginTop: 1,                                 // Маленький отступ от текста
  },
});
