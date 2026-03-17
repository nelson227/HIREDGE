import { View, Text, TouchableOpacity, FlatList, TextInput, KeyboardAvoidingView, Platform } from 'react-native';
import { useState, useRef, useEffect, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useLocalSearchParams, router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import api, { scoutsApi } from '../../lib/api';

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
    refetchInterval: 5000,
  });

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

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: '#F8F9FA' }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={0}
    >
      {/* Header */}
      <View style={{
        backgroundColor: '#fff', paddingTop: 56, paddingBottom: 14, paddingHorizontal: 16,
        borderBottomWidth: 1, borderBottomColor: '#E9ECEF',
        flexDirection: 'row', alignItems: 'center',
      }}>
        <TouchableOpacity onPress={() => router.back()} style={{ marginRight: 12 }}>
          <Ionicons name="arrow-back" size={24} color="#2D3436" />
        </TouchableOpacity>
        <View style={{
          width: 36, height: 36, borderRadius: 18, backgroundColor: '#6C5CE715',
          justifyContent: 'center', alignItems: 'center', marginRight: 10,
        }}>
          <Ionicons name="telescope-outline" size={16} color="#6C5CE7" />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 15, fontWeight: '600', color: '#2D3436' }}>
            Éclaireur anonyme
          </Text>
          <Text style={{ fontSize: 11, color: '#868E96' }}>
            {conversation?.scout?.company?.name ?? 'Entreprise'}
          </Text>
        </View>
        <View style={{
          backgroundColor: '#00B89415', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8,
        }}>
          <Text style={{ fontSize: 10, fontWeight: '600', color: '#00B894' }}>Anonyme</Text>
        </View>
      </View>

      {/* Disclaimer */}
      <View style={{
        backgroundColor: '#FFF3CD', paddingVertical: 6, paddingHorizontal: 16,
        flexDirection: 'row', alignItems: 'center', gap: 6,
      }}>
        <Ionicons name="shield-checkmark-outline" size={14} color="#856404" />
        <Text style={{ fontSize: 10, color: '#856404', flex: 1 }}>
          Cette conversation est anonymisée. L'identité de l'éclaireur est protégée.
        </Text>
      </View>

      {/* Messages */}
      <FlatList
        ref={flatListRef}
        data={messages ?? []}
        keyExtractor={(item: any) => item.id}
        contentContainerStyle={{ padding: 16, paddingBottom: 8 }}
        renderItem={({ item }: { item: any }) => {
          const isMe = item.senderType === 'CANDIDATE';
          return (
            <View style={{
              alignSelf: isMe ? 'flex-end' : 'flex-start',
              maxWidth: '80%', marginBottom: 8,
            }}>
              <View style={{
                backgroundColor: isMe ? '#6C5CE7' : '#fff',
                borderRadius: 16,
                borderBottomRightRadius: isMe ? 4 : 16,
                borderBottomLeftRadius: isMe ? 16 : 4,
                paddingHorizontal: 14, paddingVertical: 10,
                borderWidth: isMe ? 0 : 1, borderColor: '#E9ECEF',
              }}>
                <Text style={{
                  fontSize: 14, color: isMe ? '#fff' : '#2D3436', lineHeight: 20,
                }}>
                  {item.content}
                </Text>
              </View>
              <Text style={{
                fontSize: 10, color: '#CED4DA', marginTop: 3,
                textAlign: isMe ? 'right' : 'left',
              }}>
                {new Date(item.createdAt).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
              </Text>
            </View>
          );
        }}
        ListEmptyComponent={
          <View style={{ alignItems: 'center', paddingTop: 40 }}>
            <Text style={{ color: '#ADB5BD', fontSize: 13, textAlign: 'center', paddingHorizontal: 40 }}>
              Posez vos questions sur la culture d'entreprise, les process de recrutement, l'ambiance...
            </Text>
          </View>
        }
      />

      {/* Input */}
      <View style={{
        flexDirection: 'row', alignItems: 'flex-end', padding: 12,
        borderTopWidth: 1, borderTopColor: '#E9ECEF', backgroundColor: '#fff',
        paddingBottom: Platform.OS === 'ios' ? 28 : 12,
      }}>
        <TextInput
          value={message}
          onChangeText={setMessage}
          placeholder="Votre question..."
          placeholderTextColor="#ADB5BD"
          multiline
          style={{
            flex: 1, backgroundColor: '#F8F9FA', borderRadius: 20,
            paddingHorizontal: 16, paddingVertical: 10, fontSize: 14,
            maxHeight: 100, color: '#2D3436',
          }}
        />
        <TouchableOpacity
          onPress={handleSend}
          disabled={!message.trim()}
          style={{
            marginLeft: 8, width: 40, height: 40, borderRadius: 20,
            backgroundColor: message.trim() ? '#6C5CE7' : '#DEE2E6',
            justifyContent: 'center', alignItems: 'center',
          }}
        >
          <Ionicons name="send" size={18} color="#fff" />
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}
