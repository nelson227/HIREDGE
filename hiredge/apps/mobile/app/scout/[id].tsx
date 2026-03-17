import { View, Text, TouchableOpacity, FlatList, TextInput, KeyboardAvoidingView, Platform } from 'react-native';
import { useState, useRef, useEffect, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useLocalSearchParams, router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { scoutsApi } from '../../lib/api';
import { colors } from '../../lib/theme';
import { connectSocket, getSocket } from '../../lib/socket';

export default function ScoutConversationScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [message, setMessage] = useState('');
  const flatListRef = useRef<FlatList>(null);
  const queryClient = useQueryClient();

  const { data: conversation } = useQuery({
    queryKey: ['scoutConversation', id],
    queryFn: async () => {
      const { data } = await scoutsApi.getConversation(id!);
      return data.data;
    },
  });

  const { data: messages, refetch } = useQuery({
    queryKey: ['scoutMessages', id],
    queryFn: async () => {
      const { data } = await scoutsApi.getMessages(id!);
      return data.data;
    },
    refetchInterval: 30000, // Fallback polling every 30s (WebSocket handles real-time)
  });

  // WebSocket listener for real-time messages
  useEffect(() => {
    let socket = getSocket();

    function onNewMessage(payload: any) {
      if (payload?.conversationId === id) {
        queryClient.invalidateQueries({ queryKey: ['scoutMessages', id] });
      }
    }

    async function setupSocket() {
      try {
        socket = await connectSocket();
        socket.on('scout:new_message', onNewMessage);
      } catch {
        // Socket connection failed, polling fallback is active
      }
    }

    if (socket?.connected) {
      socket.on('scout:new_message', onNewMessage);
    } else {
      setupSocket();
    }

    return () => {
      const s = getSocket();
      s?.off('scout:new_message', onNewMessage);
    };
  }, [id]);

  const sendMutation = useMutation({
    mutationFn: async (text: string) => {
      const { data } = await scoutsApi.sendMessage(id!, text);
      return data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['scoutMessages', id] });
      queryClient.invalidateQueries({ queryKey: ['scoutConversations'] });
    },
  });

  const handleSend = useCallback(() => {
    const text = message.trim();
    if (!text) return;
    setMessage('');
    sendMutation.mutate(text);
  }, [message]);

  useEffect(() => {
    if (messages?.length) {
      setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);
    }
  }, [messages?.length]);

  const scout = conversation?.scout;

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: colors.background }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={0}
    >
      {/* Header */}
      <View style={{
        backgroundColor: colors.card, paddingTop: 56, paddingBottom: 14, paddingHorizontal: 16,
        borderBottomWidth: 1, borderBottomColor: colors.border,
        flexDirection: 'row', alignItems: 'center',
      }}>
        <TouchableOpacity onPress={() => router.back()} style={{ marginRight: 12 }}>
          <Ionicons name="arrow-back" size={22} color={colors.foreground} />
        </TouchableOpacity>
        <View style={{
          width: 36, height: 36, borderRadius: 10, backgroundColor: colors.primaryLight,
          justifyContent: 'center', alignItems: 'center', marginRight: 10,
        }}>
          <Ionicons name="telescope" size={16} color={colors.primary} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 14, fontWeight: '700', color: colors.foreground }}>
            {scout?.anonymousName ?? 'Éclaireur anonyme'}
          </Text>
          <Text style={{ fontSize: 11, color: colors.mutedForeground }}>
            {scout?.role ? `${scout.role} · ` : ''}{conversation?.scout?.company?.name ?? 'Entreprise'}
          </Text>
        </View>
        {scout?.trustScore != null && (
          <View style={{
            flexDirection: 'row', alignItems: 'center', gap: 3,
            backgroundColor: scout.trustScore >= 70 ? 'rgba(34,197,94,0.08)' : colors.muted,
            paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8,
          }}>
            <Ionicons name="shield-checkmark" size={11} color={scout.trustScore >= 70 ? colors.success : colors.mutedForeground} />
            <Text style={{ fontSize: 10, fontWeight: '600', color: scout.trustScore >= 70 ? colors.success : colors.mutedForeground }}>{scout.trustScore}%</Text>
          </View>
        )}
      </View>

      {/* Disclaimer */}
      <View style={{
        backgroundColor: '#FFF9E6', paddingVertical: 6, paddingHorizontal: 16,
        flexDirection: 'row', alignItems: 'center', gap: 6,
      }}>
        <Ionicons name="shield-checkmark-outline" size={12} color="#92700C" />
        <Text style={{ fontSize: 10, color: '#92700C', flex: 1 }}>
          Conversation anonymisée — l'identité de l'éclaireur est protégée
        </Text>
      </View>

      {/* Messages */}
      <FlatList
        ref={flatListRef}
        data={messages ?? []}
        keyExtractor={(item: any) => item.id}
        contentContainerStyle={{ padding: 16, paddingBottom: 8, flexGrow: 1 }}
        renderItem={({ item }: { item: any }) => {
          const isMe = item.senderType === 'CANDIDATE';
          return (
            <View style={{
              alignSelf: isMe ? 'flex-end' : 'flex-start',
              maxWidth: '80%', marginBottom: 10,
            }}>
              <View style={{
                backgroundColor: isMe ? colors.primary : colors.card,
                borderRadius: 16,
                borderBottomRightRadius: isMe ? 4 : 16,
                borderBottomLeftRadius: isMe ? 16 : 4,
                paddingHorizontal: 14, paddingVertical: 10,
                borderWidth: isMe ? 0 : 1, borderColor: colors.border,
              }}>
                <Text style={{
                  fontSize: 13, color: isMe ? '#fff' : colors.foreground, lineHeight: 19,
                }}>
                  {item.content}
                </Text>
              </View>
              <Text style={{
                fontSize: 10, color: colors.border, marginTop: 3,
                textAlign: isMe ? 'right' : 'left',
              }}>
                {new Date(item.createdAt).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
              </Text>
            </View>
          );
        }}
        ListEmptyComponent={
          <View style={{ alignItems: 'center', paddingTop: 40 }}>
            <Ionicons name="chatbubbles-outline" size={28} color={colors.mutedForeground} />
            <Text style={{ color: colors.mutedForeground, fontSize: 12, textAlign: 'center', paddingHorizontal: 40, marginTop: 10 }}>
              Posez vos questions sur la culture d'entreprise, les process de recrutement, l'ambiance...
            </Text>
          </View>
        }
      />

      {/* Input */}
      <View style={{
        flexDirection: 'row', alignItems: 'flex-end', padding: 12, gap: 8,
        backgroundColor: colors.card, borderTopWidth: 1, borderColor: colors.border,
      }}>
        <TextInput
          value={message}
          onChangeText={setMessage}
          placeholder="Votre question..."
          placeholderTextColor={colors.mutedForeground}
          multiline
          style={{
            flex: 1, backgroundColor: colors.muted, borderRadius: 20,
            paddingHorizontal: 16, paddingVertical: 10, fontSize: 14,
            maxHeight: 100, color: colors.foreground,
          }}
        />
        <TouchableOpacity
          onPress={handleSend}
          disabled={!message.trim()}
          style={{
            width: 40, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center',
            backgroundColor: message.trim() ? colors.primary : colors.muted,
          }}
        >
          <Ionicons name="send" size={17} color={message.trim() ? '#fff' : colors.mutedForeground} />
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}
