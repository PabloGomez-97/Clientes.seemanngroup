// src/hooks/useChatbot.ts
import { useState, useCallback, useEffect } from 'react';
import { useAuth } from '../auth/AuthContext';

interface Message {
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
}

interface UseChatbotReturn {
  messages: Message[];
  isOpen: boolean;
  isLoading: boolean;
  error: string | null;
  toggleChat: () => void;
  sendMessage: (message: string) => Promise<void>;
  clearChat: () => void;
}

const STORAGE_KEY = 'chatbot_history';

export function useChatbot(): UseChatbotReturn {
  const { token } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Cargar historial desde localStorage al montar
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        setMessages(parsed);
      }
    } catch (err) {
      console.error('Error loading chat history:', err);
    }
  }, []);

  // Guardar historial en localStorage cuando cambie
  useEffect(() => {
    if (messages.length > 0) {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(messages));
      } catch (err) {
        console.error('Error saving chat history:', err);
      }
    }
  }, [messages]);

  const toggleChat = useCallback(() => {
    setIsOpen(prev => !prev);
    setError(null);
  }, []);

  const clearChat = useCallback(() => {
    setMessages([]);
    localStorage.removeItem(STORAGE_KEY);
    setError(null);
  }, []);

  const sendMessage = useCallback(async (message: string) => {
    if (!message.trim() || !token) return;

    const userMessage: Message = {
      role: 'user',
      content: message.trim(),
      timestamp: Date.now(),
    };

    // Agregar mensaje del usuario
    setMessages(prev => [...prev, userMessage]);
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          message: userMessage.content,
          conversationHistory: messages,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `Error: ${response.status}`);
      }

      const data = await response.json();

      const assistantMessage: Message = {
        role: 'assistant',
        content: data.message,
        timestamp: Date.now(),
      };

      // Agregar respuesta del asistente
      setMessages(prev => [...prev, assistantMessage]);
    } catch (err: any) {
      console.error('Error sending message:', err);
      setError(err.message || 'Error al enviar el mensaje');
      
      // Remover el último mensaje del usuario en caso de error
      setMessages(prev => prev.slice(0, -1));
    } finally {
      setIsLoading(false);
    }
  }, [token, messages]);

  return {
    messages,
    isOpen,
    isLoading,
    error,
    toggleChat,
    sendMessage,
    clearChat,
  };
}