import { motion } from "framer-motion";
import { useLocation, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { FaProjectDiagram, FaBolt, FaBrain, FaLightbulb } from "react-icons/fa";

const Mindmap = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [mindmapData, setMindmapData] = useState(null);
  const [uploadedFile, setUploadedFile] = useState(null);
  const [dragActive, setDragActive] = useState(false);
  const [typedText, setTypedText] = useState("");
  const [generated, setGenerated] = useState(false);

  useEffect(() => {
    if (location.state?.mindmap) {
      setMindmapData(location.state.mindmap);
      setGenerated(true);
    }
  }, [location.state]);

  const handleFile = (file) => {
    setUploadedFile(file);
    setGenerated(true);
    console.log("File uploaded:", file);
    // Send to backend API here
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

  const handleGenerateFromText = () => {
    if (typedText.trim()) {
      setGenerated(true);
      setMindmapData(`Mindmap generated from: ${typedText}`);
      console.log("Generated from text:", typedText);
    }
  };

  return (
    <div className="bg-gray-50 min-h-screen text-gray-900 px-8 py-12 overflow-hidden">
      {/* Mindmap Display */}
      {generated && (
        <motion.div
          className="bg-white text-black rounded-xl p-6 shadow-lg mb-12 border border-gray-200"
          initial={{ opacity: 0, y: -40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
        >
          <h2 className="text-2xl font-bold mb-4 flex items-center gap-2">
            <motion.div
              animate={{ rotate: [0, 10, -10, 0] }}
              transition={{ repeat: Infinity, duration: 2 }}
            >
              <FaProjectDiagram className="text-orange-500" />
            </motion.div>
            Generated Mindmap
          </h2>
          <motion.div
            className="w-full h-96 border rounded-lg flex items-center justify-center bg-gray-100"
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.6 }}
          >
            <p className="text-lg font-medium">🗺 Your Mindmap Visualization Here</p>
          </motion.div>

          {/* Action Buttons */}
          <div className="flex gap-4 mt-6">
            {[
              { label: "Summarize", color: "bg-orange-500", hover: "hover:bg-orange-600", to: "/summarize" },
              { label: "Flashcards", color: "bg-blue-500", hover: "hover:bg-blue-600", to: "/flashcards" },
              { label: "Q&A", color: "bg-green-500", hover: "hover:bg-green-600", to: "/qa" },
            ].map((btn, i) => (
              <motion.button
                key={i}
                whileHover={{ scale: 1.08 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => navigate(btn.to, { state: { file: uploadedFile, text: typedText } })}
                className={`px-4 py-2 ${btn.color} text-white rounded-lg shadow ${btn.hover} transition-all`}
              >
                {btn.label}
              </motion.button>
            ))}
          </div>
        </motion.div>
      )}

      {/* Efficient Generation Section */}
      <motion.div
        className="flex flex-col md:flex-row items-center gap-12"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.8 }}
      >
        {/* Left Side */}
        <div className="flex-1">
          <motion.div
            className="text-orange-500 text-6xl mb-4"
            initial={{ rotate: -20, opacity: 0 }}
            animate={{ rotate: 0, opacity: 1 }}
            transition={{ duration: 0.8 }}
          >
            <FaProjectDiagram />
          </motion.div>
          <h2 className="text-4xl font-bold text-orange-500 mb-4">
            Efficient Generation
          </h2>
          <p className="text-lg text-gray-700 leading-relaxed">
            Visualize information effortlessly.{" "}
            <span className="text-gray-900 font-semibold">Study Spark AI</span> converts your files or text into mind maps in seconds.
          </p>
        </div>

        {/* Right Side - Upload & Text Input */}
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
          <input type="file" id="fileUpload" className="hidden" onChange={handleChange} />
          <label
            htmlFor="fileUpload"
            className="flex flex-col items-center justify-center h-32 cursor-pointer text-gray-500"
          >
            {uploadedFile ? (
              <>
                <p className="text-gray-800 font-medium">{uploadedFile.name}</p>
                <p className="text-sm text-gray-500">File ready to process</p>
              </>
            ) : (
              <>
                <motion.div
                  animate={{ y: [0, -5, 0] }}
                  transition={{ repeat: Infinity, duration: 1.5 }}
                >
                  📂
                </motion.div>
                <p className="text-lg">Choose a file or drag it here</p>
                <span className="text-xs text-gray-400">Supported: pdf, doc, docx, pptx</span>
              </>
            )}
          </label>

          <div className="my-4 text-center text-gray-400">OR</div>

          <textarea
            placeholder="Type or paste your text here to generate a mindmap..."
            value={typedText}
            onChange={(e) => setTypedText(e.target.value)}
            className="w-full border rounded-lg p-3 text-gray-800 focus:outline-none focus:ring-2 focus:ring-orange-400 h-32"
          ></textarea>
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className="mt-4 w-full bg-orange-500 text-white py-2 rounded-lg hover:bg-orange-600"
            onClick={handleGenerateFromText}
          >
            Generate Mindmap
          </motion.button>
        </motion.div>
      </motion.div>

      {/* Mindmap Features Section */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mt-16">
        {[
          {
            icon: <FaBolt className="text-orange-500 text-4xl" />,
            title: "Fast Processing",
            desc: "Generate mindmaps instantly from files or text with optimized AI algorithms.",
          },
          {
            icon: <FaBrain className="text-orange-500 text-4xl" />,
            title: "Smart Structuring",
            desc: "Organizes your content logically for better understanding and retention.",
          },
          {
            icon: <FaLightbulb className="text-orange-500 text-4xl" />,
            title: "Enhanced Learning",
            desc: "Helps visualize complex ideas clearly to improve study efficiency.",
          },
        ].map((feature, i) => (
          <motion.div
            key={i}
            className="bg-white rounded-xl p-6 shadow-lg border border-gray-200 relative overflow-hidden"
            whileHover={{ scale: 1.05 }}
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: i * 0.2 }}
          >
            <motion.div
              className="absolute inset-0 bg-gradient-to-r from-orange-100 to-transparent opacity-0"
              whileHover={{ opacity: 1 }}
              transition={{ duration: 0.4 }}
            />
            <motion.div
              animate={{ y: [0, -5, 0] }}
              transition={{ repeat: Infinity, duration: 1.5 }}
              className="mb-4"
            >
              {feature.icon}
            </motion.div>
            <h3 className="text-xl font-semibold mb-2">{feature.title}</h3>
            <p className="text-gray-600">{feature.desc}</p>
          </motion.div>
        ))}
      </div>
    </div>
  );
};

export default Mindmap;
