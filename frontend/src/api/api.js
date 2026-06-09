import axios from 'axios';
import { supabase } from '../lib/supabase';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5001';

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Accept': 'application/json',
  },
});

api.interceptors.request.use(async (config) => {
  const { data: { session } } = await supabase.auth.getSession();
  if (session?.access_token) {
    config.headers.Authorization = `Bearer ${session.access_token}`;
  }
  return config;
});

export const getPDFUrl = (filename) => {
  if (!filename) return null;
  const base = API_URL.endsWith('/') ? API_URL.slice(0, -1) : API_URL;
  return `${base}/uploads/${encodeURIComponent(filename)}`;
};

export const getPDFUrlById = (docId) => {
  if (!docId) return null;
  const base = API_URL.endsWith('/') ? API_URL.slice(0, -1) : API_URL;
  return `${base}/api/pdf/${docId}`;
};

export const fetchPDFBlobById = async (docId) => {
  const response = await api.get(`/api/pdf/${docId}`, { 
    responseType: 'blob',
    // Don't throw for 403/404 so we can read the JSON error
    validateStatus: (status) => status < 500 
  });

  // Check if we got a JSON error hidden in a blob
  if (response.headers['content-type']?.includes('application/json')) {
    const text = await response.data.text();
    const errorData = JSON.parse(text);
    const error = new Error(errorData.error || 'Access Denied');
    error.response = { status: response.status, data: errorData };
    throw error;
  }

  if (response.status >= 400) {
    const error = new Error(`Server returned ${response.status}`);
    error.response = { status: response.status };
    throw error;
  }

  return URL.createObjectURL(response.data);
};

export async function uploadPDF(file) {
  const formData = new FormData();
  formData.append('file', file);
  const response = await api.post('/upload', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return response.data;
}

export async function sendMessage(docIdOrIds, conversationId, message) {
  const payload = {
    conversation_id: conversationId,
    message,
  };
  
  if (Array.isArray(docIdOrIds)) {
    payload.doc_ids = docIdOrIds;
  } else {
    payload.doc_id = docIdOrIds;
  }

  const response = await api.post('/chat', payload);
  return response.data;
}

export async function createConversation(docIds, title = null) {
  const response = await api.post('/conversation', {
    doc_ids: docIds,
    title
  });
  return response.data;
}

export async function getSummary(docId, conversationId) {
  const response = await api.post('/summary', {
    doc_id: docId,
    conversation_id: conversationId,
  });
  return response.data;
}

export async function explainText(docId, conversationId) {
  const response = await api.post('/explain', {
    doc_id: docId,
    conversation_id: conversationId,
  });
  return response.data;
}

export async function runAdvancedTool(docId, toolName, conversationId) {
  const response = await api.post('/advanced', {
    doc_id: docId,
    tool_name: toolName,
    conversation_id: conversationId,
  });
  return response.data;
}

export async function explainSimply(conversationId, docId, userQuestion = "") {
  const response = await api.post('/explain-simply', {
    conversationId: conversationId,
    docId: docId,
    userQuestion: userQuestion
  });
  return response.data;
}

export async function getStudyToolkit(conversationId, pdfText = "") {
  const response = await api.post('/api/study-toolkit', {
    conversationId: conversationId,
    pdfText: pdfText
  });
  return response.data;
}

export async function rewriteText(docId, conversationId, text = "") {
  const response = await api.post('/rewrite', {
    doc_id: docId,
    conversation_id: conversationId,
    text: text
  });
  return response.data;
}

export async function getQuiz(docId, numQuestions = 5) {
  const response = await api.post('/quiz', {
    doc_id: docId,
    num_questions: numQuestions,
  });
  return response.data;
}

export async function getFlashcards(docId) {
  const response = await api.post('/flashcards', {
    doc_id: docId
  });
  return response.data;
}

export async function getHistory() {
  const response = await api.get('/history');
  return response.data;
}

export async function getConversation(conversationId) {
  const response = await api.get(`/history/${conversationId}`);
  return response.data;
}

export async function deleteConversation(conversationId) {
  const response = await api.delete(`/history/${conversationId}`);
  return response.data;
}

export async function updateConversationTitle(conversationId, title) {
  const response = await api.put(`/history/${conversationId}/title`, { title });
  return response.data;
}

export async function togglePin(conversationId) {
  const response = await api.post(`/history/${conversationId}/pin`);
  return response.data;
}

export async function clearAllHistory() {
  const response = await api.delete('/history/clear');
  return response.data;
}

export default api;
