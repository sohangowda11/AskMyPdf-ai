import React, { createContext, useContext, useReducer, useCallback, useEffect } from 'react';
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
      return { ...state, error: String(errMsg) };
    case 'CLEAR_ERROR':
      return { ...state, error: null };
    case 'SET_CONVERSATIONS':
      return { ...state, conversations: action.payload };
    case 'ADD_CONVERSATION':
      return { ...state, conversations: [action.payload, ...state.conversations] };
    case 'SET_ACTIVE_CONVERSATION':
      return { ...state, activeConversation: action.payload };
    case 'SET_ACTIVE_DOCUMENT':
      return { ...state, activeDocument: action.payload };
    case 'SET_PDF_URL':
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
    const msg = typeof message === 'string' ? message : (message?.error || message?.message || JSON.stringify(message));
    dispatch({ type: 'SET_NOTIFICATION', payload: { message: String(msg), type } });
    setTimeout(() => dispatch({ type: 'CLEAR_NOTIFICATION' }), duration);
  }, []);

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

      const pdfUrl = api.getPDFUrl(data.filename);
      console.log(">>> GENERATED PDF URL:", pdfUrl);

      dispatch({ type: 'SET_ACTIVE_DOCUMENT', payload: docInfo });
      dispatch({ type: 'SET_PDF_URL', payload: pdfUrl });
      dispatch({ type: 'SET_ACTIVE_CONVERSATION', payload: convInfo });
      dispatch({ type: 'ADD_CONVERSATION', payload: convInfo });
      dispatch({ type: 'SET_MESSAGES', payload: [] });
      dispatch({ type: 'SET_WORKSPACE_ACTIVE', payload: true });

      console.log(">>> STATE DISPATCHED. Active Doc:", docInfo.filename);

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
      
      if (err.response && err.response.data) {
        errorMsg = err.response.data.error || `Server Error (${err.response.status})`;
      } else if (err.request) {
        errorMsg = 'Server is unreachable. Please check your connection.';
      } else if (err.message) {
        errorMsg = err.message;
      }
      
      dispatch({ type: 'SET_ERROR', payload: errorMsg });
      showNotification(errorMsg, 'error');
      throw err;
    } finally {
      dispatch({ type: 'SET_UPLOADING', payload: false });
    }
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
      // Pass list of doc_ids for multi-PDF support
      const docIds = state.isMultiPDFMode 
        ? state.activeDocuments.map(d => d.doc_id)
        : [state.activeDocument.doc_id];

      const data = await api.sendMessage(
        docIds,
        state.activeConversation.conversation_id,
        message
      );
      
      const rawContent = data.answer || "";
      const suggestionMatch = rawContent.match(/SUGGESTIONS:(.*)/s);
      const suggestions = suggestionMatch 
        ? suggestionMatch[1].split('|').map(s => s.replace(/[\[\]]/g, '').trim()).filter(Boolean)
        : data.suggestions || [];

      const aiMsg = {
        id: data.message_id,
        role: 'assistant',
        content: rawContent.replace(/SUGGESTIONS:.*$/s, '').trim(),
        sources: data.sources || [],
        suggestions: suggestions,
        timestamp: data.timestamp,
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
  }, [state.activeDocument, state.activeDocuments, state.activeConversation, state.isMultiPDFMode]);

  const requestSummary = useCallback(async () => {
    console.log(">>> requestSummary triggered");
    if (!state.activeDocument) {
      console.warn("No active document found for summary");
      showNotification('Please upload a PDF first.', 'error');
      return;
    }
    
    dispatch({ type: 'SET_SENDING', payload: true });
    dispatch({ type: 'CLEAR_ERROR' });

    try {
      console.log("Calling api.getSummary with doc_id:", state.activeDocument.doc_id);
      const data = await api.getSummary(
        state.activeDocument.doc_id,
        state.activeConversation?.conversation_id
      );
      
      console.log("Summary response received:", data);
      
      const aiMsg = {
        id: data.message_id || Date.now().toString(),
        role: 'assistant',
        content: data.summary,
        sources: [],
        suggestions: data.suggestions || [],
        timestamp: new Date().toISOString(),
      };
      
      dispatch({ type: 'ADD_MESSAGE', payload: aiMsg });
    } catch (err) {
      console.error(">>> requestSummary Error:", err);
      const errorMsg = err.response?.data?.error || 'Failed to generate summary.';
      dispatch({ type: 'SET_ERROR', payload: errorMsg });
      showNotification(errorMsg, 'error');
    } finally {
      dispatch({ type: 'SET_SENDING', payload: false });
    }
  }, [state.activeDocument, state.activeConversation, showNotification]);

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

      const aiMsg = {
        id: Date.now().toString(),
        role: 'assistant',
        content: data.result,
        sources: [],
        suggestions: [],
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
  }, [state.activeDocument, state.activeConversation, showNotification]);

  const requestExplain = useCallback(async () => {
    console.log(">>> REQUEST: Explain PDF (Full Document)");
    
    if (!state.activeDocument) {
      console.warn("No active document found for Explain");
      showNotification('Please upload a PDF first.', 'error');
      return;
    }

    dispatch({ type: 'SET_SENDING', payload: true });
    dispatch({ type: 'CLEAR_ERROR' });

    try {
      console.log("Calling API /explain with doc_id:", state.activeDocument.doc_id);
      const data = await api.explainText(
        state.activeDocument.doc_id,
        state.activeConversation?.conversation_id
      );
      
      console.log("API /explain SUCCESS:", data);

      if (data.success && data.response) {
        const aiMsg = {
          id: 'explain-' + Date.now(),
          role: 'assistant',
          content: data.response,
          sources: [],
          timestamp: new Date().toISOString(),
        };
        dispatch({ type: 'ADD_MESSAGE', payload: aiMsg });
      } else {
        throw new Error(data.error || "Malformed API response: 'response' field missing");
      }
    } catch (err) {
      console.error("Summary failed:", err);
      let errorMsg = err.response?.data?.error || 'Unable to summarize the document right now.';
      if (err.response?.status === 404) {
        errorMsg = "Session expired or backend restarted. Please re-upload your PDF to continue.";
      }
      showNotification(errorMsg, 'error', 5000);
    } finally {
      dispatch({ type: 'SET_SENDING', payload: false });
    }
  }, [state.activeDocument, state.activeConversation]);

  const requestRewrite = useCallback(async (text = "") => {
    if (!state.activeDocument) return;
    dispatch({ type: 'SET_SENDING', payload: true });

    const userMsg = {
      id: Date.now().toString(),
      role: 'user',
      content: '✍️ Rewrite this document',
      sources: [],
      timestamp: new Date().toISOString(),
    };
    dispatch({ type: 'ADD_MESSAGE', payload: userMsg });

    try {
      const data = await api.rewriteText(
        state.activeDocument.doc_id,
        state.activeConversation?.conversation_id,
        text
      );
      const aiMsg = {
        id: 'rewrite-' + Date.now(),
        role: 'assistant',
        content: data.rewritten,
        sources: [],
        timestamp: new Date().toISOString(),
      };
      dispatch({ type: 'ADD_MESSAGE', payload: aiMsg });
    } catch (err) {
      dispatch({ type: 'SET_ERROR', payload: 'Rewriting failed.' });
    } finally {
      dispatch({ type: 'SET_SENDING', payload: false });
    }
  }, [state.activeDocument, state.activeConversation]);

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

  const loadConversation = useCallback(async (conv) => {
    dispatch({ type: 'SET_ACTIVE_CONVERSATION', payload: conv });
    dispatch({ type: 'SET_WORKSPACE_ACTIVE', payload: true });
    dispatch({ type: 'SET_LOADING', payload: true });
    try {
      const data = await api.getConversation(conv.conversation_id);
      dispatch({ type: 'SET_MESSAGES', payload: data.messages || [] });
      
      // Load existing study toolkit if available
      if (data.study_toolkit) {
        dispatch({ 
          type: 'SET_STUDY_TOOLKIT', 
          payload: { data: data.study_toolkit, isLoading: false, isOpen: false } 
        });
      } else {
        dispatch({ 
          type: 'SET_STUDY_TOOLKIT', 
          payload: { data: null, isLoading: false, isOpen: false } 
        });
      }

      if (data.doc_ids && data.doc_ids.length > 1) {
        const activeDocs = data.doc_ids.map((id, idx) => ({
          doc_id: id,
          filename: data.filenames ? data.filenames[idx] : 'Document'
        }));
        dispatch({ type: 'SET_ACTIVE_DOCUMENTS', payload: activeDocs });
        dispatch({ type: 'SET_ACTIVE_DOCUMENT', payload: activeDocs[0] });
        dispatch({ type: 'SET_PDF_URL', payload: api.getPDFUrl(activeDocs[0].filename) });
      } else if (data.doc_id && data.filename) {
        dispatch({
          type: 'SET_ACTIVE_DOCUMENT',
          payload: { doc_id: data.doc_id, filename: data.filename, page_count: 0 },
        });
        dispatch({ type: 'SET_ACTIVE_DOCUMENTS', payload: [] });
        dispatch({ type: 'SET_PDF_URL', payload: api.getPDFUrl(data.filename) });
      }
    } catch (err) {
      dispatch({ type: 'SET_ERROR', payload: 'Failed to load conversation.' });
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  }, []);

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
    dispatch({ type: 'SET_ACTIVE_DOCUMENT', payload: null });
    dispatch({ type: 'SET_PDF_URL', payload: null });
    dispatch({ type: 'SET_ACTIVE_CONVERSATION', payload: null });
    dispatch({ type: 'SET_MESSAGES', payload: [] });
  }, []);

  const goHome = useCallback(() => {
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
        const errorMsg = err.response?.data?.error || 'Failed to simplify content.';
        dispatch({ type: 'SET_ERROR', payload: errorMsg });
        showNotification(errorMsg, 'error');
      } finally {
        dispatch({ type: 'SET_SENDING', payload: false });
      }
    },
    startMultiPDFChat: async (navigate) => {
      if (state.selectedConvIds.length < 2) {
        dispatch({ type: 'SET_ERROR', payload: "Select at least 2 PDFs to start multi-document chat." });
        return;
      }
      
      dispatch({ type: 'SET_LOADING', payload: true });
      dispatch({ type: 'SET_LOADING_MESSAGE', payload: 'Preparing Multi-PDF Intelligence...' });
      
      try {
        const selectedConvs = state.conversations.filter(c => state.selectedConvIds.includes(c.conversation_id));
        
        // Extract all unique doc_ids from selected conversations
        const docIds = [...new Set(selectedConvs.flatMap(c => c.doc_ids || []))];
        
        if (docIds.length < 2) {
          throw new Error("Selection contains less than 2 unique PDF documents.");
        }

        const data = await api.createConversation(docIds);
        dispatch({ type: 'SET_LOADING_MESSAGE', payload: 'Combining document context...' });
        
        // Load all documents from store to get filenames
        const allDocs = await Promise.all(docIds.map(id => api.getConversation(id).catch(() => null)));
        
        const activeDocs = selectedConvs.flatMap(c => {
           if (!c.doc_ids) return [];
           return c.doc_ids.map((id, idx) => ({
             doc_id: id,
             filename: c.filenames ? c.filenames[idx] : 'Document.pdf'
           }));
        });
        
        // Deduplicate activeDocs by doc_id
        const uniqueActiveDocs = Array.from(new Map(activeDocs.map(d => [d.doc_id, d])).values());

        dispatch({ type: 'SET_ACTIVE_DOCUMENTS', payload: uniqueActiveDocs });
        dispatch({ type: 'SET_ACTIVE_DOCUMENT', payload: uniqueActiveDocs[0] });
        dispatch({ type: 'SET_PDF_URL', payload: api.getPDFUrl(uniqueActiveDocs[0].filename) });
        
        const convInfo = {
          conversation_id: data.conversation_id,
          doc_ids: docIds,
          title: `Multi-PDF Workspace (${docIds.length} PDFs)`,
          created_at: new Date().toISOString()
        };
        
        dispatch({ type: 'SET_ACTIVE_CONVERSATION', payload: convInfo });
        dispatch({ type: 'ADD_CONVERSATION', payload: convInfo });
        dispatch({ type: 'SET_WORKSPACE_ACTIVE', payload: true });
        dispatch({ type: 'SET_MULTI_PDF_MODE', payload: true });
        dispatch({ type: 'CLEAR_DOC_SELECTION' });
        dispatch({ type: 'TOGGLE_SELECTION_MODE' });

        const welcomeMsg = {
          id: 'welcome-multi-' + Date.now(),
          role: 'assistant',
          content: `Multi-document workspace ready. 🟢\n\nI can now:\n• compare PDFs\n• find common topics\n• summarize across documents\n• answer using combined context\n\nAsk me anything about the selected documents.`,
          timestamp: new Date().toISOString(),
          isOld: true
        };
        
        dispatch({ type: 'SET_MESSAGES', payload: [welcomeMsg] });
        
        if (navigate) {
          navigate(`/chat/${data.conversation_id}`);
        }
        
      } catch (err) {
        dispatch({ type: 'SET_ERROR', payload: err.message || 'Failed to start multi-PDF chat.' });
      } finally {
        dispatch({ type: 'SET_LOADING', payload: false });
        dispatch({ type: 'SET_LOADING_MESSAGE', payload: '' });
      }
    }
  }), [state, dispatch, uploadDocument, sendChatMessage, requestSummary, requestAdvancedTool, requestExplain, requestRewrite, requestQuiz, requestFlashcards, loadConversation, removeConversation, renameConversation, togglePinConversation, fetchHistory, newAnalysis, goHome]);

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export const useApp = () => useContext(AppContext);
