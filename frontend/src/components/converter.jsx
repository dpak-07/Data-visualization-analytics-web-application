import React, { useState } from 'react';
import axios from 'axios';

const Upload = () => {
  const [file, setFile] = useState(null);
  const [task, setTask] = useState('summary');
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleFileChange = (e) => {
    setFile(e.target.files[0]);
  };

  const handleTaskChange = (e) => {
    setTask(e.target.value);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!file) return alert("Please upload a file first!");

    const formData = new FormData();
    formData.append('file', file);

    try {
      setLoading(true);
      const res = await axios.post(`http://localhost:5000/process?task=${task}`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      setResult(res.data.aiOutput);
    } catch (err) {
      console.error(err);
      alert("Something went wrong. See console for details.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ maxWidth: 600, margin: '0 auto', padding: 20 }}>
      <h2>🧠 Smart File Processor</h2>
      <form onSubmit={handleSubmit}>
        <input type="file" onChange={handleFileChange} accept=".pdf,.docx,.txt,.mp3" />
        <select value={task} onChange={handleTaskChange} style={{ marginLeft: 10 }}>
          <option value="summary">Summary</option>
          <option value="mindmap">Mind Map</option>
          <option value="flashcards">Flashcards</option>
          <option value="qa">Q&A</option>
        </select>
        <button type="submit" style={{ marginLeft: 10 }}>Upload & Process</button>
      </form>

      {loading && <p>⏳ Processing...</p>}

      {result && (
        <div style={{ marginTop: 20 }}>
          <h3>📄 Result:</h3>
          {Array.isArray(result) ? (
            <ul>
              {result.map((item, i) => (
                <li key={i}>{item}</li>
              ))}
            </ul>
          ) : typeof result === 'object' ? (
            <pre>{JSON.stringify(result, null, 2)}</pre>
          ) : (
            <p>{result}</p>
          )}
        </div>
      )}
    </div>
  );
};

export default Upload;
