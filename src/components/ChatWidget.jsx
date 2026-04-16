import { useState, useRef, useEffect, useCallback } from 'react';

const SUGGESTED_PROMPTS = [
  { label: "Quick Overview", prompts: [
    "Give me the 60-second version of Pradeep",
    "What makes him different from other candidates?",
    "Why should someone reach out?",
  ]},
  { label: "Role Fit", prompts: [
    "What roles is Pradeep strongest for?",
    "What kind of teams or companies would he thrive in?",
    "What's his leadership style?",
  ]},
  { label: "Projects", prompts: [
    "Show me his best projects",
    "Tell me about the multi-agent system he built",
    "What has he actually shipped?",
  ]},
  { label: "AI Perspective", prompts: [
    "How does he think about AI agents?",
    "What's his take on practical AI vs hype?",
    "How does he approach memory and orchestration?",
  ]},
];

function MessageBubble({ role, content, isError }) {
  return (
    <div className={`flex ${role === 'user' ? 'justify-end' : 'justify-start'} mb-4`}>
      <div
        className={`max-w-[85%] px-4 py-3 rounded-2xl text-sm leading-relaxed ${
          role === 'user'
            ? 'bg-[#3b82f6] text-white rounded-br-md'
            : isError
              ? 'bg-[#451a1a] text-[#fca5a5] border border-[#7f1d1d] rounded-bl-md'
              : 'bg-[#1e293b] text-[#e2e8f0] border border-[#334155] rounded-bl-md'
        }`}
      >
        {role === 'assistant' && (
          <p className={`${isError ? 'text-[#f87171]' : 'text-[#3b82f6]'} text-xs font-mono mb-1.5`}>
            {isError ? 'connection error' : 'pradeep-ai'}
          </p>
        )}
        <div className="whitespace-pre-wrap">{content}</div>
      </div>
    </div>
  );
}

export default function ChatWidget({ initialPrompt, standalone = false }) {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showSidebar, setShowSidebar] = useState(true);
  const messagesContainerRef = useRef(null);
  const inputRef = useRef(null);

  // Handle initial prompt from URL
  useEffect(() => {
    if (initialPrompt && messages.length === 0) {
      sendMessage(initialPrompt);
    }
  }, [initialPrompt]);

  // Scroll: use scrollTop for instant, reliable scroll during streaming
  const scrollToBottom = useCallback(() => {
    const container = messagesContainerRef.current;
    if (container) {
      container.scrollTop = container.scrollHeight;
    }
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  const sendMessage = async (text) => {
    const userMessage = { role: 'user', content: text };
    const allMessages = [...messages, userMessage];
    setMessages(allMessages);
    setInput('');
    setIsLoading(true);
    setShowSidebar(false);

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: allMessages.map(m => ({ role: m.role, content: m.content })),
        }),
      });

      if (!response.ok) {
        throw new Error(`API returned ${response.status}`);
      }

      // Stream the response
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let assistantContent = '';

      setMessages(prev => [...prev, { role: 'assistant', content: '' }]);

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        assistantContent += decoder.decode(value, { stream: true });
        setMessages(prev => {
          const updated = [...prev];
          updated[updated.length - 1] = { role: 'assistant', content: assistantContent };
          return updated;
        });
      }
    } catch {
      setMessages(prev => [
        ...prev,
        {
          role: 'assistant',
          content:
            "I'm having trouble connecting right now. Please try again in a moment, " +
            "or reach out to Pradeep directly at pradeep@realgradientdescent.tech.",
          isError: true,
        },
      ]);
    }

    setIsLoading(false);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (input.trim() && !isLoading) {
      sendMessage(input.trim());
    }
  };

  const handlePromptClick = (prompt) => {
    if (!isLoading) {
      sendMessage(prompt);
    }
  };

  // Standalone mode: full viewport, no nav offset
  // Portfolio mode: offset for the 4rem nav bar
  const containerHeight = standalone ? 'h-screen' : 'h-[calc(100vh-4rem)]';

  return (
    <div className={`flex ${containerHeight} bg-[#0f172a]`}>
      {/* Sidebar - suggested prompts */}
      <div className={`${showSidebar ? 'w-72' : 'w-0'} hidden lg:block flex-shrink-0 border-r border-[#334155] overflow-y-auto transition-all duration-300`}>
        <div className="p-6">
          {standalone && (
            <div className="mb-6 pb-4 border-b border-[#334155]">
              <div className="flex items-center gap-2">
                <span className="font-mono text-[#3b82f6] text-sm">~/</span>
                <span className="font-semibold text-lg text-[#e2e8f0]">pradeep</span>
              </div>
              <p className="text-[#64748b] text-xs mt-1">AI copilot</p>
            </div>
          )}
          <p className="font-mono text-xs text-[#3b82f6] mb-4">suggested questions</p>
          {SUGGESTED_PROMPTS.map((category) => (
            <div key={category.label} className="mb-6">
              <p className="text-xs font-medium text-[#94a3b8] uppercase tracking-wide mb-2">
                {category.label}
              </p>
              <div className="space-y-1.5">
                {category.prompts.map((prompt) => (
                  <button
                    key={prompt}
                    onClick={() => handlePromptClick(prompt)}
                    className="w-full text-left px-3 py-2 rounded-lg text-sm text-[#94a3b8] hover:text-[#e2e8f0] hover:bg-[#1e293b] transition-colors duration-150"
                  >
                    {prompt}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Main chat area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Standalone header — minimal branding, no nav links */}
        {standalone && (
          <div className="flex-shrink-0 border-b border-[#334155] px-4 md:px-8 py-3 flex items-center gap-3 bg-[#0f172a]/80 backdrop-blur-xl">
            <div className="w-8 h-8 rounded-lg bg-[#1e293b] border border-[#334155] flex items-center justify-center">
              <span className="font-mono text-[#3b82f6] text-sm">P</span>
            </div>
            <div>
              <p className="text-[#e2e8f0] font-semibold text-sm leading-tight">Pradeep AI</p>
              <p className="text-[#64748b] text-xs">Professional copilot</p>
            </div>
            <div className="ml-auto flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-[#22c55e] animate-pulse" />
              <span className="text-[#22c55e] text-xs font-mono">online</span>
            </div>
          </div>
        )}

        {/* Messages */}
        <div ref={messagesContainerRef} className="flex-1 overflow-y-auto px-4 md:px-8 py-6">
          {messages.length === 0 && (
            <div className="flex items-center justify-center h-full">
              <div className="text-center max-w-lg">
                <div className="w-16 h-16 rounded-2xl bg-[#1e293b] border border-[#334155] flex items-center justify-center mx-auto mb-6">
                  <span className="font-mono text-[#3b82f6] text-xl">P</span>
                </div>
                <h2 className="text-2xl font-bold text-[#e2e8f0] mb-3">Ask Pradeep AI</h2>
                <p className="text-[#94a3b8] text-sm mb-8 leading-relaxed">
                  This copilot is grounded in Pradeep's approved professional context.
                  Ask about his background, projects, working style, or perspective on AI.
                </p>

                {/* Mobile prompt chips */}
                <div className="flex flex-wrap justify-center gap-2">
                  {["60-second summary", "Best projects", "Role fit", "AI perspective"].map((prompt) => (
                    <button
                      key={prompt}
                      onClick={() => handlePromptClick(
                        prompt === "60-second summary" ? "Give me the 60-second version of Pradeep" :
                        prompt === "Best projects" ? "Show me his best projects" :
                        prompt === "Role fit" ? "What roles is Pradeep strongest for?" :
                        "How does he think about AI agents?"
                      )}
                      className="px-4 py-2 rounded-full bg-[#1e293b] border border-[#334155] text-sm text-[#94a3b8] hover:text-[#3b82f6] hover:border-[#3b82f6]/30 transition-all duration-200"
                    >
                      {prompt}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {messages.map((msg, i) => (
            <MessageBubble key={i} role={msg.role} content={msg.content} isError={msg.isError} />
          ))}

          {isLoading && (
            <div className="flex justify-start mb-4">
              <div className="bg-[#1e293b] border border-[#334155] px-4 py-3 rounded-2xl rounded-bl-md">
                <p className="text-[#3b82f6] text-xs font-mono mb-1.5">pradeep-ai</p>
                <div className="flex gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-[#94a3b8] animate-bounce" style={{ animationDelay: '0ms' }} />
                  <span className="w-2 h-2 rounded-full bg-[#94a3b8] animate-bounce" style={{ animationDelay: '150ms' }} />
                  <span className="w-2 h-2 rounded-full bg-[#94a3b8] animate-bounce" style={{ animationDelay: '300ms' }} />
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Input */}
        <div className="flex-shrink-0 border-t border-[#334155] p-4 md:px-8">
          <form onSubmit={handleSubmit} className="flex gap-3 max-w-3xl mx-auto">
            <input
              ref={inputRef}
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask about Pradeep's background, projects, or perspective..."
              className="flex-1 bg-[#1e293b] border border-[#334155] rounded-xl px-4 py-3 text-sm text-[#e2e8f0] placeholder-[#64748b] focus:outline-none focus:border-[#3b82f6] transition-colors"
              disabled={isLoading}
            />
            <button
              type="submit"
              disabled={!input.trim() || isLoading}
              className="px-5 py-3 bg-[#3b82f6] hover:bg-[#2563eb] disabled:opacity-40 disabled:cursor-not-allowed text-white rounded-xl font-medium text-sm transition-colors"
            >
              Send
            </button>
          </form>
          <p className="text-center text-[#64748b] text-xs mt-3 max-w-3xl mx-auto">
            Responses are generated from curated professional context. For the latest, <a href="mailto:pradeep@realgradientdescent.tech" className="text-[#3b82f6] hover:underline">reach out directly</a>.
          </p>
        </div>
      </div>
    </div>
  );
}
