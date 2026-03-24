import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { ScrollView } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import socket, { connectSocket, disconnectSocket } from "../utils/socket";
import {
  createDirectChat as apiCreateDirectChat,
  getChatMessages,
  getDirectChats,
  searchUsers as apiSearchUsers,
} from "../utils/api";
import {
  Message,
  MessageMedia,
  ChatState,
  SocketEventPayload,
  UseChatsReturnType,
  SearchUser,
  ChatListItem,
  IncomingMessage,
} from "../types";

const BASE_CHATS: ChatState = {};

const formatTime = (value?: string | number | Date): string => {
  if (!value) {
    return "";
  }

  return new Date(value).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });
};

const normalizeUserId = (user: { id?: string; _id?: string }): string => {
  return user.id || user._id || "";
};

const getIncomingAuthor = (incoming: IncomingMessage): string => {
  return (
    incoming.sender?.username ||
    incoming.senderName ||
    incoming.user ||
    "Unknown"
  );
};

const getPreviewText = (message: { text?: string; media?: MessageMedia }): string => {
  const text = (message.text || '').trim();
  if (text) {
    return text;
  }

  if (message.media?.type === 'image') {
    return 'Изображение';
  }

  if (message.media?.type === 'audio') {
    return 'Голосовое сообщение';
  }

  return 'Сообщение';
};

export function useChats(
  myUsername: string,
  showLocalNotification: (title: string, body: string) => Promise<void>,
  onAuthFailure: () => void,
): UseChatsReturnType {
  const [activeChatId, setActiveChatId] = useState<string>("");
  const [allChats, setAllChats] = useState<ChatState>(BASE_CHATS);

  const scrollRef = useRef<ScrollView>(null);
  const tokenRef = useRef<string>("");

  // Используем Ref для активного ID, чтобы сокет всегда знал, какой чат "сейчас на экране"
  // без перезапуска всего слушателя
  const activeIdRef = useRef(activeChatId);
  useEffect(() => {
    activeIdRef.current = activeChatId;
  }, [activeChatId]);

  const ensureToken = useCallback(async (): Promise<string> => {
    if (tokenRef.current) {
      return tokenRef.current;
    }

    const token = (await AsyncStorage.getItem("auth_token")) || "";
    tokenRef.current = token;
    return token;
  }, []);

  const upsertDirectChat = useCallback(
    (
      chatId: string,
      user: {
        id: string;
        username: string;
        avatar?: string;
        status?: "online" | "offline";
      },
    ): void => {
      setAllChats((prev) => {
        const existingMessages = prev[chatId]?.messages || [];
        return {
          ...prev,
          [chatId]: {
            name: user.username,
            messages: existingMessages,
            avatar: user.avatar,
            status: user.status,
            isDirect: true,
            participantUserId: user.id,
            lastMessageText: prev[chatId]?.lastMessageText,
            lastMessageTime: prev[chatId]?.lastMessageTime,
          },
        };
      });
    },
    [],
  );

  const syncDirectChats = useCallback(async (): Promise<void> => {
    const token = await ensureToken();
    if (!token) {
      return;
    }

    const { chats } = await getDirectChats(token);
    setAllChats((prev) => {
      const next = { ...prev };

      chats.forEach((chat) => {
        const userId = normalizeUserId(chat.otherUser);
        if (!userId) {
          return;
        }

        next[chat.chatId] = {
          name: chat.otherUser.username,
          messages: next[chat.chatId]?.messages || [],
          avatar: chat.otherUser.avatar,
          status: chat.otherUser.status,
          isDirect: true,
          participantUserId: userId,
          lastMessageText: chat.lastMessage?.previewText || chat.lastMessage?.text,
          lastMessageTime: formatTime(chat.lastMessage?.timestamp),
        };
      });

      return next;
    });

    if (chats.length > 0) {
      setActiveChatId((currentId) => {
        if (currentId && chats.some((chat) => chat.chatId === currentId)) {
          return currentId;
        }
        return chats[0].chatId;
      });
    }
  }, [ensureToken]);

  const loadChatHistory = useCallback(
    async (chatId: string): Promise<void> => {
      if (!chatId) {
        return;
      }

      const token = await ensureToken();
      if (!token) {
        return;
      }

      try {
        const { messages } = await getChatMessages(token, chatId, {
          limit: 50,
        });

        const formatted: Message[] = messages.map((msg) => {
          const author =
            typeof msg.sender === "object"
              ? msg.sender?.username || "Unknown"
              : "Unknown";

          return {
            id: msg._id || msg.id || `${chatId}:${msg.timestamp || Date.now()}`,
            text: msg.text || '',
            media: msg.media,
            author,
            sender: (author === myUsername ? "me" : "other") as "me" | "other",
            time: formatTime(msg.timestamp),
          };
        });

        setAllChats((prev) => ({
          ...prev,
          [chatId]: {
            ...(prev[chatId] || { name: `Чат ${chatId}`, messages: [] }),
            messages: formatted,
            lastMessageText: formatted.length ? getPreviewText(formatted[formatted.length - 1]) : prev[chatId]?.lastMessageText,
            lastMessageTime: formatted[formatted.length - 1]?.time,
          },
        }));

        setTimeout(() => {
          scrollRef.current?.scrollToEnd({ animated: false });
        }, 30);
      } catch (err) {
        console.log("Ошибка загрузки истории:", err);
      }
    },
    [ensureToken, myUsername],
  );

  const searchUsers = useCallback(
    async (query: string): Promise<SearchUser[]> => {
      const trimmed = query.trim();
      if (trimmed.length < 2) {
        return [];
      }

      const token = await ensureToken();
      if (!token) {
        return [];
      }

      try {
        const { users } = await apiSearchUsers(token, trimmed);
        return users
          .map((user) => ({
            ...user,
            id: normalizeUserId(user),
          }))
          .filter((user) => Boolean(user.id));
      } catch (err) {
        console.log("Ошибка поиска пользователей:", err);
        return [];
      }
    },
    [ensureToken],
  );

  const createDirectChat = useCallback(
    async (targetUserId: string): Promise<string> => {
      const token = await ensureToken();
      if (!token) {
        throw new Error("Сессия истекла, войдите снова");
      }

      const result = await apiCreateDirectChat(token, targetUserId);
      const otherUserId = normalizeUserId(result.otherUser);
      if (!otherUserId) {
        throw new Error("Сервер вернул пользователя без id");
      }

      upsertDirectChat(result.chatId, {
        ...result.otherUser,
        id: otherUserId,
      });
      setActiveChatId(result.chatId);
      return result.chatId;
    },
    [ensureToken, upsertDirectChat],
  );

  const chatList = useMemo<ChatListItem[]>(() => {
    return Object.entries(allChats).map(([id, chat]) => {
      const lastMessage = chat.messages[chat.messages.length - 1];
      return {
        id,
        name: chat.name,
        lastMsg:
          (lastMessage ? getPreviewText(lastMessage) : null) ||
          chat.lastMessageText ||
          (chat.isDirect ? "Персональный чат" : "Связь установлена..."),
        time: lastMessage?.time || chat.lastMessageTime || "",
        avatarUrl: chat.avatar,
        status: chat.status,
      };
    });
  }, [allChats]);

  // 1. ГЛОБАЛЬНЫЕ СЛУШАТЕЛИ (запускаются 1 раз при старте)
  useEffect(() => {
    if (!myUsername) {
      disconnectSocket();
      return;
    }

    const handleConnect = () => {
      if (activeIdRef.current) {
        socket.emit("joinChat", activeIdRef.current);
      }
    };

    const handleConnectError = (error: Error) => {
      if (error.message.includes("авторизация")) {
        onAuthFailure();
      }
    };

    socket.on("connect", handleConnect);
    socket.on("connect_error", handleConnectError);
    connectSocket();

    return () => {
      socket.off("connect", handleConnect);
      socket.off("connect_error", handleConnectError);
    };
  }, [myUsername, onAuthFailure]);

  // 2. HEARTBEAT: Периодический пинг для обновления активности на сервере
  // Запускается независимо от socket.connected, потому что сокет может еще не подключиться
  useEffect(() => {
    if (!myUsername) {
      return;
    }

    // Отправляем пинг каждые 10 секунд
    const heartbeatInterval = setInterval(() => {
      if (socket.connected) {
        socket.emit("ping");
      }
    }, 10000);

    return () => {
      clearInterval(heartbeatInterval);
    };
  }, [myUsername]);

  useEffect(() => {
    const initDirectChats = async (): Promise<void> => {
      if (!myUsername) {
        setAllChats(BASE_CHATS);
        tokenRef.current = "";
        return;
      }

      try {
        await syncDirectChats();
      } catch (err) {
        console.log("Ошибка загрузки персональных чатов:", err);
      }
    };

    initDirectChats();

    if (!myUsername) {
      return;
    }

    // Загружаем персональные чаты и синхронизируем статусы каждые 10 секунд
    const intervalId = setInterval(() => {
      void syncDirectChats();
    }, 10000);

    return () => {
      clearInterval(intervalId);
    };
  }, [myUsername, syncDirectChats]);

  useEffect(() => {
    if (!myUsername) {
      return;
    }

    const handleMessage = (incoming: IncomingMessage) => {
      const targetChatId = incoming.chatId || "";
      if (!targetChatId) {
        return;
      }

      const author = getIncomingAuthor(incoming);
      const isMe = author === myUsername;
      // Если сообщение для текущего открытого чата, то не показываем локальное уведомление, потому что пользователь уже видит это сообщение
      const isCurrentChatOpen = targetChatId === activeIdRef.current;

      if (!isMe && !isCurrentChatOpen) {
        void showLocalNotification(author, getPreviewText({ text: incoming.text, media: incoming.media }));
      }

      setAllChats((prev) => {
        const existingChat = prev[targetChatId] || {
          name: author,
          messages: [],
          isDirect: targetChatId.startsWith("dm:"),
        };
        const isDuplicate = existingChat.messages.some(
          (m: any) => m.id === (incoming.id || incoming._id),
        );
        if (isDuplicate) return prev;

        const newMessage: Message = {
          id: incoming.id || incoming._id || Date.now().toString(),
          text: incoming.text || '',
          media: incoming.media,
          author: author,
          sender: (isMe ? "me" : "other") as "me" | "other",
          time:
            formatTime(incoming.timestamp) ||
            incoming.time ||
            new Date().toLocaleTimeString([], {
              hour: "2-digit",
              minute: "2-digit",
            }),
        };

        return {
          ...prev,
          [targetChatId]: {
            ...existingChat,
            avatar: existingChat.avatar || incoming.sender?.avatar,
            messages: [...existingChat.messages, newMessage],
            lastMessageText: getPreviewText(newMessage),
            lastMessageTime: newMessage.time,
          },
        };
      });

      if (targetChatId === activeIdRef.current) {
        setTimeout(() => {
          scrollRef.current?.scrollToEnd({ animated: true });
        }, 100);
      }
    };

    socket.on("message", handleMessage);

    return () => {
      socket.off("message", handleMessage);
    };
  }, [myUsername, showLocalNotification]); // ЭТОТ ЭФФЕКТ НЕ ПЕРЕЗАПУСКАЕТСЯ ПРИ СМЕНЕ ЧАТА

  // 2. ВХОД В КОМНАТУ + ЗАГРУЗКА ИСТОРИИ ПО REST
  useEffect(() => {
    if (!myUsername || !activeChatId) {
      return;
    }

    socket.emit("joinChat", activeChatId);
    void loadChatHistory(activeChatId);
  }, [activeChatId, myUsername, loadChatHistory]);

  const handleSend = (
    inputText: string,
    activeChatId: string,
    _myUsername: string,
  ): void => {
    if (inputText.trim().length > 0 && activeChatId) {
      const payload: SocketEventPayload = {
        text: inputText.trim(),
        chatId: activeChatId,
      };
      socket.emit("message", payload);
    }
  };

  const handleSendMedia = (
    chatId: string,
    media: MessageMedia,
    text?: string,
  ): void => {
    if (!chatId || !media?.url || !media?.type) {
      return;
    }

    const payload: SocketEventPayload = {
      chatId,
      media,
      text: text?.trim() || undefined,
    };
    socket.emit('message', payload);
  };

  return {
    activeChatId,
    setActiveChatId,
    allChats,
    chatList,
    currentMessages: allChats[activeChatId]?.messages || [],
    currentTitle: allChats[activeChatId]?.name || "Чат",
    currentChatAvatar: allChats[activeChatId]?.avatar,
    currentParticipantUserId: allChats[activeChatId]?.participantUserId,
    currentChatStatus: allChats[activeChatId]?.status,
    currentChatIsDirect: Boolean(allChats[activeChatId]?.isDirect),
    scrollRef,
    handleSend,
    handleSendMedia,
    searchUsers,
    createDirectChat,
  };
}
