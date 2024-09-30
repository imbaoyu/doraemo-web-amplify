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
  const textareaRef = useRef<HTMLTextAreaElement>(null);

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
      const { data } = await client.queries.sendChat({message: inputMessage});
      const responseText = data ?? "No response received";
      // Extract the message text from the response
      setMessages(prevMessages => [...prevMessages, { text: responseText, isUser: false }]);
    } catch (error) {
      console.error('Error calling sendChat query:', error);
      setMessages(prevMessages => [...prevMessages, { text: "Sorry, I couldn't process that request.", isUser: false }]);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInputMessage(e.target.value);
    adjustTextareaHeight();
  };

  const adjustTextareaHeight = () => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    }
  };

  useEffect(() => {
    adjustTextareaHeight();
  }, [inputMessage]);

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
                  {messages.reduce((acc, message, index, array) => {
                    acc.push(
                      <div key={index} className={`message ${message.isUser ? 'user' : 'assistant'}`}>
                        {message.isUser ? (
                          <p className="user-message">{message.text}</p>
                        ) : (
                          <>
                            <p className="assistant-prefix">Answer:</p>
                            <p className="assistant-message">{message.text}</p>
                          </>
                        )}
                      </div>
                    );
                    
                    // Add separator after each complete interaction (Q&A pair)
                    if (index % 2 === 1 && index < array.length - 1) {
                      acc.push(<hr key={`sep-${index}`} className="interaction-separator" />);
                    }
                    
                    return acc;
                  }, [] as JSX.Element[])}
                  <div ref={messagesEndRef} />
                </div>
              </div>
              <form onSubmit={handleSubmit} className="chat-input-form">
                <textarea
                  ref={textareaRef}
                  value={inputMessage}
                  onChange={handleInputChange}
                  placeholder="Type a message..."
                  className="chat-input"
                  rows={1}
                />
                <button type="submit" className="chat-submit">Send</button>
              </form>
            </main>
          </div>
        </div>
      )}
    </Authenticator>
  );
}

export default ChatPage;