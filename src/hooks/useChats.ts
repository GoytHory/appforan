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
  ChatUpdatePayload,
  SocketEventPayload,
  UseChatsReturnType,
  SearchUser,
  ChatListItem,
  IncomingMessage,
} from "../types";

const BASE_CHATS: ChatState = {};
const PAGE_SIZE = 50;

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

const getPreviewText = (message: {
  text?: string;
  media?: MessageMedia;
}): string => {
  const text = (message.text || "").trim();
  if (text) {
    return text;
  }

  if (message.media?.type === "image") {
    return "Изображение";
  }

  if (message.media?.type === "audio") {
    return "Голосовое сообщение";
  }

  return "Сообщение";
};

const getComparableTimestamp = (value?: string | number | Date): number => {
  if (!value) {
    return 0;
  }

  const timestamp = new Date(value).getTime();
  return Number.isFinite(timestamp) ? timestamp : 0;
};

const mergeMessages = (
  currentMessages: Message[],
  nextMessages: Message[],
  mode: "append" | "prepend",
): Message[] => {
  const combined =
    mode === "append"
      ? [...currentMessages, ...nextMessages]
      : [...nextMessages, ...currentMessages];
  const uniqueMessages = new Map<string, Message>();

  combined.forEach((message) => {
    uniqueMessages.set(String(message.id), message);
  });

  return Array.from(uniqueMessages.values()).sort(
    (first, second) =>
      getComparableTimestamp(first.timestamp) -
      getComparableTimestamp(second.timestamp),
  );
};

const formatMessage = (
  chatId: string,
  message: {
    _id?: string;
    id?: string;
    text?: string;
    media?: MessageMedia;
    timestamp?: string | number;
    sender?: { username?: string } | string;
  },
  myUsername: string,
): Message => {
  const author =
    typeof message.sender === "object"
      ? message.sender?.username || "Unknown"
      : "Unknown";
  const timestamp = message.timestamp
    ? new Date(message.timestamp).toISOString()
    : undefined;

  return {
    id:
      message._id ||
      message.id ||
      `${chatId}:${message.timestamp || Date.now()}`,
    text: message.text || "",
    media: message.media,
    author,
    sender: (author === myUsername ? "me" : "other") as "me" | "other",
    time: formatTime(message.timestamp),
    timestamp,
  };
};

export function useChats(
  myUsername: string,
  showLocalNotification: (
    title: string,
    body: string,
    options?: { chatId?: string; senderAvatar?: string },
  ) => Promise<void>,
  onAuthFailure: () => void,
): UseChatsReturnType {
  const [activeChatId, setActiveChatId] = useState<string>("");
  const [allChats, setAllChats] = useState<ChatState>(BASE_CHATS);

  const scrollRef = useRef<ScrollView>(null);
  const allChatsRef = useRef<ChatState>(BASE_CHATS);
  const tokenRef = useRef<string>("");
  const joinedChatIdRef = useRef<string>("");
  const pendingAutoScrollChatIdRef = useRef<string>("");

  useEffect(() => {
    allChatsRef.current = allChats;
  }, [allChats]);

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
        const existingChat = prev[chatId];
        return {
          ...prev,
          [chatId]: {
            name: user.username,
            messages: existingChat?.messages || [],
            avatar: user.avatar || existingChat?.avatar,
            status: user.status || existingChat?.status,
            isDirect: true,
            participantUserId: user.id,
            lastMessageText: existingChat?.lastMessageText,
            lastMessageTime: existingChat?.lastMessageTime,
            updatedAt: existingChat?.updatedAt,
            oldestMessageTimestamp: existingChat?.oldestMessageTimestamp,
            hasLoadedInitialMessages: existingChat?.hasLoadedInitialMessages,
            hasMoreMessages: existingChat?.hasMoreMessages ?? true,
            isLoadingInitialMessages: existingChat?.isLoadingInitialMessages,
            isLoadingOlderMessages: existingChat?.isLoadingOlderMessages,
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
          lastMessageText:
            chat.lastMessage?.previewText || chat.lastMessage?.text,
          lastMessageTime: formatTime(chat.lastMessage?.timestamp),
          updatedAt:
            (chat.lastMessage?.timestamp
              ? new Date(chat.lastMessage.timestamp).toISOString()
              : undefined) ||
            (chat.updatedAt
              ? new Date(chat.updatedAt).toISOString()
              : next[chat.chatId]?.updatedAt),
          oldestMessageTimestamp: next[chat.chatId]?.oldestMessageTimestamp,
          hasLoadedInitialMessages: next[chat.chatId]?.hasLoadedInitialMessages,
          hasMoreMessages: next[chat.chatId]?.hasMoreMessages ?? true,
          isLoadingInitialMessages: next[chat.chatId]?.isLoadingInitialMessages,
          isLoadingOlderMessages: next[chat.chatId]?.isLoadingOlderMessages,
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

      const existingChat = allChatsRef.current[chatId];
      let skipReason = "";
      const hasMessages = (existingChat?.messages?.length || 0) > 0;

      if (existingChat?.isLoadingInitialMessages) {
        skipReason = "already loading";
      } else if (hasMessages) {
        skipReason = "already has messages";
      }

      if (skipReason) {
        return;
      }

      setAllChats((prev) => ({
        ...prev,
        [chatId]: {
          ...(prev[chatId] || { name: `Чат ${chatId}`, messages: [] }),
          isLoadingInitialMessages: true,
          hasMoreMessages: prev[chatId]?.hasMoreMessages ?? true,
        },
      }));

      const token = await ensureToken();
      if (!token) {
        setAllChats((prev) => ({
          ...prev,
          [chatId]: {
            ...(prev[chatId] || { name: `Чат ${chatId}`, messages: [] }),
            isLoadingInitialMessages: false,
          },
        }));
        return;
      }

      try {
        const { messages } = await getChatMessages(token, chatId, {
          limit: PAGE_SIZE,
        });

        const formatted = messages.map((message) =>
          formatMessage(chatId, message, myUsername),
        );

        setAllChats((prev) => ({
          ...prev,
          [chatId]: {
            ...(prev[chatId] || { name: `Чат ${chatId}`, messages: [] }),
            messages: formatted,
            lastMessageText: formatted.length
              ? getPreviewText(formatted[formatted.length - 1])
              : prev[chatId]?.lastMessageText,
            lastMessageTime: formatted[formatted.length - 1]?.time,
            updatedAt:
              formatted[formatted.length - 1]?.timestamp ||
              prev[chatId]?.updatedAt,
            oldestMessageTimestamp:
              formatted[0]?.timestamp || prev[chatId]?.oldestMessageTimestamp,
            hasLoadedInitialMessages: true,
            hasMoreMessages: messages.length === PAGE_SIZE,
            isLoadingInitialMessages: false,
            isLoadingOlderMessages: false,
          },
        }));
      } catch (err) {
        console.log("Ошибка загрузки истории:", err);
        setAllChats((prev) => ({
          ...prev,
          [chatId]: {
            ...(prev[chatId] || { name: `Чат ${chatId}`, messages: [] }),
            isLoadingInitialMessages: false,
          },
        }));
      }
    },
    [ensureToken, myUsername],
  );

  const loadOlderMessages = useCallback(async (): Promise<void> => {
    const chatId = activeIdRef.current;
    if (!chatId) {
      return;
    }

    const existingChat = allChatsRef.current[chatId];
    let beforeCursor = existingChat?.oldestMessageTimestamp || "";
    let skipReason = "";

    if (!existingChat?.hasLoadedInitialMessages) {
      skipReason = "initial history not loaded";
    } else if (!existingChat?.hasMoreMessages) {
      skipReason = "hasMoreMessages=false";
    } else if (existingChat.isLoadingOlderMessages) {
      skipReason = "already loading older messages";
    } else if (!beforeCursor) {
      skipReason = "missing oldestMessageTimestamp";
      setAllChats((prev) => ({
        ...prev,
        [chatId]: {
          ...(prev[chatId] || { name: `Чат ${chatId}`, messages: [] }),
          hasMoreMessages: false,
        },
      }));
    }

    if (skipReason || !beforeCursor) {
      return;
    }

    setAllChats((prev) => ({
      ...prev,
      [chatId]: {
        ...(prev[chatId] || { name: `Чат ${chatId}`, messages: [] }),
        isLoadingOlderMessages: true,
      },
    }));

    const token = await ensureToken();
    if (!token) {
      setAllChats((prev) => ({
        ...prev,
        [chatId]: {
          ...(prev[chatId] || { name: `Чат ${chatId}`, messages: [] }),
          isLoadingOlderMessages: false,
        },
      }));
      return;
    }

    try {
      const { messages } = await getChatMessages(token, chatId, {
        before: beforeCursor,
        limit: PAGE_SIZE,
      });
      const olderMessages = messages.map((message) =>
        formatMessage(chatId, message, myUsername),
      );

      setAllChats((prev) => {
        const existingChat = prev[chatId];
        if (!existingChat) {
          return prev;
        }

        const mergedMessages = mergeMessages(
          existingChat.messages,
          olderMessages,
          "prepend",
        );

        return {
          ...prev,
          [chatId]: {
            ...existingChat,
            messages: mergedMessages,
            oldestMessageTimestamp:
              mergedMessages[0]?.timestamp ||
              existingChat.oldestMessageTimestamp,
            hasMoreMessages: messages.length === PAGE_SIZE,
            isLoadingOlderMessages: false,
          },
        };
      });
    } catch (err) {
      console.log("Ошибка догрузки сообщений:", err);
      setAllChats((prev) => ({
        ...prev,
        [chatId]: {
          ...(prev[chatId] || { name: `Чат ${chatId}`, messages: [] }),
          isLoadingOlderMessages: false,
        },
      }));
    }
  }, [ensureToken, myUsername]);

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
    return Object.entries(allChats)
      .sort(([, firstChat], [, secondChat]) => {
        const firstTimestamp =
          firstChat.updatedAt ||
          firstChat.messages[firstChat.messages.length - 1]?.timestamp;
        const secondTimestamp =
          secondChat.updatedAt ||
          secondChat.messages[secondChat.messages.length - 1]?.timestamp;

        return (
          getComparableTimestamp(secondTimestamp) -
          getComparableTimestamp(firstTimestamp)
        );
      })
      .map(([id, chat]) => {
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
      joinedChatIdRef.current = "";
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
        joinedChatIdRef.current = "";
        pendingAutoScrollChatIdRef.current = "";
        return;
      }

      try {
        await syncDirectChats();
      } catch (err) {
        console.log("Ошибка загрузки персональных чатов:", err);
      }
    };

    initDirectChats();
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
        void showLocalNotification(
          author,
          getPreviewText({ text: incoming.text, media: incoming.media }),
          {
            chatId: targetChatId,
            senderAvatar: incoming.sender?.avatar,
          },
        );
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
          text: incoming.text || "",
          media: incoming.media,
          author: author,
          sender: (isMe ? "me" : "other") as "me" | "other",
          timestamp: incoming.timestamp
            ? new Date(incoming.timestamp).toISOString()
            : undefined,
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
            messages: mergeMessages(
              existingChat.messages,
              [newMessage],
              "append",
            ),
            lastMessageText: getPreviewText(newMessage),
            lastMessageTime: newMessage.time,
            updatedAt: newMessage.timestamp || existingChat.updatedAt,
          },
        };
      });

      if (
        isMe &&
        targetChatId === activeIdRef.current &&
        pendingAutoScrollChatIdRef.current === targetChatId
      ) {
        pendingAutoScrollChatIdRef.current = "";
        setTimeout(() => {
          scrollRef.current?.scrollToEnd({ animated: true });
        }, 100);
      }
    };

    const handleChatUpdated = (incoming: ChatUpdatePayload) => {
      const targetChatId = incoming.chatId || "";
      if (!targetChatId) {
        return;
      }

      setAllChats((prev) => {
        const existingChat = prev[targetChatId] || {
          name: incoming.otherUser?.username || "Чат",
          messages: [],
          isDirect: targetChatId.startsWith("dm:"),
        };
        const otherUserId = incoming.otherUser
          ? normalizeUserId(incoming.otherUser)
          : existingChat.participantUserId;
        const updatedAtValue =
          incoming.updatedAt || incoming.lastMessage?.timestamp;

        return {
          ...prev,
          [targetChatId]: {
            ...existingChat,
            name: incoming.otherUser?.username || existingChat.name,
            avatar: incoming.otherUser?.avatar || existingChat.avatar,
            status: incoming.otherUser?.status || existingChat.status,
            isDirect: true,
            participantUserId: otherUserId,
            lastMessageText:
              incoming.lastMessage?.previewText ||
              incoming.lastMessage?.text ||
              existingChat.lastMessageText,
            lastMessageTime:
              formatTime(incoming.lastMessage?.timestamp) ||
              existingChat.lastMessageTime,
            updatedAt: updatedAtValue
              ? new Date(updatedAtValue).toISOString()
              : existingChat.updatedAt,
          },
        };
      });
    };

    socket.on("message", handleMessage);
    socket.on("chatUpdated", handleChatUpdated);

    return () => {
      socket.off("message", handleMessage);
      socket.off("chatUpdated", handleChatUpdated);
    };
  }, [myUsername, showLocalNotification]); // ЭТОТ ЭФФЕКТ НЕ ПЕРЕЗАПУСКАЕТСЯ ПРИ СМЕНЕ ЧАТА

  // 2. ВХОД В КОМНАТУ + ЗАГРУЗКА ИСТОРИИ ПО REST
  useEffect(() => {
    if (!myUsername || !activeChatId) {
      return;
    }

    if (joinedChatIdRef.current && joinedChatIdRef.current !== activeChatId) {
      socket.emit("leaveChat", joinedChatIdRef.current);
    }

    socket.emit("joinChat", activeChatId);
    joinedChatIdRef.current = activeChatId;
    void loadChatHistory(activeChatId);
  }, [activeChatId, myUsername, loadChatHistory]);

  const handleSend = (
    inputText: string,
    activeChatId: string,
    _myUsername: string,
  ): void => {
    if (inputText.trim().length > 0 && activeChatId) {
      pendingAutoScrollChatIdRef.current = activeChatId;
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
    if (!chatId || !media?.type || (!media.url && !media.objectKey)) {
      return;
    }

    pendingAutoScrollChatIdRef.current = chatId;
    const payload: SocketEventPayload = {
      chatId,
      media,
      text: text?.trim() || undefined,
    };
    socket.emit("message", payload);
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
    currentChatHasMoreMessages: Boolean(
      allChats[activeChatId]?.hasMoreMessages,
    ),
    // true если: загрузка идёт прямо сейчас, ИЛИ чат ни разу не загружался.
    // Это не даёт Midler снять якорь до того как придут первые сообщения.
    currentChatIsLoadingInitialMessages:
      allChats[activeChatId]?.isLoadingInitialMessages === true ||
      !allChats[activeChatId]?.hasLoadedInitialMessages,
    currentChatIsLoadingOlderMessages: Boolean(
      allChats[activeChatId]?.isLoadingOlderMessages,
    ),
    currentChatStatus: allChats[activeChatId]?.status,
    currentChatIsDirect: Boolean(allChats[activeChatId]?.isDirect),
    scrollRef,
    loadOlderMessages,
    handleSend,
    handleSendMedia,
    searchUsers,
    createDirectChat,
  };
}
