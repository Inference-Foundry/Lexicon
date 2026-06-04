"use client";

import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  BookOpen, 
  Terminal, 
  Sliders, 
  ShieldAlert, 
  Copy, 
  Check, 
  Search, 
  Filter, 
  Sparkles, 
  Send, 
  Cpu, 
  AlertTriangle, 
  Code, 
  Download, 
  Plus, 
  Play, 
  HelpCircle, 
  RefreshCw, 
  BookOpenText, 
  ExternalLink, 
  Settings2, 
  Trash2,
  ThumbsUp, 
  Award,
  Shield,
  Layers,
  FileText,
  User,
  CheckCircle2,
  Lock,
  ChevronRight
} from 'lucide-react';
import { PROMPTS_DATABASE, CATEGORIES, PromptEntry, PromptVariable } from '../lib/prompts-data';

export default function Page() {
  // Pre-load state from local storage or default database using lazy initializers
  const [prompts, setPrompts] = useState<PromptEntry[]>(() => {
    if (typeof window !== 'undefined') {
      const localDb = localStorage.getItem('lexicon_prompts_db');
      if (localDb) {
        try {
          return JSON.parse(localDb);
        } catch (e) {}
      }
    }
    return PROMPTS_DATABASE;
  });

  const [selectedPrompt, setSelectedPrompt] = useState<PromptEntry | null>(() => {
    if (typeof window !== 'undefined') {
      const localDb = localStorage.getItem('lexicon_prompts_db');
      if (localDb) {
        try {
          const parsed = JSON.parse(localDb);
          return parsed.find((p: any) => p.id === 'contextual-rag-answerer') || parsed[0] || null;
        } catch (e) {}
      }
    }
    return PROMPTS_DATABASE.find(p => p.id === 'contextual-rag-answerer') || PROMPTS_DATABASE[0] || null;
  });

  // Load variable values based on selected prompt
  const [variableValues, setVariableValues] = useState<Record<string, string>>(() => {
    const defaultPrompt = PROMPTS_DATABASE.find(p => p.id === 'contextual-rag-answerer') || PROMPTS_DATABASE[0];
    const initialVars: Record<string, string> = {};
    if (defaultPrompt) {
      defaultPrompt.variables.forEach(v => {
        initialVars[v.name] = v.defaultValue;
      });
    }
    return initialVars;
  });

  const [searchQuery, setSearchQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState<string>("all");
  
  // Playground simulation states
  const [testingModel, setTestingModel] = useState("gemini-2.5-flash");
  const [isTestingPrompt, setIsTestingPrompt] = useState(false);
  const [playgroundOutput, setPlaygroundOutput] = useState("");
  const [playgroundLogs, setPlaygroundLogs] = useState<string[]>([]);
  const [playgroundError, setPlaygroundError] = useState("");
  const [workspaceTab, setWorkspaceTab] = useState<'playground' | 'analysis' | 'integration'>('playground');
  
  // Notification states
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [successNotification, setSuccessNotification] = useState<string | null>(null);
  const [showContributorLab, setShowContributorLab] = useState(false);

  // Poll state (stored in local storage)
  const [pollVotes, setPollVotes] = useState<Record<string, number>>(() => {
    if (typeof window !== 'undefined') {
      const localVotes = localStorage.getItem('lexicon_poll_votes');
      if (localVotes) {
        try { return JSON.parse(localVotes); } catch (e) {}
      }
    }
    return {
      'llm-judge': 142,
      'static-unit': 89,
      'semantic-cos': 55,
      'red-team': 118
    };
  });

  const [userVoted, setUserVoted] = useState<string | null>(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('lexicon_user_voted');
    }
    return null;
  });

  // Dynamic feedback comments state
  const [discussions, setDiscussions] = useState<Array<{ id: number; author: string; role: string; comment: string; time: string; likes: number }>>(() => {
    if (typeof window !== 'undefined') {
      const localDiscussions = localStorage.getItem('lexicon_discussions');
      if (localDiscussions) {
        try { return JSON.parse(localDiscussions); } catch (e) {}
      }
    }
    return [
      {
        id: 1,
        author: "@prompt_pioneer",
        role: "Core Contributor",
        comment: "The negative constraint structure in our RAG grounder has been cut down to an absolute minimum. We tested this with sub-10B Parameter local models, and it significantly lowers hallucination spikes.",
        time: "3 hours ago",
        likes: 14
      },
      {
        id: 2,
        author: "@inference_arch",
        role: "NLP Analyst",
        comment: "If you're deploying the strict JSON schema template to production, make sure to anchor the parser's temperature to 0.0. Higher values frequently lead to backslash leaks or stray parentheses.",
        time: "Yesterday",
        likes: 9
      }
    ];
  });

  const [newCommentName, setNewCommentName] = useState("");
  const [newCommentText, setNewCommentText] = useState("");

  // Prompt Creator State (Dynamic Builder)
  const [builderTitle, setBuilderTitle] = useState("");
  const [builderTagline, setBuilderTagline] = useState("");
  const [builderCategory, setBuilderCategory] = useState<'summarization' | 'reasoning' | 'code-generation' | 'rag' | 'classification' | 'structured-output' | 'safety'>("rag");
  const [builderLicense, setBuilderLicense] = useState<'MIT' | 'Apache-2.0' | 'Unlicense' | 'CC0-1.0'>("MIT");
  const [builderTargetModel, setBuilderTargetModel] = useState("Universal / Gemini 2.5");
  const [builderTemplate, setBuilderTemplate] = useState("You are an expert... \n\n=== CONTEXT ===\n{{MY_CONTEXT}}\n\nTask: {{MY_TASK}}");
  const [builderVariablesText, setBuilderVariablesText] = useState("MY_CONTEXT: Context Document Block; MY_TASK: Task to Execute");
  const [builderBackground, setBuilderBackground] = useState("");

  const handleSelectPrompt = (prompt: PromptEntry) => {
    setSelectedPrompt(prompt);
    const initialVars: Record<string, string> = {};
    prompt.variables.forEach(v => {
      initialVars[v.name] = v.defaultValue;
    });
    setVariableValues(initialVars);
    setPlaygroundOutput("");
    setPlaygroundLogs([]);
    setPlaygroundError("");
  };

  // Handle Search and Category Filter
  const filteredPrompts = prompts.filter(p => {
    const matchesSearch = p.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          p.tagline.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          p.template.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = activeCategory === "all" ? true : p.category === activeCategory;
    return matchesSearch && matchesCategory;
  });

  // Calculate template substitution on the fly
  const getSubstitutedTemplate = () => {
    if (!selectedPrompt) return "";
    let compiled = selectedPrompt.template;
    Object.entries(variableValues).forEach(([key, val]) => {
      compiled = compiled.split(`{{${key}}}`).join(val || `{{${key}}}`);
    });
    return compiled;
  };

  // Completely client-side deterministic natural-language simulation compiler (Zero API calls, Frontend-only)
  const handleClientSimulation = () => {
    if (!selectedPrompt) return;
    setIsTestingPrompt(true);
    setPlaygroundOutput("");
    setPlaygroundError("");
    setPlaygroundLogs([
      `[${new Date().toISOString().split('T')[1].slice(0, 8)}] Preparing local token stream...`,
      `[${new Date().toISOString().split('T')[1].slice(0, 8)}] Submitting variables mapping to context-buffer...`,
      `[${new Date().toISOString().split('T')[1].slice(0, 8)}] Standardizing schema matching vectors...`
    ]);

    setTimeout(() => {
      const subTemplate = getSubstitutedTemplate();
      let logUpdates = [
        `[${new Date().toISOString().split('T')[1].slice(0, 8)}] Parsing prompt guidelines via local deterministic tokenizer`,
        `[${new Date().toISOString().split('T')[1].slice(0, 8)}] Checking negative constraints... Compliance level: 100%`,
        `[${new Date().toISOString().split('T')[1].slice(0, 8)}] Running local mock compiler for: ${selectedPrompt.id}`
      ];

      // Formulate mock output based on the specific prompt ID
      let resultText = "";
      if (selectedPrompt.id === "contextual-rag-answerer") {
        const contextVal = variableValues["CONTEXT"] || "";
        const queryVal = (variableValues["QUERY"] || "").toLowerCase();

        if (queryVal.includes("participate") || queryVal.includes("help") || queryVal.includes("lexicon")) {
          resultText = `Based on the provided context, someone can participate and help in the Lexicon initiative even before the repository goes live by visiting the Inference-Foundry/.github issues board and submitting suggestions [Block B]. 
          
Initially, Lexicon coordinates its contributor roster within the secure .github-private environment [Block B], but actively welcomes feedback through their public issues channel.`;
        } else if (contextVal.trim() === "" || queryVal.trim() === "") {
          resultText = `I am unable to answer this question because the provided details do not contain sufficient evidence.`;
        } else {
          // Dynamic keyword scanning to sound realistic
          const wordsInQuery = queryVal.split(/\s+/).filter(w => w.length > 3);
          const foundSentences = contextVal.split(/[.!\n]+/).filter(sentence => {
            return wordsInQuery.some(wq => sentence.toLowerCase().includes(wq));
          });

          if (foundSentences.length > 0) {
            resultText = `According to the source document: "${foundSentences[0].trim()}". This is directly audited and grounded back to the context files provided. No unauthorized external facts were summarized.`;
          } else {
            resultText = `I am unable to answer this question because the provided details do not contain sufficient evidence.`;
          }
        }
      } else if (selectedPrompt.id === "strict-schema-json") {
        const inputData = variableValues["INPUT_DATA"] || "";
        // Extract Jane Doe information or compile a mock JSON
        let guestName = "Jane Doe";
        let room = 302;
        let amount = 150.50;
        let pMethod = "cash";
        let email = "jane.d@gmail.co";
        let phone: string | null = null;

        if (!inputData.toLowerCase().includes("jane doe") && inputData.trim().length > 10) {
          // Attempt simple regex parse for variables
          const nameMatch = inputData.match(/([A-Z][a-z]+ [A-Z][a-z]+)/);
          if (nameMatch) guestName = nameMatch[1];
          const roomMatch = inputData.match(/room\s*(\d+)/i);
          if (roomMatch) room = parseInt(roomMatch[1], 10);
          const amountMatch = inputData.match(/(\d+(?:\.\d{2})?)/);
          if (amountMatch) amount = parseFloat(amountMatch[1]);
          const emailMatch = inputData.match(/([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/);
          if (emailMatch) email = emailMatch[1];
        }

        const compiledJsonObj = {
          guestName,
          room,
          amountPaid: amount,
          paymentMethod: pMethod,
          contact: {
            email,
            phone
          }
        };

        resultText = JSON.stringify(compiledJsonObj, null, 2);
      } else if (selectedPrompt.id === "chain-of-thought-reasoner") {
        resultText = `<scratchpad>
Constants and Given Parameters:
1. Tank is filled by Pipe A in 6 hours -> filling rate = 1/6 tank per hour
2. Tank is filled by Pipe B in 8 hours -> filling rate = 1/8 tank per hour
3. Empty drainage C takes 12 hours -> drainage rate = -1/12 tank per hour
4. Start timeline:
   - At 8:00 AM: Pipe A is opened, drainage valve C is opened.
   - At 10:00 AM: Pipe B is opened as well.

Step 1: Calculate state from 8:00 AM to 10:00 AM (2 hours)
Running systems: Pipe A + Drainage C.
Combined rate = 1/6 - 1/12 = 2/12 - 1/12 = 1/12 tank per hour.
In 2 hours, volume filled = 2 * (1/12) = 2/12 = 1/6 of the tank.
Remaining fraction to fill = 1 - 1/6 = 5/6 of the tank.

Step 2: Calculate state from 10:00 AM onwards
Running systems: Pipe A + Pipe B + Drainage C.
Combined rate = 1/6 + 1/8 - 1/12
LCD of 6, 8, 12 is 24.
Combined rate = 4/24 + 3/24 - 2/24 = (4 + 3 - 2)/24 = 5/24 tank per hour.

Step 3: Solve for remaining time (T) to fill 5/6 of the tank
Rate * Time = Work
(5/24) * T = 5/6
T = (5/6) * (24/5)
T = 24/6 = 4 hours.

Step 4: Verify absolute clock time
Starting from 10:00 AM + 4 hours = 2:00 PM precisely.
Does this step-by-step arithmetic proof pass self-consistency? Yes.
</scratchpad>

Based on rigorous mathematical deduction, if Pipe A and the drainage system are initiated at 8:00 AM, and Pipe B joins at 10:00 AM, the water tank will be completely filled at exactly 2:00 PM.`;
      } else if (selectedPrompt.id === "few-shot-semantic-classifier") {
        const inputStr = (variableValues["TARGET_INPUT"] || "").toLowerCase();
        if (inputStr.includes("incredible") || inputStr.includes("love") || inputStr.includes("perfect")) {
          resultText = "POSITIVE";
        } else if (inputStr.includes("terrible") || inputStr.includes("disappointing") || inputStr.includes("broken")) {
          resultText = "NEGATIVE";
        } else if (inputStr.includes("reset") || inputStr.includes("ignore") || inputStr.includes("apple pie")) {
          resultText = "SPAM_OR_MALICIOUS";
        } else if (inputStr.includes("where") || inputStr.includes("how") || inputStr.includes("what")) {
          resultText = "INQUIRY";
        } else {
          resultText = "MIXED";
        }
      } else if (selectedPrompt.id === "adversarial-jailbreak-moderator") {
        const userInput = (variableValues["USER_INPUT"] || "").toLowerCase();
        let isSafe = true;
        let threatType = "NONE";
        let confidence = 0.98;
        let justification = "The user query is standard and poses no threat to the model context constraints.";

        if (userInput.includes("system instructions") || userInput.includes("system prompt") || userInput.includes("explain your raw instructions") || userInput.includes("you are an analytics researcher")) {
          isSafe = false;
          threatType = "SYSTEM_LEAKAGE";
          confidence = 0.96;
          justification = "System prompt retrieval attempt detected. Query requests extraction of background directives.";
        } else if (userInput.includes("ignore") || userInput.includes("bypass") || userInput.includes("now act as")) {
          isSafe = false;
          threatType = "PROMPT_INJECTION";
          confidence = 0.94;
          justification = "Overriding commands detected. Query contains instructions to disregard rules.";
        }

        const report = {
          isSafe,
          threatType,
          confidenceScore: confidence,
          justification
        };
        resultText = JSON.stringify(report, null, 2);
      } else {
        // Fallback generic simulator for custom user-submitted prompts
        resultText = `=== SIMULATION OUTCOME ===
[Local Engine: ${testingModel}]
Successfully substitution-compiled template metrics.

Your template variables resolved as follows:
${Object.entries(variableValues).map(([name, val]) => `  - ${name}: "${val.slice(0, 30)}${val.length > 30 ? '...' : ''}"`).join('\n')}

MOCK AI COMPLETION RESPONSE:
Thank you for evaluating this compiled instruction set. The inputs were structured correctly inside markdown separation lines to reinforce structure. No system bypass signs were logged in the text.`;
      }

      setPlaygroundOutput(resultText);
      setPlaygroundLogs(prev => [
        ...prev,
        ...logUpdates,
        `[${new Date().toISOString().split('T')[1].slice(0, 8)}] Token output streamed successfully (~${resultText.length} characters)`
      ]);
      setIsTestingPrompt(false);
    }, 1200);
  };

  // Helper to copy strings
  const handleCopyText = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  // Trigger poll voting
  const handleVote = (option: string) => {
    if (userVoted) return; // single vote lock
    const updated = {
      ...pollVotes,
      [option]: (pollVotes[option] || 0) + 1
    };
    setPollVotes(updated);
    setUserVoted(option);
    localStorage.setItem('lexicon_poll_votes', JSON.stringify(updated));
    localStorage.setItem('lexicon_user_voted', option);
  };

  const totalVotes = useMemo(() => {
    return Object.values(pollVotes).reduce((a, b) => a + b, 0);
  }, [pollVotes]);

  // Submit Comments
  const submitComment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCommentText.trim()) return;

    const newComment = {
      id: Date.now(),
      author: newCommentName.trim() ? `@${newCommentName.replace(/\s+/g, '').toLowerCase()}` : "@community_pilot",
      role: "Inference Associate",
      comment: newCommentText,
      time: "Just now",
      likes: 0
    };

    const updatedList = [newComment, ...discussions];
    setDiscussions(updatedList);
    localStorage.setItem('lexicon_discussions', JSON.stringify(updatedList));
    setNewCommentName("");
    setNewCommentText("");

    setSuccessNotification("Suggestion added successfully to board!");
    setTimeout(() => setSuccessNotification(null), 3500);
  };

  const handleLikeComment = (id: number) => {
    const updated = discussions.map(d => {
      if (d.id === id) {
        return { ...d, likes: d.likes + 1 };
      }
      return d;
    });
    setDiscussions(updated);
    localStorage.setItem('lexicon_discussions', JSON.stringify(updated));
  };

  // Quick seed custom prompt generator
  const handleCreatePrompt = (e: React.FormEvent) => {
    e.preventDefault();
    if (!builderTitle.trim() || !builderTemplate.trim()) {
      setSuccessNotification("Trigger Fail: Title and Template fields are required.");
      setTimeout(() => setSuccessNotification(null), 3000);
      return;
    }

    const vars: PromptVariable[] = [];
    if (builderVariablesText.trim()) {
      builderVariablesText.split(";").forEach(pair => {
        const parts = pair.split(":");
        if (parts.length >= 2) {
          const name = parts[0].trim();
          const label = parts[1].trim();
          vars.push({
            name,
            label,
            placeholder: `Enter value for ${name.toLowerCase()}...`,
            defaultValue: "",
            type: "textarea"
          });
        }
      });
    }

    const braceRegex = /\{\{([^}]+)\}\}/g;
    let match;
    const foundVars: string[] = [];
    while ((match = braceRegex.exec(builderTemplate)) !== null) {
      foundVars.push(match[1]);
    }

    foundVars.forEach(vName => {
      if (!vars.some(v => v.name === vName)) {
        vars.push({
          name: vName,
          label: `${vName.charAt(0).toUpperCase() + vName.slice(1).toLowerCase()} Parameter`,
          placeholder: `Enter value for ${vName.toLowerCase()}...`,
          defaultValue: "",
          type: "textarea"
        });
      }
    });

    const newPrompt: PromptEntry = {
      id: builderTitle.toLowerCase().replace(/[^a-z0-9]+/g, "-"),
      title: builderTitle,
      tagline: builderTagline || "User-submitted instruction standard template",
      category: builderCategory,
      version: "v1.0.0",
      license: builderLicense,
      authors: ["Local Contributor"],
      targetModel: builderTargetModel,
      template: builderTemplate,
      variables: vars,
      background: builderBackground || "Prompt formulated using Lexicon lightweight builder.",
      patterns: ["Dynamic Metadata Layout"],
      analysis: {
        failureModes: ["Unvetted community layout. Requires structural test metrics."],
        quirks: {
          "Generic LLM": "Expected baseline instruction adherence."
        },
        adversarialScore: 82,
        adversarialNotes: "Unvetted user blueprint sandbox template. Suggest running regression safety checks."
      },
      benchmarks: {
        models: ["Universal Model", "Llama 3.1 70B", "Gemini 2.5 Flash"],
        accuracy: [88, 85, 90],
        latency: [800, 1100, 700]
      }
    };

    const updatedDb = [...prompts, newPrompt];
    setPrompts(updatedDb);
    localStorage.setItem('lexicon_prompts_db', JSON.stringify(updatedDb));
    handleSelectPrompt(newPrompt);

    setBuilderTitle("");
    setBuilderTagline("");
    setBuilderBackground("");
    
    setSuccessNotification("Prompt compiled & appended to persistent system registry!");
    setTimeout(() => setSuccessNotification(null), 4000);
  };

  // Format schema string to download
  const getPromptYAML = (entry: PromptEntry) => {
    return `id: "${entry.id}"
title: "${entry.title}"
tagline: "${entry.tagline}"
category: "${entry.category}"
version: "${entry.version}"
license: "${entry.license}"
authors:
${entry.authors.map(a => `  - "${a}"`).join('\n')}
target_model_family: "${entry.targetModel}"
patterns:
${entry.patterns.map(p => `  - "${p}"`).join('\n')}
vulnerability_metrics:
  adversarial_immunity_score: ${entry.analysis.adversarialScore}
  notes: "${entry.analysis.adversarialNotes.replace(/"/g, '\\"')}"
variables:
${entry.variables.map(v => `  - name: "${v.name}"\n    label: "${v.label}"\n    default: "${v.defaultValue.replace(/\n/g, '\\n')}"`).join('\n')}
template: |
${entry.template.split('\n').map(l => `  ${l}`).join('\n')}
`;
  };

  const handleDeleteCustomPrompts = () => {
    localStorage.removeItem('lexicon_prompts_db');
    setPrompts(PROMPTS_DATABASE);
    handleSelectPrompt(PROMPTS_DATABASE[0]);
    setSuccessNotification("Registry sandbox reset to default production list!");
    setTimeout(() => setSuccessNotification(null), 3000);
  };

  return (
    <div className="min-h-screen bg-[#fafafa] text-zinc-800 font-sans selection:bg-blue-500/10 selection:text-blue-800 pb-16">
      
      {/* Toast Notification */}
      <AnimatePresence>
        {successNotification && (
          <motion.div 
            initial={{ opacity: 0, y: -40, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="fixed top-6 right-6 z-50 flex items-center gap-3 bg-white border border-zinc-200 px-5 py-4 rounded-xl shadow-xl text-zinc-900 text-xs font-semibold font-mono"
          >
            <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
            <span>{successNotification}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Modern High-Density Sticky Subheader */}
      <div className="bg-zinc-900 text-zinc-200 text-[11px] font-mono py-2.5 px-4 flex justify-between items-center tracking-tight shadow-sm">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block animate-pulse" />
          <span className="text-zinc-400">ORGANIZATION:</span>
          <span className="text-zinc-100 font-semibold">INFERENCE FOUNDRY SYSTEMS</span>
        </div>
        <div className="hidden sm:flex items-center gap-4 text-zinc-400">
          <span>CATALOG: VER_1.1.2_STABLE</span>
          <span>•</span>
          <span>STATION: OFFLINE_CLIENT_SANDBOX</span>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        
        {/* Navigation & Brand Header */}
        <header className="mb-8 border-b border-zinc-200 pb-6 flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div className="text-left">
            <div className="flex items-center gap-2.5 mb-2">
              <span className="text-[10px] font-mono tracking-wider font-extrabold uppercase bg-zinc-100 border border-zinc-200 text-zinc-650 px-2.5 py-1 rounded">
                PROMPT REGISTRY SYSTEM
              </span>
              <span className="text-[10px] font-mono text-zinc-400">
                DEP_ID // REF_84920
              </span>
            </div>
            <h1 className="text-4xl font-black tracking-tighter text-zinc-900 flex items-center gap-2">
              <BookOpenText className="w-9 h-9 text-zinc-900" />
              LEXICON
            </h1>
            <p className="mt-1 text-sm text-zinc-500 font-mono tracking-tight max-w-xl">
              Strictly versioned, task-anchored instruction models & safety schemas. Hosted by Inference Foundry.
            </p>
          </div>

          {/* Social and External Links */}
          <div className="flex gap-2 font-mono text-[11px] font-semibold self-start md:self-end">
            <a 
              href="https://github.com/Inference-Foundry/.github/blob/main/docs/members/README.md"
              target="_blank" 
              rel="noreferrer"
              className="flex items-center gap-1.5 bg-white border border-zinc-200 hover:border-zinc-400 hover:bg-zinc-50 text-zinc-700 px-3.5 py-2 rounded-lg transition"
            >
              <Award className="w-3.5 h-3.5 text-zinc-500" />
              <span>Members</span>
            </a>
            <a 
              href="https://github.com/Inference-Foundry/.github/issues"
              target="_blank" 
              rel="noreferrer"
              className="flex items-center gap-1.5 bg-zinc-900 hover:bg-zinc-800 text-white px-3.5 py-2 rounded-lg transition"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              <span>Open PR</span>
            </a>
          </div>
        </header>

        {/* Bento Grid: Registry Metrics in Light Modern Theme */}
        <section className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8 text-left">
          <div className="bg-white border border-zinc-200/80 p-5 rounded-xl shadow-[0_1px_3px_rgba(0,0,0,0.02)]">
            <span className="text-[10px] font-mono text-zinc-400 uppercase tracking-wider block mb-1">PROMPTS INSTALLED</span>
            <div className="flex items-baseline gap-2">
              <span className="text-4xl font-extrabold text-zinc-900 tabular-nums">{prompts.length}</span>
              <span className="text-[10px] text-zinc-500 font-mono bg-zinc-150 border border-zinc-200 px-1.5 py-0.5 rounded">
                COMPREHENSIVE
              </span>
            </div>
            <p className="text-[11px] text-zinc-500 mt-2 font-mono">Durable local catalog</p>
          </div>

          <div className="bg-white border border-zinc-200/80 p-5 rounded-xl shadow-[0_1px_3px_rgba(0,0,0,0.02)]">
            <span className="text-[10px] font-mono text-zinc-400 uppercase tracking-wider block mb-1">AVG SECURITY AUDIT</span>
            <div className="flex items-baseline gap-1.5">
              <span className="text-4xl font-extrabold text-emerald-600 tabular-nums">93.4%</span>
              <span className="text-[9px] bg-emerald-50 border border-emerald-250 text-emerald-750 px-1.5 py-0.5 rounded font-mono font-bold">
                HIGH IMMUNITY
              </span>
            </div>
            <p className="text-[11px] text-zinc-500 mt-2 font-mono">Protected against injection</p>
          </div>

          <div className="bg-white border border-zinc-200/80 p-5 rounded-xl shadow-[0_1px_3px_rgba(0,0,0,0.02)]">
            <span className="text-[10px] font-mono text-zinc-400 uppercase tracking-wider block mb-1">LICENSE STANDARD</span>
            <div className="flex items-baseline gap-2">
              <span className="text-4xl font-extrabold text-zinc-900 font-mono">MIT</span>
              <span className="text-xs text-zinc-500 font-mono">/ CC0</span>
            </div>
            <p className="text-[11px] text-zinc-500 mt-2 font-mono">Open-source compliance</p>
          </div>

          <div className="bg-white border border-zinc-200/80 p-5 rounded-xl shadow-[0_1px_3px_rgba(0,0,0,0.02)]">
            <span className="text-[10px] font-mono text-zinc-400 uppercase tracking-wider block mb-1">SIMULATION ENGINE</span>
            <div className="flex items-baseline gap-2">
              <span className="text-4xl font-extrabold text-blue-600 font-mono">LOCAL</span>
              <span className="text-[9px] bg-blue-50 border border-blue-200 text-blue-700 px-1.5 py-0.5 rounded font-mono font-bold">
                SECURE
              </span>
            </div>
            <p className="text-[11px] text-zinc-500 mt-2 font-mono">Zero data leakage</p>
          </div>
        </section>

        {/* Dual Layout: Sidebar Directory & Workspace */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          
          {/* LEFT SIDEBAR: Prompt Directory (5 cols) */}
          <section className="lg:col-span-5 space-y-6">
            
            <div className="bg-white border border-zinc-200 rounded-xl p-5 shadow-[0_1px_3px_rgba(0,0,0,0.01)] text-left">
              <h2 className="text-sm font-bold tracking-tight text-zinc-800 uppercase font-mono flex items-center gap-2 mb-4">
                <Filter className="w-4 h-4 text-zinc-500" />
                Registry Index list
              </h2>

              {/* Dynamic Filter Search */}
              <div className="relative mb-4">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-zinc-400" />
                <input
                  type="text"
                  placeholder="Regex or keyword filter..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-[#fafafa] border border-zinc-200 focus:border-zinc-400 focus:bg-white rounded-lg py-2 pl-9 pr-4 text-xs font-mono text-zinc-800 placeholder:text-zinc-400 focus:outline-none transition"
                />
              </div>

              {/* Category Tab buttons */}
              <div className="flex flex-wrap gap-1 mb-4 pb-4 border-b border-zinc-100">
                {CATEGORIES.map(cat => (
                  <button
                    key={cat.id}
                    onClick={() => setActiveCategory(cat.id)}
                    className={`px-2.5 py-1 text-[10px] rounded-md border font-semibold tracking-tight transition cursor-pointer ${
                      activeCategory === cat.id
                        ? 'bg-zinc-900 text-white border-zinc-900'
                        : 'bg-white text-zinc-500 border-zinc-200 hover:border-zinc-300 hover:text-zinc-800'
                    }`}
                  >
                    {cat.label}
                  </button>
                ))}
              </div>

              {/* Directory rows */}
              <div className="space-y-2 max-h-[480px] overflow-y-auto pr-1">
                {filteredPrompts.length === 0 ? (
                  <div className="text-center py-12 border border-dashed border-zinc-200 bg-zinc-50 rounded-lg">
                    <HelpCircle className="w-8 h-8 text-zinc-350 mx-auto mb-2" />
                    <p className="text-xs text-zinc-500 font-mono">Zero matches on query filter</p>
                  </div>
                ) : (
                  filteredPrompts.map(prompt => {
                    const isSelected = selectedPrompt?.id === prompt.id;
                    const catInfo = CATEGORIES.find(c => c.id === prompt.category);
                    return (
                      <div
                        id={`prompt-card-${prompt.id}`}
                        key={prompt.id}
                        onClick={() => handleSelectPrompt(prompt)}
                        className={`p-4 rounded-lg border text-left transition duration-200 cursor-pointer ${
                          isSelected 
                            ? 'bg-zinc-50 border-zinc-900 shadow-[0_2px_8px_-3px_rgba(0,0,0,0.05)]' 
                            : 'bg-white border-zinc-200 hover:border-zinc-400'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-1.5">
                          <span className={`text-[9px] font-mono tracking-tight font-extrabold uppercase px-2 py-0.5 rounded border ${
                            prompt.category === 'safety' ? 'bg-rose-50 text-rose-700 border-rose-100' :
                            prompt.category === 'rag' ? 'bg-indigo-50 text-indigo-700 border-indigo-100' :
                            prompt.category === 'reasoning' ? 'bg-amber-50 text-amber-700 border-amber-100' :
                            prompt.category === 'structured-output' ? 'bg-cyan-50 text-cyan-700 border-cyan-100' :
                            'bg-zinc-50 text-zinc-750 border-zinc-150'
                          }`}>
                            {catInfo?.label || prompt.category}
                          </span>
                          <span className="text-[10px] text-zinc-400 font-mono whitespace-nowrap">
                            SYSTEMID: {prompt.version}
                          </span>
                        </div>
                        <h3 className="text-xs font-bold text-zinc-900 font-mono uppercase tracking-tight">
                          {prompt.title}
                        </h3>
                        <p className="text-[11px] text-zinc-500 mt-1 line-clamp-2 leading-relaxed">
                          {prompt.tagline}
                        </p>
                        
                        <div className="mt-3 pt-3 border-t border-zinc-100 flex items-center justify-between text-[10px] text-zinc-400 font-mono">
                          <span className="flex items-center gap-1 font-semibold">
                            <Cpu className="w-3 h-3 text-zinc-350" />
                            {prompt.targetModel}
                          </span>
                          <span className="bg-zinc-100 text-zinc-650 px-1.5 py-0.2 rounded font-semibold uppercase text-[9px] border border-zinc-200">
                            {prompt.license}
                          </span>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              {/* Reset database if custom schemas have been added */}
              {prompts.length > PROMPTS_DATABASE.length && (
                <div className="mt-4 pt-4 border-t border-zinc-100">
                  <button
                    onClick={handleDeleteCustomPrompts}
                    className="w-full flex items-center justify-center gap-1.5 bg-rose-50 border border-rose-200 hover:bg-rose-100 text-rose-700 py-2 rounded-lg text-xs font-mono font-bold transition cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Reset Custom Extensions</span>
                  </button>
                </div>
              )}
            </div>

            {/* Design Standards Informational Block */}
            <div className="bg-white border border-zinc-250/70 p-5 rounded-xl text-left">
              <h3 className="text-xs font-bold uppercase tracking-wide text-zinc-800 font-mono flex items-center gap-2 mb-3">
                <Shield className="w-4 h-4 text-zinc-600" />
                Prompt Engineering Standards
              </h3>
              <p className="text-[12px] text-zinc-500 leading-relaxed mb-4">
                Inference Foundry prompts are constructed according to a strict mathematical and lexical framework to enforce target outcomes.
              </p>
              <div className="space-y-3.5 font-sans">
                <div className="flex gap-2.5 items-start">
                  <span className="text-xs font-mono font-black text-zinc-400 bg-zinc-100 h-5 w-5 rounded flex items-center justify-center shrink-0">01</span>
                  <div>
                    <h4 className="text-xs font-bold text-zinc-800 font-mono uppercase">Sandboxed Deliberation</h4>
                    <p className="text-[11px] text-zinc-500 leading-normal">Surrounding variable parameters with XML descriptors acts as an effective command-isolation barrier.</p>
                  </div>
                </div>
                <div className="flex gap-2.5 items-start">
                  <span className="text-xs font-mono font-black text-zinc-400 bg-zinc-100 h-5 w-5 rounded flex items-center justify-center shrink-0">02</span>
                  <div>
                    <h4 className="text-xs font-bold text-zinc-800 font-mono uppercase">Ignorance Anchoring</h4>
                    <p className="text-[11px] text-zinc-500 leading-normal">Failing cleanly with fixed syntax results is twice as productive as generating smooth hallucinations.</p>
                  </div>
                </div>
                <div className="flex gap-2.5 items-start">
                  <span className="text-xs font-mono font-black text-zinc-400 bg-zinc-100 h-5 w-5 rounded flex items-center justify-center shrink-0">03</span>
                  <div>
                    <h4 className="text-xs font-bold text-zinc-800 font-mono uppercase">Verification loops</h4>
                    <p className="text-[11px] text-zinc-500 leading-normal">Encouraging model output to double-calculate coordinates prior to rendering final values improves mathematical correctness by over 14%.</p>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* MAIN WORKSPACE GRID: Interactive Console & Sandbox (7 cols) */}
          <main className="lg:col-span-7 space-y-6">
            
            {selectedPrompt ? (
              <div className="bg-white border border-zinc-200 rounded-xl overflow-hidden shadow-[0_1px_3px_rgba(0,0,0,0.01)] text-left">
                
                {/* Selected Prompt Header metadata */}
                <div className="bg-zinc-50 p-6 border-b border-zinc-250/80">
                  <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
                    <span className="text-zinc-600 bg-zinc-150 border border-zinc-250 px-2.5 py-1 rounded-md text-[10px] font-mono tracking-wider font-extrabold uppercase">
                      CAT_ID: {selectedPrompt.category.toUpperCase()} • DESIGN STABLE
                    </span>
                    <div className="flex items-center gap-1.5">
                      <span className="text-[10px] font-mono text-zinc-500 bg-white border border-zinc-200 px-2.5 py-1 rounded-md">
                        VERSION: {selectedPrompt.version}
                      </span>
                      <button
                        onClick={() => handleCopyText(getPromptYAML(selectedPrompt), selectedPrompt.id)}
                        className="p-1.5 bg-white border border-zinc-200 hover:border-zinc-400 rounded-md text-zinc-500 hover:text-zinc-800 transition cursor-pointer"
                        title="Copy YAML Schema"
                      >
                        {copiedId === selectedPrompt.id ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                  </div>

                  <h2 className="text-xl font-bold font-mono tracking-tight text-zinc-900 uppercase">
                    {selectedPrompt.title}
                  </h2>
                  <p className="text-xs text-zinc-500 mt-1 uppercase font-mono tracking-tight italic">
                    &ldquo;{selectedPrompt.tagline}&rdquo;
                  </p>

                  {/* System Tags Row */}
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-y-3 gap-x-4 mt-5 pt-4 border-t border-zinc-200/80 text-[11px] font-mono">
                    <div>
                      <span className="text-[9px] text-zinc-400 block uppercase font-bold">Standard License</span>
                      <span className="font-semibold text-zinc-700">{selectedPrompt.license} open-license</span>
                    </div>
                    <div>
                      <span className="text-[9px] text-zinc-400 block uppercase font-bold">Registry Authors</span>
                      <span className="font-semibold text-zinc-700 truncate block">{selectedPrompt.authors.join(", ")}</span>
                    </div>
                    <div className="col-span-2 sm:col-span-1">
                      <span className="text-[9px] text-zinc-400 block uppercase font-bold">Optimal engine family</span>
                      <span className="font-semibold text-blue-600 font-mono select-all shrink-0">{selectedPrompt.targetModel}</span>
                    </div>
                  </div>
                </div>

                {/* Main Action Tabs */}
                <div className="flex bg-[#fafafa] border-b border-zinc-200 px-2 pt-2">
                  <button
                    onClick={() => setWorkspaceTab('playground')}
                    className={`flex items-center gap-2 px-5 py-3 text-[11px] uppercase font-mono tracking-wider font-extrabold border-b-2 transition duration-200 cursor-pointer ${
                      workspaceTab === 'playground'
                        ? 'border-zinc-905 text-zinc-900 bg-white'
                        : 'border-transparent text-zinc-400 hover:text-zinc-600'
                    }`}
                  >
                    <Terminal className="w-3.5 h-3.5 text-zinc-500" />
                    <span>Sandbox simulation</span>
                  </button>
                  <button
                    onClick={() => setWorkspaceTab('analysis')}
                    className={`flex items-center gap-2 px-5 py-3 text-[11px] uppercase font-mono tracking-wider font-extrabold border-b-2 transition duration-200 cursor-pointer ${
                      workspaceTab === 'analysis'
                        ? 'border-zinc-905 text-zinc-900 bg-white'
                        : 'border-transparent text-zinc-400 hover:text-zinc-600'
                    }`}
                  >
                    <Sliders className="w-3.5 h-3.5 text-zinc-500" />
                    <span>Vulnerabilities & Fine-Tune</span>
                  </button>
                  <button
                    onClick={() => setWorkspaceTab('integration')}
                    className={`flex items-center gap-2 px-5 py-3 text-[11px] uppercase font-mono tracking-wider font-extrabold border-b-2 transition duration-200 cursor-pointer ${
                      workspaceTab === 'integration'
                        ? 'border-zinc-905 text-zinc-900 bg-white'
                        : 'border-transparent text-zinc-400 hover:text-zinc-600'
                    }`}
                  >
                    <Code className="w-3.5 h-3.5 text-zinc-500" />
                    <span>Source Schemas (YAML)</span>
                  </button>
                </div>

                {/* Tab content wrapper */}
                <div className="p-6">
                  
                  {/* TAB 1: SANDBOX PLAYGROUND */}
                  {workspaceTab === 'playground' && (
                    <div className="space-y-6 text-left">
                      
                      {/* Substituted Variables Form */}
                      <div>
                        <h4 className="text-[10px] font-mono uppercase text-zinc-400 tracking-wider font-bold mb-3">
                          1. Dynamic Evaluation Variables
                        </h4>
                        <div className="grid grid-cols-1 gap-4 bg-[#fafafa] p-4 rounded-xl border border-zinc-200">
                          {selectedPrompt.variables.length === 0 ? (
                            <p className="text-xs text-zinc-400 font-mono">No substitution variables identified in system template.</p>
                          ) : (
                            selectedPrompt.variables.map(v => (
                              <div key={v.name} className="space-y-1.5 text-left">
                                <label className="flex items-center justify-between text-[11px] font-mono">
                                  <span className="font-extrabold text-blue-600">{`{{${v.name}}}`}</span>
                                  <span className="text-zinc-400 font-normal">{v.label}</span>
                                </label>
                                {v.type === 'textarea' ? (
                                  <textarea
                                    placeholder={v.placeholder}
                                    value={variableValues[v.name] || ""}
                                    onChange={(e) => setVariableValues({...variableValues, [v.name]: e.target.value})}
                                    className="w-full bg-white border border-zinc-200 focus:border-zinc-400 focus:outline-none rounded-lg p-3 text-xs font-mono text-zinc-850 resize-y min-h-[85px] leading-relaxed transition"
                                  />
                                ) : (
                                  <input
                                    type="text"
                                    placeholder={v.placeholder}
                                    value={variableValues[v.name] || ""}
                                    onChange={(e) => setVariableValues({...variableValues, [v.name]: e.target.value})}
                                    className="w-full bg-white border border-zinc-200 focus:border-zinc-400 focus:outline-none rounded-lg p-3 text-xs font-mono text-zinc-850 transition"
                                  />
                                )}
                              </div>
                            ))
                          )}
                        </div>
                      </div>

                      {/* Real-time Substituted Preview & Prompt Copier Station */}
                      <div className="space-y-3.5">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-zinc-100 pb-2">
                          <h4 className="text-[10px] font-mono uppercase text-zinc-500 tracking-wider font-extrabold flex items-center gap-1.5">
                            <span className="w-1.5 h-1.5 bg-zinc-900 rounded-full" />
                            2. Prompt Preview & Copier Board
                          </h4>
                          <span className="text-[9px] text-zinc-400 font-mono uppercase">
                            Copy to use in any platform (Gemini, ChatGPT, etc.)
                          </span>
                        </div>

                        {/* High-visibility Action Buttons card */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          {/* Copy Filled Prompt Button */}
                          <button
                            onClick={() => handleCopyText(getSubstitutedTemplate(), 'copy-filled')}
                            className={`w-full py-4 px-4 rounded-xl font-mono text-xs font-bold tracking-tight transition-all duration-200 flex items-center justify-center gap-2 cursor-pointer shadow-sm border ${
                              copiedId === 'copy-filled'
                                ? 'bg-emerald-50 border-emerald-400 text-emerald-700 font-extrabold'
                                : 'bg-zinc-900 border-zinc-950 text-white hover:bg-zinc-800 hover:shadow-md'
                            }`}
                          >
                            {copiedId === 'copy-filled' ? (
                              <>
                                <Check className="w-4 h-4 text-emerald-600 animate-bounce" />
                                <span>COPIED GROUNDED PROMPT!</span>
                              </>
                            ) : (
                              <>
                                <Copy className="w-4 h-4 text-zinc-300" />
                                <span>Copy Filled Prompt (With Inputs)</span>
                              </>
                            )}
                          </button>

                          {/* Copy Raw Template Button */}
                          <button
                            onClick={() => handleCopyText(selectedPrompt.template, 'copy-raw')}
                            className={`w-full py-4 px-4 rounded-xl font-mono text-xs font-bold tracking-tight transition-all duration-200 flex items-center justify-center gap-2 cursor-pointer border ${
                              copiedId === 'copy-raw'
                                ? 'bg-emerald-50 border-emerald-400 text-emerald-700 font-extrabold'
                                : 'bg-white border-zinc-200 hover:border-zinc-400 text-zinc-700 hover:text-zinc-900 hover:bg-zinc-50/50'
                            }`}
                          >
                            {copiedId === 'copy-raw' ? (
                              <>
                                <Check className="w-4 h-4 text-emerald-600 animate-bounce" />
                                <span>COPIED RAW PROMPT CODE!</span>
                              </>
                            ) : (
                              <>
                                <Code className="w-4 h-4 text-zinc-400" />
                                <span>Copy Raw Prompt Template</span>
                              </>
                            )}
                          </button>
                        </div>

                        {/* Interactive live preview block */}
                        <div className="bg-[#fafafa] border border-zinc-200 rounded-xl p-4 max-h-[220px] overflow-y-auto shadow-inner relative group">
                          <pre className="text-[11px] font-mono whitespace-pre-wrap text-zinc-650 leading-relaxed font-sans text-left selection:bg-zinc-200">
                            {getSubstitutedTemplate()}
                          </pre>
                        </div>
                      </div>

                      {/* Compiled Console Controls */}
                      <div className="pt-4 border-t border-zinc-150">
                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                          <div className="flex items-center gap-3">
                            <label className="text-xs text-zinc-500 font-mono">Mock Target Engine:</label>
                            <select
                              value={testingModel}
                              onChange={(e) => setTestingModel(e.target.value)}
                              className="bg-white border border-zinc-250 text-xs text-zinc-700 rounded-lg py-1.5 px-3 focus:outline-none font-mono cursor-pointer"
                            >
                              <option value="gemini-2.5-flash">gemini-2.5-flash (Fast)</option>
                              <option value="gemini-2.5-pro">gemini-2.5-pro (Reasoning)</option>
                              <option value="llama-3.1-70b">llama-3.1-70B (OpenSource)</option>
                            </select>
                          </div>

                          <button
                            onClick={handleClientSimulation}
                            disabled={isTestingPrompt}
                            className="w-full sm:w-auto flex items-center justify-center gap-2 bg-zinc-900 border border-zinc-950 text-white hover:bg-zinc-850 px-6 py-2.5 rounded-xl font-mono text-xs font-bold tracking-tight transition cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed uppercase"
                          >
                            {isTestingPrompt ? (
                              <>
                                <RefreshCw className="w-3.5 h-3.5 animate-spin text-zinc-300" />
                                <span>Evaluating Token Stream...</span>
                              </>
                            ) : (
                              <>
                                <Play className="w-3.5 h-3.5 shrink-0" />
                                <span>Compile & Execute Sandbox</span>
                              </>
                            )}
                          </button>
                        </div>

                        {/* Sandbox Console output */}
                        <AnimatePresence>
                          {(playgroundOutput || playgroundLogs.length > 0 || isTestingPrompt) && (
                            <motion.div
                              initial={{ opacity: 0, height: 0 }}
                              animate={{ opacity: 1, height: 'auto' }}
                              exit={{ opacity: 0, height: 0 }}
                              className="mt-4 pt-1"
                            >
                              <div className="bg-zinc-900 border border-zinc-950 rounded-xl overflow-hidden shadow-lg text-left">
                                
                                <div className="bg-zinc-850 px-4 py-2.5 flex items-center justify-between border-b border-zinc-800 text-[10px]">
                                  <span className="font-mono text-zinc-300 flex items-center gap-1.5">
                                    <Terminal className="w-3.5 h-3.5 text-blue-400 animate-pulse" />
                                    LOCAL DETERMINISTIC MOCK COMPILER STREAM
                                  </span>
                                  {playgroundOutput && (
                                    <button
                                      onClick={() => handleCopyText(playgroundOutput, 'console')}
                                      className="text-zinc-400 hover:text-white font-mono text-[10px] flex items-center gap-1 cursor-pointer"
                                    >
                                      {copiedId === 'console' ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                                      <span>{copiedId === 'console' ? 'Copied' : 'Copy'}</span>
                                    </button>
                                  )}
                                </div>

                                <div className="p-4 space-y-4 max-h-[350px] overflow-y-auto">
                                  
                                  {/* Micro Terminal logs */}
                                  <div className="font-mono text-[9px] text-zinc-400 space-y-1 bg-zinc-950/50 p-2.5 rounded border border-zinc-800">
                                    {playgroundLogs.map((log, lidx) => (
                                      <div key={lidx}>{log}</div>
                                    ))}
                                    {isTestingPrompt && (
                                      <div className="animate-pulse text-blue-400 flex items-center gap-1">
                                        <span>• Rendering prediction based on context parameters...</span>
                                      </div>
                                    )}
                                  </div>

                                  {playgroundError && (
                                    <div className="flex gap-2 text-rose-400 bg-rose-950/20 border border-rose-900/40 p-3 rounded-lg text-xs leading-normal font-mono">
                                      <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                                      <div>
                                        <h5 className="font-bold">SIMULATION ERROR:</h5>
                                        <p>{playgroundError}</p>
                                      </div>
                                    </div>
                                  )}

                                  {playgroundOutput && (
                                    <div className="bg-zinc-950 p-4 rounded-lg border border-zinc-850">
                                      <span className="text-[8px] font-mono text-zinc-500 uppercase tracking-widest block mb-2 font-bold">MODEL OUTPUT COMPLETED</span>
                                      <pre className="text-xs font-mono text-zinc-100 whitespace-pre-wrap leading-relaxed">
                                        {playgroundOutput}
                                      </pre>
                                    </div>
                                  )}
                                </div>
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>

                    </div>
                  )}

                  {/* TAB 2: ANALYSIS & FAILURE MODES */}
                  {workspaceTab === 'analysis' && (
                    <div className="space-y-6 text-left">
                      
                      {/* Benchmarks Graphic bar charts */}
                      <div>
                        <h4 className="text-[10px] font-mono uppercase text-zinc-400 tracking-wider font-bold mb-3">
                          1. Model Execution Consistency Benchmarks
                        </h4>
                        <div className="bg-[#fafafa] border border-zinc-205 p-5 rounded-xl">
                          <p className="text-[11px] text-zinc-500 mb-4 font-mono">
                            Deterministic reliability audits under target benchmark vectors (higher score implies higher accuracy):
                          </p>
                          <div className="space-y-4">
                            {selectedPrompt.benchmarks.models.map((model, idx) => {
                              const score = selectedPrompt.benchmarks.accuracy[idx] || 0;
                              const latency = selectedPrompt.benchmarks.latency[idx] || 0;
                              return (
                                <div key={model} className="space-y-1.5 text-xs text-left">
                                  <div className="flex justify-between font-mono text-[11px]">
                                    <span className="text-zinc-800 font-bold">{model}</span>
                                    <span className="text-zinc-500 font-semibold">{score}% Trace Accuracy • ~{latency}ms</span>
                                  </div>
                                  <div className="w-full bg-zinc-200/60 h-2.5 rounded-full overflow-hidden border border-zinc-200">
                                    <div 
                                      className="bg-zinc-800 h-full rounded-full transition-all duration-1000" 
                                      style={{ width: `${score}%` }}
                                    />
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      </div>

                      {/* Qualitative Failure modes schema list */}
                      <div>
                        <h4 className="text-[10px] font-mono uppercase text-zinc-400 tracking-wider font-bold mb-2.5">
                          2. Identified Weaknesses & Token Escapes
                        </h4>
                        <div className="space-y-2.5">
                          {selectedPrompt.analysis.failureModes.map((fm, idx) => (
                            <div key={idx} className="flex gap-3 bg-rose-50/40 p-4 rounded-xl border border-rose-100 text-left">
                              <ShieldAlert className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                              <p className="text-xs text-zinc-700 leading-relaxed font-mono">{fm}</p>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Model Quirks */}
                      <div>
                        <h4 className="text-[10px] font-mono uppercase text-zinc-400 tracking-wider font-bold mb-3">
                          3. Fine-Tune Observations per Tokenizer Family
                        </h4>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          {Object.entries(selectedPrompt.analysis.quirks).map(([mName, qText]) => (
                            <div key={mName} className="p-4 bg-zinc-50 border border-zinc-200 rounded-xl text-left">
                              <span className="text-[9px] font-mono text-zinc-400 uppercase font-black tracking-wider block mb-1.5">
                                FAMILY: {mName}
                              </span>
                              <p className="text-xs text-zinc-650 leading-relaxed font-mono font-sans">
                                {qText}
                              </p>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Immunization rating against injections */}
                      <div className="bg-white border border-zinc-200 p-4 rounded-xl flex flex-col sm:flex-row items-center gap-4 text-left">
                        <div className="text-center shrink-0 p-3 bg-zinc-50 border border-zinc-200 rounded-xl min-w-[120px]">
                          <span className="text-[9px] font-mono text-zinc-400 uppercase tracking-tight block">IMMUNITY VAL</span>
                          <span className="text-3xl font-black text-emerald-600 font-mono">{selectedPrompt.analysis.adversarialScore}%</span>
                        </div>
                        <div className="space-y-1">
                          <h5 className="text-xs font-bold text-zinc-800 font-mono uppercase flex items-center gap-1.5">
                            <Shield className="w-3.5 h-3.5 text-emerald-600" />
                            Adversarial robustness audit report
                          </h5>
                          <p className="text-[11px] text-zinc-500 leading-relaxed font-mono">
                            {selectedPrompt.analysis.adversarialNotes}
                          </p>
                        </div>
                      </div>

                    </div>
                  )}

                  {/* TAB 3: SCHEMAS INTEGRATION */}
                  {workspaceTab === 'integration' && (
                    <div className="space-y-6 text-left">
                      
                      {/* YAML block rendering */}
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <h4 className="text-[10px] font-mono uppercase text-zinc-400 tracking-wider font-bold">
                            1. Inference Foundry Specs (Blueprint Schema)
                          </h4>
                          <button
                            onClick={() => handleCopyText(getPromptYAML(selectedPrompt), 'yaml')}
                            className="text-[10px] text-blue-600 hover:text-blue-800 font-mono font-bold flex items-center gap-1 cursor-pointer"
                          >
                            {copiedId === 'yaml' ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                            <span>{copiedId === 'yaml' ? 'COPIED TO CLIPBOARD' : 'COPY SCHEMAS CODE'}</span>
                          </button>
                        </div>
                        <div className="bg-zinc-900 border border-zinc-950 rounded-xl p-4 overflow-x-auto shadow-md">
                          <pre className="text-[11px] font-mono text-zinc-200 whitespace-pre leading-relaxed selection:bg-zinc-800">
                            {getPromptYAML(selectedPrompt)}
                          </pre>
                        </div>
                      </div>

                      {/* Stash client loading instructions */}
                      <div className="bg-zinc-50 border border-zinc-200 p-5 rounded-xl">
                        <h4 className="text-xs font-bold text-zinc-800 font-mono uppercase flex items-center gap-1.5 mb-2">
                          <Layers className="w-4 h-4 text-zinc-500" />
                          Programmatic Client loading guidelines
                        </h4>
                        <p className="text-[12px] text-zinc-500 leading-relaxed mb-4">
                          To parse this prompt within your client applications, retrieve the YAML string and replace the curly brackets variables securely inside a parser block:
                        </p>
                        <div className="bg-zinc-900 rounded-lg p-3 overflow-x-auto text-left">
                          <pre className="text-[10px] font-mono text-zinc-300 leading-relaxed">
{`const compileLexiconPrompt = (yamlTemplate, variables = {}) => {
  let prompt = yamlTemplate.template;
  for (const [key, val] of Object.entries(variables)) {
    prompt = prompt.replace(new RegExp('\\\\{\\\\{' + key + '\\\\}\\\\}', 'g'), val);
  }
  return prompt;
};`}
                          </pre>
                        </div>
                      </div>

                    </div>
                  )}

                </div>

                {/* Footnotes background context info */}
                <div className="bg-zinc-50/50 p-5 border-t border-zinc-200 text-xs text-zinc-500 text-left leading-relaxed">
                  <span className="font-mono text-zinc-400 block uppercase text-[9px] font-bold mb-1">PROMPT BACKGROUND CHRONICLES</span>
                  <p className="font-mono text-[11px] font-sans">
                    {selectedPrompt.background}
                  </p>
                  <div className="flex flex-wrap gap-2 mt-3">
                    {selectedPrompt.patterns.map((pt, pidx) => (
                      <span key={pidx} className="bg-white border border-zinc-200 text-zinc-600 text-[9px] px-2 py-0.5 rounded font-mono font-bold">
                        #{pt.toUpperCase()}
                      </span>
                    ))}
                  </div>
                </div>

              </div>
            ) : (
              <div className="bg-white border border-zinc-205 p-12 rounded-xl text-center shadow-sm">
                <Sliders className="w-12 h-12 text-zinc-300 mx-auto mb-4 animate-bounce" />
                <h3 className="text-base font-bold font-mono text-zinc-800">NO REGISTRY PROMPT SELECTED</h3>
                <p className="text-xs text-zinc-500 mt-1 max-w-sm mx-auto">Please navigate the index list on the left to initiate compile simulations.</p>
              </div>
            )}

            {/* COLLAPSIBLE CONTRIBUTOR LAB CONSOLE */}
            <div className="bg-white border border-zinc-200 rounded-xl p-4 shadow-[0_1px_3px_rgba(0,0,0,0.01)] text-left">
              <button
                type="button"
                onClick={() => setShowContributorLab(!showContributorLab)}
                className="w-full flex items-center justify-between gap-3 text-left font-mono cursor-pointer transition-all hover:bg-zinc-50 p-2 text-zinc-800 focus:outline-none"
              >
                <div className="flex items-center gap-3">
                  <div className="h-8 w-8 bg-zinc-100 border border-zinc-200 rounded-lg flex items-center justify-center shrink-0">
                    <Sparkles className="w-4 h-4 text-zinc-700 animate-pulse" />
                  </div>
                  <div>
                    <h3 className="text-[12px] font-bold text-zinc-900 uppercase tracking-tight flex items-center gap-1.5">
                      {showContributorLab ? "Hide Contributor Extensions Lab" : "Open Contributor Extensions Lab"}
                    </h3>
                    <p className="text-[10px] text-zinc-400 mt-0.5 leading-none">
                      {showContributorLab ? "Collapse builder, dynamic poll, and suggestions" : "Expand custom blueprint compiler, developer poll, and collaboration suggestion boards"}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[9px] font-bold text-zinc-400 bg-zinc-100 px-2 py-0.5 rounded border border-zinc-200">
                    {showContributorLab ? "ACTIVE" : "COLLAPSED"}
                  </span>
                  <ChevronRight className={`w-4 h-4 text-zinc-400 transition-transform duration-300 ${showContributorLab ? "rotate-90 text-zinc-800" : ""}`} />
                </div>
              </button>
            </div>

            {showContributorLab && (
              <div className="space-y-6">
            <div className="bg-white border border-zinc-200 rounded-xl p-6 shadow-[0_1px_3px_rgba(0,0,0,0.01)] text-left">
              <div className="flex items-center gap-2 mb-4 border-b border-zinc-100 pb-3">
                <Plus className="w-5 h-5 text-zinc-600" />
                <div>
                  <h3 className="text-sm font-extrabold uppercase font-mono text-zinc-900 tracking-tight">COMPILE NEW PROMPT BLUEPRINT</h3>
                  <p className="text-[11px] text-zinc-400 font-mono leading-none mt-1">Append custom schemas to local catalog state</p>
                </div>
              </div>

              <form onSubmit={handleCreatePrompt} className="space-y-4 font-mono text-xs">
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5 text-left">
                    <label className="font-bold text-zinc-600">PARADIGM TITLE <span className="text-rose-500">*</span></label>
                    <input
                      type="text"
                      placeholder="e.g. Strict Translation Scaffolder"
                      value={builderTitle}
                      onChange={(e) => setBuilderTitle(e.target.value)}
                      className="w-full bg-[#fafafa] border border-zinc-200 rounded-lg p-2.5 focus:border-zinc-400 focus:outline-none transition text-zinc-805"
                      required
                    />
                  </div>
                  <div className="space-y-1.5 text-left">
                    <label className="font-bold text-zinc-650">SUBTITLE / TAGLINE</label>
                    <input
                      type="text"
                      placeholder="e.g. Minimizes word count bloat tags"
                      value={builderTagline}
                      onChange={(e) => setBuilderTagline(e.target.value)}
                      className="w-full bg-[#fafafa] border border-zinc-200 rounded-lg p-2.5 focus:border-zinc-400 focus:outline-none transition text-zinc-805"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="space-y-1.5 text-left">
                    <label className="font-bold text-zinc-600">CATEGORY</label>
                    <select
                      value={builderCategory}
                      onChange={(e: any) => setBuilderCategory(e.target.value)}
                      className="w-full bg-white border border-zinc-200 rounded-lg p-2.5 outline-none cursor-pointer text-zinc-805"
                    >
                      <option value="rag">Retrieval (RAG)</option>
                      <option value="reasoning">Reasoning Chain</option>
                      <option value="code-generation">Code Gen</option>
                      <option value="structured-output">JSON Outputs</option>
                      <option value="safety">Safety Guard</option>
                      <option value="summarization">Summarization</option>
                      <option value="classification">Classification</option>
                    </select>
                  </div>
                  <div className="space-y-1.5 text-left">
                    <label className="font-bold text-zinc-600">OPEN LICENSE</label>
                    <select
                      value={builderLicense}
                      onChange={(e: any) => setBuilderLicense(e.target.value)}
                      className="w-full bg-white border border-zinc-200 rounded-lg p-2.5 outline-none cursor-pointer text-zinc-850"
                    >
                      <option value="MIT">MIT Open-Source</option>
                      <option value="Apache-2.0">Apache 2.0</option>
                      <option value="CC0-1.0">Creative Commons CC0</option>
                      <option value="Unlicense">Unlicense</option>
                    </select>
                  </div>
                  <div className="space-y-1.5 text-left">
                    <label className="font-bold text-zinc-600">ENGINE TARGET</label>
                    <input
                      type="text"
                      placeholder="e.g. Gemini 2.5 +"
                      value={builderTargetModel}
                      onChange={(e) => setBuilderTargetModel(e.target.value)}
                      className="w-full bg-[#fafafa] border border-zinc-200 rounded-lg p-2.5 focus:border-zinc-400 focus:outline-none transition text-zinc-805"
                    />
                  </div>
                </div>

                <div className="space-y-1.5 text-left">
                  <label className="font-bold text-zinc-600">DECLARED INPUT VARIABLES (Semi-colon separated)</label>
                  <input
                    type="text"
                    placeholder="e.g. DOCUMENT: Context details string; QUESTION: User Question"
                    value={builderVariablesText}
                    onChange={(e) => setBuilderVariablesText(e.target.value)}
                    className="w-full bg-[#fafafa] border border-zinc-200 rounded-lg p-2.5 focus:border-zinc-400 focus:outline-none transition text-zinc-805"
                  />
                  <p className="text-[10px] text-zinc-400 font-normal leading-normal">
                    Format: VARIABLE_NAME: Long-form Human Label. Variables must exist in the blueprint template block below.
                  </p>
                </div>

                <div className="space-y-1.5 text-left">
                  <label className="font-bold text-zinc-600">SYSTEM ARCHITECTURE TEMPLATE <span className="text-rose-500">*</span></label>
                  <textarea
                    placeholder="You are strict... \n\n=== SOURCE ===\n{{DOCUMENT}}\n\nTask: {{QUESTION}}"
                    value={builderTemplate}
                    onChange={(e) => setBuilderTemplate(e.target.value)}
                    className="w-full bg-white border border-zinc-200 rounded-lg p-3 focus:border-zinc-400 focus:outline-none transition text-zinc-850 h-32 leading-relaxed"
                    required
                  />
                  <p className="text-[10px] text-zinc-400 font-normal leading-normal">
                    Declare logical parameters using double brackets, e.g. <span className="font-sans font-bold text-zinc-600">{`{{MY_TAG}}`}</span>.
                  </p>
                </div>

                <div className="space-y-1.5 text-left">
                  <label className="font-bold text-zinc-600">DESIGN CHRONICLES & BACKGROUND STORY</label>
                  <textarea
                    placeholder="Detail research findings, sample regression logs or injection shields guidelines..."
                    value={builderBackground}
                    onChange={(e) => setBuilderBackground(e.target.value)}
                    className="w-full bg-white border border-zinc-205 rounded-lg p-3 focus:outline-none transition text-zinc-805 h-16 leading-relaxed"
                  />
                </div>

                <div className="pt-2">
                  <button
                    type="submit"
                    className="w-full flex items-center justify-center gap-1.5 bg-zinc-900 border border-zinc-950 text-white hover:bg-zinc-800 py-3 rounded-xl transition cursor-pointer font-extrabold uppercase tracking-tight"
                  >
                    <Plus className="w-4 h-4 shrink-0" />
                    <span>Compile Blueprint Template</span>
                  </button>
                </div>

              </form>
            </div>

            {/* OPINION POLL CHART PANEL */}
            <div className="bg-white border border-zinc-200 rounded-xl p-5 shadow-[0_1px_3px_rgba(0,0,0,0.01)] text-left">
              <h3 className="text-sm font-bold uppercase tracking-tight font-mono text-zinc-800 flex items-center gap-1.5 mb-1.5">
                <Sliders className="w-4 h-4 text-zinc-500" />
                Active Engineering Poll
              </h3>
              <p className="text-[11px] text-zinc-400 font-mono tracking-tight mb-4">
                Cast your vote for scheduled prompt registry patterns:
              </p>

              <div className="space-y-3 font-mono text-xs">
                
                {/* Poll Option A */}
                <div 
                  onClick={() => handleVote('llm-judge')}
                  className={`p-3.5 rounded-lg border text-left transition relative overflow-hidden ${
                    userVoted ? 'cursor-default' : 'cursor-pointer hover:border-zinc-400 bg-zinc-50/20'
                  } ${userVoted === 'llm-judge' ? 'border-zinc-900 bg-zinc-50/50' : 'border-zinc-200'}`}
                >
                  {userVoted && (
                    <div 
                      className="absolute left-0 top-0 bottom-0 bg-blue-100/50 transition-all duration-1000 z-0" 
                      style={{ width: `${((pollVotes['llm-judge'] || 0) / totalVotes) * 100}%` }}
                    />
                  )}
                  <div className="flex justify-between items-center relative z-10">
                    <span className="font-semibold text-zinc-800 uppercase flex items-center gap-1">
                      {userVoted === 'llm-judge' && <CheckCircle2 className="w-3.5 h-3.5 text-blue-600 shrink-0" />}
                      LLM Judge Consensus Scaffolds
                    </span>
                    <span className="text-zinc-500">
                      {pollVotes['llm-judge'] || 0} votes ({userVoted ? `${(((pollVotes['llm-judge'] || 0) / totalVotes) * 100).toFixed(1)}%` : 'tally'})
                    </span>
                  </div>
                </div>

                {/* Poll Option B */}
                <div 
                  onClick={() => handleVote('static-unit')}
                  className={`p-3.5 rounded-lg border text-left transition relative overflow-hidden ${
                    userVoted ? 'cursor-default' : 'cursor-pointer hover:border-zinc-400 bg-zinc-50/20'
                  } ${userVoted === 'static-unit' ? 'border-zinc-900 bg-zinc-50/50' : 'border-zinc-200'}`}
                >
                  {userVoted && (
                    <div 
                      className="absolute left-0 top-0 bottom-0 bg-blue-100/50 transition-all duration-1000 z-0" 
                      style={{ width: `${((pollVotes['static-unit'] || 0) / totalVotes) * 100}%` }}
                    />
                  )}
                  <div className="flex justify-between items-center relative z-10">
                    <span className="font-semibold text-zinc-800 uppercase flex items-center gap-1">
                      {userVoted === 'static-unit' && <CheckCircle2 className="w-3.5 h-3.5 text-blue-600 shrink-0" />}
                      Static Prompt Unit Testing Framework
                    </span>
                    <span className="text-zinc-500">
                      {pollVotes['static-unit'] || 0} votes ({userVoted ? `${(((pollVotes['static-unit'] || 0) / totalVotes) * 100).toFixed(1)}%` : 'tally'})
                    </span>
                  </div>
                </div>

                {/* Poll Option C */}
                <div 
                  onClick={() => handleVote('semantic-cos')}
                  className={`p-3.5 rounded-lg border text-left transition relative overflow-hidden ${
                    userVoted ? 'cursor-default' : 'cursor-pointer hover:border-zinc-400 bg-zinc-50/20'
                  } ${userVoted === 'semantic-cos' ? 'border-zinc-900 bg-zinc-50/50' : 'border-zinc-200'}`}
                >
                  {userVoted && (
                    <div 
                      className="absolute left-0 top-0 bottom-0 bg-blue-100/50 transition-all duration-1000 z-0" 
                      style={{ width: `${((pollVotes['semantic-cos'] || 0) / totalVotes) * 100}%` }}
                    />
                  )}
                  <div className="flex justify-between items-center relative z-10">
                    <span className="font-semibold text-zinc-800 uppercase flex items-center gap-1">
                      {userVoted === 'semantic-cos' && <CheckCircle2 className="w-3.5 h-3.5 text-blue-600 shrink-0" />}
                      Semantic Cosine drift Tracker
                    </span>
                    <span className="text-zinc-500">
                      {pollVotes['semantic-cos'] || 0} votes ({userVoted ? `${(((pollVotes['semantic-cos'] || 0) / totalVotes) * 100).toFixed(1)}%` : 'tally'})
                    </span>
                  </div>
                </div>

                {/* Poll Option D */}
                <div 
                  onClick={() => handleVote('red-team')}
                  className={`p-3.5 rounded-lg border text-left transition relative overflow-hidden ${
                    userVoted ? 'cursor-default' : 'cursor-pointer hover:border-zinc-400 bg-zinc-50/20'
                  } ${userVoted === 'red-team' ? 'border-zinc-900 bg-zinc-50/50' : 'border-zinc-200'}`}
                >
                  {userVoted && (
                    <div 
                      className="absolute left-0 top-0 bottom-0 bg-blue-100/50 transition-all duration-1000 z-0" 
                      style={{ width: `${((pollVotes['red-team'] || 0) / totalVotes) * 100}%` }}
                    />
                  )}
                  <div className="flex justify-between items-center relative z-10">
                    <span className="font-semibold text-zinc-800 uppercase flex items-center gap-1">
                      {userVoted === 'red-team' && <CheckCircle2 className="w-3.5 h-3.5 text-blue-600 shrink-0" />}
                      Automated Red-Teaming Shielding
                    </span>
                    <span className="text-zinc-500">
                      {pollVotes['red-team'] || 0} votes ({userVoted ? `${(((pollVotes['red-team'] || 0) / totalVotes) * 100).toFixed(1)}%` : 'tally'})
                    </span>
                  </div>
                </div>

              </div>

              {userVoted && (
                <p className="text-[10px] text-zinc-450 mt-3 font-mono leading-normal">
                  Your cryptographic balance signature has logged! Overall participation tracker count: {totalVotes} members.
                </p>
              )}
            </div>

            {/* INTERACTIVE DISCUSSION / COMMUNITY SUGGESTIONS BOARD */}
            <div className="bg-white border border-zinc-200 rounded-xl p-5 shadow-[0_1px_3px_rgba(0,0,0,0.01)] text-left">
              <h3 className="text-sm font-bold uppercase tracking-tight font-mono text-zinc-900 flex items-center gap-1.5 mb-1.5 border-b border-zinc-100 pb-2">
                <Send className="w-4 h-4 text-zinc-500" />
                Prompt optimization Suggestions
              </h3>

              {/* Submit suggestion */}
              <form onSubmit={submitComment} className="space-y-3 mb-6">
                <div className="grid grid-cols-2 gap-3 text-xs font-mono">
                  <div className="space-y-1">
                    <label className="text-[10px] text-zinc-450 block uppercase font-bold">Contributor Name</label>
                    <input
                      type="text"
                      placeholder="e.g. PromptSlayer"
                      value={newCommentName}
                      onChange={(e) => setNewCommentName(e.target.value)}
                      className="w-full bg-[#fafafa] border border-zinc-200 rounded p-2 focus:border-zinc-400 outline-none transition text-zinc-805"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] text-zinc-450 block uppercase font-bold">Design Role (Static)</label>
                    <input
                      type="text"
                      placeholder="Associate Researcher"
                      className="w-full bg-zinc-100 border border-zinc-250 cursor-not-allowed select-none rounded p-2 outline-none text-zinc-500"
                      disabled
                    />
                  </div>
                </div>
                <div className="space-y-1 text-xs font-mono">
                  <label className="text-[10px] text-zinc-450 block uppercase font-bold">Optimization Suggestion context <span className="text-rose-500">*</span></label>
                  <textarea
                    placeholder="Submit systematic evaluation notes, edge case reports or version anchors guidelines..."
                    value={newCommentText}
                    onChange={(e) => setNewCommentText(e.target.value)}
                    className="w-full bg-[#fafafa] border border-zinc-200 focus:border-zinc-400 rounded p-2 outline-none transition text-zinc-805 h-16 leading-relaxed"
                    required
                  />
                </div>
                <button
                  type="submit"
                  className="bg-zinc-900 hover:bg-zinc-850 text-white font-mono font-bold uppercase tracking-wide text-[10px] py-2 px-4 rounded transition cursor-pointer"
                >
                  Publish Suggestion
                </button>
              </form>

              {/* List comments reviews */}
              <div className="space-y-4">
                {discussions.map(d => (
                  <div key={d.id} className="p-4 rounded-lg bg-[#fafafa] border border-zinc-200 flex gap-3 text-left">
                    <div className="h-8 w-8 bg-zinc-200 border border-zinc-300 text-zinc-650 font-mono text-xs font-black rounded-lg shrink-0 flex items-center justify-center select-none uppercase">
                      {d.author.replace('@', '').slice(0, 2)}
                    </div>
                    <div className="space-y-1 text-xs">
                      <div className="flex flex-wrap items-center gap-x-2 font-mono text-[11px]">
                        <span className="font-bold text-zinc-800">{d.author}</span>
                        <span className="bg-zinc-200 text-zinc-600 px-1 text-[9px] rounded uppercase font-bold tracking-tighter">
                          {d.role}
                        </span>
                        <span className="text-zinc-400 text-[10px]">{d.time}</span>
                      </div>
                      <p className="text-zinc-600 leading-relaxed font-sans">{d.comment}</p>
                      
                      <div className="pt-2 flex items-center gap-3 font-mono text-[10px]">
                        <button
                          onClick={() => handleLikeComment(d.id)}
                          className="flex items-center gap-1 hover:text-zinc-800 text-zinc-400 transition cursor-pointer"
                        >
                          <ThumbsUp className="w-3 h-3" />
                          <span>({d.likes})</span>
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

            </div>
            </div>
            )}

          </main>

        </div>

      </div>

    </div>
  );
}
