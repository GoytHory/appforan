import React, { FC } from 'react';
import { StyleSheet, TouchableOpacity, Text } from 'react-native';
import { COLORS } from '../constants/colors';
import { FloatingButtonProps } from '../types';

/**
 * FloatingButton — плавающая кнопка для открытия меню чатов.
 * 
 * ЧТО ДЕЛАЕТ:
 * 1. Отображает круглую кнопку с плюсом
 * 2. Расположена в правом нижнем углу экрана
 * 3. При нажатии вызывает функцию onPress
 * 
 * Плюсы использования плавающей кнопки:
 * - Всегда видна (не перекрывается контентом)
 * - Удобна на мобильных (большая площадь нажатия)
 * - Юзер-френдли (привычный паттерн из других приложений)
 * 
 * ПАРАМЕТРЫ (Props):
 * - onPress: функция, вызывается при нажатии на кнопку
 */
export const FloatingButton: FC<FloatingButtonProps> = ({ onPress }) => {
  return (
    <TouchableOpacity
      style={styles.fab}                          // Применяем стили
      onPress={onPress}                           // При нажатии вызываем функцию
      activeOpacity={0.8}                         // При нажатии кнопка становится прозрачнее
    >
      {/* Иконка плюса */}
      <Text style={styles.fabText}>+</Text>
    </TouchableOpacity>
  );
};

// Стили для компонента
const styles = StyleSheet.create({
  fab: {
    // Абсолютное позиционирование: фиксируем кнопку в определённой точке
    position: 'absolute',
    bottom: 90,                                   // 90px от низа (выше нижней панели)
    right: 20,                                    // 20px от правого края
    width: 60,                                    // Ширина кнопки
    height: 60,                                   // Высота кнопки
    borderRadius: 30,                             // Круглая (половина ширины)
    backgroundColor: COLORS.myBubble,            // Цвет фона
    justifyContent: 'center',                     // Центрируем контент
    alignItems: 'center',
    elevation: 8,                                 // Тень для Android
    shadowColor: '#000',                          // Цвет тени для iOS
    shadowOffset: { width: 0, height: 4 },        // Смещение тени
    shadowOpacity: 0.3,                           // Прозрачность тени
    shadowRadius: 4,                              // Размытие тени
    zIndex: 1000,                                 // Выше всем остальных элементов
  },
  fabText: {
    fontSize: 30,                                 // Размер иконки плюса
    color: 'white',                               // Цвет иконки
  },
});
