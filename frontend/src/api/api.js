import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'https://askmypdf-ai-2c63.onrender.com';

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Accept': 'application/json',
  },
});

export const getPDFUrl = (filename) => {
  if (!filename) return null;
  // Ensure we don't double up slashes
  const base = API_URL.endsWith('/') ? API_URL.slice(0, -1) : API_URL;
  return `${base}/uploads/${filename}`;
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
