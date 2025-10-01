import { Link } from "react-router-dom";
import { Globe } from "lucide-react";

const Landing = () => {
  const features = [
    {
      name: "Summarize",
      color: "text-blue-600",
      img: "/images/summarize.gif", // Replace with your custom animated image
      link: "/summarize",
    },
    {
      name: "Flashcard",
      color: "text-pink-600",
      img: "/images/flashcard.gif",
      link: "/flashcard",
    },
    {
      name: "Mindmap",
      color: "text-purple-600",
      img: "/images/mindmap.gif",
      link: "/mindmap",
    },
    {
      name: "Q/A",
      color: "text-green-600",
      img: "/images/qa.gif",
      link: "/qa",
    },
    {
      name: "Chatbot 🤖",
      color: "text-yellow-600",
      img: "/images/bot.png", // no /public here
       link: "/chatbot",
    },
  ];

  return (
    <div className="font-sans bg-gray-50 text-gray-800">
      {/* Hero Section */}
      <section className="text-center py-14 px-6 border-b border-gray-200">
        <h1 className="text-4xl font-bold mb-4">Welcome to Study Spark 🔥</h1>
        <p className="text-lg max-w-3xl mx-auto text-gray-600">
          Your one-stop AI-powered learning platform to summarize textbooks,
          generate flashcards, build mind maps, ask questions, and chat with
          your learning assistant!
        </p>
      </section>
      
{/* Feature Cards -- replace your current section with this */}
<section className="py-14 px-6 flex flex-col items-center space-y-10">
  {features.map((feature, idx) => {
    const slideLeft = idx % 2 === 0; // even => image slides left, desc appears right
    return (
      <div
        key={idx}
        className="relative w-full max-w-4xl overflow-visible" /* allow desc to overflow */
      >
        {/* group wrapper controls hover for both image & desc */}
        <div
          className={`group flex items-center transition-all duration-500 ${
            slideLeft ? 'justify-start' : 'justify-end'
          }`}
        >
          {/* Image card (fixed size) */}
          <Link
            to={feature.link}
            className={`flex-shrink-0 w-56 h-56 bg-white rounded-xl shadow flex items-center justify-center overflow-hidden
                        transition-all duration-500 transform
                        group-hover:scale-110`}
          >
            <img
              src={feature.img}
              alt={feature.name}
              className={`w-24 h-24 object-contain transform transition-all duration-500
                          group-hover:grayscale group-hover:blur-sm
                          ${slideLeft ? 'group-hover:-translate-x-6' : 'group-hover:translate-x-6'}`}
            />
          </Link>

          {/* Description (absolute, outside the card) */}
          <div
            className={`absolute top-0 z-20 opacity-0 pointer-events-none transition-all duration-500
                        ${slideLeft ? 'left-full ml-6' : 'right-full mr-6'}`}
          >
            <div
            >
              className={`bg-white rounded-xl shadow p-6 h-56 w-80 flex flex-col justify-center
                          transform transition-all duration-500
                          ${slideLeft ? 'translate-x-6 group-hover:translate-x-0' : '-translate-x-6 group-hover:-translate-x-0'}
                          group-hover:opacity-100 group-hover:pointer-events-auto`}
              <span className={`text-lg font-semibold ${feature.color}`}>{feature.name}</span>
              <p className="text-gray-600 text-sm mt-2">
                {feature.name === "Summarize" &&
                  "Quickly condense long texts into key points."}
                {feature.name === "Flashcard" &&
                  "Turn your notes into interactive flashcards."}
                {feature.name === "Mindmap" &&
                  "Visualize concepts and their connections."}
                {feature.name === "Q/A" &&
                  "Ask questions and get instant answers."}
                {feature.name === "Chatbot 🤖" &&
                  "Chat with your AI study assistant."}
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  })}
</section>

      {/* Quote Section */}
      <section className="bg-white py-14 px-6 border-t border-b border-gray-200 text-center">
        <blockquote className="italic text-xl text-gray-700 mb-8 max-w-3xl mx-auto">
          “Education is the passport to the future, for tomorrow belongs to
          those who prepare for it today.”
        </blockquote>
      </section>

      {/* FAQs */}
      <section className="py-14 px-6 text-center">
        <h3 className="text-2xl font-bold mb-6">FAQs</h3>
        <div className="max-w-2xl mx-auto text-left space-y-6 text-gray-700">
          <div>
            <p className="font-semibold">Q: What can Study Spark do?</p>
            <p>
              A: It summarizes notes, creates flashcards, mind maps, Q/A, and
              offers an AI chatbot assistant.
            </p>
          </div>
          <div>
            <p className="font-semibold">Q: Is it free?</p>
            <p>
              A: Basic features are free. Premium tools may be added later.
            </p>
          </div>
          <div>
            <p className="font-semibold">Q: Do I need to sign in?</p>
            <p>
              A: Yes, login is required to access personalized features and
              history.
            </p>
          </div>
        </div>
      </section>

      {/* About Us */}
      <section className="bg-gray-100 py-14 px-6 text-center">
        <h3 className="text-2xl font-bold mb-6">About Us</h3>
        <p className="max-w-3xl mx-auto text-gray-700 text-lg leading-relaxed">
          Study Spark is a student-focused project built to make learning fun,
          fast, and effective using artificial intelligence. We're a passionate
          team aiming to empower learners with tools that think and adapt just
          like a human tutor!
        </p>
      </section>
    </div>
  );
};

export default Landing;
