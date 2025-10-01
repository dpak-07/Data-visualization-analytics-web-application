import { useEffect, useState } from 'react';
import { FaBrain, FaClock, FaListUl } from 'react-icons/fa';
import { MdFilterList } from 'react-icons/md';

const HistoryChatbot = () => {
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');

  useEffect(() => {
    fetch('http://localhost:3001/history_chatbot')
      .then(res => res.json())
      .then(data => {
        const sessions = (data.sessions || []).filter(s => s.type === 'completed-session');
        setHistory(sessions);
        setLoading(false);
      })
      .catch(err => {
        console.error('❌ Error fetching history:', err.message);
        setLoading(false);
      });
  }, []);

  const isToday = (timestamp) => {
    const date = new Date(timestamp._seconds * 1000);
    const today = new Date();
    return (
      date.getDate() === today.getDate() &&
      date.getMonth() === today.getMonth() &&
      date.getFullYear() === today.getFullYear()
    );
  };

  const filteredHistory = history
    .filter(session => filter === 'today' ? isToday(session.timestamp) : true)
    .sort((a, b) => b.timestamp._seconds - a.timestamp._seconds)
    .slice(0, filter === 'today' ? history.length : 5);

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-4xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <div className="flex items-center gap-2">
            <MdFilterList className="text-gray-600" />
            <select
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              className="border border-gray-300 rounded px-2 py-1 text-sm"
            >
              <option value="all">Last 5 Sessions</option>
              <option value="today">Today’s Sessions</option>
            </select>
          </div>
        </div>

        {loading ? (
          <div className="text-center text-gray-500">Loading history...</div>
        ) : filteredHistory.length === 0 ? (
          <div className="text-center text-gray-400">No sessions available.</div>
        ) : (
          <div className="flex flex-col space-y-6">
            {filteredHistory.map((session, idx) => (
              <div key={session.id || idx} className="bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden">
                <div className="bg-blue-100 px-6 py-4">
                  <h2 className="text-lg font-bold text-blue-700 flex items-center gap-2">
                    <FaBrain /> Concept: {session.concept}
                  </h2>
                  <p className="text-sm text-gray-600 flex items-center gap-1">
                    <FaClock /> {new Date(session.timestamp._seconds * 1000).toLocaleString()}
                  </p>
                </div>

                <div className="p-6 space-y-6">
                  {session.conversation?.map((entry, i) => (
                    <div key={i} className="relative border-l-4 border-blue-400 pl-4 ml-2">
                      <div className="absolute -left-2 top-2 w-4 h-4 rounded-full bg-blue-400 border-2 border-white"></div>
                      <div className="space-y-2">
                        <p><span className="font-semibold text-gray-800">Explanation:</span> {entry.explanation}</p>

                        {entry.userAnswer && (
                          <p><span className="font-semibold text-gray-800">Your Answer:</span> {entry.userAnswer}</p>
                        )}

                        {entry.feedback && (
                          <div className="bg-gray-50 p-3 rounded-md border text-sm">
                            <span className="font-semibold text-gray-700">Feedback:</span>
                            <p className="text-gray-700 whitespace-pre-line mt-1">{entry.feedback}</p>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default HistoryChatbot;
