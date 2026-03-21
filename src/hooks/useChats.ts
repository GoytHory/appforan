import { useState, useEffect, useRef } from 'react';
import { ScrollView } from 'react-native';
import socket from '../utils/socket';
import { Message, Chat, ChatState, IncomingMessage, SocketEventPayload, UseChatsReturnType } from '../types';

/**
 * useChats — кастомный хук для управления чатами и сообщениями.
 * 
 * ЧТО ДЕЛАЕТ:
 * 1. Управляет состоянием всех чатов и сообщений
 * 2. Подписывается на Socket.IO события (получение сообщений с сервера)
 * 3. Обновляет список сообщений при получении новых
 * 4. Показывает уведомления для входящих сообщений
 * 5. Предоставляет функцию для отправки сообщений
 * 
 * ПАРАМЕТРЫ:
 * - myUsername: имя пользователя (строка)
 * - showLocalNotification: функция для показа уведомлений
 * 
 * ВОЗВРАЩАЕТ: объект с состоянием и функциями
 */
export function useChats(
  myUsername: string,                         // Имя пользователя
  showLocalNotification: (title: string, body: string) => Promise<void>  // Функция уведомлений
): UseChatsReturnType {
  // Состояние: ID активно открытого чата
  const [activeChatId, setActiveChatId] = useState<string>('1');

  /**
   * Состояние: все чаты и их сообщения
   * Структура:
   * {
   *   "1": { name: "Лохи", messages: [...] },
   *   "2": { name: "болталк", messages: [...] },
   *   ...
   * }
   */
  const [allChats, setAllChats] = useState<ChatState>({
    '1': { name: 'Лохи', messages: [] },
    '2': { name: 'болталк', messages: [] },
    '3': { name: 'личный чат', messages: [] },
    '4': { name: 'товарпищ майор', messages: [] },
  });

  //Ссылка (ref) на ScrollView для прокрутки вниз при новых сообщениях
  const scrollRef = useRef<ScrollView>(null);

  // Вычисляемые значения (преобразованы в переменные для удобства)

  // Текущий активный чат
  const currentChat = allChats[activeChatId];

  // Сообщения активного чата
  const currentMessages: Message[] = currentChat ? currentChat.messages : [];

  // Название активного чата
  const currentTitle: string = currentChat ? currentChat.name : 'Чат';

  /**
   * Эффект: подписка на Socket.IO события
   * Зависимости: myUsername и showLocalNotification
   * Выполняется при изменении этих переменных
   */
  useEffect(() => {
    /**
     * Событие 'history': приходит история сообщений при подключении
     * 
     * ПАРАМЕТР historyData: массив сообщений с сервера
     */
    socket.on('history', (historyData: any[]) => {
      // Обновляем состояние чатов
      setAllChats((prev: ChatState) => {
        // Создаём копию всех чатов
        const newChats = { ...prev };

        // Преобразуем историю в наш формат (Message[])
        newChats['1'].messages = historyData.map((msg: any) => ({
          id: msg._id,                           // ID с сервера
          text: msg.text,                        // Текст сообщения
          author: msg.user,                      // Кто написал
          sender: msg.user === myUsername ? 'me' : 'other',  // Своё или чужое
          time: new Date(msg.timestamp).toLocaleTimeString([], {
            hour: '2-digit',
            minute: '2-digit'
          })  // Форматируем время
        }));

        return newChats;
      });

      // Прокручиваем вниз через 500ms (даём времени на рендер)
      setTimeout(() => {
        scrollRef.current?.scrollToEnd({ animated: true });
      }, 500);
    });

    /**
     * Событие 'message': приходит новое сообщение в реальном времени
     * 
     * ПАРАМЕТР incoming: объект сообщения от сервера
     */
    socket.on("message", (incoming: IncomingMessage) => {
      // Определяем автора (может быть в разных полях)
      const author = incoming.senderName || incoming.user || 'Unknown';

      // Проверяем, это своё сообщение или чужое
      const isMe = author === myUsername;

      // Если это сообщение от других, показываем уведомление
      if (!isMe) {
        showLocalNotification(author, incoming.text);
      }

      // Обновляем состояние чатов
      setAllChats((prev: ChatState) => {
        // ID чата (по умолчанию первый)
        const chatId = incoming.chatId || '1';

        // Проверяем, нет ли уже такого сообщения (дубликат)
        const exists = prev[chatId]?.messages.some(
          (m: Message) => m.id === incoming.id || m.id === incoming._id
        );

        // Если дубликат, ничего не меняем
        if (exists) return prev;

        // Создаём объект нового сообщения в нашем формате
        const newMessage: Message = {
          id: incoming.id || incoming._id || Date.now().toString(),
          text: incoming.text,
          author: author,
          sender: isMe ? 'me' : 'other',
          time: incoming.time || new Date().toLocaleTimeString([], {
            hour: '2-digit',
            minute: '2-digit'
          })
        };

        // Возвращаем новое состояние с добавленным сообщением
        return {
          ...prev,
          [chatId]: {
            ...prev[chatId],
            messages: [...prev[chatId].messages, newMessage]  // Добавляем сообщение в конец
          }
        };
      });

      // Быстро прокручиваем вниз
      setTimeout(() => {
        scrollRef.current?.scrollToEnd({ animated: true });
      }, 100);
    });

    // Функция очистки: отписываемся от событий при размонтировании
    return () => {
      socket.off('history');
      socket.off('message');
    };
  }, [myUsername, showLocalNotification]);  // Переписываемся при изменении этих значений

  /**
   * handleSend — функция отправки сообщения на сервер
   * 
   * ПАРАМЕТРЫ:
   * - inputText: текст сообщения
   * - activeChatId: в какой чат отправляем
   * - myUsername: кто отправляет
   * 
   * ЧТО ДЕЛАЕТ:
   * 1. Проверяет, что текст не пустой
   * 2. Создаёт объект сообщения
   * 3. Отправляет на сервер через Socket.IO
   */
  const handleSend = (
    inputText: string,      // Текст
    activeChatId: string,   // ID чата
    myUsername: string      // Имя пользователя
  ): void => {
    // Проверяем, что текст не только из пробелов
    if (inputText.trim().length > 0) {
      // Создаём объект payload для отправки на сервер
      const payload: SocketEventPayload = {
        text: inputText.trim(),  // Текст (без лишних пробелов)
        senderName: myUsername,  // Кто отправляет
        chatId: activeChatId,    // В какой чат
        time: new Date().toLocaleTimeString([], {
          hour: '2-digit',
          minute: '2-digit'
        })  // Время
      };

      // Отправляем на сервер через Socket.IO
      socket.emit("message", payload);
    }
  };

  // Возвращаем все нужные переменные и функции
  return {
    activeChatId,
    setActiveChatId,
    allChats,
    currentMessages,
    currentTitle,
    scrollRef,
    handleSend
  };
}
