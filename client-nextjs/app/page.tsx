'use client';

import { ProtectedRoute } from '@/components/protected-route';
import { Navbar } from '@/components/navbar';
import { ConversationsList } from '@/components/conversations-list';
import { MessagesPanel } from '@/components/messages-panel';
import { useAuth } from '@/lib/auth-context';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

export default function Home() {
  const { isAuthenticated, loading } = useAuth();
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [selectedConversationId, setSelectedConversationId] = useState<string>();

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (mounted && !loading && !isAuthenticated) {
      router.push('/auth');
    }
  }, [mounted, loading, isAuthenticated, router]);

  if (!mounted || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  return (
    <ProtectedRoute>
      <Navbar />
      <main className="flex h-[calc(100vh-64px)] bg-gray-50">
        <div className="w-full md:w-80 bg-white border-r border-gray-200 flex flex-col">
          <div className="p-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">Conversations</h2>
          </div>
          <div className="flex-1 overflow-y-auto">
            <ConversationsList
              onSelectConversation={setSelectedConversationId}
              selectedConversationId={selectedConversationId}
            />
          </div>
        </div>

        <div className="flex-1 bg-white flex flex-col">
          {selectedConversationId && (
            <div className="h-full">
              <MessagesPanel conversationId={selectedConversationId} />
            </div>
          )}
          {!selectedConversationId && (
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center">
                <p className="text-gray-500 mb-4">Select a conversation to start messaging</p>
              </div>
            </div>
          )}
        </div>
      </main>
    </ProtectedRoute>
  );
}
