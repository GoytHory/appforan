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
  const [password, setPassword] = useState<string>('');
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [errorText, setErrorText] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  /**
   * Обработчик нажатия на кнопку "ВОЙТИ В ЧАТ"
   * 
   * ЧТО ДЕЛАЕТ:
   * 1. Проверяет, что имя не пустое
   * 2. Очищает от лишних пробелов (trim())
   * 3. Вызывает функцию onLogin
   */
  const handlePress = async (): Promise<void> => {
    setErrorText('');

    // Проверяем, что имя содержит хотя бы один символ (не только пробелы)
    if (tempName.trim().length < 3) {
      setErrorText('Имя должно быть минимум 3 символа');
      return;
    }

    if (password.length < 6) {
      setErrorText('Пароль должен быть минимум 6 символов');
      return;
    }

    try {
      setIsSubmitting(true);
      await onLogin(tempName.trim(), password, mode);
    } catch (e) {
      const message = e instanceof Error ? e.message : 'Ошибка авторизации';
      setErrorText(message);
    } finally {
      setIsSubmitting(false);
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
        autoCapitalize="none"
      />

      <TextInput
        style={styles.input}
        placeholder="Пароль..."
        placeholderTextColor="#999"
        value={password}
        onChangeText={setPassword}
        secureTextEntry
        autoCapitalize="none"
      />

      {errorText ? <Text style={styles.error}>{errorText}</Text> : null}

      <View style={styles.switcher}>
        <TouchableOpacity
          onPress={() => setMode('login')}
          style={[styles.modeBtn, mode === 'login' && styles.modeBtnActive]}
        >
          <Text style={styles.modeBtnText}>Вход</Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => setMode('register')}
          style={[styles.modeBtn, mode === 'register' && styles.modeBtnActive]}
        >
          <Text style={styles.modeBtnText}>Регистрация</Text>
        </TouchableOpacity>
      </View>

      {/* Кнопка входа */}
      <TouchableOpacity onPress={handlePress} style={styles.button}>
        <Text style={styles.buttonText}>
          {isSubmitting ? 'Загрузка...' : mode === 'login' ? 'ВОЙТИ В ЧАТ' : 'СОЗДАТЬ АККАУНТ'}
        </Text>
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
  error: {
    width: '80%',
    color: '#ff8080',
    marginBottom: 12,
  },
  switcher: {
    flexDirection: 'row',
    width: '80%',
    gap: 10,
    marginBottom: 16,
  },
  modeBtn: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#555',
    borderRadius: 10,
    paddingVertical: 10,
    alignItems: 'center',
  },
  modeBtnActive: {
    backgroundColor: '#2f3a40',
    borderColor: COLORS.myBubble,
  },
  modeBtnText: {
    color: '#fff',
    fontWeight: '600',
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
