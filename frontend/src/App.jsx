import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';

import './App.css';
import Navbar from './components/navbar';
import Auth from './components/auth';
import UploadPage from './components/converter';
import ChatbotPage from './components/chatbot';
import HistoryChatbot from './components/history_chatbot';
import Landing from './components/landing';
import MindMap from './components/mindmap';
import Flashcard from './components/flashcard';
import Summarize from './components/summarize';
import QA from './components/qa';


function App() {
  
  return (
    <Router>
      <div>
        <Navbar />
        <Routes>
          <Route path="/" element={<Landing/>} />
          <Route path="/summarize" element={<Summarize />} />
          <Route path="/flashcard" element={<Flashcard />} />
          <Route path="/mindmap" element={<MindMap />} />
          <Route path="/qa" element={<QA/>} />
          <Route path="/chatbot" element={<ChatbotPage />} />
          <Route path="/auth" element={<Auth />} />
          <Route path="/historychatbot" element={<HistoryChatbot />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;
