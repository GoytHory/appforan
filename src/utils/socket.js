import { io } from "socket.io-client";

/**
 * Настройка Socket.IO клиента для реального времени.
 * Подключается к серверу для обмена сообщениями в чатах.
 * Используется во всём приложении для отправки и приёма сообщений.
 */

// Адрес сервера Socket.IO (проверь через ipconfig или используй production URL)
const SOCKET_URL = "https://serverapp-f0wj.onrender.com";

// Создаём экземпляр сокета с настройками для стабильного соединения
const socket = io(SOCKET_URL, {
  transports: ['websocket'], // Используем только WebSocket для скорости
  forceNew: true, // Всегда новое соединение
  upgrade: false // Отключаем апгрейд до HTTP для простоты
});

export default socket;