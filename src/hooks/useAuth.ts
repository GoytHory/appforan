import { useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { UseAuthReturnType } from '../types'; // Импорт типов
import { getMe, loginUser, registerUser } from '../utils/api';
import { clearSocketToken, disconnectSocket, setSocketToken } from '../utils/socket';

/** //
 * useAuth — кастомный хук для управления аутентификацией.
 * 
 * ЧТО ДЕЛАЕТ:
 * 1. При загрузке приложения проверяет, сохранено ли имя пользователя в AsyncStorage
 * 2. Если сохранено, загружает его
 * 3. Предоставляет функцию для логина (сохранения нового имени)
 * 
 * ПАРАМЕТРЫ: нет
 * 
 * ВОЗВРАЩАЕТ:
 * - myUsername: текущее имя пользователя (строка)
 * - setMyUsername: функция для установки имени напрямую
 * - isLoading: загружается ли данные (true/false)
 * - handleLogin: функция для сохранения имени при входе
 */
export function useAuth(): UseAuthReturnType {
  // Состояние: имя пользователя
  // Инициализируется пустой строкой (""), но потом может быть заполнено
  const [myUsername, setMyUsername] = useState<string>("");

  // Состояние: идёт ли загрузка
  // true = загружаем, false = готово
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const clearAuthState = async (): Promise<void> => {
    disconnectSocket();
    clearSocketToken();
    await AsyncStorage.multiRemove(['user_name', 'auth_token']);
    setMyUsername('');
  };

  /**
   * Эффект: инициализация при запуске приложения
   * [] — пустой массив зависимостей означает, что эффект выполнится только один раз
   */
  useEffect(() => {
    // Асинхронная функция для загрузки имени
    const initAuth = async (): Promise<void> => {
      try {
        const [savedName, savedToken] = await Promise.all([
          AsyncStorage.getItem('user_name'),
          AsyncStorage.getItem('auth_token')
        ]);

        if (savedName && savedToken) {
          try {
            const { user } = await getMe(savedToken);
            setSocketToken(savedToken);
            setMyUsername(user.username);
          } catch {
            await clearAuthState();
          }
        } else {
          await clearAuthState();
        }
      } catch (e) {
        // Если произошла ошибка (например, нет доступа к хранилищу)
        console.log("Ошибка инициализации:", e);
      } finally {
        // В любом случае (успех или ошибка) говорим, что загрузка завершена
        setIsLoading(false);
      }
    };

    // Запускаем функцию инициализации
    initAuth();
  }, []);

  /**
   * handleLogin — функция для логина пользователя
   * 
   * ПАРАМЕТРЫ:
   * - name: имя пользователя, которое нужно сохранить (строка)
   * 
   * ЧТО ДЕЛАЕТ:
   * 1. Сохраняет имя в AsyncStorage (локальное хранилище)
   * 2. Обновляет состояние (myUsername)
   */
  const handleLogin = async (name: string, password: string, mode: 'login' | 'register'): Promise<void> => {
  try {
    console.log('🔄 Отправляю данные на сервер...');
    const authResponse = mode === 'register'
      ? await registerUser(name, password)
      : await loginUser(name, password);

    console.log('✅ Ответ получен, сохраняю сессию...');
    await AsyncStorage.multiSet([
      ['user_name', authResponse.user.username],
      ['auth_token', authResponse.token]
    ]);

    setSocketToken(authResponse.token);
    console.log('✅ Сессия сохранена, обновляю статус...');

    setMyUsername(authResponse.user.username);
    console.log('✅ Все готово!');
  } catch (e) {
    console.log("❌ Ошибка логина:", e);
    throw e;
  }
};

  // Возвращаем объект с нужными данными и функциями
  return { myUsername, setMyUsername, isLoading, handleLogin, logout: clearAuthState };
}
