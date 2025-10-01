import { motion } from "framer-motion";
import { useState } from "react";
import { FileText, HelpCircle, Lightbulb, Brain } from "lucide-react";
import { useNavigate } from "react-router-dom";

const QA = () => {
  const [uploadedFile, setUploadedFile] = useState(null);
  const [dragActive, setDragActive] = useState(false);
  const [questionText, setQuestionText] = useState("");
  const [answer, setAnswer] = useState(null);

  const navigate = useNavigate();

  const handleFile = (file) => {
    setUploadedFile(file);
    console.log("File uploaded:", file);
    setAnswer("✅ Your answer will be displayed here once processed.");
  };

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFile(e.dataTransfer.files[0]);
    }
  };

  const handleChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      handleFile(e.target.files[0]);
    }
  };

  const handleTextSubmit = () => {
    if (questionText.trim()) {
      console.log("Text submitted:", questionText);
      setAnswer("💡 AI-generated answer based on your text will appear here.");
    }
  };

  return (
    <div className="bg-gray-50 min-h-screen text-gray-900 px-8 py-12">
      {/* QA Output */}
      {answer && (
        <motion.div
          className="bg-white text-black rounded-xl p-6 shadow-lg mb-8 border border-gray-200"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          <h2 className="text-2xl font-bold mb-4">Answer</h2>
          <p className="text-gray-700">{answer}</p>

          {/* Navigation buttons */}
          <div className="mt-6 flex gap-4">
            <button
              onClick={() => navigate("/mindmap")}
              className="px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition"
            >
              Mindmap
            </button>
            <button
              onClick={() => navigate("/flashcards")}
              className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition"
            >
              Flashcards
            </button>
            <button
              onClick={() => navigate("/summarize")}
              className="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition"
            >
              Summarize
            </button>
          </div>
        </motion.div>
      )}

      {/* Upload & Text Input */}
      <motion.div
        className="flex flex-col md:flex-row items-center gap-12 mb-12"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.8 }}
      >
        {/* Left - Info */}
        <div className="flex-1">
          <HelpCircle size={64} className="text-orange-500 mb-4" />
          <h2 className="text-4xl font-bold text-orange-500 mb-4">
            AI-Powered Q&A
          </h2>
          <p className="text-lg text-gray-700 leading-relaxed">
            Upload your documents or type your questions directly to get instant, accurate answers powered by{" "}
            <span className="font-semibold">Study Spark AI</span>.
          </p>
        </div>

        {/* Right - Upload */}
        <motion.div
          className={`flex-1 rounded-2xl p-6 shadow-lg border-2 border-dashed ${
            dragActive ? "border-orange-500 bg-orange-50" : "border-gray-300 bg-white"
          } relative`}
          onDragEnter={handleDrag}
          onDragOver={handleDrag}
          onDragLeave={handleDrag}
          onDrop={handleDrop}
          initial={{ x: 50, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          transition={{ duration: 0.8 }}
        >
          <input
            type="file"
            id="fileUpload"
            className="hidden"
            onChange={handleChange}
          />
          <label
            htmlFor="fileUpload"
            className="flex flex-col items-center justify-center h-40 cursor-pointer text-gray-500"
          >
            {uploadedFile ? (
              <>
                <p className="text-gray-800 font-medium">{uploadedFile.name}</p>
                <p className="text-sm text-gray-500">File ready to process</p>
              </>
            ) : (
              <>
                <p className="text-lg">Choose a file or drag it here</p>
                <span className="text-xs text-gray-400">
                  Supported: pdf, doc, docx, pptx, txt
                </span>
              </>
            )}
          </label>

          {/* OR text input */}
          <div className="mt-4 flex gap-2">
            <input
              type="text"
              placeholder="Type your question here..."
              value={questionText}
              onChange={(e) => setQuestionText(e.target.value)}
              className="flex-1 border rounded-lg px-3 py-2"
            />
            <button
              onClick={handleTextSubmit}
              className="px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition"
            >
              Ask
            </button>
          </div>
        </motion.div>
      </motion.div>

      {/* Features Section */}
      <div className="grid md:grid-cols-3 gap-8">
        {[
          {
            icon: <FileText size={40} className="text-blue-500" />,
            title: "Multiple Formats",
            desc: "Supports PDFs, Word docs, PPTs, and text input for flexible question answering."
          },
          {
            icon: <Lightbulb size={40} className="text-yellow-500" />,
            title: "Instant Answers",
            desc: "Get quick, AI-generated answers to save time and improve productivity."
          },
          {
            icon: <Brain size={40} className="text-purple-500" />,
            title: "Smart Understanding",
            desc: "Understands context from the document to provide accurate, relevant answers."
          }
        ].map((feature, idx) => (
          <motion.div
            key={idx}
            className="bg-white p-6 rounded-xl shadow-lg border hover:shadow-xl transition"
            whileHover={{ scale: 1.05 }}
          >
            {feature.icon}
            <h3 className="text-xl font-semibold mt-4">{feature.title}</h3>
            <p className="text-gray-600 mt-2">{feature.desc}</p>
          </motion.div>
        ))}
      </div>
    </div>
  );
};

export default QA;
