/**
 * Файл types/index.ts
 * 
 * Здесь определяются все TypeScript типы и интерфейсы для приложения.
 * Типы помогают IDE понять структуру данных и поймать ошибки на этапе разработки.
 * 
 * Что в этом файле:
 * - Message: структура одного сообщения
 * - Chat: структура одного чата
 * - ChatState: состояние всех чатов
 * - Notification: структура уведомления
 * - SocketEvents: события Socket.IO
 */

/**
 * Message — интерфейс для одного сообщения в чате.
 * 
 * Интерфейс — это контракт, который говорит:
 * "Если объект типа Message, то он ДОЛЖЕН иметь эти свойства с этими типами"
 * 
 * Параметры:
 * - id: уникальный идентификатор сообщения (строка или число)
 * - text: содержание сообщения (строка)
 * - author: кто отправил (строка с именем)
 * - sender: 'me' если своё, 'other' если чужое (строковый литерал, только эти два значения)
 * - time: время отправки в формате "20:15" (строка)
 */
export interface Message {
  id: string | number;         // ID может быть строкой или числом
  text: string;                 // Текст сообщения
  author: string;               // Имя автора
  sender: 'me' | 'other';       // Только эти два значения (литерал)
  time: string;                 // Время в виде строки
}

/**
 * Chat — интерфейс для одного чата.
 * 
 * Параметры:
 * - name: название чата (например, "Лохи", "болталк")
 * - messages: массив всех сообщений в этом чате
 */
export interface Chat {
  name: string;                 // Название чата
  messages: Message[];          // Массив сообщений
}

/**
 * ChatState — интерфейс для всего состояния чатов.
 * 
 * Это объект, где:
 * - ключи: ID чатов (строки типа "1", "2", "3")
 * - значения: объекты типа Chat
 * 
 * Например: {
 *   "1": { name: "Лохи", messages: [...] },
 *   "2": { name: "болталк", messages: [...] }
 * }
 */
export interface ChatState {
  [chatId: string]: Chat;       // Объект, где ключи — строки, значения — Chat
}

/**
 * IncomingMessage — интерфейс для сообщения, приходящего от сервера.
 * 
 * Сообщение может прийти в разных форматах от Socket.IO,
 * поэтому в нём много optional полей (? означает, что поле может быть не обязательным).
 * 
 * Параметры:
 * - text: содержание (обязательное)
 * - senderName: имя отправителя
 * - user: альтернативное имя отправителя (для совместимости со старым форматом)
 * - _id или id: ID сообщения на сервере
 * - timestamp: время в формате ISO (строка)
 * - chatId: в какой чат это сообщение
 * - time: уже отформатированное время
 */
export interface IncomingMessage {
  text: string;                             // Обязательно
  senderName?: string;                      // Может быть
  user?: string;                            // Может быть
  _id?: string;                             // MongoDB ID
  id?: string;                              // Может быть
  timestamp?: string | number;              // ISO время или миллисекунды
  chatId?: string;                          // ID чата
  time?: string;                            // Уже отформатированное время
}

/**
 * UserProfile — интерфейс профиля пользователя.
 * 
 * Параметры:
 * - username: имя пользователя (строка)
 * - avatar: URI изображения аватара (может быть null, если нет)
 */
export interface UserProfile {
  username: string;             // Имя пользователя
  avatar?: string | null;       // URL аватара (может быть пусто)
}

/**
 * NotificationContent — интерфейс для содержимого уведомления.
 * 
 * Параметры:
 * - title: заголовок уведомления
 * - body: текст уведомления
 */
export interface NotificationContent {
  title: string;                // Заголовок
  body: string;                 // Содержание
}

/**
 * SocketEventPayload — интерфейс для данных, отправляемых через Socket.IO.
 * 
 * Когда мы отправляем сообщение на сервер, нужно отправить эту структуру.
 * 
 * Параметры:
 * - text: содержание сообщения
 * - senderName: кто отправляет (имя пользователя)
 * - chatId: в какой чат
 * - time: время отправки
 */
export interface SocketEventPayload {
  text: string;                 // Текст сообщения
  senderName: string;           // Имя отправителя
  chatId: string;               // ID чата
  time: string;                 // Время
}

/**
 * LoginScreenProps — типы для пропсов компонента LoginScreen.
 * 
 * Параметры:
 * - onLogin: функция, которая вызывается при входе, принимает имя и возвращает Promise
 */
export interface LoginScreenProps {
  onLogin: (name: string, password: string, mode: 'login' | 'register') => Promise<void>;
}

/**
 * MainScreenProps — типы для пропсов компонента MainScreen.
 * 
 * Это большой интерфейс с множеством свойств для основного экрана.
 */
export interface MainScreenProps {
  myUsername: string;                       // Имя текущего пользователя
  setMyUsername: (name: string) => void;    // Функция для изменения имени
  currentTitle: string;                     // Название текущего чата
  currentMessages: Message[];               // Сообщения текущего чата
  scrollRef: React.RefObject<any>;          // Ссылка на ScrollView для прокрутки
  keyboardHeight: number;                   // Высота клавиатуры
  activeChatId: string;                     // ID активного чата
  setActiveChatId: (id: string) => void;    // Функция для смены чата
  handleSend: (text: string, chatId: string, username: string) => void; // Функция отправки
}

/**
 * HeaderProps — типы для пропсов компонента Header.
 */
export interface HeaderProps {
  title: string;                            // Название чата
  myUsername: string;                       // Имя пользователя
  setMyUsername: (name: string) => void;    // Функция изменения имени
  onOpenProfile?: () => void;               // Функция открытия профиля (может быть не передана)
}

/**
 * BottomProps — типы для пропсов компонента Bottom.
 */
export interface BottomProps {
  value: string;                            // Текущее значение в инпуте
  onTextChange: (text: string) => void;     // Функция при изменении текста
  onSend: () => void;                       // Функция при отправке
}

/**
 * MidlerProps — типы для пропсов компонента Midler (список сообщений).
 */
export interface MidlerProps {
  chatMessages: Message[];                  // Массив сообщений
  scrollRef: React.RefObject<any>;          // Ссылка для скролла
}

/**
 * ChatListMenuProps — типы для пропсов компонента ChatListMenu.
 */
export interface ChatListMenuProps {
  visible: boolean;                         // Видимо ли меню
  onClose: () => void;                      // Функция закрытия
  onSelectChat: (id: string) => void;       // Функция выбора чата
}

/**
 * FloatingButtonProps — типы для пропсов компонента FloatingButton.
 */
export interface FloatingButtonProps {
  onPress: () => void;                      // Функция нажатия
}

/**
 * ProfileScreenProps — типы для пропсов компонента ProfileScreen.
 */
export interface ProfileScreenProps {
  myUsername: string;                       // Имя пользователя
  setMyUsername: (name: string) => void;    // Функция изменения имени
}

/**
 * UseAuthReturnType — типы возвращаемого значения хука useAuth.
 */
export interface UseAuthReturnType {
  myUsername: string;                       // Текущее имя пользователя
  setMyUsername: (name: string) => void;    // Функция изменения
  isLoading: boolean;                       // Загружается ли данные
  handleLogin: (name: string, password: string, mode: 'login' | 'register') => Promise<void>;  // Функция логина
}

/**
 * UseChatsReturnType — типы возвращаемого значения хука useChats.
 */
export interface UseChatsReturnType {
  activeChatId: string;                     // ID активного чата
  setActiveChatId: (id: string) => void;    // Функция смены
  allChats: ChatState;                      // Все чаты
  currentMessages: Message[];               // Сообщения активного чата
  currentTitle: string;                     // Название активного чата
  scrollRef: React.RefObject<any>;          // Ссылка для скролла
  handleSend: (text: string, chatId: string, username: string) => void;  // Функция отправки
}

/**
 * UseNotificationsReturnType — типы возвращаемого значения хука useNotifications.
 */
export interface UseNotificationsReturnType {
  showLocalNotification: (title: string, body: string) => Promise<void>;  // Функция показа
}

/**
 * UseKeyboardReturnType — типы возвращаемого значения хука useKeyboard.
 */
export interface UseKeyboardReturnType {
  keyboardHeight: number;                   // Текущая высота клавиатуры
}


/**
 * Интерфейс пользователя из базы данных MongoDB.
 * _id — уникальный ключ, который создает сама база.
 * username — отображаемое имя.
 */
export interface User {
  _id: string;      // Уникальный идентификатор из MongoDB
  username: string; // Никнейм пользователя
}

/**
 * Тип возвращаемого значения для хука useAuth.
 * Мы меняем myUsername (строку) на myUser (объект или null).
 */
export interface UseAuthUserReturnType {
  myUser: User | null;                         // Весь объект пользователя или ничего
  setMyUser: (user: User | null) => void;      // Функция для ручного изменения
  isLoading: boolean;                          // Состояние загрузки
  handleUserLogin: (userData: User) => Promise<void>; // Функция входа, принимающая объект
}
