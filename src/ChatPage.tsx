import React, { useState, useEffect, useRef } from 'react';
import { Authenticator } from "@aws-amplify/ui-react";
import Banner from './Banner';
import Menu from './Menu';
import './App.css';
import { generateClient } from 'aws-amplify/api';

import type { Schema } from "../amplify/data/resource";
const client = generateClient<Schema>();

import DOMPurify from 'dompurify';
import { marked } from 'marked';

marked.setOptions({ async: false });

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
      const { data } = await client.queries.sendConverseCommand({prompt: inputMessage});
      const responseText = data ?? "No response received";
      // Extract the message text from the response
      setMessages(prevMessages => [...prevMessages, { text: responseText, isUser: false }]);
    } catch (error) {
      console.error('Error calling sendConverseCommand query:', error);
      setMessages(prevMessages => [...prevMessages, { text: "Sorry, I couldn't process that request.", isUser: false }]);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInputMessage(e.target.value);
    adjustTextareaHeight();
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  const adjustTextareaHeight = () => {
    if (textareaRef.current) {
        // Reset to minimum height first
        textareaRef.current.style.height = '40px';
        
        // Get the scroll height
        const scrollHeight = textareaRef.current.scrollHeight;
        
        // Set new height based on content
        textareaRef.current.style.height = 
            scrollHeight > 40 ? `${scrollHeight}px` : '40px';
        
        // Show/hide scrollbar based on content
        textareaRef.current.style.overflowY = 
            scrollHeight > 200 ? 'auto' : 'hidden';
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
                    // Convert markdown to HTML synchronously
                    const markdownText = marked.parse(message.text);
                    // Sanitize the HTML
                    const sanitizedText = DOMPurify.sanitize(markdownText.toString());

                    acc.push(
                      <div key={index} className={`message ${message.isUser ? 'user' : 'assistant'}`}>
                        {message.isUser ? (
                          <p className="user-message">{message.text}</p>
                        ) : (
                          <>
                            <p className="assistant-prefix">Answer:</p>
                            <p
                              className="assistant-message"
                              dangerouslySetInnerHTML={{ __html: sanitizedText }}
                            />
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
              <div className="chat-input-wrapper">
                <form className="chat-input-form" onSubmit={handleSubmit}>
                  <textarea
                    ref={textareaRef}
                    value={inputMessage}
                    onChange={handleInputChange}
                    onKeyDown={handleKeyDown}
                    className="chat-input"
                    placeholder="Type your message..."
                  />
                  <button type="submit" className="chat-submit">
                    Send
                  </button>
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