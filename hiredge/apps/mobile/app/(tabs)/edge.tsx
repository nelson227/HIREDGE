import { View, Text, TextInput, TouchableOpacity, FlatList, KeyboardAvoidingView, Platform, Image, ActivityIndicator, ScrollView, Modal, Animated } from 'react-native';
import { useState, useRef, useEffect, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import api from '../../lib/api';
import { type CVData } from '../../lib/document-generator';
import { colors } from '../../lib/theme';

// Load PDF.js from CDN at runtime (avoids Metro bundler issues)
let pdfjsLib: any = null;
const PDF_CDN = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174';
async function loadPdfJs(): Promise<any> {
  if (pdfjsLib) return pdfjsLib;
  if (Platform.OS !== 'web' || typeof window === 'undefined') return null;
  if ((window as any).pdfjsLib) {
    pdfjsLib = (window as any).pdfjsLib;
    pdfjsLib.GlobalWorkerOptions.workerSrc = `${PDF_CDN}/pdf.worker.min.js`;
    return pdfjsLib;
  }
  return new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = `${PDF_CDN}/pdf.min.js`;
    script.onload = () => {
      pdfjsLib = (window as any).pdfjsLib;
      if (pdfjsLib) {
        pdfjsLib.GlobalWorkerOptions.workerSrc = `${PDF_CDN}/pdf.worker.min.js`;
      }
      resolve(pdfjsLib);
    };
    script.onerror = () => reject(new Error('Failed to load PDF.js'));
    document.head.appendChild(script);
  });
}

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
  actions?: ChatAction[];
  suggestedFollowups?: string[];
  createdAt: string;
}

type ChatAction =
  | { type: 'NAVIGATE'; screen: string }
  | { type: 'DOWNLOAD_DOCUMENT'; documentType: 'cv' | 'cover_letter'; data: any };

interface Conversation {
  id: string;
  title: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  _count: { messages: number };
}

declare var window: any;

export default function EdgeScreen() {
  const [input, setInput] = useState('');
  const [attachment, setAttachment] = useState<Attachment | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessingFile, setIsProcessingFile] = useState(false);
  const [downloadingFormat, setDownloadingFormat] = useState<string | null>(null);
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editingConvId, setEditingConvId] = useState<string | null>(null);
  const [editingTitle, setEditingTitle] = useState('');
  const flatListRef = useRef<FlatList>(null);
  const fileInputRef = useRef<any>(null);
  const recognitionRef = useRef<any>(null);
  const queryClient = useQueryClient();

  // ─── Conversations list ────────────────────────────────
  const { data: conversations } = useQuery({
    queryKey: ['edgeConversations'],
    queryFn: async () => {
      const { data } = await api.get('/edge/conversations');
      return data.data as Conversation[];
    },
  });

  // ─── Messages for active conversation ──────────────────
  const { data: history } = useQuery({
    queryKey: ['edgeHistory', activeConversationId],
    queryFn: async () => {
      const params = new URLSearchParams();
      params.set('limit', '50');
      if (activeConversationId) params.set('conversationId', activeConversationId);
      const { data } = await api.get(`/edge/history?${params}`);
      return data.data as ChatMessage[];
    },
  });

  const messages = history ?? [];

  const sendMutation = useMutation({
    mutationFn: async (payload: { message: string; attachment?: Attachment }) => {
      let finalMessage = payload.message;
      let imageBase64: string | undefined;
      if (payload.attachment) {
        if (payload.attachment.type === 'document' && payload.attachment.content) {
          finalMessage = `[📄 Document joint : ${payload.attachment.name}]\n\n${payload.attachment.content}\n\n---\n${payload.message}`;
        } else if (payload.attachment.type === 'image' && payload.attachment.uri) {
          // Send image as base64 for vision analysis
          imageBase64 = payload.attachment.uri; // already a data URL from FileReader.readAsDataURL
          if (!finalMessage.trim()) {
            finalMessage = `Analyse cette image : ${payload.attachment.name}`;
          }
        }
      }
      const body: any = { message: finalMessage };
      if (imageBase64) body.imageBase64 = imageBase64;
      if (activeConversationId) body.conversationId = activeConversationId;
      const { data } = await api.post('/edge/chat', body);
      return { ...data.data, _attachment: payload.attachment };
    },
    onMutate: async (payload) => {
      await queryClient.cancelQueries({ queryKey: ['edgeHistory', activeConversationId] });
      const prev = queryClient.getQueryData<ChatMessage[]>(['edgeHistory', activeConversationId]) ?? [];
      const optimistic: ChatMessage = {
        id: `temp-${Date.now()}`,
        role: 'user',
        content: payload.message,
        attachment: payload.attachment ?? undefined,
        createdAt: new Date().toISOString(),
      };
      queryClient.setQueryData(['edgeHistory', activeConversationId], [...prev, optimistic]);
      return { prev };
    },
    onSuccess: (response) => {
      // If the server created/returned a conversationId, track it
      if (response.conversationId && response.conversationId !== activeConversationId) {
        setActiveConversationId(response.conversationId);
        // Move optimistic messages to the new conversation key
        const prev = queryClient.getQueryData<ChatMessage[]>(['edgeHistory', activeConversationId]) ?? [];
        queryClient.setQueryData(['edgeHistory', response.conversationId], prev);
      }
      const convKey = response.conversationId ?? activeConversationId;
      const prev = queryClient.getQueryData<ChatMessage[]>(['edgeHistory', convKey]) ?? [];
      const assistantMsg: ChatMessage = {
        id: response.id ?? `resp-${Date.now()}`,
        role: 'assistant',
        content: response.message,
        actions: response.actions,
        suggestedFollowups: response.suggestedFollowups,
        createdAt: new Date().toISOString(),
      };
      queryClient.setQueryData(['edgeHistory', convKey], [...prev, assistantMsg]);
      // Refresh conversations list (new conv or updated title)
      queryClient.invalidateQueries({ queryKey: ['edgeConversations'] });
    },
    onError: (_err, _payload, context) => {
      if (context?.prev) {
        queryClient.setQueryData(['edgeHistory', activeConversationId], context.prev);
      }
    },
  });

  // Auto-select latest conversation on first load
  useEffect(() => {
    if (activeConversationId === null && conversations && conversations.length > 0) {
      setActiveConversationId(conversations[0].id);
    }
  }, [conversations]);

  // ─── Conversation management ────────────────────────────
  const handleNewConversation = useCallback(async () => {
    try {
      const { data } = await api.post('/edge/conversations');
      const newConv = data.data;
      setActiveConversationId(newConv.id);
      queryClient.invalidateQueries({ queryKey: ['edgeConversations'] });
      // Clear the history cache for this new empty conversation
      queryClient.setQueryData(['edgeHistory', newConv.id], []);
    } catch { /* silent */ }
    setDrawerOpen(false);
    setInput('');
    setAttachment(null);
  }, [queryClient]);

  const handleSwitchConversation = useCallback((convId: string) => {
    setActiveConversationId(convId);
    setDrawerOpen(false);
    setInput('');
    setAttachment(null);
  }, []);

  const handleDeleteConversation = useCallback(async (convId: string) => {
    try {
      await api.delete(`/edge/conversations/${encodeURIComponent(convId)}`);
      queryClient.invalidateQueries({ queryKey: ['edgeConversations'] });
      queryClient.removeQueries({ queryKey: ['edgeHistory', convId] });
      if (activeConversationId === convId) {
        // Switch to the next available conversation or create new
        const convs = queryClient.getQueryData<Conversation[]>(['edgeConversations']);
        const remaining = convs?.filter(c => c.id !== convId);
        if (remaining && remaining.length > 0) {
          setActiveConversationId(remaining[0].id);
        } else {
          setActiveConversationId(null);
        }
      }
    } catch { /* silent */ }
  }, [activeConversationId, queryClient]);

  const handleRenameConversation = useCallback(async (convId: string, title: string) => {
    try {
      await api.patch(`/edge/conversations/${encodeURIComponent(convId)}`, { title });
      queryClient.invalidateQueries({ queryKey: ['edgeConversations'] });
      setEditingConvId(null);
    } catch { /* silent */ }
  }, [queryClient]);

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

  // Document download handlers
  const handleDownloadPDF = async (action: ChatAction & { type: 'DOWNLOAD_DOCUMENT' }) => {
    if (downloadingFormat) return;
    setDownloadingFormat('pdf');
    try {
      if (action.documentType === 'cv') {
        const { generatePDF, downloadBlob } = await import('../../lib/document-generator');
        const blob = await generatePDF(action.data as CVData);
        const name = `${(action.data as CVData).personalInfo?.firstName ?? 'CV'}_${(action.data as CVData).personalInfo?.lastName ?? ''}_CV`.replace(/\s+/g, '_');
        downloadBlob(blob, `${name}.pdf`);
      } else {
        // Cover letter as simple PDF
        const { jsPDF } = await import('jspdf');
        const doc = new jsPDF();
        const margin = 20;
        const contentWidth = doc.internal.pageSize.getWidth() - margin * 2;
        doc.setFontSize(11);
        const lines = doc.splitTextToSize(action.data.content, contentWidth);
        let y = 25;
        for (const line of lines) {
          if (y > 275) { doc.addPage(); y = 20; }
          doc.text(line, margin, y);
          y += 5.5;
        }
        const { downloadBlob: dlBlob } = await import('../../lib/document-generator');
        dlBlob(doc.output('blob'), 'Lettre_de_motivation.pdf');
      }
    } catch (err) {
      alert('Erreur lors de la génération du PDF. Réessaie.');
    } finally {
      setDownloadingFormat(null);
    }
  };

  const handleDownloadWord = async (action: ChatAction & { type: 'DOWNLOAD_DOCUMENT' }) => {
    if (downloadingFormat) return;
    setDownloadingFormat('word');
    try {
      if (action.documentType === 'cv') {
        const { generateWord, downloadBlob } = await import('../../lib/document-generator');
        const blob = await generateWord(action.data as CVData);
        const name = `${(action.data as CVData).personalInfo?.firstName ?? 'CV'}_${(action.data as CVData).personalInfo?.lastName ?? ''}_CV`.replace(/\s+/g, '_');
        downloadBlob(blob, `${name}.docx`);
      } else {
        // Cover letter as simple .docx
        const { Document, Packer, Paragraph, TextRun } = await import('docx');
        const paragraphs = (action.data.content as string).split('\n').map(
          (line: string) => new Paragraph({ children: [new TextRun({ text: line, size: 22, font: 'Calibri' })], spacing: { after: 120 } })
        );
        const docFile = new Document({ sections: [{ children: paragraphs }] });
        const blob = await Packer.toBlob(docFile);
        const { downloadBlob: dlBlob2 } = await import('../../lib/document-generator');
        dlBlob2(blob, 'Lettre_de_motivation.docx');
      }
    } catch (err) {
      alert('Erreur lors de la génération du Word. Réessaie.');
    } finally {
      setDownloadingFormat(null);
    }
  };

  // Extract text from PDF using PDF.js (loaded from CDN)
  const extractPdfText = async (file: File): Promise<string> => {
    const lib = await loadPdfJs();
    if (!lib) throw new Error('PDF.js not available');
    const arrayBuffer = await file.arrayBuffer();
    const pdf = await lib.getDocument({ data: arrayBuffer }).promise;
    const pages: string[] = [];
    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const textContent = await page.getTextContent();
      const pageText = textContent.items.map((item: any) => item.str).join(' ');
      pages.push(pageText);
    }
    return pages.join('\n\n');
  };

  // File picker
  const handleFilePickerChange = async (e: any) => {
    const file: File = e.target.files?.[0];
    if (!file) return;
    e.target.value = '';

    const isImage = file.type.startsWith('image/');
    const isPdf = file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf');
    const isDocx = file.name.toLowerCase().endsWith('.doc') || file.name.toLowerCase().endsWith('.docx');

    if (isImage) {
      const reader = new FileReader();
      reader.onload = (ev) => {
        setAttachment({ type: 'image', name: file.name, uri: ev.target?.result as string });
      };
      reader.readAsDataURL(file);
    } else if (isPdf) {
      setIsProcessingFile(true);
      try {
        const text = await extractPdfText(file);
        if (!text.trim()) {
          alert('Ce PDF ne contient pas de texte extractible (peut-être un scan/image).');
          setIsProcessingFile(false);
          return;
        }
        setAttachment({ type: 'document', name: file.name, content: text.slice(0, 12000) });
      } catch {
        alert('Impossible de lire ce PDF. Essaie un autre fichier.');
      } finally {
        setIsProcessingFile(false);
      }
    } else if (isDocx) {
      alert('Les fichiers .doc/.docx ne sont pas encore supportés. Convertis-le en PDF ou .txt.');
    } else {
      // Text-based files: .txt, .md, .json, .csv
      const reader = new FileReader();
      reader.onload = (ev) => {
        const content = ev.target?.result as string;
        setAttachment({ type: 'document', name: file.name, content: content.slice(0, 12000) });
      };
      reader.readAsText(file);
    }
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

  // Parse messages that contain embedded document content (from server history)
  // Pattern: [📄 Document joint : filename]\n\n<content>\n\n---\n<user message>
  const parseMessageContent = (content: string): { fileName: string | null; userText: string } => {
    const match = content.match(/^\[📄 Document joint : (.+?)\]\n\n[\s\S]*?\n\n---\n(.*)$/s);
    if (match) return { fileName: match[1], userText: match[2] || '' };
    // Also handle case where user typed nothing (just sent the file)
    const matchNoText = content.match(/^\[📄 Document joint : (.+?)\]\n\n[\s\S]+$/);
    if (matchNoText && !content.includes('\n\n---\n')) return { fileName: matchNoText[1], userText: '' };
    return { fileName: null, userText: content };
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: colors.background }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={90}
    >
      {/* Header */}
      <View style={{
        backgroundColor: colors.background, paddingTop: 56, paddingBottom: 12, paddingHorizontal: 20,
        flexDirection: 'row', alignItems: 'center', gap: 12,
        borderBottomWidth: 1, borderColor: colors.border,
      }}>
        <TouchableOpacity onPress={() => setDrawerOpen(true)} style={{ padding: 4 }}>
          <Ionicons name="menu-outline" size={22} color={colors.foreground} />
        </TouchableOpacity>
        <View style={{
          width: 36, height: 36, borderRadius: 12, backgroundColor: colors.primaryLight,
          justifyContent: 'center', alignItems: 'center',
        }}>
          <Ionicons name="sparkles" size={18} color={colors.primary} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={{ color: colors.foreground, fontSize: 17, fontWeight: '700' }}>EDGE</Text>
          <Text style={{ color: colors.mutedForeground, fontSize: 11 }} numberOfLines={1}>
            {activeConversationId && conversations?.find(c => c.id === activeConversationId)?.title || 'Nouvelle conversation'}
          </Text>
        </View>
        <TouchableOpacity onPress={handleNewConversation} style={{ padding: 6 }}>
          <Ionicons name="create-outline" size={20} color={colors.primary} />
        </TouchableOpacity>
        {messages.length > 0 && (
          <TouchableOpacity onPress={handleExport} style={{ padding: 6 }}>
            <Ionicons name="download-outline" size={20} color={colors.primary} />
          </TouchableOpacity>
        )}
      </View>

      {/* Conversation Drawer */}
      <Modal visible={drawerOpen} animationType="slide" transparent>
        <View style={{ flex: 1, flexDirection: 'row' }}>
          <View style={{
            width: 300, maxWidth: '80%', backgroundColor: colors.card, flex: 1,
            paddingTop: 56, paddingBottom: 40, borderRightWidth: 1, borderColor: colors.border,
          }}>
            {/* Drawer header */}
            <View style={{
              flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
              paddingHorizontal: 18, paddingBottom: 16, borderBottomWidth: 1, borderColor: colors.border,
            }}>
              <Text style={{ color: colors.foreground, fontSize: 17, fontWeight: '700' }}>Conversations</Text>
              <TouchableOpacity onPress={() => setDrawerOpen(false)}>
                <Ionicons name="close" size={22} color={colors.mutedForeground} />
              </TouchableOpacity>
            </View>

            {/* New conversation button */}
            <TouchableOpacity
              onPress={handleNewConversation}
              style={{
                flexDirection: 'row', alignItems: 'center', gap: 8, justifyContent: 'center',
                margin: 12, paddingHorizontal: 14, paddingVertical: 11,
                backgroundColor: colors.primary, borderRadius: 12,
              }}
            >
              <Ionicons name="add-circle-outline" size={18} color="#fff" />
              <Text style={{ color: '#fff', fontWeight: '700', fontSize: 14 }}>Nouvelle conversation</Text>
            </TouchableOpacity>

            {/* Conversations list */}
            <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingHorizontal: 8 }}>
              {(conversations ?? []).map((conv) => {
                const isActive = conv.id === activeConversationId;
                const isEditing = editingConvId === conv.id;
                return (
                  <TouchableOpacity
                    key={conv.id}
                    onPress={() => handleSwitchConversation(conv.id)}
                    style={{
                      flexDirection: 'row', alignItems: 'center', gap: 10,
                      paddingHorizontal: 12, paddingVertical: 11, marginVertical: 2,
                      backgroundColor: isActive ? colors.primaryLight : 'transparent',
                      borderRadius: 10,
                    }}
                  >
                    <Ionicons name="chatbubble-outline" size={15} color={isActive ? colors.primary : colors.mutedForeground} />
                    {isEditing ? (
                      <TextInput
                        autoFocus
                        value={editingTitle}
                        onChangeText={setEditingTitle}
                        onBlur={() => { handleRenameConversation(conv.id, editingTitle); }}
                        onSubmitEditing={() => { handleRenameConversation(conv.id, editingTitle); }}
                        style={{
                          flex: 1, color: colors.foreground, fontSize: 13, borderBottomWidth: 1,
                          borderColor: colors.primary, paddingVertical: 2,
                        }}
                        maxLength={200}
                      />
                    ) : (
                      <View style={{ flex: 1 }}>
                        <Text style={{ color: colors.foreground, fontSize: 13, fontWeight: isActive ? '700' : '400' }} numberOfLines={1}>
                          {conv.title}
                        </Text>
                        <Text style={{ color: colors.mutedForeground, fontSize: 11, marginTop: 2 }}>
                          {conv._count.messages} msg · {formatDate(conv.updatedAt)}
                        </Text>
                      </View>
                    )}
                    {!isEditing && (
                      <View style={{ flexDirection: 'row', gap: 4 }}>
                        <TouchableOpacity
                          onPress={(e) => { e.stopPropagation?.(); setEditingConvId(conv.id); setEditingTitle(conv.title); }}
                          hitSlop={8}
                        >
                          <Ionicons name="pencil-outline" size={14} color={colors.mutedForeground} />
                        </TouchableOpacity>
                        <TouchableOpacity
                          onPress={(e) => { e.stopPropagation?.(); handleDeleteConversation(conv.id); }}
                          hitSlop={8}
                        >
                          <Ionicons name="trash-outline" size={14} color={colors.destructive} />
                        </TouchableOpacity>
                      </View>
                    )}
                  </TouchableOpacity>
                );
              })}
              {(!conversations || conversations.length === 0) && (
                <Text style={{ color: colors.mutedForeground, textAlign: 'center', marginTop: 32, fontSize: 13 }}>
                  Aucune conversation{'\n'}Envoie ton premier message !
                </Text>
              )}
            </ScrollView>
          </View>

          {/* Tap outside to close */}
          <TouchableOpacity
            style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.4)' }}
            activeOpacity={1}
            onPress={() => setDrawerOpen(false)}
          />
        </View>
      </Modal>

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
        renderItem={({ item }) => {
          const parsed = item.role === 'user' ? parseMessageContent(item.content) : null;
          const hasEmbeddedDoc = parsed?.fileName != null;
          const displayContent = hasEmbeddedDoc ? parsed!.userText : item.content;
          const embeddedFileName = parsed?.fileName ?? null;
          return (
          <View style={{
            alignSelf: item.role === 'user' ? 'flex-end' : 'flex-start',
            maxWidth: '82%', marginBottom: 10,
          }}>
            {/* Attachment preview */}
            {item.attachment?.type === 'image' && item.attachment.uri && (
              <Image
                source={{ uri: item.attachment.uri }}
                style={{ width: 180, height: 120, borderRadius: 12, marginBottom: 4 }}
                resizeMode="cover"
              />
            )}
            {(item.attachment?.type === 'document' || hasEmbeddedDoc) && (
              <View style={{
                flexDirection: 'row', alignItems: 'center', gap: 6,
                backgroundColor: colors.primaryLight, borderRadius: 10, paddingHorizontal: 10, paddingVertical: 6,
                marginBottom: 4, borderWidth: 1, borderColor: colors.primaryMedium,
              }}>
                <Ionicons name="document-text-outline" size={15} color={colors.primary} />
                <Text style={{ fontSize: 12, color: colors.primary, fontWeight: '600' }}>
                  {item.attachment?.name ?? embeddedFileName}
                </Text>
              </View>
            )}
            <View style={{
              backgroundColor: item.role === 'user' ? colors.primary : colors.card,
              borderRadius: 18,
              borderBottomRightRadius: item.role === 'user' ? 4 : 18,
              borderBottomLeftRadius: item.role === 'assistant' ? 4 : 18,
              paddingHorizontal: 14, paddingVertical: 10,
              ...(item.role === 'assistant' ? { borderWidth: 1, borderColor: colors.border } : {}),
            }}>
              <Text style={{
                color: item.role === 'user' ? '#fff' : colors.foreground, fontSize: 14, lineHeight: 21,
              }}>
                {displayContent || (hasEmbeddedDoc ? 'Fichier envoyé' : item.content)}
              </Text>
            </View>
            <Text style={{ color: colors.border, fontSize: 10, marginTop: 2, textAlign: item.role === 'user' ? 'right' : 'left' }}>
              {formatTime(item.createdAt)}
            </Text>
            {/* Download buttons for generated documents */}
            {item.role === 'assistant' && item.actions?.some((a: any) => a.type === 'DOWNLOAD_DOCUMENT') && (
              <View style={{ flexDirection: 'row', gap: 8, marginTop: 8 }}>
                {item.actions!.filter((a: any) => a.type === 'DOWNLOAD_DOCUMENT').map((action: any, i: number) => (
                  <View key={i} style={{ flexDirection: 'row', gap: 8 }}>
                    <TouchableOpacity
                      onPress={() => handleDownloadPDF(action)}
                      disabled={!!downloadingFormat}
                      style={{
                        flexDirection: 'row', alignItems: 'center', gap: 6,
                        backgroundColor: '#E74C3C', borderRadius: 10,
                        paddingHorizontal: 14, paddingVertical: 9,
                        opacity: downloadingFormat === 'pdf' ? 0.6 : 1,
                      }}
                    >
                      {downloadingFormat === 'pdf' ? (
                        <ActivityIndicator size="small" color="#fff" />
                      ) : (
                        <Ionicons name="document-text" size={15} color="#fff" />
                      )}
                      <Text style={{ color: '#fff', fontWeight: '700', fontSize: 13 }}>PDF</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      onPress={() => handleDownloadWord(action)}
                      disabled={!!downloadingFormat}
                      style={{
                        flexDirection: 'row', alignItems: 'center', gap: 6,
                        backgroundColor: '#2B5797', borderRadius: 10,
                        paddingHorizontal: 14, paddingVertical: 9,
                        opacity: downloadingFormat === 'word' ? 0.6 : 1,
                      }}
                    >
                      {downloadingFormat === 'word' ? (
                        <ActivityIndicator size="small" color="#fff" />
                      ) : (
                        <Ionicons name="document" size={15} color="#fff" />
                      )}
                      <Text style={{ color: '#fff', fontWeight: '700', fontSize: 13 }}>Word</Text>
                    </TouchableOpacity>
                  </View>
                ))}
              </View>
            )}
          </View>
        );}}
      />

      {/* Suggestions */}
      {lastAssistantMsg?.suggestedFollowups && lastAssistantMsg.suggestedFollowups.length > 0 && (
        <View style={{ paddingHorizontal: 16, paddingBottom: 4, flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
          {lastAssistantMsg.suggestedFollowups.map((s: string, i: number) => (
            <TouchableOpacity
              key={i}
              onPress={() => handleSuggestion(s)}
              style={{
                paddingHorizontal: 12, paddingVertical: 7, borderRadius: 999,
                borderWidth: 1, borderColor: colors.primary, backgroundColor: colors.primaryLight,
              }}
            >
              <Text style={{ fontSize: 12, color: colors.primary, fontWeight: '600' }}>{s}</Text>
            </TouchableOpacity>
          ))}
        </View>
      )}

      {/* Typing indicator */}
      {sendMutation.isPending && (
        <View style={{ paddingHorizontal: 16, paddingBottom: 4 }}>
          <View style={{
            backgroundColor: colors.card, alignSelf: 'flex-start', borderRadius: 18,
            borderBottomLeftRadius: 4, paddingHorizontal: 14, paddingVertical: 10,
            borderWidth: 1, borderColor: colors.border,
          }}>
            <Text style={{ color: colors.mutedForeground, fontSize: 13 }}>EDGE réfléchit...</Text>
          </View>
        </View>
      )}

      {/* Attachment preview bar */}
      {isProcessingFile && (
        <View style={{
          flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 10,
          backgroundColor: colors.primaryLight, borderTopWidth: 1, borderColor: colors.primaryMedium, gap: 8,
        }}>
          <ActivityIndicator size="small" color={colors.primary} />
          <Text style={{ fontSize: 12, color: colors.primary, fontWeight: '600' }}>Extraction du texte du PDF...</Text>
        </View>
      )}
      {attachment && (
        <View style={{
          flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 8,
          backgroundColor: colors.primaryLight, borderTopWidth: 1, borderColor: colors.primaryMedium, gap: 8,
        }}>
          {attachment.type === 'image' && attachment.uri ? (
            <Image source={{ uri: attachment.uri }} style={{ width: 40, height: 40, borderRadius: 6 }} />
          ) : (
            <Ionicons name="document-text" size={22} color={colors.primary} />
          )}
          <Text style={{ flex: 1, fontSize: 12, color: colors.primary, fontWeight: '600' }} numberOfLines={1}>
            {attachment.name}
          </Text>
          <TouchableOpacity onPress={() => setAttachment(null)}>
            <Ionicons name="close-circle" size={20} color={colors.primary} />
          </TouchableOpacity>
        </View>
      )}

      {/* Input */}
      <View style={{
        paddingHorizontal: 12, paddingTop: 10, paddingBottom: 88,
        backgroundColor: colors.card,
        borderTopWidth: 1, borderColor: colors.border,
      }}>
        <View style={{
          flexDirection: 'row', alignItems: 'flex-end', gap: 6,
          backgroundColor: colors.muted, borderRadius: 24, borderWidth: 1,
          borderColor: colors.border, paddingHorizontal: 10, paddingVertical: 6,
        }}>
          {/* Attach */}
          <TouchableOpacity
            onPress={() => Platform.OS === 'web' && fileInputRef.current?.click()}
            style={{
              width: 34, height: 34, borderRadius: 17, justifyContent: 'center', alignItems: 'center',
              backgroundColor: colors.primaryLight,
            }}
          >
            <Ionicons name="attach" size={18} color={colors.primary} />
          </TouchableOpacity>

          {/* Text input */}
          <TextInput
            value={input}
            onChangeText={setInput}
            placeholder="Parle à EDGE..."
            placeholderTextColor={colors.mutedForeground}
            multiline
            maxLength={2000}
            onKeyPress={(e: any) => {
              if (Platform.OS === 'web' && e.nativeEvent.key === 'Enter' && !e.nativeEvent.shiftKey) {
                e.preventDefault?.();
                handleSend();
              }
            }}
            style={{
              flex: 1, fontSize: 14, maxHeight: 120,
              color: colors.foreground, paddingVertical: 7, paddingHorizontal: 4,
            }}
          />

          {/* Micro */}
          <TouchableOpacity
            onPress={handleVoice}
            style={{
              width: 34, height: 34, borderRadius: 17, justifyContent: 'center', alignItems: 'center',
              backgroundColor: isRecording ? colors.destructive : colors.primaryLight,
            }}
          >
            <Ionicons name={isRecording ? 'stop-circle' : 'mic-outline'} size={18} color={isRecording ? '#fff' : colors.primary} />
          </TouchableOpacity>

          {/* Send */}
          <TouchableOpacity
            onPress={handleSend}
            disabled={(!input.trim() && !attachment) || sendMutation.isPending}
            style={{
              width: 38, height: 38, borderRadius: 19, justifyContent: 'center', alignItems: 'center',
              backgroundColor: (input.trim() || attachment) ? colors.primary : colors.border,
            }}
          >
            <Ionicons name="send" size={16} color={(input.trim() || attachment) ? '#fff' : colors.mutedForeground} />
          </TouchableOpacity>
        </View>

        <Text style={{ fontSize: 10, color: colors.mutedForeground, marginTop: 5, textAlign: 'center' }}>
          ↵ Entrée pour envoyer · Shift+↵ nouvelle ligne · 📎 documents &amp; images
        </Text>
      </View>
    </KeyboardAvoidingView>
  );
}

function WelcomeMessage() {
  return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 28, paddingBottom: 40 }}>
      <View style={{
        width: 64, height: 64, borderRadius: 16, backgroundColor: colors.primaryLight,
        justifyContent: 'center', alignItems: 'center', marginBottom: 16,
      }}>
        <Ionicons name="sparkles" size={30} color={colors.primary} />
      </View>
      <Text style={{ fontSize: 20, fontWeight: '700', color: colors.foreground, textAlign: 'center' }}>
        Salut ! Moi c'est EDGE
      </Text>
      <Text style={{ fontSize: 13, color: colors.mutedForeground, textAlign: 'center', marginTop: 6, lineHeight: 19 }}>
        Ton compagnon de recherche d'emploi.{"\n"}Dis-moi ce que tu cherches et je m'occupe du reste
      </Text>
      <View style={{ marginTop: 24, gap: 8, width: '100%' }}>
        <SuggestionChip text="Cherche-moi un poste de développeur" icon="search" />
        <SuggestionChip text="Prépare un CV pour une offre tech" icon="document-text" />
        <SuggestionChip text="Lance une simulation d'entretien" icon="mic" />
        <SuggestionChip text="Mes statistiques de recherche" icon="bar-chart" />
      </View>
      <Text style={{ fontSize: 11, color: colors.border, marginTop: 20, textAlign: 'center' }}>
        Astuce : envoie un document ou une photo pour que je l'analyse
      </Text>
    </View>
  );
}

function SuggestionChip({ text, icon }: { text: string; icon: string }) {
  return (
    <TouchableOpacity style={{
      borderWidth: 1, borderColor: colors.border, borderRadius: 12, paddingHorizontal: 14,
      paddingVertical: 12, backgroundColor: colors.card, flexDirection: 'row', alignItems: 'center', gap: 10,
    }}>
      <Ionicons name={icon as any} size={16} color={colors.primary} />
      <Text style={{ color: colors.foreground, fontSize: 13, flex: 1 }}>{text}</Text>
      <Ionicons name="chevron-forward" size={14} color={colors.border} />
    </TouchableOpacity>
  );
}

function formatTime(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
}

function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  if (diffMins < 1) return "à l'instant";
  if (diffMins < 60) return `il y a ${diffMins}min`;
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `il y a ${diffHours}h`;
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 7) return `il y a ${diffDays}j`;
  return date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
}
