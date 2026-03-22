import React, { FC, useRef } from "react";
import { StyleSheet, View, Text, TextInput, TouchableOpacity } from 'react-native';
import { COLORS } from '../constants/colors';
import { BottomProps } from '../types';

/**
 * Bottom — компонент нижней панели для ввода сообщений.
 * 
 * ЧТО ДЕЛАЕТ:
 * 1. Отображает поле ввода текста
 * 2. Обновляет текст при вводе (через onTextChange)
 * 3. Показывает кнопку отправки
 * 4. При отправке вызывает onSend
 * 
 * ПАРАМЕТРЫ (Props):
 * - value: текущее значение в инпуте (строка)
 * - onTextChange: функция, вызывается при изменении текста
 * - onSend: функция, вызывается при отправке
 */
export const Bottom: FC<BottomProps> = ({
  value,                // Текущий текст
  onTextChange,         // Функция изменения
  onSend                // Функция отправки
}) => {
  // Ref для фокуса на инпут после отправки
  // useRef создаёт ссылку, которая не теряется при ре-рендере
  const inputRef = useRef<TextInput>(null);

  return (
    <View style={styles.bottomBar}>
      {/* Поле ввода сообщения */}
      <TextInput
        ref={inputRef}                            // Ссылка на инпут
        style={styles.input}
        placeholder="Введите текст..."            // Текст-подсказка
        blurOnSubmit={false}                      // Не закрывать клавиатуру при Enter
        placeholderTextColor="#acaaaa"            // Цвет подсказки
        value={value}                             // Текущее значение
        onChangeText={onTextChange}               // Функция при изменении текста
        onSubmitEditing={onSend}                  // Функция при нажатии Enter на клавиатуре
      />

      {/* Кнопка отправки */}
      <TouchableOpacity
        onPress={() => { 
          console.log("Кнопка физически нажата в Bottom.tsx");  // Лог для отладки
          onSend();                               // Отправляем сообщение
          inputRef.current?.focus();              // Фокусируем инпут после отправки
        }}
        style={styles.button}
      >
        
        {/* Иконка стрелочки */}
        <Text style={styles.buttonText}>⋺</Text>
      </TouchableOpacity>
    </View>
  );
};

// Стили для компонента
const styles = StyleSheet.create({
  bottomBar: {
    height: 70,                                   // Высота панели
    backgroundColor: COLORS.header,
    flexDirection: 'row',                         // Элементы в ряд
    alignItems: 'center',                         // Центрируем по центру
    paddingHorizontal: 10,                        // Боковые отступы
  },
  button: {
    marginLeft: 10,                               // Отступ от инпута
    width: 45,                                    // Ширина кнопки
    height: 45,                                   // Высота кнопки
    backgroundColor: '#4d799c',                   // Цвет кнопки
    borderRadius: 22.5,                           // Круглая кнопка (половина ширины)
    justifyContent: 'center',                     // Центрируем контент
    alignItems: 'center',
    zIndex: 99,                                   // Выше других элементов
  },
  buttonText: {
    fontSize: 30,                                 // Размер иконки
    color: '#dadada',                             // Цвет иконки
  },
  input: {
    flex: 1,                                      // Занимает всё свободное место
    height: 40,                                   // Высота инпута
    backgroundColor: 'rgba(255,255,255,0.2)',    // Полупрозрачный белый фон
    borderRadius: 20,                             // Закруглённые края (как в Telegram)
    paddingHorizontal: 15,                        // Отступ текста от краев
    color: COLORS.otherText,                     // Цвет вводимого текста
  },
});
