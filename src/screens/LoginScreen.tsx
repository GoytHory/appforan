import React, { FC, useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, SafeAreaView, StyleSheet } from 'react-native';
import { COLORS } from '../constants/colors';
import { LoginScreenProps } from '../types';

/**
 * LoginScreen — экран входа в приложение.
 * 
 * ЧТО ДЕЛАЕТ:
 * 1. Показывает форму для ввода имени пользователя
 * 2. При вводе обновляет локальное состояние
 * 3. При нажатии на кнопку "ВОЙТИ В ЧАТ" вызывает onLogin
 * 
 * ПАРАМЕТРЫ (Props):
 * - onLogin: функция для входа, принимает имя и возвращает Promise
 * 
 * КОГДА ИСПОЛЬЗУЕТСЯ:
 * - Когда приложение загружается и нет сохранённого имени пользователя
 */
const LoginScreen: FC<LoginScreenProps> = ({ onLogin }) => {
  // Состояние: имя, введённое пользователем
  const [tempName, setTempName] = useState<string>("");

  /**
   * Обработчик нажатия на кнопку "ВОЙТИ В ЧАТ"
   * 
   * ЧТО ДЕЛАЕТ:
   * 1. Проверяет, что имя не пустое
   * 2. Очищает от лишних пробелов (trim())
   * 3. Вызывает функцию onLogin
   */
  const handlePress = (): void => {
    // Проверяем, что имя содержит хотя бы один символ (не только пробелы)
    if (tempName.trim().length > 0) {
      // Вызываем функцию логина с очищенным именем
      onLogin(tempName.trim());
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Заголовок */}
      <Text style={styles.title}>Как тебя зовут?</Text>

      {/* Поле ввода имени */}
      <TextInput
        style={styles.input}
        placeholder="Твой ник..."
        placeholderTextColor="#999"
        value={tempName}                          // Текущее значение
        onChangeText={setTempName}                // Функция при изменении
      />

      {/* Кнопка входа */}
      <TouchableOpacity onPress={handlePress} style={styles.button}>
        <Text style={styles.buttonText}>ВОЙТИ В ЧАТ</Text>
      </TouchableOpacity>
    </SafeAreaView>
  );
};

// Стили для компонента
const styles = StyleSheet.create({
  container: {
    flex: 1,                                      // Занимает весь экран
    backgroundColor: COLORS.background,
    justifyContent: 'center',                     // Центрируем вертикально
    alignItems: 'center',                         // Центрируем горизонтально
  },
  title: {
    color: 'white',
    fontSize: 24,                                 // Большой размер
    marginBottom: 20,                             // Отступ снизу
  },
  input: {
    backgroundColor: '#3e454a',                   // Тёмный фон
    color: 'white',                               // Белый текст
    width: '80%',                                 // 80% ширины экрана
    padding: 15,                                  // Внутренний отступ
    borderRadius: 10,                             // Закруглённые углы
    marginBottom: 20,                             // Отступ снизу
  },
  button: {
    backgroundColor: COLORS.myBubble,
    padding: 15,                                  // Внутренний отступ (делает кнопку выше)
    borderRadius: 10,                             // Закруглённые углы
    width: '80%',                                 // 80% ширины экрана
    alignItems: 'center',                         // Центрируем текст
  },
  buttonText: {
    color: 'white',
    fontWeight: 'bold',
  }
});

export default LoginScreen;
