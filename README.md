# Multi-PDF Intelligence Workspace 🚀

A premium, high-fidelity AI-powered document intelligence system designed for researchers, students, and professionals. Chat with multiple PDFs simultaneously, generate summaries, and unlock deep insights with a buttery-smooth, interactive interface.

![Project Banner](https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?q=80&w=2564&auto=format&fit=crop)

## ✨ Core Features

*   **Multi-PDF Intelligence**: Select and chat with multiple documents at once. Compare insights across your entire library.
*   **Deep Analysis**: Instantly generate summaries, simplify complex concepts, and extract key takeaways.
*   **PDF Answer Highlighting**: The AI doesn't just answer; it shows you exactly where the information came from with real-time highlighting.
*   **Study Toolkit**: Automated quiz generation, flashcards, and study guides tailored to your documents.
*   **Voice Mode**: Hands-free interaction with high-fidelity speech recognition and animated feedback.
*   **Premium Aesthetics**: Ultra-smooth animations, ambient particle effects, and a sophisticated Dark/Light mode system.
*   **Secure & Fast**: Local-first document processing with secure backend AI integration.

## 🛠️ Tech Stack

*   **Frontend**: React (Vite), Tailwind CSS, Framer Motion, Lucide Icons, Axios.
*   **Backend**: Flask, Flask-CORS, Google Gemini Pro API.
*   **PDF Engine**: PyPDF2, custom extraction & chunking logic.
*   **Styling**: Vanilla CSS + Tailwind for a bespoke, premium look.

## 🚀 Quick Start

### 1. Clone the Repository
```bash
git clone https://github.com/yourusername/mypdf-intelligence.git
cd mypdf-intelligence
```

### 2. Backend Setup
```bash
cd backend
python -m venv venv
source venv/bin/activate # On Windows use `venv\Scripts\activate`
pip install -r requirements.txt
```
Create a `.env` file in the `backend/` directory:
```env
GEMINI_API_KEY_PRIMARY=your_key_here
GEMINI_API_KEY_SECONDARY=optional_backup_key
PORT=5001
ALLOWED_ORIGINS=http://localhost:5173,https://your-deployed-frontend.vercel.app
```

### 3. Frontend Setup
```bash
cd ../frontend
npm install
```
Create a `.env` file in the `frontend/` directory:
```env
VITE_API_URL=http://localhost:5001
```

### 4. Run Locally
**Start Backend:**
```bash
cd backend
python app.py
```
**Start Frontend:**
```bash
cd frontend
npm run dev
```

## 🌐 Deployment

### Backend (Heroku/Render/Railway)
1. Set the environment variables in your provider's dashboard.
2. Use the `gunicorn` entry point: `gunicorn --chdir backend app:app`.

### Frontend (Vercel/Netlify)
1. Build the project: `npm run build`.
2. Deploy the `dist/` folder.
3. Set `VITE_API_URL` to your deployed backend URL.

## 🧹 Maintenance & Security
*   **Auto-Cleanup**: The system automatically purges uploaded files and metadata older than 24 hours to ensure privacy and storage efficiency.
*   **Security**: No API keys are exposed to the frontend. All AI logic is handled securely via the Flask backend.

## 📜 License
MIT License - Feel free to use this for your own hackathons and projects!
