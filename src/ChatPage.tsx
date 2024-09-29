import React, { useState, useEffect, useRef } from 'react';
import { Authenticator } from "@aws-amplify/ui-react";
import Banner from './Banner';
import Menu from './Menu';
import './App.css';
import { generateClient } from 'aws-amplify/api';

import type { Schema } from "../amplify/data/resource";
const client = generateClient<Schema>();

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (inputMessage.trim() === '') return;

    setMessages(prevMessages => [...prevMessages, { text: inputMessage, isUser: true }]);
    setInputMessage('');

    try {
      const response = await client.queries.sendChat({
        message: inputMessage
      });
      
      // Extract the message text from the response
      const botMessage = typeof response === 'string' ? response : "No response received";
      setMessages(prevMessages => [...prevMessages, { text: botMessage, isUser: false }]);
    } catch (error) {
      console.error('Error calling sendChat query:', error);
      setMessages(prevMessages => [...prevMessages, { text: "Sorry, I couldn't process that request.", isUser: false }]);
    }
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