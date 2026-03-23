import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { ScrollView } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import socket, { connectSocket, disconnectSocket } from '../utils/socket';
import { createDirectChat as apiCreateDirectChat, getDirectChats, searchUsers as apiSearchUsers } from '../utils/api';
import { Message, ChatState, SocketEventPayload, UseChatsReturnType, SearchUser, ChatListItem } from '../types';

const BASE_CHATS: ChatState = {
  '1': {
    name: 'Лохи',
    messages: []
  },
  '2': {
    name: 'болталк',
    messages: []
  }
};

const formatTime = (value?: string | number | Date): string => {
  if (!value) {
    return '';
  }

  return new Date(value).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
};

export function useChats(
  myUsername: string,
  showLocalNotification: (title: string, body: string) => Promise<void>,
  onAuthFailure: () => void
): UseChatsReturnType {
  const [activeChatId, setActiveChatId] = useState<string>('1');
  const [allChats, setAllChats] = useState<ChatState>(BASE_CHATS);

  const scrollRef = useRef<ScrollView>(null);
  const tokenRef = useRef<string>('');
  
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

    const token = (await AsyncStorage.getItem('auth_token')) || '';
    tokenRef.current = token;
    return token;
  }, []);

  const upsertDirectChat = useCallback(
    (chatId: string, user: { id: string; username: string; avatar?: string; status?: 'online' | 'offline' }): void => {
      setAllChats(prev => {
        const existingMessages = prev[chatId]?.messages || [];
        return {
          ...prev,
          [chatId]: {
            name: user.username,
            messages: existingMessages,
            avatar: user.avatar,
            status: user.status,
            isDirect: true,
            participantUserId: user.id
          }
        };
      });
    },
    []
  );

  const searchUsers = useCallback(async (query: string): Promise<SearchUser[]> => {
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
      return users;
    } catch (err) {
      console.log('Ошибка поиска пользователей:', err);
      return [];
    }
  }, [ensureToken]);

  const createDirectChat = useCallback(async (targetUserId: string): Promise<string> => {
    const token = await ensureToken();
    if (!token) {
      throw new Error('Сессия истекла, войдите снова');
    }

    const result = await apiCreateDirectChat(token, targetUserId);
    upsertDirectChat(result.chatId, result.otherUser);
    setActiveChatId(result.chatId);
    return result.chatId;
  }, [ensureToken, upsertDirectChat]);

  const chatList = useMemo<ChatListItem[]>(() => {
    return Object.entries(allChats).map(([id, chat]) => {
      const lastMessage = chat.messages[chat.messages.length - 1];
      return {
        id,
        name: chat.name,
        lastMsg: lastMessage?.text || (chat.isDirect ? 'Персональный чат' : 'Связь установлена...'),
        time: lastMessage?.time || '',
        avatarUrl: chat.avatar,
        status: chat.status
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
      socket.emit('joinChat', activeIdRef.current);
    };

    const handleConnectError = (error: Error) => {
      if (error.message.includes('авторизация')) {
        onAuthFailure();
      }
    };

    socket.on('connect', handleConnect);
    socket.on('connect_error', handleConnectError);
    connectSocket();

    return () => {
      socket.off('connect', handleConnect);
      socket.off('connect_error', handleConnectError);
    };
  }, [myUsername, onAuthFailure]);

  useEffect(() => {
    const initDirectChats = async (): Promise<void> => {
      if (!myUsername) {
        setAllChats(BASE_CHATS);
        tokenRef.current = '';
        return;
      }

      const token = await ensureToken();
      if (!token) {
        return;
      }

      try {
        const { chats } = await getDirectChats(token);
        chats.forEach((chat) => {
          upsertDirectChat(chat.chatId, chat.otherUser);
        });
      } catch (err) {
        console.log('Ошибка загрузки персональных чатов:', err);
      }
    };

    initDirectChats();
  }, [myUsername, ensureToken, upsertDirectChat]);

  useEffect(() => {
    if (!myUsername) {
      return;
    }

    const handleHistory = (historyData: any[]) => {
      const currentId = activeIdRef.current; // Берем актуальный ID из рефа

      const formatted: Message[] = historyData.map((msg: any) => ({
        id: msg._id || msg.id,
        text: msg.text,
        author: msg.user,
        sender: (msg.user === myUsername ? 'me' : 'other') as "me" | "other",
        time: formatTime(msg.timestamp)
      }));

      setAllChats(prev => ({
        ...prev,
        [currentId]: {
          ...(prev[currentId] || { name: `Чат ${currentId}`, messages: [] }),
          messages: formatted
        }
      }));

      // Мгновенный скролл без анимации
      setTimeout(() => {
        scrollRef.current?.scrollToEnd({ animated: false });
      }, 30);
    };

    const handleMessage = (incoming: any) => {
      const targetChatId = incoming.chatId || '1';
      const author = incoming.senderName || incoming.user || 'Unknown';
      const isMe = author === myUsername;

      if (!isMe) {
        showLocalNotification(author, incoming.text);
      }

      setAllChats(prev => {
        const existingChat = prev[targetChatId] || { name: author, messages: [], isDirect: targetChatId.startsWith('dm:') };
        const isDuplicate = existingChat.messages.some((m: any) => m.id === (incoming.id || incoming._id));
        if (isDuplicate) return prev;

        const newMessage: Message = {
          id: incoming.id || incoming._id || Date.now().toString(),
          text: incoming.text,
          author: author,
          sender: (isMe ? 'me' : 'other') as "me" | "other",
          time: incoming.time || new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        };

        return {
          ...prev,
          [targetChatId]: { ...existingChat, messages: [...existingChat.messages, newMessage] }
        };
      });

      if (targetChatId === activeIdRef.current) {
        setTimeout(() => {
          scrollRef.current?.scrollToEnd({ animated: true });
        }, 100);
      }
    };

    socket.on('history', handleHistory);
    socket.on('message', handleMessage);

    return () => {
      socket.off('history', handleHistory);
      socket.off('message', handleMessage);
    };
  }, [myUsername, showLocalNotification]); // ЭТОТ ЭФФЕКТ НЕ ПЕРЕЗАПУСКАЕТСЯ ПРИ СМЕНЕ ЧАТА

  // 2. ОТДЕЛЬНЫЙ ЭФФЕКТ ДЛЯ ЗАПРОСА ИСТОРИИ
  useEffect(() => {
    if (!myUsername) {
      return;
    }

    // Просто просим сервер прислать данные, когда сменился ID
    socket.emit('joinChat', activeChatId);
  }, [activeChatId, myUsername]);

  const handleSend = (inputText: string, activeChatId: string, myUsername: string): void => {
    if (inputText.trim().length > 0) {
      const payload: SocketEventPayload = {
        text: inputText.trim(),
        senderName: myUsername,
        chatId: activeChatId,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };
      socket.emit("message", payload);
    }
  };

  return {
    activeChatId,
    setActiveChatId,
    allChats,
    chatList,
    currentMessages: allChats[activeChatId]?.messages || [],
    currentTitle: allChats[activeChatId]?.name || 'Чат',
    scrollRef,
    handleSend,
    searchUsers,
    createDirectChat
  };
}