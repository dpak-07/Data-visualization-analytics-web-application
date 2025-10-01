import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { FaMagic, FaFileUpload } from 'react-icons/fa';
import { useNavigate } from 'react-router-dom';
import Navbar from '../components/Navbar'; // ✅ Make sure the path is correct

const Summarize = () => {
  const [inputText, setInputText] = useState('');
  const [summary, setSummary] = useState('');
  const [isFocused, setIsFocused] = useState(false);
  const navigate = useNavigate();

  const handleSummarize = () => {
    if (!inputText.trim()) {
      setSummary('Please enter or upload content to summarize.');
      return;
    }

    const words = inputText.split(' ');
    const summaryText =
      words.slice(0, Math.min(20, words.length)).join(' ') +
      (words.length > 20 ? '...' : '');
    setSummary(summaryText);
  };

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const allowedTypes = [
      'text/plain',
      'application/pdf',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'audio/mpeg'
    ];

    if (!allowedTypes.includes(file.type)) {
      alert('Only .txt, .pdf, .docx, .mp3 files are allowed!');
      return;
    }

    setInputText(`Uploaded file: ${file.name}`);
  };

  return (
    <>
      {/* ✅ Fixed Navbar */}
      <div className="fixed top-0 left-0 w-full z-50">
        <Navbar />
      </div>

      {/* ✅ Add padding to prevent content overlap */}
      <div className="min-h-screen bg-gradient-to-br from-sky-50 to-indigo-100 p-6 md:p-12 pt-40">
        <motion.div
          className="max-w-4xl mx-auto bg-white shadow-2xl rounded-2xl p-6 md:p-10"
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          <h1 className="text-3xl md:text-4xl font-bold text-indigo-700 mb-6 flex items-center gap-2">
            <FaMagic /> Smart Summarizer
          </h1>

          <motion.textarea
            className={`w-full transition-all duration-300 p-4 text-lg border border-indigo-300 rounded-md resize-none focus:outline-none focus:ring-2 focus:ring-indigo-400 ${
              isFocused ? 'h-48' : 'h-12'
            }`}
            placeholder="Paste your paragraph or notes here..."
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            onFocus={() => setIsFocused(true)}
          />

          <div className="flex items-center gap-4 mt-4">
            <button
              className="px-6 py-2 text-white bg-indigo-600 hover:bg-indigo-700 rounded-md transition"
              onClick={handleSummarize}
            >
              Summarize
            </button>

            <label className="flex items-center gap-2 cursor-pointer text-indigo-600 hover:underline">
              <FaFileUpload />
              <span>Upload File</span>
              <input
                type="file"
                className="hidden"
                onChange={handleFileUpload}
                accept=".txt,.pdf,.docx,.mp3"
              />
            </label>
          </div>

          {summary && (
            <motion.div
              className="mt-6 bg-indigo-50 border border-indigo-300 p-4 rounded-md"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
            >
              <h2 className="text-xl font-semibold text-indigo-700 mb-2">Summary:</h2>
              <p className="text-gray-800">{summary}</p>

              <div className="mt-4 flex flex-wrap gap-4">
                <button
                  className="px-4 py-2 bg-purple-600 text-white rounded hover:bg-purple-700"
                  onClick={() => navigate('/mindmap')}
                >
                  Mindmap
                </button>
                <button
                  className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
                  onClick={() => navigate('/flashcard')}
                >
                  Flashcard
                </button>
                <button
                  className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                  onClick={() => navigate('/qa')}
                >
                  QA
                </button>
              </div>
            </motion.div>
          )}
        </motion.div>

        <motion.div
          className="max-w-6xl mx-auto mt-12 bg-white shadow-xl rounded-2xl p-6 md:p-10"
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          viewport={{ once: true }}
        >
          <h2 className="text-2xl font-bold text-indigo-700 mb-8 text-center">
            How to Use Smart Summarizer
          </h2>

          <div className="flex flex-col md:flex-row gap-6 justify-center items-center">
            {[
              "Paste or upload your academic notes or documents (.txt, .pdf, .docx, .mp3).",
              "Click on the 'Summarize' button to generate an AI-based summary.",
              "Access extra tools like Mindmap, Flashcard, and QA instantly from your result."
            ].map((step, index) => (
              <motion.div
                key={index}
                className="flex flex-col items-center bg-indigo-50 p-6 rounded-xl shadow-md border-t-4 border-indigo-500 w-full md:w-1/3 text-center"
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: index * 0.2 }}
                viewport={{ once: true }}
              >
                <div className="text-3xl font-bold text-indigo-700 mb-2">{index + 1}</div>
                <p className="text-gray-700 text-base">{step}</p>
              </motion.div>
            ))}
          </div>
        </motion.div>
      </div>
    </>
  );
};

export default Summarize;
