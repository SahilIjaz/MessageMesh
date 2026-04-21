'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/lib/auth-context';
import { api } from '@/lib/api';

interface Conversation {
  id: string;
  name: string;
  lastMessage?: string;
  lastMessageAt?: string;
  participantCount?: number;
}

interface ConversationsListProps {
  onSelectConversation: (conversationId: string) => void;
  selectedConversationId?: string;
}

export function ConversationsList({
  onSelectConversation,
  selectedConversationId,
}: ConversationsListProps) {
  const { token } = useAuth();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const loadConversations = async () => {
      if (!token) return;
      try {
        console.log('💬 Fetching conversations...');
        const data = await api.getConversations(token);
        console.log('✅ Conversations loaded:', data);
        setConversations(Array.isArray(data) ? data : data.conversations || []);
      } catch (err) {
        console.error('❌ Failed to load conversations:', err);
        setError(err instanceof Error ? err.message : 'Failed to load conversations');
      } finally {
        setLoading(false);
      }
    };

    loadConversations();
  }, [token]);

  if (loading) {
    return (
      <div className="p-6 text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
        <p className="text-gray-500 text-sm">Loading conversations...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <p className="text-red-600 text-sm font-medium">{error}</p>
      </div>
    );
  }

  if (conversations.length === 0) {
    return (
      <div className="p-6 text-center">
        <p className="text-gray-500 text-sm">No conversations yet</p>
        <p className="text-gray-400 text-xs mt-2">Start a new chat to begin messaging</p>
      </div>
    );
  }

  return (
    <div className="divide-y">
      {conversations.map((conversation) => (
        <button
          key={conversation.id}
          onClick={() => onSelectConversation(conversation.id)}
          className={`w-full p-4 text-left transition hover:bg-gray-50 ${
            selectedConversationId === conversation.id ? 'bg-blue-50 border-l-4 border-blue-600' : ''
          }`}
        >
          <h3 className="font-medium text-gray-900 text-sm">{conversation.name}</h3>
          {conversation.lastMessage && (
            <p className="text-gray-500 text-xs mt-1 truncate">{conversation.lastMessage}</p>
          )}
          {conversation.lastMessageAt && (
            <p className="text-gray-400 text-xs mt-1">
              {new Date(conversation.lastMessageAt).toLocaleDateString()}
            </p>
          )}
        </button>
      ))}
    </div>
  );
}
