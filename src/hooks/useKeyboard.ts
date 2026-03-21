import { useState, useEffect } from 'react';
import { Keyboard, KeyboardEvent } from 'react-native';
import { UseKeyboardReturnType } from '../types';

/**
 * useKeyboard — кастомный хук для отслеживания высоты клавиатуры.
 * 
 * ЧТО ДЕЛАЕТ:
 * 1. Подписывается на события показа/скрытия клавиатуры
 * 2. При показе записывает её высоту
 * 3. При скрытии устанавливает высоту в 0
 * 
 * ЗАЧЕМ НУЖНА ВЫСОТА:
 * На Android часто нужно поднять контент выше клавиатуры, чтобы он был видим.
 * Мы используем эту высоту как отступ снизу.
 * 
 * ПАРАМЕТРЫ: нет
 * 
 * ВОЗВРАЩАЕТ:
 * - keyboardHeight: текущая высота клавиатуры (число)
 */
export function useKeyboard(): UseKeyboardReturnType {
  // Состояние: высота клавиатуры (изначально 0, клавиатуры нет)
  const [keyboardHeight, setKeyboardHeight] = useState<number>(0);

  /**
   * Эффект: добавляем слушатели событий клавиатуры
   * Выполняется один раз при монтировании
   */
  useEffect(() => {
    /**
     * Слушатель события 'keyboardDidShow'
     * 
     * Когда клавиатура появляется, это событие срабатывает с информацией о высоте.
     * 
     * ПАРАМЕТР e: объект события, содержит:
     * - endCoordinates: координаты клавиатуры
     * - endCoordinates.height: высота в пикселях
     */
    const showSub = Keyboard.addListener(
      "keyboardDidShow",
      (e: KeyboardEvent) => {
        // Устанавливаем высоту из события
        setKeyboardHeight(e.endCoordinates.height);
      }
    );

    /**
     * Слушатель события 'keyboardDidHide'
     * 
     * Когда клавиатура исчезает, это событие срабатывает.
     */
    const hideSub = Keyboard.addListener(
      "keyboardDidHide",
      () => {
        // Устанавливаем высоту в 0 (клавиатуры нет)
        setKeyboardHeight(0);
      }
    );

    /**
     * Функция очистки: отписываемся от событий при размонтировании
     * 
     * Почему важно: если не отписаться, слушатели будут работать даже после
     * удаления компонента, что может привести к утечке памяти.
     */
    return () => {
      // Удаляем обе подписки
      showSub.remove();
      hideSub.remove();
    };
  }, []);  // Пустой массив = выполнить один раз при монтировании

  // Возвращаем объект с высотой
  return { keyboardHeight };
}
