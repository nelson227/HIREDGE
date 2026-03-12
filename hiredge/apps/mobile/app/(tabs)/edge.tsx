import { View, Text, TextInput, TouchableOpacity, FlatList, KeyboardAvoidingView, Platform } from 'react-native';
import { useState, useRef, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import api from '../../lib/api';

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  actions?: any[];
  suggestedFollowups?: string[];
  createdAt: string;
}

export default function EdgeScreen() {
  const [input, setInput] = useState('');
  const flatListRef = useRef<FlatList>(null);
  const queryClient = useQueryClient();

  const { data: history } = useQuery({
    queryKey: ['edgeHistory'],
    queryFn: async () => {
      const { data } = await api.get('/edge/history?limit=50');
      return data.data as ChatMessage[];
    },
  });

  const messages = history ?? [];

  const sendMutation = useMutation({
    mutationFn: async (message: string) => {
      const { data } = await api.post('/edge/chat', { message });
      return data.data;
    },
    onMutate: async (message) => {
      await queryClient.cancelQueries({ queryKey: ['edgeHistory'] });
      const prev = queryClient.getQueryData<ChatMessage[]>(['edgeHistory']) ?? [];
      const optimistic: ChatMessage = {
        id: `temp-${Date.now()}`,
        role: 'user',
        content: message,
        createdAt: new Date().toISOString(),
      };
      queryClient.setQueryData(['edgeHistory'], [...prev, optimistic]);
      return { prev };
    },
    onSuccess: (response) => {
      const prev = queryClient.getQueryData<ChatMessage[]>(['edgeHistory']) ?? [];
      const assistantMsg: ChatMessage = {
        id: response.id ?? `resp-${Date.now()}`,
        role: 'assistant',
        content: response.message,
        actions: response.actions,
        suggestedFollowups: response.suggestedFollowups,
        createdAt: new Date().toISOString(),
      };
      queryClient.setQueryData(['edgeHistory'], [...prev, assistantMsg]);
    },
    onError: (_err, _msg, context) => {
      if (context?.prev) {
        queryClient.setQueryData(['edgeHistory'], context.prev);
      }
    },
  });

  const handleSend = () => {
    const text = input.trim();
    if (!text || sendMutation.isPending) return;
    setInput('');
    sendMutation.mutate(text);
  };

  const handleSuggestion = (text: string) => {
    if (sendMutation.isPending) return;
    sendMutation.mutate(text);
  };

  useEffect(() => {
    if (messages.length > 0) {
      setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);
    }
  }, [messages.length]);

  const lastAssistantMsg = [...messages].reverse().find((m) => m.role === 'assistant');

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: '#F8F9FA' }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={90}
    >
      {/* Header */}
      <View style={{
        backgroundColor: '#6C5CE7', paddingTop: 60, paddingBottom: 16, paddingHorizontal: 20,
        flexDirection: 'row', alignItems: 'center', gap: 12,
      }}>
        <View style={{
          width: 40, height: 40, borderRadius: 20, backgroundColor: '#A29BFE',
          justifyContent: 'center', alignItems: 'center',
        }}>
          <Text style={{ fontSize: 20 }}>🧠</Text>
        </View>
        <View>
          <Text style={{ color: '#fff', fontSize: 18, fontWeight: '700' }}>EDGE</Text>
          <Text style={{ color: '#A29BFE', fontSize: 12 }}>Ton compagnon de recherche</Text>
        </View>
      </View>

      {/* Messages */}
      <FlatList
        ref={flatListRef}
        data={messages}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ padding: 16, paddingBottom: 8, flexGrow: 1 }}
        ListEmptyComponent={<WelcomeMessage />}
        renderItem={({ item }) => (
          <View style={{
            alignSelf: item.role === 'user' ? 'flex-end' : 'flex-start',
            maxWidth: '80%', marginBottom: 10,
          }}>
            <View style={{
              backgroundColor: item.role === 'user' ? '#6C5CE7' : '#fff',
              borderRadius: 16,
              borderBottomRightRadius: item.role === 'user' ? 4 : 16,
              borderBottomLeftRadius: item.role === 'assistant' ? 4 : 16,
              paddingHorizontal: 14, paddingVertical: 10,
              ...(item.role === 'assistant' ? { borderWidth: 1, borderColor: '#E9ECEF' } : {}),
            }}>
              <Text style={{
                color: item.role === 'user' ? '#fff' : '#2D3436', fontSize: 15, lineHeight: 22,
              }}>
                {item.content}
              </Text>
            </View>
            <Text style={{ color: '#CED4DA', fontSize: 10, marginTop: 2, textAlign: item.role === 'user' ? 'right' : 'left' }}>
              {formatTime(item.createdAt)}
            </Text>
          </View>
        )}
      />

      {/* Suggestions */}
      {lastAssistantMsg?.suggestedFollowups && lastAssistantMsg.suggestedFollowups.length > 0 && (
        <View style={{ paddingHorizontal: 16, paddingBottom: 4, flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
          {lastAssistantMsg.suggestedFollowups.map((s: string, i: number) => (
            <TouchableOpacity
              key={i}
              onPress={() => handleSuggestion(s)}
              style={{
                paddingHorizontal: 12, paddingVertical: 7, borderRadius: 16,
                borderWidth: 1, borderColor: '#6C5CE7', backgroundColor: '#F0EEFF',
              }}
            >
              <Text style={{ fontSize: 13, color: '#6C5CE7', fontWeight: '500' }}>{s}</Text>
            </TouchableOpacity>
          ))}
        </View>
      )}

      {/* Typing indicator */}
      {sendMutation.isPending && (
        <View style={{ paddingHorizontal: 16, paddingBottom: 4 }}>
          <View style={{
            backgroundColor: '#fff', alignSelf: 'flex-start', borderRadius: 16,
            borderBottomLeftRadius: 4, paddingHorizontal: 14, paddingVertical: 10,
            borderWidth: 1, borderColor: '#E9ECEF',
          }}>
            <Text style={{ color: '#ADB5BD', fontSize: 14 }}>EDGE réfléchit...</Text>
          </View>
        </View>
      )}

      {/* Input */}
      <View style={{
        flexDirection: 'row', alignItems: 'flex-end',
        paddingHorizontal: 12, paddingTop: 12, paddingBottom: 88,
        backgroundColor: '#fff', borderTopWidth: 1, borderColor: '#E9ECEF', gap: 8,
      }}>
        <TextInput
          value={input}
          onChangeText={setInput}
          placeholder="Parle à EDGE..."
          placeholderTextColor="#ADB5BD"
          multiline
          maxLength={1000}
          style={{
            flex: 1, backgroundColor: '#F1F3F5', borderRadius: 20,
            paddingHorizontal: 16, paddingVertical: 10, fontSize: 15,
            maxHeight: 100, color: '#2D3436',
          }}
        />
        <TouchableOpacity
          onPress={handleSend}
          disabled={!input.trim() || sendMutation.isPending}
          style={{
            width: 42, height: 42, borderRadius: 21, justifyContent: 'center', alignItems: 'center',
            backgroundColor: input.trim() ? '#6C5CE7' : '#E9ECEF',
          }}
        >
          <Ionicons name="send" size={18} color={input.trim() ? '#fff' : '#ADB5BD'} />
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

function WelcomeMessage() {
  return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 32, paddingBottom: 40 }}>
      <View style={{
        width: 80, height: 80, borderRadius: 40, backgroundColor: '#F0EEFF',
        justifyContent: 'center', alignItems: 'center', marginBottom: 16,
      }}>
        <Text style={{ fontSize: 36 }}>🧠</Text>
      </View>
      <Text style={{ fontSize: 20, fontWeight: '700', color: '#2D3436', textAlign: 'center' }}>
        Salut ! Moi c'est EDGE
      </Text>
      <Text style={{ fontSize: 14, color: '#868E96', textAlign: 'center', marginTop: 8, lineHeight: 20 }}>
        Ton compagnon de recherche d'emploi. Dis-moi ce que tu cherches et je m'occupe du reste 💪
      </Text>
      <View style={{ marginTop: 20, gap: 8, width: '100%' }}>
        <SuggestionChip text="🔍 Cherche-moi un poste de développeur à Paris" />
        <SuggestionChip text="📝 Prépare un CV pour une offre tech" />
        <SuggestionChip text="🎭 Lance une simulation d'entretien" />
        <SuggestionChip text="📊 Mes statistiques de recherche" />
      </View>
    </View>
  );
}

function SuggestionChip({ text }: { text: string }) {
  return (
    <TouchableOpacity style={{
      borderWidth: 1, borderColor: '#E9ECEF', borderRadius: 12, paddingHorizontal: 14,
      paddingVertical: 10, backgroundColor: '#fff',
    }}>
      <Text style={{ color: '#495057', fontSize: 14 }}>{text}</Text>
    </TouchableOpacity>
  );
}

function formatTime(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
}
