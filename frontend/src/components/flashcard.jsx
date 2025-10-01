import React, { useState } from "react";
import { FaUpload } from "react-icons/fa";
import * as pdfjsLib from "pdfjs-dist";
import pdfWorker from "pdfjs-dist/build/pdf.worker?url";
import mammoth from "mammoth";

// Fix for Vite + PDF.js worker
pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorker;

const Flashcard = () => {
  const [cards, setCards] = useState([]);
  const [index, setIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [file, setFile] = useState(null);

  const handleFileSelect = (event) => {
    setFile(event.target.files[0]);
  };

  const generateFlashcards = async () => {
    if (!file) {
      alert("Please select a file first!");
      return;
    }

    const ext = file.name.split(".").pop().toLowerCase();
    let text = "";

    if (ext === "txt") {
      text = await file.text();
    } else if (ext === "pdf") {
      const pdf = await pdfjsLib.getDocument(URL.createObjectURL(file)).promise;
      let extractedText = "";
      for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i);
        const content = await page.getTextContent();
        extractedText += content.items.map((item) => item.str).join(" ") + "\n";
      }
      text = extractedText;
    } else if (ext === "docx") {
      const arrayBuffer = await file.arrayBuffer();
      const { value } = await mammoth.extractRawText({ arrayBuffer });
      text = value;
    } else {
      alert("Unsupported file type");
      return;
    }

    const sentences = text
      .split(/(?<=[.?!])\s+/)
      .filter((s) => s.trim().length > 10);

    const generatedCards = sentences.map((sentence, i) => ({
      question: `Q${i + 1}`,
      answer: sentence.trim(),
    }));

    setCards(generatedCards);
    setIndex(0);
    setFlipped(false);
  };

  const handleNext = () => {
    if (cards.length === 0) return;
    setFlipped(false);
    setIndex((prev) => (prev + 1) % cards.length);
  };

  return (
    <div className="flex flex-col items-center p-6 font-sans min-h-screen bg-gradient-to-br from-orange-50 to-orange-100">
      <h2 className="text-3xl font-bold mb-4 text-orange-700">Flashcards</h2>

      {/* Instruction + Upload Section */}
      {cards.length === 0 && (
        <div className="mt-4 max-w-3xl text-center bg-white shadow-lg rounded-lg p-6 border border-orange-200">
          <p className="text-orange-700 text-lg font-medium mb-2">
            Flashcards are a fun way to learn concepts quickly.
          </p>
          <p className="text-gray-600 mb-6">
            Upload your study material and turn it into interactive Q&A cards.
          </p>

          {/* Steps */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
            <div className="p-4 bg-orange-50 rounded-lg shadow-sm hover:shadow-lg transition-transform transform hover:scale-105 border border-orange-200">
              <img
                src="https://cdn-icons-png.flaticon.com/512/1041/1041873.png"
                alt="Step 1"
                className="w-12 mx-auto mb-2"
              />
              <h3 className="font-semibold mb-1">Step 1</h3>
              <p className="text-sm text-gray-600">
                Select your study file (.txt, .pdf, .docx)
              </p>
            </div>

            <div className="p-4 bg-orange-100 rounded-lg shadow-sm hover:shadow-lg transition-transform transform hover:scale-105 border border-orange-200">
              <img
                src="https://cdn-icons-png.flaticon.com/512/3135/3135692.png"
                alt="Step 2"
                className="w-12 mx-auto mb-2"
              />
              <h3 className="font-semibold mb-1">Step 2</h3>
              <p className="text-sm text-gray-600">
                Click “Generate Flashcards” to process your file.
              </p>
            </div>

            <div className="p-4 bg-orange-200 rounded-lg shadow-sm hover:shadow-lg transition-transform transform hover:scale-105 border border-orange-300">
              <img
                src="https://cdn-icons-png.flaticon.com/512/1040/1040230.png"
                alt="Step 3"
                className="w-12 mx-auto mb-2"
              />
              <h3 className="font-semibold mb-1">Step 3</h3>
              <p className="text-sm text-gray-600">
                Flip & review the generated flashcards.
              </p>
            </div>
          </div>

          {/* File Upload */}
          <label className="flex items-center gap-2 cursor-pointer bg-orange-600 text-white px-4 py-2 rounded-lg hover:bg-orange-700 transition">
            <FaUpload />
            Choose File
            <input
              type="file"
              accept=".txt,.pdf,.docx"
              onChange={handleFileSelect}
              className="hidden"
            />
          </label>

          {/* Generate Button */}
          <button
            onClick={generateFlashcards}
            className="mt-4 px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition"
          >
            Generate Flashcards
          </button>
        </div>
      )}

      {/* Flashcard Display */}
      {cards.length > 0 && (
        <>
          <div
            className="mt-6 w-80 h-48 flex items-center justify-center border rounded-lg shadow-lg bg-white text-lg font-medium text-center cursor-pointer transition-transform duration-300 hover:scale-105"
            onClick={() => setFlipped(!flipped)}
          >
            {flipped ? cards[index].answer : cards[index].question}
          </div>

          <button
            onClick={handleNext}
            className="mt-4 px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition"
          >
            Next
          </button>
        </>
      )}

      {/* About Flashcards Section */}
      <div className="max-w-5xl w-full bg-white rounded-lg shadow-lg p-8 mt-16 flex flex-col md:flex-row items-center gap-8 border border-orange-200">
        <img
          src="https://cdn-icons-png.flaticon.com/512/201/201565.png"
          alt="Flashcard Illustration"
          className="w-80 rounded-lg shadow-md transform transition-transform hover:scale-105 hover:rotate-1"
        />
        <div>
          <h2 className="text-3xl font-bold text-orange-700 mb-4">Make Flashcards</h2>
          <p className="text-gray-600 leading-relaxed mb-4">
            Creating your own set of flashcards is simple — just upload your study material, 
            and we’ll turn it into interactive Q&A cards. You can flip them to test yourself, 
            and review concepts faster. Once your set is ready, study anywhere and share with friends.
          </p>

          <ul className="list-disc pl-5 text-gray-700 mb-4 space-y-2">
            <li><strong>Quick Learning:</strong> Memorize faster using active recall.</li>
            <li><strong>Smart Design:</strong> Easy-to-read cards with clean layout.</li>
            <li><strong>Anytime Access:</strong> Study on desktop, tablet, or phone.</li>
            <li><strong>Customizable:</strong> Edit questions and answers anytime.</li>
          </ul>

          <p className="text-orange-600 font-semibold">
            📚 Start building your flashcards today and make studying fun!
          </p>
        </div>
      </div>
    </div>
  );
};

export default Flashcard;
