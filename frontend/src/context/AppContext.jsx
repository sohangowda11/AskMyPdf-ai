import React, { createContext, useContext, useReducer, useCallback, useEffect, useMemo, useRef } from 'react';
import * as api from '../api/api';

export const AppContext = createContext(null);

const initialState = {
  isLoading: true,
  isUploading: false,
  isSending: false,
  isGeneratingQuiz: false,
  error: null,
  activeDocument: null,
  activeDocuments: [],
  selectedConvIds: [], // Use conversation_id for selection uniqueness
  isMultiPDFMode: false,
  selectionMode: false,
  activeConversation: null,
  pdfUrl: null,
  messages: [],
  conversations: [],
  sidebarOpen: true,
  quizOpen: false,
  quizData: null,
  flashcardsOpen: false,
  flashcardsData: null,
  notification: null,
  theme: localStorage.getItem('theme') || 'light',
  isWorkspaceActive: false,
  resolvedPdfUrl: null,
  pdfResolutionStatus: 'idle', // 'idle' | 'loading' | 'success' | 'error'
  errorCode: null,
  utilityPanel: {
    isOpen: false,
    activeTool: null,
    data: null,
    isLoading: false
  },
  studyToolkit: {
    isOpen: false,
    isLoading: false,
    data: null,
    error: null
  },
  voiceMode: {
    isOpen: false
  }
};

function reducer(state, action) {
  switch (action.type) {
    case 'TOGGLE_THEME':
      const newTheme = state.theme === 'light' ? 'dark' : 'light';
      localStorage.setItem('theme', newTheme);
      return { ...state, theme: newTheme };
    case 'SET_LOADING':
      return { ...state, isLoading: action.payload };
    case 'SET_UPLOADING':
      return { ...state, isUploading: action.payload };
    case 'SET_SENDING':
      return { ...state, isSending: action.payload };
    case 'SET_QUIZ_LOADING':
      return { ...state, isGeneratingQuiz: action.payload };
    case 'SET_ERROR':
      const errMsg = typeof action.payload === 'string' ? action.payload : (action.payload?.error || action.payload?.message || JSON.stringify(action.payload));
      const cleanErrMsg = String(errMsg).length > 150 
        ? "AI service encountered an error. The document might be too large or the API quota was exceeded."
        : String(errMsg);
      return { ...state, error: cleanErrMsg };
    case 'CLEAR_ERROR':
      return { ...state, error: null };
    case 'SET_CONVERSATIONS':
      return { ...state, conversations: action.payload };
    case 'ADD_CONVERSATION':
      return { ...state, conversations: [action.payload, ...state.conversations] };
    case 'SET_ACTIVE_CONVERSATION':
      return { ...state, activeConversation: action.payload };
    case 'SET_ACTIVE_DOCUMENT':
      // Prevent redundant updates if it's the same document
      if (state.activeDocument?.doc_id === action.payload?.doc_id) return state;
      return { ...state, activeDocument: action.payload };
    case 'SET_PDF_URL':
      // Prevent redundant updates to stop PDF flickering
      if (state.pdfUrl === action.payload) return state;
      return { ...state, pdfUrl: action.payload };
    case 'SET_MESSAGES':
      return { ...state, messages: action.payload };
    case 'ADD_MESSAGE':
      return { ...state, messages: [...state.messages, action.payload] };
    case 'SET_WORKSPACE_ACTIVE':
      return { ...state, isWorkspaceActive: action.payload };
    case 'SET_UTILITY_PANEL':
      return { 
        ...state, 
        utilityPanel: { ...state.utilityPanel, ...action.payload } 
      };
    case 'SET_STUDY_TOOLKIT':
      return {
        ...state,
        studyToolkit: { ...state.studyToolkit, ...action.payload }
      };
    case 'SET_VOICE_MODE':
      return {
        ...state,
        voiceMode: { ...state.voiceMode, ...action.payload }
      };
    case 'TOGGLE_SIDEBAR':
      return { ...state, sidebarOpen: !state.sidebarOpen };
    case 'SET_SIDEBAR':
      return { ...state, sidebarOpen: action.payload };
    case 'SET_QUIZ':
      return { ...state, quizData: action.payload, quizOpen: true };
    case 'CLOSE_QUIZ':
      return { ...state, quizOpen: false };
    case 'SET_FLASHCARDS':
      return { ...state, flashcardsData: action.payload, flashcardsOpen: true };
    case 'CLOSE_FLASHCARDS':
      return { ...state, flashcardsOpen: false };
    case 'SET_NOTIFICATION':
      return { ...state, notification: action.payload };
    case 'CLEAR_NOTIFICATION':
      return { ...state, notification: null };
    case 'SET_ACTIVE_DOCUMENTS':
      return { ...state, activeDocuments: action.payload, isMultiPDFMode: action.payload.length > 1 };
    case 'TOGGLE_SELECTION_MODE':
      const newMode = !state.selectionMode;
      return { 
        ...state, 
        selectionMode: newMode,
        selectedConvIds: [] // Clear on toggle
      };
    case 'TOGGLE_DOC_SELECTION':
      if (!action.payload) return state;
      const isSelected = state.selectedConvIds.includes(action.payload);
      return {
        ...state,
        selectedConvIds: isSelected 
          ? state.selectedConvIds.filter(id => id !== action.payload)
          : [...state.selectedConvIds, action.payload]
      };
    case 'CLEAR_DOC_SELECTION':
      return { ...state, selectedConvIds: [] };
    case 'REMOVE_CONVERSATION':
      return {
        ...state,
        conversations: state.conversations.filter(
          (c) => c.conversation_id !== action.payload
        ),
      };
    case 'CLEAR_ALL_HISTORY':
      return {
        ...state,
        conversations: [],
        activeConversation: null,
        activeDocument: null,
        activeDocuments: [],
        pdfUrl: null,
        messages: [],
        selectedConvIds: [],
        isMultiPDFMode: false,
        isWorkspaceActive: false
      };
    case 'SET_RESOLVED_PDF_URL':
      return { 
        ...state, 
        resolvedPdfUrl: action.payload.url, 
        pdfResolutionStatus: action.payload.status,
        errorCode: action.payload.errorCode || null
      };
    case 'CLEAR_RESOLVED_PDF_URL':
      return { 
        ...state, 
        resolvedPdfUrl: null, 
        pdfResolutionStatus: 'idle' 
      };
    case 'LOGOUT':
      return {
        ...initialState,
        theme: state.theme,
        isLoading: false
      };
    default:
      return state;
  }
}

export function AppProvider({ children }) {
  const [state, dispatch] = useReducer(reducer, initialState);

  useEffect(() => {
    if (state.theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [state.theme]);

  const showNotification = useCallback((message, type = 'info', duration = 3000) => {
    const rawMsg = typeof message === 'string' ? message : (message?.error || message?.message || JSON.stringify(message));
    const cleanMsg = String(rawMsg).length > 120 
      ? "AI service encountered an error (e.g., rate limits or doc length). Please try again later."
      : String(rawMsg);
      
    dispatch({ type: 'SET_NOTIFICATION', payload: { message: cleanMsg, type } });
    setTimeout(() => dispatch({ type: 'CLEAR_NOTIFICATION' }), duration);
  }, []);

  const loadConversation = useCallback(async (conv) => {
    if (!conv?.conversation_id) return;
    
    console.log(">>> [LOAD_CONV] Initializing hydration for:", conv.conversation_id);
    
    // 1. Set preliminary state to show active item in sidebar immediately
    dispatch({ type: 'SET_ACTIVE_CONVERSATION', payload: conv });
    dispatch({ type: 'SET_WORKSPACE_ACTIVE', payload: true });
    dispatch({ type: 'SET_LOADING', payload: true });
    dispatch({ type: 'CLEAR_ERROR' });

    try {
      // 2. Fetch fresh data from backend
      const data = await api.getConversation(conv.conversation_id);
      
      if (!data) throw new Error("Conversation data not found");

      // 3. Hydrate Messages
      dispatch({ type: 'SET_MESSAGES', payload: data.messages || [] });
      
      // 4. Hydrate Active Document
      const docInfo = {
        doc_id: data.doc_id,
        filename: data.title || data.filename,
        page_count: 0
      };
      dispatch({ type: 'SET_ACTIVE_DOCUMENT', payload: docInfo });
      dispatch({ type: 'SET_ACTIVE_DOCUMENTS', payload: [] });

      // 5. Restore Study Toolkit / Summary state if it exists
      if (data.summary) {
        dispatch({ 
          type: 'SET_STUDY_TOOLKIT', 
          payload: { data: { summary: data.summary }, isLoading: false, isOpen: false } 
        });
      }

      // 6. Securely fetch PDF Blob for the viewer
      try {
        console.log(">>> [LOAD_CONV] Fetching secure PDF blob for doc:", data.doc_id);
        const blobUrl = await api.fetchPDFBlobById(data.doc_id);
        dispatch({ type: 'SET_PDF_URL', payload: blobUrl });
      } catch (blobErr) {
        console.error(">>> [LOAD_CONV] PDF Fetch failed:", blobErr);
        // Fallback to legacy URL if blob fails (might be unowned doc)
        dispatch({ type: 'SET_PDF_URL', payload: api.getPDFUrl(data.filename) });
      }

      // 7. Persist selection
      localStorage.setItem('lastActiveConversationId', conv.conversation_id);
      
      console.log(">>> [LOAD_CONV] Hydration complete for:", data.title);
    } catch (err) {
      console.error(">>> [LOAD_CONV] Hydration failed:", err);
      dispatch({ type: 'SET_ERROR', payload: 'Failed to restore conversation history.' });
      showNotification('History sync failed. Please try again.', 'error');
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  }, [showNotification]);

  // PERSISTENCE: Restore last active conversation on mount
  useEffect(() => {
    const initialize = async () => {
      try {
        const data = await api.getHistory();
        dispatch({ type: 'SET_CONVERSATIONS', payload: data.conversations || [] });
        
        // Try to restore last active conversation
        const lastActiveId = localStorage.getItem('lastActiveConversationId');
        if (lastActiveId && data.conversations?.length > 0) {
          const lastConv = data.conversations.find(c => c.conversation_id === lastActiveId);
          if (lastConv) {
            console.log("!!! [PERSISTENCE] Restoring last active conversation:", lastActiveId);
            loadConversation({ conversation_id: lastActiveId });
          } else {
            dispatch({ type: 'SET_LOADING', payload: false });
          }
        } else {
          dispatch({ type: 'SET_LOADING', payload: false });
        }
      } catch (err) {
        console.error("!!! [PERSISTENCE] Init failed:", err);
        dispatch({ type: 'SET_LOADING', payload: false });
      }
    };
    initialize();
  }, [loadConversation]); // Only on mount, but depends on stable loadConversation

  const uploadDocument = useCallback(async (file) => {
    dispatch({ type: 'SET_UPLOADING', payload: true });
    dispatch({ type: 'CLEAR_ERROR' });
    console.log(">>> STARTING PDF UPLOAD:", file.name);
    
    try {
      const data = await api.uploadPDF(file);
      console.log(">>> UPLOAD API RESPONSE:", data);

      if (!data || !data.doc_id || !data.filename) {
        throw new Error("Invalid response from server. Missing document data.");
      }

      const docInfo = {
        doc_id: data.doc_id,
        filename: data.filename,
        page_count: data.page_count || 0,
      };

      const convInfo = {
        conversation_id: data.conversation_id,
        doc_id: data.doc_id,
        title: file.name.replace('.pdf', ''),
        message_count: 0,
        created_at: new Date().toISOString(),
      };

      // Fetch Blob immediately for the viewer to avoid legacy URL flicker
      try {
        const blobUrl = await api.fetchPDFBlobById(data.doc_id);
        dispatch({ type: 'SET_PDF_URL', payload: blobUrl });
      } catch (err) {
        dispatch({ type: 'SET_PDF_URL', payload: api.getPDFUrl(data.filename) });
      }

      dispatch({ type: 'SET_ACTIVE_DOCUMENT', payload: docInfo });
      dispatch({ type: 'SET_ACTIVE_CONVERSATION', payload: convInfo });
      dispatch({ type: 'ADD_CONVERSATION', payload: convInfo });
      dispatch({ type: 'SET_MESSAGES', payload: [] });
      dispatch({ type: 'SET_WORKSPACE_ACTIVE', payload: true });
      
      // Save for persistence
      localStorage.setItem('lastActiveConversationId', data.conversation_id);

      // Add welcome message
      const welcomeMsg = {
        id: 'welcome-' + Date.now(),
        role: 'assistant',
        content: `✅ PDF Uploaded Successfully!\n\nI've loaded **${file.name}** (${data.page_count || 0} pages). How can I help you study this document?`,
        sources: [],
        timestamp: new Date().toISOString(),
      };
      dispatch({ type: 'ADD_MESSAGE', payload: welcomeMsg });

      // Ensure Study Toolkit is CLOSED by default on fresh upload
      dispatch({ type: 'SET_STUDY_TOOLKIT', payload: { isOpen: false, data: null } });

      showNotification('PDF Ready! Entering workspace...', 'success');

      return data;
    } catch (err) {
      console.error(">>> CRITICAL UPLOAD FAILURE:", err);
      let errorMsg = 'Sorry, I couldn\'t process that PDF right now. Please try again.';
      
      if (err.response) {
        const data = err.response.data;
        if (err.response.status === 401) {
          errorMsg = "Authentication failed. Please check your Supabase keys in the backend .env file.";
        } else if (err.response.status === 500) {
          errorMsg = data.error || "Server error. This usually means the backend .env keys are invalid.";
        } else {
          errorMsg = data.error || `Upload failed (${err.response.status})`;
        }
      } else if (err.request) {
        errorMsg = 'Backend is unreachable. Ensure the Flask server is running on port 5001.';
      }
      
      dispatch({ type: 'SET_ERROR', payload: errorMsg });
      showNotification(errorMsg, 'error', 6000);
      throw err;
    } finally {
      dispatch({ type: 'SET_UPLOADING', payload: false });
    }
  }, [showNotification]);

  const parseAiResponse = useCallback((rawContent, data = {}) => {
    if (!rawContent) return { content: "", suggestions: [] };
    
    const suggestionMatch = rawContent.match(/SUGGESTIONS:(.*)/s);
    let suggestions = [];
    
    if (suggestionMatch) {
      suggestions = suggestionMatch[1]
        .split('|')
        .map(s => s.replace(/[\[\]]/g, '').trim())
        .filter(Boolean);
    } else if (data.suggestions && Array.isArray(data.suggestions)) {
      suggestions = data.suggestions;
    }
    
    const content = rawContent.replace(/SUGGESTIONS:.*$/s, '').trim();
    return { content, suggestions };
  }, []);

  const sendChatMessage = useCallback(async (message) => {
    if ((!state.activeDocument && !state.activeDocuments.length) || !state.activeConversation) return;
    dispatch({ type: 'SET_SENDING', payload: true });
    dispatch({ type: 'CLEAR_ERROR' });

    const userMsg = {
      id: Date.now().toString(),
      role: 'user',
      content: message,
      sources: [],
      timestamp: new Date().toISOString(),
    };
    dispatch({ type: 'ADD_MESSAGE', payload: userMsg });

    try {
      const docIds = state.isMultiPDFMode 
        ? state.activeDocuments.map(d => d.doc_id)
        : [state.activeDocument.doc_id];

      const data = await api.sendMessage(
        docIds,
        state.activeConversation.conversation_id,
        message
      );
      
      const { content, suggestions } = parseAiResponse(data.answer || "", data);

      const aiMsg = {
        id: data.message_id || Date.now().toString(),
        role: 'assistant',
        content,
        sources: data.sources || [],
        suggestions,
        timestamp: data.timestamp || new Date().toISOString(),
      };
      dispatch({ type: 'ADD_MESSAGE', payload: aiMsg });
      return data;
    } catch (err) {
      const errorMsg = err.response?.data?.error || 'Failed to get response. Please try again.';
      dispatch({ type: 'SET_ERROR', payload: errorMsg });
      const errMsg = {
        id: 'error-' + Date.now(),
        role: 'assistant',
        content: `⚠️ ${errorMsg}`,
        sources: [],
        timestamp: new Date().toISOString(),
      };
      dispatch({ type: 'ADD_MESSAGE', payload: errMsg });
    } finally {
      dispatch({ type: 'SET_SENDING', payload: false });
    }
  }, [state.activeDocument, state.activeDocuments, state.activeConversation, state.isMultiPDFMode, parseAiResponse]);

  const requestSummary = useCallback(async () => {
    if (!state.activeDocument) {
      showNotification('Please upload a PDF first.', 'error');
      return;
    }
    
    dispatch({ type: 'SET_SENDING', payload: true });
    dispatch({ type: 'CLEAR_ERROR' });

    try {
      const data = await api.getSummary(
        state.activeDocument.doc_id,
        state.activeConversation?.conversation_id
      );
      
      const { content, suggestions } = parseAiResponse(data.summary || "", data);
      
      const aiMsg = {
        id: data.message_id || Date.now().toString(),
        role: 'assistant',
        content,
        sources: [],
        suggestions,
        timestamp: new Date().toISOString(),
      };
      
      dispatch({ type: 'ADD_MESSAGE', payload: aiMsg });
    } catch (err) {
      const errorMsg = err.response?.data?.error || 'Failed to generate summary.';
      dispatch({ type: 'SET_ERROR', payload: errorMsg });
      showNotification(errorMsg, 'error');
    } finally {
      dispatch({ type: 'SET_SENDING', payload: false });
    }
  }, [state.activeDocument, state.activeConversation, showNotification, parseAiResponse]);

  const requestAdvancedTool = useCallback(async (toolName) => {
    if (!state.activeDocument) return;
    dispatch({ type: 'SET_SENDING', payload: true });
    dispatch({ type: 'CLEAR_ERROR' });

    try {
      const data = await api.runAdvancedTool(
        state.activeDocument.doc_id,
        toolName,
        state.activeConversation?.conversation_id
      );

      const { content, suggestions } = parseAiResponse(data.result || "", data);

      const aiMsg = {
        id: Date.now().toString(),
        role: 'assistant',
        content,
        sources: [],
        suggestions,
        timestamp: new Date().toISOString(),
      };
      
      dispatch({ type: 'ADD_MESSAGE', payload: aiMsg });
    } catch (err) {
      const errorMsg = err.response?.data?.error || 'Failed to process request.';
      dispatch({ type: 'SET_ERROR', payload: errorMsg });
      showNotification(errorMsg, 'error');
    } finally {
      dispatch({ type: 'SET_SENDING', payload: false });
    }
  }, [state.activeDocument, state.activeConversation, showNotification, parseAiResponse]);

  const requestExplain = useCallback(async () => {
    if (!state.activeDocument) {
      showNotification('Please upload a PDF first.', 'error');
      return;
    }

    dispatch({ type: 'SET_SENDING', payload: true });
    dispatch({ type: 'CLEAR_ERROR' });

    try {
      const data = await api.explainText(
        state.activeDocument.doc_id,
        state.activeConversation?.conversation_id
      );
      
      const { content, suggestions } = parseAiResponse(data.response || "", data);

      const aiMsg = {
        id: 'explain-' + Date.now(),
        role: 'assistant',
        content,
        sources: [],
        suggestions,
        timestamp: new Date().toISOString(),
      };
      dispatch({ type: 'ADD_MESSAGE', payload: aiMsg });
    } catch (err) {
      const errorMsg = err.response?.data?.error || 'Unable to explain the document right now.';
      showNotification(errorMsg, 'error', 5000);
    } finally {
      dispatch({ type: 'SET_SENDING', payload: false });
    }
  }, [state.activeDocument, state.activeConversation, showNotification, parseAiResponse]);

  const requestRewrite = useCallback(async (text = "") => {
    if (!state.activeDocument) return;
    dispatch({ type: 'SET_SENDING', payload: true });

    try {
      const data = await api.rewriteText(
        state.activeDocument.doc_id,
        state.activeConversation?.conversation_id,
        text
      );
      
      const { content, suggestions } = parseAiResponse(data.rewritten || "", data);

      const aiMsg = {
        id: 'rewrite-' + Date.now(),
        role: 'assistant',
        content,
        sources: [],
        suggestions,
        timestamp: new Date().toISOString(),
      };
      dispatch({ type: 'ADD_MESSAGE', payload: aiMsg });
    } catch (err) {
      dispatch({ type: 'SET_ERROR', payload: 'Rewriting failed.' });
    } finally {
      dispatch({ type: 'SET_SENDING', payload: false });
    }
  }, [state.activeDocument, state.activeConversation, parseAiResponse]);

  const requestQuiz = useCallback(async () => {
    if (!state.activeDocument) return;
    dispatch({ type: 'SET_QUIZ_LOADING', payload: true });
    dispatch({ type: 'CLEAR_ERROR' });
    
    try {
      const data = await api.getQuiz(state.activeDocument.doc_id, 5);
      dispatch({ type: 'SET_QUIZ', payload: data.quiz });
    } catch (err) {
      console.error("Quiz generation failed:", err);
      const errorMsg = 'Sorry, I couldn\'t generate the quiz right now. Please try again.';
      showNotification(errorMsg, 'error');
      
      const errMsg = {
        id: 'quiz-error-' + Date.now(),
        role: 'assistant',
        content: `⚠️ ${errorMsg}`,
        sources: [],
        timestamp: new Date().toISOString(),
      };
      dispatch({ type: 'ADD_MESSAGE', payload: errMsg });
    } finally {
      dispatch({ type: 'SET_QUIZ_LOADING', payload: false });
    }
  }, [state.activeDocument, showNotification]);

  const requestFlashcards = useCallback(async () => {
    if (!state.activeDocument) return;
    dispatch({ type: 'SET_LOADING', payload: true });
    try {
      const data = await api.getFlashcards(state.activeDocument.doc_id);
      dispatch({ type: 'SET_FLASHCARDS', payload: data.flashcards });
    } catch (err) {
      dispatch({ type: 'SET_ERROR', payload: 'Flashcard generation failed.' });
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  }, [state.activeDocument]);

  const removeConversation = useCallback(async (convId) => {
    try {
      await api.deleteConversation(convId);
      dispatch({ type: 'REMOVE_CONVERSATION', payload: convId });
      if (state.activeConversation?.conversation_id === convId) {
        // Find another conversation to load or set to null
        const other = state.conversations.find(c => c.conversation_id !== convId);
        if (other) {
          loadConversation(other);
        } else {
          dispatch({ type: 'SET_ACTIVE_CONVERSATION', payload: null });
          dispatch({ type: 'SET_MESSAGES', payload: [] });
          dispatch({ type: 'SET_ACTIVE_DOCUMENT', payload: null });
          dispatch({ type: 'SET_PDF_URL', payload: null });
        }
      }
      showNotification('Conversation deleted', 'success');
    } catch (err) {
      dispatch({ type: 'SET_ERROR', payload: 'Failed to delete conversation.' });
    }
  }, [state.activeConversation, state.conversations, loadConversation]);

  const renameConversation = useCallback(async (convId, newTitle) => {
    try {
      await api.updateConversationTitle(convId, newTitle);
      dispatch({
        type: 'SET_CONVERSATIONS',
        payload: state.conversations.map(c => 
          c.conversation_id === convId ? { ...c, title: newTitle } : c
        )
      });
      if (state.activeConversation?.conversation_id === convId) {
        dispatch({
          type: 'SET_ACTIVE_CONVERSATION',
          payload: { ...state.activeConversation, title: newTitle }
        });
      }
    } catch (err) {
      dispatch({ type: 'SET_ERROR', payload: 'Failed to rename conversation.' });
    }
  }, [state.conversations, state.activeConversation]);

  const togglePinConversation = useCallback(async (convId) => {
    try {
      const data = await api.togglePin(convId);
      dispatch({
        type: 'SET_CONVERSATIONS',
        payload: state.conversations.map(c => 
          c.conversation_id === convId ? { ...c, pinned: data.pinned } : c
        ).sort((a, b) => (b.pinned - a.pinned) || new Date(b.created_at) - new Date(a.created_at))
      });
    } catch (err) {
      dispatch({ type: 'SET_ERROR', payload: 'Failed to toggle pin.' });
    }
  }, [state.conversations]);

  const fetchHistory = useCallback(async () => {
    try {
      const data = await api.getHistory();
      dispatch({ type: 'SET_CONVERSATIONS', payload: data.conversations || [] });
    } catch (err) {
      // Silent fail for history
    }
  }, []);

  const newAnalysis = useCallback(() => {
    localStorage.removeItem('lastActiveConversationId');
    dispatch({ type: 'SET_ACTIVE_DOCUMENT', payload: null });
    dispatch({ type: 'SET_PDF_URL', payload: null });
    dispatch({ type: 'SET_ACTIVE_CONVERSATION', payload: null });
    dispatch({ type: 'SET_MESSAGES', payload: [] });
  }, []);

  const goHome = useCallback(() => {
    localStorage.removeItem('lastActiveConversationId');
    dispatch({ type: 'SET_WORKSPACE_ACTIVE', payload: false });
    dispatch({ type: 'SET_ACTIVE_DOCUMENT', payload: null });
    dispatch({ type: 'SET_PDF_URL', payload: null });
    dispatch({ type: 'SET_ACTIVE_CONVERSATION', payload: null });
    dispatch({ type: 'SET_MESSAGES', payload: [] });
  }, []);

  const value = React.useMemo(() => ({
    state,
    dispatch,
    uploadDocument,
    sendChatMessage,
    requestSummary,
    requestAdvancedTool,
    requestExplain,
    requestRewrite,
    requestQuiz,
    requestFlashcards,
    loadConversation,
    removeConversation,
    renameConversation,
    togglePinConversation,
    fetchHistory,
    startMultiPDFChat: async (navigate) => {
      if (state.selectedConvIds.length < 2) return;
      dispatch({ type: 'SET_LOADING', payload: true });
      dispatch({ type: 'CLEAR_ERROR' });
      try {
        const title = `Multi-PDF Session (${state.selectedConvIds.length} docs)`;
        const data = await api.createConversation(state.selectedConvIds, title);
        
        // Deselect all
        dispatch({ type: 'SET_SELECTED_CONV_IDS', payload: [] });
        dispatch({ type: 'TOGGLE_SELECTION_MODE', payload: false });
        
        // Force refresh history to show new conversation
        await fetchHistory();
        
        // Navigate and load
        navigate(`/chat/${data.conversation_id}`);
      } catch (err) {
        dispatch({ type: 'SET_ERROR', payload: 'Failed to start multi-PDF chat.' });
        showNotification('Failed to create multi-PDF session.', 'error');
      } finally {
        dispatch({ type: 'SET_LOADING', payload: false });
      }
    },
    newAnalysis,
    goHome,
    showNotification,
    clearAllHistory: async () => {
      try {
        await api.clearAllHistory();
        dispatch({ type: 'CLEAR_ALL_HISTORY' });
        showNotification('All history and files cleared.', 'success');
      } catch (err) {
        dispatch({ type: 'SET_ERROR', payload: 'Failed to clear history.' });
      }
    },
    openUtilityTool: async (toolName) => {
      if (!state.activeDocument) return;
      
      // Open panel immediately
      dispatch({ 
        type: 'SET_UTILITY_PANEL', 
        payload: { isOpen: true, activeTool: toolName, isLoading: true, data: null } 
      });

      try {
        const data = await api.runAdvancedTool(
          state.activeDocument.doc_id,
          toolName,
          state.activeConversation?.conversation_id
        );
        
        dispatch({ 
          type: 'SET_UTILITY_PANEL', 
          payload: { data: data.result, isLoading: false } 
        });
      } catch (err) {
        dispatch({ 
          type: 'SET_UTILITY_PANEL', 
          payload: { isLoading: false } 
        });
      }
    },
    closeUtilityPanel: () => {
      dispatch({ type: 'SET_UTILITY_PANEL', payload: { isOpen: false } });
    },
    generateStudyToolkit: async () => {
      if (!state.activeDocument) return;
      
      dispatch({ 
        type: 'SET_STUDY_TOOLKIT', 
        payload: { isOpen: true, isLoading: true, error: null } 
      });

      try {
        const fullText = state.activeDocument.pages?.map(p => p.text).join('\n') || "";
        const data = await api.getStudyToolkit(
          state.activeConversation?.conversation_id,
          fullText
        );
        
        dispatch({ 
          type: 'SET_STUDY_TOOLKIT', 
          payload: { data, isLoading: false } 
        });
      } catch (err) {
        dispatch({ 
          type: 'SET_STUDY_TOOLKIT', 
          payload: { isLoading: false, error: 'Study insights couldn\'t load right now.' } 
        });
      }
    },
    setStudyToolkitOpen: (isOpen) => {
      dispatch({ type: 'SET_STUDY_TOOLKIT', payload: { isOpen } });
    },
    setVoiceModeOpen: (isOpen) => {
      dispatch({ type: 'SET_VOICE_MODE', payload: { isOpen } });
    },
    requestExplainSimply: async (question = "") => {
      if (!state.activeDocument) return;
      
      dispatch({ type: 'SET_SENDING', payload: true });
      dispatch({ type: 'CLEAR_ERROR' });

      // Add "Explain Simply" user indicator if it's a specific question
      if (question) {
        const userMsg = {
          id: Date.now().toString(),
          role: 'user',
          content: `💡 Explain Simply: ${question}`,
          sources: [],
          timestamp: new Date().toISOString(),
        };
        dispatch({ type: 'ADD_MESSAGE', payload: userMsg });
      }

      try {
        const data = await api.explainSimply(
          state.activeConversation?.conversation_id,
          state.activeDocument.doc_id,
          question
        );

        const rawContent = data.result || "";
        const suggestionMatch = rawContent.match(/SUGGESTIONS:(.*)/s);
        const suggestions = suggestionMatch 
          ? suggestionMatch[1].split('|').map(s => s.replace(/[\[\]]/g, '').trim()).filter(Boolean)
          : [];

        const aiMsg = {
          id: Date.now().toString(),
          role: 'assistant',
          content: rawContent.replace(/SUGGESTIONS:.*$/s, '').trim(),
          sources: [],
          suggestions: suggestions,
          timestamp: new Date().toISOString(),
        };
        
        dispatch({ type: 'ADD_MESSAGE', payload: aiMsg });
      } catch (err) {
        dispatch({ type: 'SET_ERROR', payload: 'Failed to explain simply.' });
      } finally {
        dispatch({ type: 'SET_SENDING', payload: false });
      }
    }
  }), [state, uploadDocument, sendChatMessage, requestSummary, requestAdvancedTool, requestExplain, requestRewrite, requestQuiz, requestFlashcards, loadConversation, removeConversation, renameConversation, togglePinConversation, fetchHistory, newAnalysis, goHome, showNotification]);

  return (
    <AppContext.Provider value={value}>
      {children}
    </AppContext.Provider>
  );
}

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) throw new Error('useApp must be used within an AppProvider');
  return context;
};
