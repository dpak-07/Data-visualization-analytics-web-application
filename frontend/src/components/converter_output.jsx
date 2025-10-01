import React from 'react';

const OutputPage = ({ text }) => {
  // You can replace these with actual backend results
  const summary = `Summary of: ${text.slice(0, 50)}...`;
  const authorInfo = 'Author: John Doe';
  const mindMapPoints = ['Point 1', 'Point 2', 'Point 3'];
  const qaPairs = [
    { question: 'What is it about?', answer: 'It is about a summary.' },
    { question: 'Who wrote it?', answer: 'John Doe' },
  ];

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-4xl mx-auto bg-white p-6 rounded shadow space-y-6">

        {/* Summarize */}
        <section>
          <h2 className="text-xl font-bold text-pink-600 mb-2">Summarize Output</h2>
          <p className="text-gray-800">{summary}</p>
        </section>

        {/* Author Info */}
        <section>
          <h2 className="text-xl font-bold text-pink-600 mb-2">Author Info</h2>
          <p className="text-gray-800">{authorInfo}</p>
        </section>

        {/* Mind Map (Just displaying points) */}
        <section>
          <h2 className="text-xl font-bold text-pink-600 mb-2">Mind Map Output</h2>
          <ul className="list-disc pl-5 text-gray-800">
            {mindMapPoints.map((point, index) => (
              <li key={index}>{point}</li>
            ))}
          </ul>
        </section>

        {/* Q/A Output */}
        <section>
          <h2 className="text-xl font-bold text-pink-600 mb-2">Q/A Output</h2>
          <div className="space-y-2">
            {qaPairs.map((pair, index) => (
              <div key={index}>
                <p className="font-semibold">Q: {pair.question}</p>
                <p className="text-gray-700">A: {pair.answer}</p>
              </div>
            ))}
          </div>
        </section>

      </div>
    </div>
  );
};

export default OutputPage;
