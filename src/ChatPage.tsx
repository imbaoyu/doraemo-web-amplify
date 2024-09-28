import React, { useState, useEffect, useRef } from 'react';
import { Authenticator } from "@aws-amplify/ui-react";
import Banner from './Banner';
import Menu from './Menu';
import './App.css';

interface Message {
  text: string;
  isUser: boolean;
}

function ChatPage() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const messagesEndRef = useRef<null | HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(scrollToBottom, [messages]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (inputMessage.trim() === '') return;

    setMessages(prevMessages => [...prevMessages, { text: inputMessage, isUser: true }]);
    setInputMessage('');

    setTimeout(() => {
      setMessages(prevMessages => [...prevMessages, { text: `You said: ${inputMessage}`, isUser: false }]);
    }, 1000);
  };

  return (
    <Authenticator socialProviders={['google']}>
      {({ signOut, }) => (
        <div className="page-container">
          <Banner onSignOut={signOut} />
          <div className="content-wrapper">
            <Menu />
            <main className="content-container">
              <div className="chat-container">
                <div className="chat-messages">
                  {messages.map((message, index) => (
                    <div key={index} className={`message ${message.isUser ? 'user' : 'bot'}`}>
                      {message.text}
                    </div>
                  ))}
                  <div ref={messagesEndRef} />
                </div>
                <form onSubmit={handleSubmit} className="chat-input-form">
                  <input
                    type="text"
                    value={inputMessage}
                    onChange={(e) => setInputMessage(e.target.value)}
                    placeholder="Type a message..."
                    className="chat-input"
                  />
                  <button type="submit" className="chat-submit">Send</button>
                </form>
              </div>
            </main>
          </div>
        </div>
      )}
    </Authenticator>
  );
}

export default ChatPage;