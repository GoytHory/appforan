import { useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { UseAuthReturnType } from '../types'; // Импорт типов

/**
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

  /**
   * Эффект: инициализация при запуске приложения
   * [] — пустой массив зависимостей означает, что эффект выполнится только один раз
   */
  useEffect(() => {
    // Асинхронная функция для загрузки имени
    const initAuth = async (): Promise<void> => {
      try {
        // Получаем сохранённое имя из локального хранилища (AsyncStorage)
        // getItem возвращает строку или null, если ключ не найден
        const savedName = await AsyncStorage.getItem('user_name');

        // Если имя есть (не null), устанавливаем его в состояние
        if (savedName) {
          setMyUsername(savedName);
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
  const handleLogin = async (name: string): Promise<void> => {
    try {
      // Сохраняем имя в хранилище под ключом 'user_name'
      await AsyncStorage.setItem('user_name', name);

      // Обновляем состояние приложения
      setMyUsername(name);
    } catch (e) {
      // Если сохранение не удалось
      console.log("Ошибка логина:", e);
    }
  };

  // Возвращаем объект с нужными данными и функциями
  return { myUsername, setMyUsername, isLoading, handleLogin };
}
