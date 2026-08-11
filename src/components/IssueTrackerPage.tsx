import React, { useState, useEffect } from 'react';
import { 
  Bug, 
  Plus, 
  CheckCircle2, 
  AlertTriangle, 
  Flame, 
  Tag, 
  ThumbsUp, 
  Search, 
  SlidersHorizontal, 
  ShieldAlert, 
  Clock, 
  ArrowUpDown,
  Download,
  Trash2,
  Edit2
} from 'lucide-react';
import type { 
  IssueItem, 
  IssueCategory, 
  IssueSeverity, 
  IssueCriticality, 
  IssueStatus 
} from '../types';

const INITIAL_ISSUES: IssueItem[] = [
  {
    id: 'ISSUE-101',
    title: 'Web Speech Synthesis voice pitch reset on model change',
    description: 'When switching between OpenRouter models during live debate, the speech synthesis voice pitch reverts to browser default.',
    category: 'BUG',
    severity: 'MEDIUM',
    criticality: 'P2_MEDIUM',
    status: 'IN_PROGRESS',
    reportedBy: 'GetBack2Basics Evaluator',
    createdAt: new Date(Date.now() - 86400000 * 2).toISOString(),
    updatedAt: new Date(Date.now() - 3600000 * 5).toISOString(),
    tags: ['Speech', 'WebSpeechAPI', 'UI'],
    votes: 4
  },
  {
    id: 'ISSUE-102',
    title: 'Add Google Cloud Text-to-Speech API integration for ultra-realistic voices',
    description: 'Support native Google Cloud TTS Wavenet/Neural2 voice synthesis option alongside local Web Speech API voices.',
    category: 'FEATURE',
    severity: 'HIGH',
    criticality: 'P1_HIGH',
    status: 'OPEN',
    reportedBy: 'Spatial AI Team',
    createdAt: new Date(Date.now() - 86400000 * 3).toISOString(),
    updatedAt: new Date(Date.now() - 86400000 * 3).toISOString(),
    tags: ['GCP', 'TTS', 'Audio'],
    votes: 9
  },
  {
    id: 'ISSUE-103',
    title: 'Microphone continuous streaming timeout after 30s silent pause',
    description: 'Auto-restart speech recognition gracefully when user pauses for extended periods during persona prompt crafting.',
    category: 'ENHANCEMENT',
    severity: 'LOW',
    criticality: 'P3_LOW',
    status: 'RESOLVED',
    reportedBy: 'QualityAssurance',
    createdAt: new Date(Date.now() - 86400000 * 5).toISOString(),
    updatedAt: new Date(Date.now() - 86400000 * 1).toISOString(),
    tags: ['WebSpeech', 'Microphone', 'UX'],
    votes: 2
  }
];

const STORAGE_KEY = 'LPC_USER_ISSUES_BACKLOG';

export function IssueTrackerPage() {
  const [issues, setIssues] = useState<IssueItem[]>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      return stored ? JSON.parse(stored) : INITIAL_ISSUES;
    } catch {
      return INITIAL_ISSUES;
    }
  });

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingIssueId, setEditingIssueId] = useState<string | null>(null);

  // Form State
  const [formTitle, setFormTitle] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [formCategory, setFormCategory] = useState<IssueCategory>('BUG');
  const [formSeverity, setFormSeverity] = useState<IssueSeverity>('MEDIUM');
  const [formCriticality, setFormCriticality] = useState<IssueCriticality>('P2_MEDIUM');
  const [formReportedBy, setFormReportedBy] = useState('GetBack2Basics');
  const [formTags, setFormTags] = useState('');

  // Filtering & Sorting State
  const [searchQuery, setSearchQuery] = useState('');
  const [filterCategory, setFilterCategory] = useState<string>('ALL');
  const [filterSeverity, setFilterSeverity] = useState<string>('ALL');
  const [filterCriticality, setFilterCriticality] = useState<string>('ALL');
  const [filterStatus, setFilterStatus] = useState<string>('ALL');
  const [sortBy, setSortBy] = useState<'PRIORITY' | 'VOTES' | 'NEWEST'>('PRIORITY');

  // Persist to local storage
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(issues));
    } catch (e) {
      console.error('Failed to store issues', e);
    }
  }, [issues]);

  const handleOpenAddModal = () => {
    setEditingIssueId(null);
    setFormTitle('');
    setFormDescription('');
    setFormCategory('BUG');
    setFormSeverity('MEDIUM');
    setFormCriticality('P2_MEDIUM');
    setFormTags('');
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (issue: IssueItem) => {
    setEditingIssueId(issue.id);
    setFormTitle(issue.title);
    setFormDescription(issue.description);
    setFormCategory(issue.category);
    setFormSeverity(issue.severity);
    setFormCriticality(issue.criticality);
    setFormReportedBy(issue.reportedBy);
    setFormTags(issue.tags.join(', '));
    setIsModalOpen(true);
  };

  const handleSaveIssue = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formTitle.trim()) return;

    const parsedTags = formTags
      .split(',')
      .map(t => t.trim())
      .filter(Boolean);

    if (editingIssueId) {
      setIssues(prev =>
        prev.map(item =>
          item.id === editingIssueId
            ? {
                ...item,
                title: formTitle.trim(),
                description: formDescription.trim(),
                category: formCategory,
                severity: formSeverity,
                criticality: formCriticality,
                reportedBy: formReportedBy.trim() || 'Anonymous',
                tags: parsedTags,
                updatedAt: new Date().toISOString()
              }
            : item
        )
      );
    } else {
      const newIssue: IssueItem = {
        id: `ISSUE-${Date.now().toString().slice(-4)}`,
        title: formTitle.trim(),
        description: formDescription.trim(),
        category: formCategory,
        severity: formSeverity,
        criticality: formCriticality,
        status: 'OPEN',
        reportedBy: formReportedBy.trim() || 'Anonymous Evaluator',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        tags: parsedTags.length > 0 ? parsedTags : ['General'],
        votes: 1
      };
      setIssues(prev => [newIssue, ...prev]);
    }

    setIsModalOpen(false);
  };

  const handleStatusChange = (id: string, newStatus: IssueStatus) => {
    setIssues(prev =>
      prev.map(item =>
        item.id === id
          ? { ...item, status: newStatus, updatedAt: new Date().toISOString() }
          : item
      )
    );
  };

  const handleVote = (id: string) => {
    setIssues(prev =>
      prev.map(item =>
        item.id === id
          ? { ...item, votes: item.votes + 1, updatedAt: new Date().toISOString() }
          : item
      )
    );
  };

  const handleDeleteIssue = (id: string) => {
    if (confirm('Are you sure you want to delete this backlog entry?')) {
      setIssues(prev => prev.filter(item => item.id !== id));
    }
  };

  const exportIssuesJSON = () => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(issues, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", `LivePersonaCrafter_Bugs_Backlog_${new Date().toISOString().slice(0, 10)}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  // Severity Weight Mapping for sorting
  const severityRank: Record<IssueSeverity, number> = {
    CRITICAL: 4,
    HIGH: 3,
    MEDIUM: 2,
    LOW: 1
  };

  const criticalityRank: Record<IssueCriticality, number> = {
    P0_BLOCKER: 4,
    P1_HIGH: 3,
    P2_MEDIUM: 2,
    P3_LOW: 1
  };

  // Filter & Sort Logic
  const filteredIssues = issues.filter(issue => {
    const matchesSearch = 
      issue.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      issue.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      issue.reportedBy.toLowerCase().includes(searchQuery.toLowerCase()) ||
      issue.tags.some(t => t.toLowerCase().includes(searchQuery.toLowerCase()));

    const matchesCategory = filterCategory === 'ALL' || issue.category === filterCategory;
    const matchesSeverity = filterSeverity === 'ALL' || issue.severity === filterSeverity;
    const matchesCriticality = filterCriticality === 'ALL' || issue.criticality === filterCriticality;
    const matchesStatus = filterStatus === 'ALL' || issue.status === filterStatus;

    return matchesSearch && matchesCategory && matchesSeverity && matchesCriticality && matchesStatus;
  }).sort((a, b) => {
    if (sortBy === 'PRIORITY') {
      const scoreA = criticalityRank[a.criticality] * 10 + severityRank[a.severity];
      const scoreB = criticalityRank[b.criticality] * 10 + severityRank[b.severity];
      return scoreB - scoreA;
    }
    if (sortBy === 'VOTES') {
      return b.votes - a.votes;
    }
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  });

  const getSeverityBadge = (severity: IssueSeverity) => {
    switch (severity) {
      case 'CRITICAL':
        return <span className="px-2 py-0.5 text-[10px] font-extrabold bg-rose-500/20 text-rose-300 border border-rose-500/40 rounded flex items-center gap-1"><ShieldAlert className="w-3 h-3 text-rose-400" /> CRITICAL</span>;
      case 'HIGH':
        return <span className="px-2 py-0.5 text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40 rounded flex items-center gap-1"><AlertTriangle className="w-3 h-3 text-amber-400" /> HIGH</span>;
      case 'MEDIUM':
        return <span className="px-2 py-0.5 text-[10px] font-semibold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 rounded">MEDIUM</span>;
      case 'LOW':
        return <span className="px-2 py-0.5 text-[10px] font-medium bg-zinc-800 text-zinc-400 border border-zinc-700 rounded">LOW</span>;
    }
  };

  const getCriticalityBadge = (criticality: IssueCriticality) => {
    switch (criticality) {
      case 'P0_BLOCKER':
        return <span className="px-2 py-0.5 text-[10px] font-black bg-rose-950 text-rose-200 border border-rose-500/60 rounded animate-pulse">P0 BLOCKER</span>;
      case 'P1_HIGH':
        return <span className="px-2 py-0.5 text-[10px] font-bold bg-amber-950 text-amber-200 border border-amber-500/50 rounded">P1 HIGH</span>;
      case 'P2_MEDIUM':
        return <span className="px-2 py-0.5 text-[10px] font-semibold bg-indigo-950 text-indigo-200 border border-indigo-500/40 rounded">P2 MEDIUM</span>;
      case 'P3_LOW':
        return <span className="px-2 py-0.5 text-[10px] font-medium bg-zinc-900 text-zinc-400 border border-zinc-800 rounded">P3 LOW</span>;
    }
  };

  const getStatusBadge = (status: IssueStatus) => {
    switch (status) {
      case 'OPEN':
        return <span className="px-2 py-0.5 text-[11px] font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/30 rounded-md">Open</span>;
      case 'IN_PROGRESS':
        return <span className="px-2 py-0.5 text-[11px] font-semibold bg-indigo-500/20 text-indigo-300 border border-indigo-500/40 rounded-md animate-pulse">In Progress</span>;
      case 'RESOLVED':
        return <span className="px-2 py-0.5 text-[11px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 rounded-md">Resolved</span>;
      case 'CLOSED':
        return <span className="px-2 py-0.5 text-[11px] font-semibold bg-zinc-800 text-zinc-400 border border-zinc-700 rounded-md">Closed</span>;
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 space-y-6">
      {/* Header Banner */}
      <div className="p-6 bg-zinc-950 border border-zinc-800 rounded-2xl shadow-2xl flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-indigo-950/80 border border-indigo-500/40 rounded-xl text-indigo-400">
            <Bug className="w-7 h-7 text-indigo-400" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="font-extrabold text-lg text-zinc-100 tracking-tight">
                Bugs, Issues & Feature Request Backlog
              </h2>
              <span className="px-2.5 py-0.5 text-xs font-semibold bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 rounded-full flex items-center gap-1">
                <Flame className="w-3 h-3 text-amber-400" />
                Priority Ranked
              </span>
            </div>
            <p className="text-xs text-zinc-400 font-sans mt-0.5">
              Submit user feedback, report bugs, rate severity/criticality, and prioritize sprint updates.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={exportIssuesJSON}
            className="flex items-center gap-2 px-3.5 py-2 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-300 rounded-xl text-xs font-semibold transition-all"
          >
            <Download className="w-4 h-4 text-indigo-400" />
            Export JSON Backlog
          </button>
          <button
            onClick={handleOpenAddModal}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold transition-all shadow-lg shadow-indigo-600/30"
          >
            <Plus className="w-4 h-4" />
            Log New Issue / Feature
          </button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="p-4 bg-zinc-900/80 border border-zinc-800 rounded-xl space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="relative flex-1 min-w-[240px]">
            <Search className="w-4 h-4 text-zinc-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Search bugs by title, description, author, or tag..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-2 bg-zinc-950 border border-zinc-800 rounded-lg text-xs text-zinc-100 placeholder:text-zinc-500 focus:outline-none focus:border-indigo-500"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2 text-xs">
            <div className="flex items-center gap-1.5 px-2.5 py-1.5 bg-zinc-950 border border-zinc-800 rounded-lg">
              <SlidersHorizontal className="w-3.5 h-3.5 text-indigo-400" />
              <span className="text-zinc-400 font-medium">Category:</span>
              <select
                value={filterCategory}
                onChange={e => setFilterCategory(e.target.value)}
                className="bg-transparent text-zinc-200 font-semibold focus:outline-none"
              >
                <option value="ALL">All Categories</option>
                <option value="BUG">Bugs</option>
                <option value="FEATURE">Features</option>
                <option value="ENHANCEMENT">Enhancements</option>
                <option value="UI_UX">UI / UX</option>
                <option value="PERFORMANCE">Performance</option>
              </select>
            </div>

            <div className="flex items-center gap-1.5 px-2.5 py-1.5 bg-zinc-950 border border-zinc-800 rounded-lg">
              <ShieldAlert className="w-3.5 h-3.5 text-rose-400" />
              <span className="text-zinc-400 font-medium">Severity:</span>
              <select
                value={filterSeverity}
                onChange={e => setFilterSeverity(e.target.value)}
                className="bg-transparent text-zinc-200 font-semibold focus:outline-none"
              >
                <option value="ALL">All Severities</option>
                <option value="CRITICAL">Critical</option>
                <option value="HIGH">High</option>
                <option value="MEDIUM">Medium</option>
                <option value="LOW">Low</option>
              </select>
            </div>

            <div className="flex items-center gap-1.5 px-2.5 py-1.5 bg-zinc-950 border border-zinc-800 rounded-lg">
              <Flame className="w-3.5 h-3.5 text-amber-400" />
              <span className="text-zinc-400 font-medium">Criticality:</span>
              <select
                value={filterCriticality}
                onChange={e => setFilterCriticality(e.target.value)}
                className="bg-transparent text-zinc-200 font-semibold focus:outline-none"
              >
                <option value="ALL">All Priorities</option>
                <option value="P0_BLOCKER">P0 Blocker</option>
                <option value="P1_HIGH">P1 High</option>
                <option value="P2_MEDIUM">P2 Medium</option>
                <option value="P3_LOW">P3 Low</option>
              </select>
            </div>

            <div className="flex items-center gap-1.5 px-2.5 py-1.5 bg-zinc-950 border border-zinc-800 rounded-lg">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
              <span className="text-zinc-400 font-medium">Status:</span>
              <select
                value={filterStatus}
                onChange={e => setFilterStatus(e.target.value)}
                className="bg-transparent text-zinc-200 font-semibold focus:outline-none"
              >
                <option value="ALL">All Statuses</option>
                <option value="OPEN">Open</option>
                <option value="IN_PROGRESS">In Progress</option>
                <option value="RESOLVED">Resolved</option>
                <option value="CLOSED">Closed</option>
              </select>
            </div>

            <div className="flex items-center gap-1.5 px-2.5 py-1.5 bg-zinc-950 border border-zinc-800 rounded-lg">
              <ArrowUpDown className="w-3.5 h-3.5 text-cyan-400" />
              <span className="text-zinc-400 font-medium">Sort By:</span>
              <select
                value={sortBy}
                onChange={e => setSortBy(e.target.value as any)}
                className="bg-transparent text-zinc-200 font-semibold focus:outline-none"
              >
                <option value="PRIORITY">Highest Priority</option>
                <option value="VOTES">Most Votes</option>
                <option value="NEWEST">Newest First</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Issues Table / List */}
      <div className="space-y-3">
        {filteredIssues.length === 0 ? (
          <div className="p-12 text-center bg-zinc-900/40 border border-zinc-800 rounded-xl space-y-2">
            <Bug className="w-8 h-8 text-zinc-600 mx-auto animate-bounce" />
            <h3 className="font-bold text-sm text-zinc-300">No issues found</h3>
            <p className="text-xs text-zinc-500 max-w-sm mx-auto">
              No reported bugs or feature requests match your current filters. Click Log New Issue / Feature to add one!
            </p>
          </div>
        ) : (
          filteredIssues.map(issue => (
            <div
              key={issue.id}
              className={`p-4 rounded-xl border transition-all space-y-3 ${
                issue.criticality === 'P0_BLOCKER'
                  ? 'bg-rose-950/20 border-rose-500/40 shadow-lg shadow-rose-950/20'
                  : issue.status === 'RESOLVED'
                  ? 'bg-zinc-950/60 border-zinc-800 opacity-75'
                  : 'bg-zinc-900/70 border-zinc-800 hover:border-zinc-700'
              }`}
            >
              <div className="flex items-start justify-between gap-4 flex-wrap">
                <div className="space-y-1 max-w-3xl">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-mono text-xs text-indigo-400 font-bold">{issue.id}</span>
                    <h3 className="font-bold text-sm text-zinc-100">{issue.title}</h3>
                    {getSeverityBadge(issue.severity)}
                    {getCriticalityBadge(issue.criticality)}
                    {getStatusBadge(issue.status)}
                  </div>
                  <p className="text-xs text-zinc-300 font-sans leading-relaxed whitespace-pre-wrap">
                    {issue.description}
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleVote(issue.id)}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 rounded-lg text-xs font-bold text-indigo-300 transition-colors"
                    title="Upvote this feature/issue priority"
                  >
                    <ThumbsUp className="w-3.5 h-3.5" />
                    <span>{issue.votes}</span>
                  </button>

                  <button
                    onClick={() => handleOpenEditModal(issue)}
                    className="p-1.5 bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 rounded-lg text-zinc-400 hover:text-zinc-100 transition-colors"
                    title="Edit issue details"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                  </button>

                  <button
                    onClick={() => handleDeleteIssue(issue.id)}
                    className="p-1.5 bg-zinc-800 hover:bg-rose-950 border border-zinc-700 text-zinc-400 hover:text-rose-400 transition-colors"
                    title="Delete entry"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* Footer Meta Row */}
              <div className="pt-2 border-t border-zinc-800/80 flex items-center justify-between flex-wrap gap-2 text-[11px] text-zinc-400 font-mono">
                <div className="flex items-center gap-3 flex-wrap">
                  <span className="flex items-center gap-1 text-zinc-400">
                    <Tag className="w-3 h-3 text-indigo-400" />
                    Category: <strong className="text-zinc-200 font-sans">{issue.category}</strong>
                  </span>
                  <span>|</span>
                  <span>Reported by: <strong className="text-zinc-200 font-sans">{issue.reportedBy}</strong></span>
                  <span>|</span>
                  <span className="flex items-center gap-1">
                    <Clock className="w-3 h-3 text-zinc-500" />
                    {new Date(issue.createdAt).toLocaleDateString("en-AU", { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>

                {/* Status Selector */}
                <div className="flex items-center gap-2">
                  <span className="text-zinc-500">Update Status:</span>
                  <select
                    value={issue.status}
                    onChange={e => handleStatusChange(issue.id, e.target.value as IssueStatus)}
                    className="bg-zinc-950 border border-zinc-700 text-zinc-200 text-[11px] font-bold rounded px-2 py-0.5 focus:outline-none focus:border-indigo-400 cursor-pointer"
                  >
                    <option value="OPEN">Open</option>
                    <option value="IN_PROGRESS">In Progress</option>
                    <option value="RESOLVED">Resolved</option>
                    <option value="CLOSED">Closed</option>
                  </select>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Add / Edit Issue Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-zinc-950 border border-zinc-800 rounded-2xl w-full max-w-xl p-6 space-y-4 shadow-2xl text-white">
            <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
              <h3 className="font-extrabold text-base flex items-center gap-2 text-indigo-300">
                <Bug className="w-5 h-5 text-indigo-400" />
                {editingIssueId ? `Edit Entry (${editingIssueId})` : 'Log Bug or Feature Suggestion'}
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-zinc-400 hover:text-white text-xs font-bold px-2 py-1 bg-zinc-900 rounded"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveIssue} className="space-y-4 text-xs">
              <div className="space-y-1">
                <label className="font-semibold text-zinc-300 block">
                  Title / Short Summary:
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. OpenAI model latency spikes during live voice response..."
                  value={formTitle}
                  onChange={e => setFormTitle(e.target.value)}
                  className="w-full p-2.5 bg-zinc-900 border border-zinc-800 rounded-lg text-zinc-100 focus:outline-none focus:border-indigo-500 font-medium"
                />
              </div>

              <div className="space-y-1">
                <label className="font-semibold text-zinc-300 block">
                  Detailed Description & Steps to Reproduce:
                </label>
                <textarea
                  rows={4}
                  required
                  placeholder="Provide context, expected vs actual behavior, or proposed functionality..."
                  value={formDescription}
                  onChange={e => setFormDescription(e.target.value)}
                  className="w-full p-2.5 bg-zinc-900 border border-zinc-800 rounded-lg text-zinc-100 focus:outline-none focus:border-indigo-500 font-sans"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="space-y-1">
                  <label className="font-semibold text-zinc-300 block">Category:</label>
                  <select
                    value={formCategory}
                    onChange={e => setFormCategory(e.target.value as IssueCategory)}
                    className="w-full p-2 bg-zinc-900 border border-zinc-800 rounded-lg text-zinc-200 focus:outline-none focus:border-indigo-500 font-semibold"
                  >
                    <option value="BUG">Bug</option>
                    <option value="FEATURE">New Feature</option>
                    <option value="ENHANCEMENT">Enhancement</option>
                    <option value="UI_UX">UI / UX Improvement</option>
                    <option value="PERFORMANCE">Performance</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="font-semibold text-zinc-300 block">Severity (Impact):</label>
                  <select
                    value={formSeverity}
                    onChange={e => setFormSeverity(e.target.value as IssueSeverity)}
                    className="w-full p-2 bg-zinc-900 border border-zinc-800 rounded-lg text-zinc-200 focus:outline-none focus:border-indigo-500 font-semibold"
                  >
                    <option value="LOW">Low (Minor annoyance)</option>
                    <option value="MEDIUM">Medium (Noticeable impact)</option>
                    <option value="HIGH">High (Major feature broken)</option>
                    <option value="CRITICAL">Critical (System crash/data loss)</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="font-semibold text-zinc-300 block">Criticality (Priority):</label>
                  <select
                    value={formCriticality}
                    onChange={e => setFormCriticality(e.target.value as IssueCriticality)}
                    className="w-full p-2 bg-zinc-900 border border-zinc-800 rounded-lg text-zinc-200 focus:outline-none focus:border-indigo-500 font-semibold"
                  >
                    <option value="P3_LOW">P3 - Low Priority</option>
                    <option value="P2_MEDIUM">P2 - Medium Priority</option>
                    <option value="P1_HIGH">P1 - High Priority</option>
                    <option value="P0_BLOCKER">P0 - Blocker (Must Fix Now)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-semibold text-zinc-300 block">Reporter Name:</label>
                  <input
                    type="text"
                    placeholder="Your Name or Role..."
                    value={formReportedBy}
                    onChange={e => setFormReportedBy(e.target.value)}
                    className="w-full p-2 bg-zinc-900 border border-zinc-800 rounded-lg text-zinc-100 focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-semibold text-zinc-300 block">Tags (comma-separated):</label>
                  <input
                    type="text"
                    placeholder="e.g. Speech, OpenRouter, Mobile"
                    value={formTags}
                    onChange={e => setFormTags(e.target.value)}
                    className="w-full p-2 bg-zinc-900 border border-zinc-800 rounded-lg text-zinc-100 focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-zinc-800">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 bg-zinc-900 hover:bg-zinc-800 text-zinc-400 rounded-lg font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg font-bold shadow-lg shadow-indigo-600/30"
                >
                  {editingIssueId ? 'Save Changes' : 'Submit Entry'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
