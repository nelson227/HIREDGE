import { View, Text, TextInput, TouchableOpacity, FlatList, KeyboardAvoidingView, Platform, Image } from 'react-native';
import { useState, useRef, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import api from '../../lib/api';

interface Attachment {
  type: 'image' | 'document';
  name: string;
  content?: string;
  uri?: string;
}

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  attachment?: Attachment;
  actions?: any[];
  suggestedFollowups?: string[];
  createdAt: string;
}

declare var window: any;

export default function EdgeScreen() {
  const [input, setInput] = useState('');
  const [attachment, setAttachment] = useState<Attachment | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const flatListRef = useRef<FlatList>(null);
  const fileInputRef = useRef<any>(null);
  const recognitionRef = useRef<any>(null);
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
    mutationFn: async (payload: { message: string; attachment?: Attachment }) => {
      let finalMessage = payload.message;
      if (payload.attachment) {
        if (payload.attachment.type === 'document' && payload.attachment.content) {
          finalMessage = `[📄 Document joint : ${payload.attachment.name}]\n\n${payload.attachment.content}\n\n---\n${payload.message}`;
        } else if (payload.attachment.type === 'image') {
          finalMessage = `[🖼️ Image jointe : ${payload.attachment.name}]\n\n${payload.message}`;
        }
      }
      const { data } = await api.post('/edge/chat', { message: finalMessage });
      return { ...data.data, _attachment: payload.attachment };
    },
    onMutate: async (payload) => {
      await queryClient.cancelQueries({ queryKey: ['edgeHistory'] });
      const prev = queryClient.getQueryData<ChatMessage[]>(['edgeHistory']) ?? [];
      const optimistic: ChatMessage = {
        id: `temp-${Date.now()}`,
        role: 'user',
        content: payload.message,
        attachment: payload.attachment ?? undefined,
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
    onError: (_err, _payload, context) => {
      if (context?.prev) {
        queryClient.setQueryData(['edgeHistory'], context.prev);
      }
    },
  });

  const handleSend = () => {
    const text = input.trim();
    if ((!text && !attachment) || sendMutation.isPending) return;
    setInput('');
    setAttachment(null);
    sendMutation.mutate({ message: text || (attachment ? `Analyse ce fichier : ${attachment.name}` : ''), attachment: attachment ?? undefined });
  };

  const handleSuggestion = (text: string) => {
    if (sendMutation.isPending) return;
    sendMutation.mutate({ message: text });
  };

  // Voice input via Web Speech API
  const handleVoice = () => {
    if (!Platform.OS === undefined && typeof window === 'undefined') return;
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) {
      alert('Reconnaissance vocale non supportée. Utilise Chrome ou Edge.');
      return;
    }
    if (isRecording) {
      recognitionRef.current?.stop();
      setIsRecording(false);
      return;
    }
    const recognition = new SR();
    recognitionRef.current = recognition;
    recognition.lang = 'fr-FR';
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.onresult = (e: any) => {
      const transcript = e.results[0][0].transcript;
      setInput((prev) => (prev ? prev + ' ' + transcript : transcript));
    };
    recognition.onerror = () => setIsRecording(false);
    recognition.onend = () => setIsRecording(false);
    recognition.start();
    setIsRecording(true);
  };

  // File picker
  const handleFilePickerChange = (e: any) => {
    const file: File = e.target.files?.[0];
    if (!file) return;
    const isImage = file.type.startsWith('image/');
    if (isImage) {
      const reader = new FileReader();
      reader.onload = (ev) => {
        setAttachment({ type: 'image', name: file.name, uri: ev.target?.result as string });
      };
      reader.readAsDataURL(file);
    } else {
      const reader = new FileReader();
      reader.onload = (ev) => {
        const content = ev.target?.result as string;
        setAttachment({ type: 'document', name: file.name, content: content.slice(0, 8000) });
      };
      reader.readAsText(file);
    }
    e.target.value = '';
  };

  // Export conversation
  const handleExport = () => {
    if (typeof window === 'undefined') return;
    const lines = messages.map((m) =>
      `[${formatTime(m.createdAt)}] ${m.role === 'user' ? 'Moi' : 'EDGE'} :\n${m.content}`
    ).join('\n\n');
    const blob = new Blob([lines], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `conversation-edge-${new Date().toISOString().slice(0, 10)}.txt`;
    a.click();
    URL.revokeObjectURL(url);
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
        <View style={{ flex: 1 }}>
          <Text style={{ color: '#fff', fontSize: 18, fontWeight: '700' }}>EDGE</Text>
          <Text style={{ color: '#A29BFE', fontSize: 12 }}>Ton compagnon de recherche</Text>
        </View>
        {messages.length > 0 && (
          <TouchableOpacity onPress={handleExport} style={{ padding: 6 }}>
            <Ionicons name="download-outline" size={22} color="#A29BFE" />
          </TouchableOpacity>
        )}
      </View>

      {/* Hidden file input for web */}
      {Platform.OS === 'web' && (
        <input
          ref={fileInputRef}
          type="file"
          accept=".txt,.md,.json,.csv,.pdf,.doc,.docx,image/*"
          style={{ display: 'none' }}
          onChange={handleFilePickerChange}
        />
      )}

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
            {/* Attachment preview */}
            {item.attachment?.type === 'image' && item.attachment.uri && (
              <Image
                source={{ uri: item.attachment.uri }}
                style={{ width: 180, height: 120, borderRadius: 12, marginBottom: 4 }}
                resizeMode="cover"
              />
            )}
            {item.attachment?.type === 'document' && (
              <View style={{
                flexDirection: 'row', alignItems: 'center', gap: 6,
                backgroundColor: '#F0EEFF', borderRadius: 10, paddingHorizontal: 10, paddingVertical: 6,
                marginBottom: 4, borderWidth: 1, borderColor: '#D8D1FF',
              }}>
                <Ionicons name="document-text-outline" size={16} color="#6C5CE7" />
                <Text style={{ fontSize: 12, color: '#6C5CE7', fontWeight: '600' }}>{item.attachment.name}</Text>
              </View>
            )}
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

      {/* Attachment preview bar */}
      {attachment && (
        <View style={{
          flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 8,
          backgroundColor: '#F0EEFF', borderTopWidth: 1, borderColor: '#D8D1FF', gap: 8,
        }}>
          {attachment.type === 'image' && attachment.uri ? (
            <Image source={{ uri: attachment.uri }} style={{ width: 40, height: 40, borderRadius: 6 }} />
          ) : (
            <Ionicons name="document-text" size={24} color="#6C5CE7" />
          )}
          <Text style={{ flex: 1, fontSize: 13, color: '#6C5CE7', fontWeight: '500' }} numberOfLines={1}>
            {attachment.name}
          </Text>
          <TouchableOpacity onPress={() => setAttachment(null)}>
            <Ionicons name="close-circle" size={20} color="#6C5CE7" />
          </TouchableOpacity>
        </View>
      )}

      {/* Input */}
      <View style={{
        paddingHorizontal: 12, paddingTop: 12, paddingBottom: 88,
        backgroundColor: '#F0EEFF',
        borderTopWidth: 2, borderColor: '#D8D1FF',
        shadowColor: '#6C5CE7', shadowOffset: { width: 0, height: -4 },
        shadowOpacity: 0.08, shadowRadius: 12, elevation: 8,
      }}>
        <View style={{
          flexDirection: 'row', alignItems: 'flex-end', gap: 8,
          backgroundColor: '#fff', borderRadius: 24, borderWidth: 1.5,
          borderColor: '#D8D1FF', paddingHorizontal: 8, paddingVertical: 6,
          shadowColor: '#6C5CE7', shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.06, shadowRadius: 6, elevation: 2,
        }}>
          {/* Attach */}
          <TouchableOpacity
            onPress={() => Platform.OS === 'web' && fileInputRef.current?.click()}
            style={{
              width: 36, height: 36, borderRadius: 18, justifyContent: 'center', alignItems: 'center',
              backgroundColor: '#F0EEFF',
            }}
          >
            <Ionicons name="attach" size={20} color="#6C5CE7" />
          </TouchableOpacity>

          {/* Text input */}
          <TextInput
            value={input}
            onChangeText={setInput}
            placeholder="Parle à EDGE..."
            placeholderTextColor="#B2ACDD"
            multiline
            maxLength={2000}
            onKeyPress={(e: any) => {
              if (Platform.OS === 'web' && e.nativeEvent.key === 'Enter' && !e.nativeEvent.shiftKey) {
                e.preventDefault?.();
                handleSend();
              }
            }}
            style={{
              flex: 1, fontSize: 15, maxHeight: 120,
              color: '#2D3436', paddingVertical: 6,
            }}
          />

          {/* Micro */}
          <TouchableOpacity
            onPress={handleVoice}
            style={{
              width: 36, height: 36, borderRadius: 18, justifyContent: 'center', alignItems: 'center',
              backgroundColor: isRecording ? '#FF6B6B' : '#F0EEFF',
            }}
          >
            <Ionicons name={isRecording ? 'stop-circle' : 'mic-outline'} size={20} color={isRecording ? '#fff' : '#6C5CE7'} />
          </TouchableOpacity>

          {/* Send */}
          <TouchableOpacity
            onPress={handleSend}
            disabled={(!input.trim() && !attachment) || sendMutation.isPending}
            style={{
              width: 40, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center',
              backgroundColor: (input.trim() || attachment) ? '#6C5CE7' : '#D8D1FF',
            }}
          >
            <Ionicons name="send" size={17} color="#fff" />
          </TouchableOpacity>
        </View>

        <Text style={{ fontSize: 11, color: '#9B8FCC', marginTop: 6, textAlign: 'center' }}>
          ↵ Entrée pour envoyer · Shift+↵ nouvelle ligne · 📎 documents &amp; images
        </Text>
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
      <Text style={{ fontSize: 12, color: '#CED4DA', marginTop: 16, textAlign: 'center' }}>
        💡 Astuce : envoie un document (CV, offre) ou une photo pour que je l'analyse
      </Text>
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
