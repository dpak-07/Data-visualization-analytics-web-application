import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';

import './App.css';

import Landing from './components/login';
import MindMap from './components/history';
import Flashcard from './components/adminportal';
import Summarize from './components/userdashboard';
function App() {
  
  return (
    <Router>
      <div>
        {/* <Navbar /> */}
        <Routes>
          <Route path="/" element={<Landing/>} />
          <Route path="/userdashboard" element={<Summarize />} />
          <Route path="/admin" element={<Flashcard />} />
          <Route path="/history" element={<MindMap />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;
