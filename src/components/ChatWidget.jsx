import { useState, useRef, useEffect } from 'react';

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

function MessageBubble({ role, content }) {
  return (
    <div className={`flex ${role === 'user' ? 'justify-end' : 'justify-start'} mb-4`}>
      <div
        className={`max-w-[85%] px-4 py-3 rounded-2xl text-sm leading-relaxed ${
          role === 'user'
            ? 'bg-[#3b82f6] text-white rounded-br-md'
            : 'bg-[#1e293b] text-[#e2e8f0] border border-[#334155] rounded-bl-md'
        }`}
      >
        {role === 'assistant' && (
          <p className="text-[#3b82f6] text-xs font-mono mb-1.5">pradeep-ai</p>
        )}
        <div className="whitespace-pre-wrap">{content}</div>
      </div>
    </div>
  );
}

export default function ChatWidget({ initialPrompt }) {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showSidebar, setShowSidebar] = useState(true);
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  // Handle initial prompt from URL
  useEffect(() => {
    if (initialPrompt && messages.length === 0) {
      sendMessage(initialPrompt);
    }
  }, [initialPrompt]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const sendMessage = async (text) => {
    const userMessage = { role: 'user', content: text };
    const allMessages = [...messages, userMessage];
    setMessages(allMessages);
    setInput('');
    setIsLoading(true);
    setShowSidebar(false);

    try {
      // Try the real API endpoint first (Ollama → Groq)
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
    } catch (err) {
      // Fallback to local response if API is unavailable (e.g., static hosting / dev)
      console.log('API unavailable, using local fallback:', err.message);
      const fallback = generateLocalResponse(text);
      setMessages(prev => [...prev, { role: 'assistant', content: fallback }]);
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

  return (
    <div className="flex h-[calc(100vh-4rem)] bg-[#0f172a]">
      {/* Sidebar - suggested prompts */}
      <div className={`${showSidebar ? 'w-72' : 'w-0'} hidden lg:block flex-shrink-0 border-r border-[#334155] overflow-y-auto transition-all duration-300`}>
        <div className="p-6">
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
        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-4 md:px-8 py-6">
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
            <MessageBubble key={i} role={msg.role} content={msg.content} />
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

          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <div className="border-t border-[#334155] p-4 md:px-8">
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

// Temporary local response generator - will be replaced with API call to Ollama
function generateLocalResponse(query) {
  const q = query.toLowerCase();

  if (q.includes('60-second') || q.includes('summary') || q.includes('who is') || q.includes('tell me about')) {
    return `Pradeep is a Software Engineering Director who combines engineering leadership with hands-on AI building. He leads teams through complex product builds, and on his own time designs multi-agent architectures, experiments with memory and orchestration patterns, and builds tools that push his understanding of what's practical with AI today.

He's currently targeting AI enablement leadership roles — VP/Director of Engineering with an AI focus, or Head of AI Platform — where he can help engineering teams become genuinely more effective with AI.

What sets him apart is the combination: he has the leadership experience to operate at a strategic level, and the building practice to understand what actually works at the implementation level. He doesn't just talk about AI — he builds with it.`;
  }

  if (q.includes('role') || q.includes('fit') || q.includes('position') || q.includes('looking for')) {
    return `Pradeep is strongest for roles at the intersection of engineering leadership and AI enablement:

• VP/Director of Engineering — AI Enablement
• Head of AI/ML Platform
• Technical leadership at AI-forward companies

He's best suited for organizations that see AI as a capability to weave into engineering practice, not just a product feature to bolt on. He thrives where the question is "how do we make our entire engineering org better with AI?" rather than "can we add a chatbot?"

His combination of team leadership experience and hands-on AI building practice means he can operate at both the strategy and implementation levels — which is rare in this space.`;
  }

  if (q.includes('project') || q.includes('built') || q.includes('ship') || q.includes('work')) {
    return `Pradeep has two flagship projects that show different but complementary strengths:

1. Multi-Agent OpenClaw Orchestration — A role-based multi-agent assistant system with four specialized agents (Jeeves, Ada, Hermes, Scribe), explicit routing policies, durable file-backed memory, and baton-based handoffs. The key insight: "systems fail at the seams." See /projects/multi-agent-openclaw

2. Employee Communication Simulator — A full-stack simulation platform for testing how leadership messages land across a 450-person org. Features 60 weighted personas, Monte Carlo scenario analysis, multi-provider LLM integration (Groq, DeepSeek, OpenAI, Ollama), and executive-ready PDF/PPTX reporting. See /projects/employee-communication-simulator

The first shows agentic systems thinking and memory design. The second shows product judgment, operational hardening of AI features, and the ability to translate analytics into executive decisions. Together they demonstrate that Pradeep builds end-to-end — from agent orchestration to decision-support systems.`;
  }

  if (q.includes('ai') || q.includes('agent') || q.includes('think')) {
    return `Pradeep's perspective on AI is grounded and practical. His core belief is that the interesting challenge in AI right now isn't raw intelligence — it's coordination, continuity, and controlled behavior over time.

He gravitates toward agentic systems: multi-agent architectures, memory design, orchestration, and the operational patterns that make AI useful rather than just impressive. He cares less about what a model can do in a demo and more about what it can do on a Tuesday morning when context is stale and the task is ambiguous.

As a leader, he brings this lens to teams: how do we make AI a real capability in our engineering practice, not just a feature we bolt on? How do we build systems that actually improve because AI is part of them?`;
  }

  if (q.includes('different') || q.includes('stand out') || q.includes('unique') || q.includes('why')) {
    return `What makes Pradeep distinctive is the combination of layers:

1. He has the leadership experience (Engineering Director) to operate at a strategic level
2. He has the hands-on building practice to understand what actually works at the implementation level
3. He thinks in systems — not just individual AI features, but how agents, memory, orchestration, and workflows fit together
4. He cares about reliability over novelty — his work focuses on making AI systems that work consistently, not just impressively

Most candidates at his level either lead teams OR build hands-on. Pradeep does both, and the building directly informs his leadership perspective on AI enablement.`;
  }

  if (q.includes('style') || q.includes('lead') || q.includes('manage') || q.includes('team')) {
    return `Pradeep leads by building context and trust, not by prescription. He wants to understand the problem deeply before committing to a direction, and he wants his teams to have the same understanding.

He prefers structured clarity over rigid process — clear ownership, explicit decisions, and room for people to do their best work. He's opinionated about quality but pragmatic about shipping.

He believes the best teams iterate fast with a clear sense of direction, and he works to create that environment whether leading a team or building something solo.`;
  }

  return `That's a great question. Based on Pradeep's professional context, I can share that he's an Engineering Director with a deep hands-on AI building practice, focused on multi-agent systems, memory design, and practical AI enablement.

If you'd like more specific information, try asking about:
• His background and 60-second summary
• What roles he's strongest for
• His projects and what he's built
• How he thinks about AI and agentic systems
• What makes him different

For anything not covered here, you can reach Pradeep directly at pradeep@realgradientdescent.tech.`;
}
