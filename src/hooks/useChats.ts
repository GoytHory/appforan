import { useState, useEffect, useRef } from 'react';
import { ScrollView } from 'react-native';
import socket from '../utils/socket';
import { Message, ChatState, IncomingMessage, SocketEventPayload, UseChatsReturnType } from '../types';

export function useChats(
  myUsername: string,
  showLocalNotification: (title: string, body: string) => Promise<void>
): UseChatsReturnType {
  const [activeChatId, setActiveChatId] = useState<string>('1');
  const [allChats, setAllChats] = useState<ChatState>({
    '1': { name: 'Лохи', messages: [] },
    '2': { name: 'болталк', messages: [] },
    '3': { name: 'личный чат', messages: [] },
    '4': { name: 'товарпищ майор', messages: [] },
  });

  const scrollRef = useRef<ScrollView>(null);
  
  // Используем Ref для активного ID, чтобы сокет всегда знал, какой чат "сейчас на экране"
  // без перезапуска всего слушателя
  const activeIdRef = useRef(activeChatId);
  useEffect(() => {
    activeIdRef.current = activeChatId;
  }, [activeChatId]);

  // 1. ГЛОБАЛЬНЫЕ СЛУШАТЕЛИ (запускаются 1 раз при старте)
  useEffect(() => {
    const handleHistory = (historyData: any[]) => {
      const currentId = activeIdRef.current; // Берем актуальный ID из рефа

      const formatted: Message[] = historyData.map((msg: any) => ({
        id: msg._id || msg.id,
        text: msg.text,
        author: msg.user,
        sender: (msg.user === myUsername ? 'me' : 'other') as "me" | "other",
        time: new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      }));

      setAllChats(prev => ({
        ...prev,
        [currentId]: { ...prev[currentId], messages: formatted }
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
        if (!prev[targetChatId]) return prev;
        const isDuplicate = prev[targetChatId].messages.some((m: any) => m.id === (incoming.id || incoming._id));
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
          [targetChatId]: { ...prev[targetChatId], messages: [...prev[targetChatId].messages, newMessage] }
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
    // Просто просим сервер прислать данные, когда сменился ID
    socket.emit('joinChat', activeChatId);
  }, [activeChatId]);

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
    currentMessages: allChats[activeChatId]?.messages || [],
    currentTitle: allChats[activeChatId]?.name || 'Чат',
    scrollRef,
    handleSend
  };
}