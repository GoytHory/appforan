import { io, Socket } from "socket.io-client";

/**
 * socket.ts — конфигурация Socket.IO клиента для реального времени.
 * 
 * ЧТО ЭТО:
 * Socket.IO — это библиотека для двусторонней связи между клиентом и сервером в реальном времени.
 * Используется для отправки и получения сообщений без задержки.
 * 
 * ЧТО ДЕЛАЕТ:
 * 1. Подключается к серверу Socket.IO по адресу SOCKET_URL
 * 2. Настраивает параметры соединения (только WebSocket, без деградации)
 * 3. Экспортирует готовый объект socket для использования во всём приложении
 * 
 * КАК ИСПОЛЬЗОВАТЬ:
 * import socket from './utils/socket'
 * socket.emit('message', { text: 'Привет!' })    // Отправка
 * socket.on('message', (msg) => { ... })          // Получение
 */

// Адрес сервера Socket.IO
// Это URL, на котором запущен сервер (может быть localhost, IP, или production URL)
const SOCKET_URL = "https://serverapp-f0wj.onrender.com";

/**
 * Создание экземпляра сокета с настройками
 * 
 * Параметры:
 * - transports: ['websocket'] — используем только WebSocket (самый быстрый протокол)
 *   Альтернативы: 'polling' (постоянный опрос сервера, медленнее)
 * 
 * - forceNew: true — всегда создавать новое соединение
 *   (не переиспользовать старое, которое может быть нестабильным)
 * 
 * - upgrade: false — не пытаться обновляться на другие протоколы
 *   (остаёмся только на WebSocket, это проще и надёжнее)
 */
const socket: Socket = io(SOCKET_URL, {
  transports: ['websocket'],    // Используем только WebSocket
  forceNew: true,               // Новое соединение каждый раз
  upgrade: false,               // Не обновляем протокол
  autoConnect: false
});

export const setSocketToken = (token: string): void => {
  socket.auth = { token };
};

export const clearSocketToken = (): void => {
  socket.auth = {};
};

export const connectSocket = (): void => {
  if (!socket.connected) {
    socket.connect();
  }
};

export const disconnectSocket = (): void => {
  if (socket.connected) {
    socket.disconnect();
  }
};

// Экспортируем готовый socket object
// Теперь любой файл может импортировать и использовать socket.emit() и socket.on()
export default socket;
