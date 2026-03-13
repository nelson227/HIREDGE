import { View, Text, TextInput, TouchableOpacity, FlatList, KeyboardAvoidingView, Platform, Image, ActivityIndicator, ScrollView, Modal, Animated } from 'react-native';
import { useState, useRef, useEffect, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import api from '../../lib/api';
import { generatePDF, generateWord, downloadBlob, type CVData } from '../../lib/document-generator';
import { colors, spacing, radius, fontSize as FS, shadows } from '../../lib/theme';

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
        const blob = generatePDF(action.data as CVData);
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
        downloadBlob(doc.output('blob'), 'Lettre_de_motivation.pdf');
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
        downloadBlob(blob, 'Lettre_de_motivation.docx');
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
        backgroundColor: colors.card, paddingTop: 60, paddingBottom: spacing.lg, paddingHorizontal: spacing.xl,
        flexDirection: 'row', alignItems: 'center', gap: spacing.md,
        borderBottomWidth: 1, borderColor: colors.border,
      }}>
        <TouchableOpacity onPress={() => setDrawerOpen(true)} style={{ padding: 4 }}>
          <Ionicons name="menu-outline" size={24} color={colors.foreground} />
        </TouchableOpacity>
        <View style={{
          width: 40, height: 40, borderRadius: 20, backgroundColor: colors.primaryLight,
          justifyContent: 'center', alignItems: 'center',
        }}>
          <Text style={{ fontSize: 20 }}>🧠</Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={{ color: colors.foreground, fontSize: FS.lg + 1, fontWeight: '700' }}>EDGE</Text>
          <Text style={{ color: colors.mutedForeground, fontSize: FS.xs + 1 }} numberOfLines={1}>
            {activeConversationId && conversations?.find(c => c.id === activeConversationId)?.title || 'Nouvelle conversation'}
          </Text>
        </View>
        <TouchableOpacity onPress={handleNewConversation} style={{ padding: 6 }}>
          <Ionicons name="create-outline" size={22} color={colors.primary} />
        </TouchableOpacity>
        {messages.length > 0 && (
          <TouchableOpacity onPress={handleExport} style={{ padding: 6 }}>
            <Ionicons name="download-outline" size={22} color={colors.primary} />
          </TouchableOpacity>
        )}
      </View>

      {/* Conversation Drawer */}
      <Modal visible={drawerOpen} animationType="slide" transparent>
        <View style={{ flex: 1, flexDirection: 'row' }}>
          <View style={{
            width: 300, maxWidth: '80%', backgroundColor: colors.sidebar, flex: 1,
            paddingTop: 60, paddingBottom: 40, borderRightWidth: 1, borderColor: colors.sidebarBorder,
          }}>
            {/* Drawer header */}
            <View style={{
              flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
              paddingHorizontal: spacing.lg, paddingBottom: spacing.lg, borderBottomWidth: 1, borderColor: colors.sidebarBorder,
            }}>
              <Text style={{ color: colors.sidebarForeground, fontSize: FS.lg + 1, fontWeight: '700' }}>Conversations</Text>
              <TouchableOpacity onPress={() => setDrawerOpen(false)}>
                <Ionicons name="close" size={24} color={colors.mutedForeground} />
              </TouchableOpacity>
            </View>

            {/* New conversation button */}
            <TouchableOpacity
              onPress={handleNewConversation}
              style={{
                flexDirection: 'row', alignItems: 'center', gap: spacing.sm + 2,
                margin: spacing.md, paddingHorizontal: spacing.lg - 2, paddingVertical: spacing.md,
                backgroundColor: colors.primary, borderRadius: radius.lg,
              }}
            >
              <Ionicons name="add-circle-outline" size={20} color={colors.primaryForeground} />
              <Text style={{ color: colors.primaryForeground, fontWeight: '600', fontSize: FS.base }}>Nouvelle conversation</Text>
            </TouchableOpacity>

            {/* Conversations list */}
            <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingHorizontal: spacing.sm }}>
              {(conversations ?? []).map((conv) => {
                const isActive = conv.id === activeConversationId;
                const isEditing = editingConvId === conv.id;
                return (
                  <TouchableOpacity
                    key={conv.id}
                    onPress={() => handleSwitchConversation(conv.id)}
                    style={{
                      flexDirection: 'row', alignItems: 'center', gap: spacing.sm + 2,
                      paddingHorizontal: spacing.md, paddingVertical: spacing.md, marginVertical: 2,
                      backgroundColor: isActive ? colors.sidebarAccent : 'transparent',
                      borderRadius: radius.md,
                    }}
                  >
                    <Ionicons name="chatbubble-outline" size={16} color={isActive ? colors.primary : colors.mutedForeground} />
                    {isEditing ? (
                      <TextInput
                        autoFocus
                        value={editingTitle}
                        onChangeText={setEditingTitle}
                        onBlur={() => { handleRenameConversation(conv.id, editingTitle); }}
                        onSubmitEditing={() => { handleRenameConversation(conv.id, editingTitle); }}
                        style={{
                          flex: 1, color: colors.foreground, fontSize: FS.sm + 1, borderBottomWidth: 1,
                          borderColor: colors.primary, paddingVertical: 2,
                        }}
                        maxLength={200}
                      />
                    ) : (
                      <View style={{ flex: 1 }}>
                        <Text style={{ color: colors.sidebarForeground, fontSize: FS.sm + 1, fontWeight: isActive ? '600' : '400' }} numberOfLines={1}>
                          {conv.title}
                        </Text>
                        <Text style={{ color: colors.mutedForeground, fontSize: FS.xs, marginTop: 2 }}>
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
                <Text style={{ color: colors.mutedForeground, textAlign: 'center', marginTop: 32, fontSize: FS.sm + 1 }}>
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
        contentContainerStyle={{ padding: spacing.lg, paddingBottom: spacing.sm, flexGrow: 1 }}
        ListEmptyComponent={<WelcomeMessage />}
        renderItem={({ item }) => {
          const parsed = item.role === 'user' ? parseMessageContent(item.content) : null;
          const hasEmbeddedDoc = parsed?.fileName != null;
          const displayContent = hasEmbeddedDoc ? parsed!.userText : item.content;
          const embeddedFileName = parsed?.fileName ?? null;
          return (
          <View style={{
            alignSelf: item.role === 'user' ? 'flex-end' : 'flex-start',
            maxWidth: '80%', marginBottom: spacing.sm + 2,
          }}>
            {/* Attachment preview */}
            {item.attachment?.type === 'image' && item.attachment.uri && (
              <Image
                source={{ uri: item.attachment.uri }}
                style={{ width: 180, height: 120, borderRadius: radius.lg, marginBottom: 4 }}
                resizeMode="cover"
              />
            )}
            {(item.attachment?.type === 'document' || hasEmbeddedDoc) && (
              <View style={{
                flexDirection: 'row', alignItems: 'center', gap: 6,
                backgroundColor: colors.primaryLight, borderRadius: radius.md, paddingHorizontal: spacing.sm + 2, paddingVertical: 6,
                marginBottom: 4, borderWidth: 1, borderColor: colors.primaryMedium,
              }}>
                <Ionicons name="document-text-outline" size={16} color={colors.primary} />
                <Text style={{ fontSize: FS.xs + 1, color: colors.primary, fontWeight: '600' }}>
                  {item.attachment?.name ?? embeddedFileName}
                </Text>
              </View>
            )}
            <View style={{
              backgroundColor: item.role === 'user' ? colors.primary : colors.card,
              borderRadius: radius.xl,
              borderBottomRightRadius: item.role === 'user' ? radius.xs : radius.xl,
              borderBottomLeftRadius: item.role === 'assistant' ? radius.xs : radius.xl,
              paddingHorizontal: spacing.lg - 2, paddingVertical: spacing.sm + 2,
              ...(item.role === 'assistant' ? { borderWidth: 1, borderColor: colors.border } : {}),
            }}>
              <Text style={{
                color: item.role === 'user' ? colors.primaryForeground : colors.foreground, fontSize: FS.base, lineHeight: 22,
              }}>
                {displayContent || (hasEmbeddedDoc ? 'Fichier envoyé' : item.content)}
              </Text>
            </View>
            <Text style={{ color: colors.border, fontSize: 10, marginTop: 2, textAlign: item.role === 'user' ? 'right' : 'left' }}>
              {formatTime(item.createdAt)}
            </Text>
            {/* Download buttons for generated documents */}
            {item.role === 'assistant' && item.actions?.some((a: any) => a.type === 'DOWNLOAD_DOCUMENT') && (
              <View style={{ flexDirection: 'row', gap: spacing.sm, marginTop: spacing.sm }}>
                {item.actions!.filter((a: any) => a.type === 'DOWNLOAD_DOCUMENT').map((action: any, i: number) => (
                  <View key={i} style={{ flexDirection: 'row', gap: spacing.sm }}>
                    <TouchableOpacity
                      onPress={() => handleDownloadPDF(action)}
                      disabled={!!downloadingFormat}
                      style={{
                        flexDirection: 'row', alignItems: 'center', gap: 6,
                        backgroundColor: '#E74C3C', borderRadius: radius.lg,
                        paddingHorizontal: spacing.lg - 2, paddingVertical: 9,
                        opacity: downloadingFormat === 'pdf' ? 0.6 : 1,
                      }}
                    >
                      {downloadingFormat === 'pdf' ? (
                        <ActivityIndicator size="small" color="#fff" />
                      ) : (
                        <Ionicons name="document-text" size={16} color="#fff" />
                      )}
                      <Text style={{ color: '#fff', fontWeight: '700', fontSize: FS.sm }}>PDF</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      onPress={() => handleDownloadWord(action)}
                      disabled={!!downloadingFormat}
                      style={{
                        flexDirection: 'row', alignItems: 'center', gap: 6,
                        backgroundColor: '#2B5797', borderRadius: radius.lg,
                        paddingHorizontal: spacing.lg - 2, paddingVertical: 9,
                        opacity: downloadingFormat === 'word' ? 0.6 : 1,
                      }}
                    >
                      {downloadingFormat === 'word' ? (
                        <ActivityIndicator size="small" color="#fff" />
                      ) : (
                        <Ionicons name="document" size={16} color="#fff" />
                      )}
                      <Text style={{ color: '#fff', fontWeight: '700', fontSize: FS.sm }}>Word</Text>
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
        <View style={{ paddingHorizontal: spacing.lg, paddingBottom: 4, flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
          {lastAssistantMsg.suggestedFollowups.map((s: string, i: number) => (
            <TouchableOpacity
              key={i}
              onPress={() => handleSuggestion(s)}
              style={{
                paddingHorizontal: spacing.md, paddingVertical: 7, borderRadius: radius.xl,
                borderWidth: 1, borderColor: colors.primary, backgroundColor: colors.primaryLight,
              }}
            >
              <Text style={{ fontSize: FS.sm, color: colors.primary, fontWeight: '500' }}>{s}</Text>
            </TouchableOpacity>
          ))}
        </View>
      )}

      {/* Typing indicator */}
      {sendMutation.isPending && (
        <View style={{ paddingHorizontal: spacing.lg, paddingBottom: 4 }}>
          <View style={{
            backgroundColor: colors.card, alignSelf: 'flex-start', borderRadius: radius.xl,
            borderBottomLeftRadius: radius.xs, paddingHorizontal: spacing.lg - 2, paddingVertical: spacing.sm + 2,
            borderWidth: 1, borderColor: colors.border,
          }}>
            <Text style={{ color: colors.mutedForeground, fontSize: FS.sm + 1 }}>EDGE réfléchit...</Text>
          </View>
        </View>
      )}

      {/* Attachment preview bar */}
      {isProcessingFile && (
        <View style={{
          flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 10,
          backgroundColor: colors.primaryLight, borderTopWidth: 1, borderColor: colors.primaryMedium, gap: spacing.sm,
        }}>
          <ActivityIndicator size="small" color={colors.primary} />
          <Text style={{ fontSize: FS.sm, color: colors.primary, fontWeight: '500' }}>Extraction du texte du PDF...</Text>
        </View>
      )}
      {attachment && (
        <View style={{
          flexDirection: 'row', alignItems: 'center', paddingHorizontal: spacing.md, paddingVertical: spacing.sm,
          backgroundColor: colors.primaryLight, borderTopWidth: 1, borderColor: colors.primaryMedium, gap: spacing.sm,
        }}>
          {attachment.type === 'image' && attachment.uri ? (
            <Image source={{ uri: attachment.uri }} style={{ width: 40, height: 40, borderRadius: 6 }} />
          ) : (
            <Ionicons name="document-text" size={24} color={colors.primary} />
          )}
          <Text style={{ flex: 1, fontSize: FS.sm, color: colors.primary, fontWeight: '500' }} numberOfLines={1}>
            {attachment.name}
          </Text>
          <TouchableOpacity onPress={() => setAttachment(null)}>
            <Ionicons name="close-circle" size={20} color={colors.primary} />
          </TouchableOpacity>
        </View>
      )}

      {/* Input */}
      <View style={{
        paddingHorizontal: spacing.md, paddingTop: spacing.md, paddingBottom: 88,
        backgroundColor: colors.muted,
        borderTopWidth: 1, borderColor: colors.border,
      }}>
        <View style={{
          flexDirection: 'row', alignItems: 'flex-end', gap: spacing.sm,
          backgroundColor: colors.card, borderRadius: radius['2xl'] + 8, borderWidth: 1,
          borderColor: colors.border, paddingHorizontal: spacing.md, paddingVertical: spacing.sm + 2,
          ...shadows.sm,
        }}>
          {/* Attach */}
          <TouchableOpacity
            onPress={() => Platform.OS === 'web' && fileInputRef.current?.click()}
            style={{
              width: 36, height: 36, borderRadius: 18, justifyContent: 'center', alignItems: 'center',
              backgroundColor: colors.primaryLight,
            }}
          >
            <Ionicons name="attach" size={20} color={colors.primary} />
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
              flex: 1, fontSize: FS.base, maxHeight: 120,
              color: colors.foreground, paddingVertical: 8, paddingHorizontal: 4,
            }}
          />

          {/* Micro */}
          <TouchableOpacity
            onPress={handleVoice}
            style={{
              width: 36, height: 36, borderRadius: 18, justifyContent: 'center', alignItems: 'center',
              backgroundColor: isRecording ? colors.destructive : colors.primaryLight,
            }}
          >
            <Ionicons name={isRecording ? 'stop-circle' : 'mic-outline'} size={20} color={isRecording ? colors.primaryForeground : colors.primary} />
          </TouchableOpacity>

          {/* Send */}
          <TouchableOpacity
            onPress={handleSend}
            disabled={(!input.trim() && !attachment) || sendMutation.isPending}
            style={{
              width: 40, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center',
              backgroundColor: (input.trim() || attachment) ? colors.primary : colors.muted,
            }}
          >
            <Ionicons name="send" size={17} color={(input.trim() || attachment) ? colors.primaryForeground : colors.mutedForeground} />
          </TouchableOpacity>
        </View>

        <Text style={{ fontSize: FS.xs, color: colors.mutedForeground, marginTop: 6, textAlign: 'center' }}>
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
        width: 80, height: 80, borderRadius: 40, backgroundColor: colors.primaryLight,
        justifyContent: 'center', alignItems: 'center', marginBottom: spacing.lg,
      }}>
        <Text style={{ fontSize: 36 }}>🧠</Text>
      </View>
      <Text style={{ fontSize: FS.xl, fontWeight: '700', color: colors.foreground, textAlign: 'center' }}>
        Salut ! Moi c'est EDGE
      </Text>
      <Text style={{ fontSize: FS.sm + 1, color: colors.mutedForeground, textAlign: 'center', marginTop: spacing.sm, lineHeight: 20 }}>
        Ton compagnon de recherche d'emploi. Dis-moi ce que tu cherches et je m'occupe du reste 💪
      </Text>
      <View style={{ marginTop: spacing.xl, gap: spacing.sm, width: '100%' }}>
        <SuggestionChip text="🔍 Cherche-moi un poste de développeur à Paris" />
        <SuggestionChip text="📝 Prépare un CV pour une offre tech" />
        <SuggestionChip text="🎭 Lance une simulation d'entretien" />
        <SuggestionChip text="📊 Mes statistiques de recherche" />
      </View>
      <Text style={{ fontSize: FS.xs + 1, color: colors.border, marginTop: spacing.lg, textAlign: 'center' }}>
        💡 Astuce : envoie un document (CV, offre) ou une photo pour que je l'analyse
      </Text>
    </View>
  );
}

function SuggestionChip({ text }: { text: string }) {
  return (
    <TouchableOpacity style={{
      borderWidth: 1, borderColor: colors.border, borderRadius: radius.lg, paddingHorizontal: spacing.lg - 2,
      paddingVertical: spacing.sm + 2, backgroundColor: colors.card,
    }}>
      <Text style={{ color: colors.foreground, fontSize: FS.sm + 1 }}>{text}</Text>
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
