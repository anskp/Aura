import React, { useMemo, useState } from 'react';
import api from '../services/api';

const AgentChatModal = ({ isOpen, onClose }) => {
    const [messages, setMessages] = useState([
        {
            role: 'assistant',
            content: 'Hi, I am Aura Agent. Ask me about onboarding, investing, portfolio, oracle sync, or CCIP.'
        }
    ]);
    const [input, setInput] = useState('');
    const [sending, setSending] = useState(false);

    const canSend = useMemo(() => input.trim().length > 0 && !sending, [input, sending]);

    const sendMessage = async () => {
        const message = input.trim();
        if (!message || sending) return;

        const nextMessages = [...messages, { role: 'user', content: message }];
        setMessages(nextMessages);
        setInput('');
        setSending(true);

        try {
            const res = await api.post('/ai/chat', {
                message,
                history: nextMessages.slice(-10)
            });
            const reply = res.data?.reply || 'No response from agent.';
            setMessages((prev) => [...prev, { role: 'assistant', content: reply }]);
        } catch (error) {
            const errMsg = error.response?.data?.error || error.message || 'Chat failed';
            setMessages((prev) => [...prev, { role: 'assistant', content: `Error: ${errMsg}` }]);
        } finally {
            setSending(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed z-[70] right-4 bottom-4 w-[380px] max-w-[calc(100vw-2rem)] h-[70vh] max-h-[720px] min-h-[420px] bg-white dark:bg-background-dark border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl flex flex-col md:right-6 md:bottom-6">
            <div className="absolute -top-10 right-0 md:hidden">
                <button onClick={onClose} className="bg-slate-900 text-white border-none rounded-full px-3 py-1 text-xs cursor-pointer">
                    Close
                </button>
            </div>
            <div className="w-full h-full bg-white dark:bg-background-dark rounded-2xl flex flex-col">
                <div className="flex items-center justify-between p-4 border-b border-slate-200 dark:border-slate-800">
                    <div>
                        <p className="m-0 text-lg font-bold text-slate-900 dark:text-white">Aura Agent</p>
                        <p className="m-0 text-xs text-slate-500">Gemini-powered assistant</p>
                    </div>
                    <button onClick={onClose} className="bg-transparent border-none text-slate-500 cursor-pointer">
                        <span className="material-symbols-outlined">close</span>
                    </button>
                </div>

                <div className="p-4 overflow-y-auto space-y-3 flex-1">
                    {messages.map((m, i) => (
                        <div key={`${m.role}-${i}`} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                            <div
                                className={`max-w-[85%] rounded-xl px-3 py-2 text-sm whitespace-pre-wrap ${m.role === 'user'
                                        ? 'bg-primary text-white'
                                        : 'bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-100'
                                    }`}
                            >
                                {m.content}
                            </div>
                        </div>
                    ))}
                    {sending && <p className="text-xs text-slate-500 m-0">Agent is typing...</p>}
                </div>

                <div className="p-4 border-t border-slate-200 dark:border-slate-800 flex gap-2">
                    <input
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter' && !e.shiftKey) {
                                e.preventDefault();
                                sendMessage();
                            }
                        }}
                        placeholder="Ask Aura Agent..."
                        className="flex-1 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-sm"
                        disabled={sending}
                    />
                    <button
                        onClick={sendMessage}
                        disabled={!canSend}
                        className="px-4 py-2 rounded-lg bg-primary text-white border-none cursor-pointer disabled:opacity-50"
                    >
                        Send
                    </button>
                </div>
            </div>
        </div>
    );
};

export default AgentChatModal;
