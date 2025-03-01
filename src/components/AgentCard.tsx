import { useState, useMemo, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { Agent, FACTIONS } from '../services/api';
import { formatDistanceToNow } from 'date-fns';

interface AgentCardProps {
  agent: Agent;
}

const AgentCard = ({ agent }: AgentCardProps) => {
  const [activeTab, setActiveTab] = useState<'thoughts' | 'actions'>('thoughts');
  const [expandedAction, setExpandedAction] = useState<string | null>(null);
  const [expandedThought, setExpandedThought] = useState<string | null>(null);

  // Memoize faction data and colors
  const factionData = useMemo(() => agent.faction ? FACTIONS[agent.faction] : null, [agent.faction]);
  const factionColor = useMemo(() => factionData?.color || 'rgba(59, 130, 246, 0.5)', [factionData]);

  // Status badge color
  const getStatusColor = useCallback((status: string) => {
    switch (status) {
      case 'thinking':
        return 'bg-yellow-500';
      case 'executing':
        return 'bg-green-500';
      case 'idle':
        return 'bg-gray-500';
      default:
        return 'bg-gray-500';
    }
  }, []);

  // Action status color
  const getActionStatusColor = useCallback((status: string) => {
    switch (status) {
      case 'success':
        return 'text-green-400';
      case 'failed':
        return 'text-red-400';
      case 'pending':
        return 'text-yellow-400';
      default:
        return 'text-gray-400';
    }
  }, []);

  // Toggle action details expansion
  const toggleActionExpansion = useCallback((actionId: string) => {
    setExpandedAction(prevId => prevId === actionId ? null : actionId);
  }, []);

  // Toggle thought details expansion
  const toggleThoughtExpansion = useCallback((thoughtId: string) => {
    setExpandedThought(prevId => prevId === thoughtId ? null : thoughtId);
  }, []);

  // Get emoji for thought based on content
  const getThoughtEmoji = useCallback((content: string) => {
    const lowerContent = content.toLowerCase();
    
    if (lowerContent.includes('analyzing') || lowerContent.includes('analysis')) return '🔍';
    if (lowerContent.includes('investigating') || lowerContent.includes('research')) return '🧐';
    if (lowerContent.includes('waiting') || lowerContent.includes('cooldown')) return '⏳';
    if (lowerContent.includes('error') || lowerContent.includes('failed')) return '❌';
    if (lowerContent.includes('success') || lowerContent.includes('completed')) return '✅';
    if (lowerContent.includes('strategy') || lowerContent.includes('plan')) return '📝';
    if (lowerContent.includes('opportunity') || lowerContent.includes('arbitrage')) return '💰';
    if (lowerContent.includes('swap') || lowerContent.includes('exchange')) return '🔄';
    if (lowerContent.includes('deposit') || lowerContent.includes('staking')) return '📥';
    if (lowerContent.includes('withdraw')) return '📤';
    if (lowerContent.includes('monitor') || lowerContent.includes('watching')) return '👀';
    if (lowerContent.includes('competition') || lowerContent.includes('competitor')) return '🏆';
    if (lowerContent.includes('resource') || lowerContent.includes('token')) return '🪙';
    if (lowerContent.includes('path') || lowerContent.includes('route')) return '🛣️';
    if (lowerContent.includes('update')) return '🔄';
    if (lowerContent.includes('focus')) return '🎯';
    
    // Faction-specific emojis
    if (agent.faction === 'UC') return '🛡️';
    if (agent.faction === 'FS') return '💹';
    if (agent.faction === 'CP') return '🔮';
    if (agent.faction === 'MWU') return '⚙️';
    if (agent.faction === 'SO') return '📊';
    if (agent.faction === 'ES') return '🔍';
    if (agent.faction === 'TG') return '✨';
    
    // Default emoji for other thoughts
    return '💭';
  }, [agent.faction]);

  // Format thought content with highlights - memoize the regex patterns
  const keyTermRegexes = useMemo(() => {
    const keyTerms = ['analyzing', 'waiting', 'strategy', 'opportunity', 'arbitrage', 'swap', 'deposit', 'withdraw', 'monitor'];
    return keyTerms.map(term => ({
      regex: new RegExp(`\\b${term}\\w*\\b`, 'gi')
    }));
  }, []);

  const formatThoughtContent = useCallback((content: string) => {
    // Highlight token symbols
    let formattedContent = content.replace(/\b([A-Z]{2,})\b/g, '<span class="text-primary-300">$1</span>');
    
    // Highlight numbers and percentages
    formattedContent = formattedContent.replace(/\b(\d+(\.\d+)?%?)\b/g, '<span class="text-green-300">$1</span>');
    
    // Highlight key terms
    const factionHighlightColor = agent.faction ? `${factionColor}CC` : '#facc15';
    keyTermRegexes.forEach(({ regex }) => {
      formattedContent = formattedContent.replace(
        regex, 
        `<span style="color: ${factionHighlightColor}" class="font-medium">$&</span>`
      );
    });
    
    // Ensure all spans inside the content have proper text wrapping to prevent overflow
    formattedContent = formattedContent.replace(/<span/g, '<span style="word-break: break-word; overflow-wrap: break-word;"');
    
    return formattedContent;
  }, [agent.faction, factionColor, keyTermRegexes]);

  // Get faction-specific card border style
  const factionBorderStyle = useMemo(() => {
    if (!agent.faction) return {};
    
    return {
      borderColor: `${factionColor}25`,
      boxShadow: `0 0 8px ${factionColor}10`
    };
  }, [agent.faction, factionColor]);

  // Get faction-specific action icon
  const getActionIcon = useCallback((type: string) => {
    // Default icons
    const defaultIcons = {
      'SWAP': '🔄',
      'DEPOSIT': '📥',
      'WITHDRAW': '📤',
      'STAKE': '📌',
      'CLAIM': '💰',
      'SECURE': '🔒',
      'PREDICT': '🔮',
      'OPTIMIZE': '⚙️',
      'EXTRACT': '🔍',
      'DEPLOY': '🚀'
    };
    
    // Faction-specific overrides
    if (agent.faction === 'UC' && type === 'SECURE') return '🛡️';
    if (agent.faction === 'FS' && type === 'SWAP') return '💱';
    if (agent.faction === 'CP' && type === 'PREDICT') return '🧿';
    if (agent.faction === 'MWU' && type === 'OPTIMIZE') return '🔧';
    if (agent.faction === 'SO' && type === 'DEPOSIT') return '📊';
    if (agent.faction === 'ES' && type === 'EXTRACT') return '🕵️';
    if (agent.faction === 'TG' && type === 'DEPLOY') return '✨';
    
    return defaultIcons[type as keyof typeof defaultIcons] || '⚡';
  }, [agent.faction]);

  // Memoize sorted thoughts
  const sortedThoughts = useMemo(() => 
    [...agent.thoughts].sort((a, b) => b.timestamp - a.timestamp),
    [agent.thoughts]
  );

  // Memoize deduplicated and sorted actions
  const sortedActions = useMemo(() => {
    // Deduplicate actions by id
    const uniqueActionsMap = new Map();
    
    // Keep only the latest instance of each action with the same ID
    agent.actions.forEach(action => {
      // If we already have this action, only update it if the new one is more recent
      // or has a different status (which indicates an update)
      const existingAction = uniqueActionsMap.get(action.id);
      if (!existingAction || 
          action.timestamp > existingAction.timestamp || 
          action.status !== existingAction.status) {
        uniqueActionsMap.set(action.id, action);
      }
    });
    
    // Convert Map back to array and sort by timestamp (newest first)
    return Array.from(uniqueActionsMap.values())
      .sort((a, b) => b.timestamp - a.timestamp);
  }, [agent.actions]);

  // Memoize tab change handler
  const handleTabChange = useCallback((tab: 'thoughts' | 'actions') => {
    setActiveTab(tab);
  }, []);

  // Memoize faction-specific styles
  const thoughtsTabStyle = useMemo(() => 
    activeTab === 'thoughts' && agent.faction 
      ? { 
          backgroundColor: `${factionColor}10`, 
          color: `${factionColor}CC`,
          borderColor: `${factionColor}60`
        } 
      : {},
    [activeTab, agent.faction, factionColor]
  );

  const actionsTabStyle = useMemo(() => 
    activeTab === 'actions' && agent.faction 
      ? { 
          backgroundColor: `${factionColor}10`, 
          color: `${factionColor}CC`,
          borderColor: `${factionColor}60`
        } 
      : {},
    [activeTab, agent.faction, factionColor]
  );

  const headerBackgroundStyle = useMemo(() => ({ 
    background: agent.faction 
      ? `linear-gradient(to right, ${factionColor}05, ${factionColor}15, ${factionColor}05)`
      : 'bg-black/40' 
  }), [agent.faction, factionColor]);

  const avatarStyle = useMemo(() => ({ 
    backgroundColor: agent.faction ? `${factionColor}10` : 'rgba(59, 130, 246, 0.2)',
    borderColor: agent.faction ? `${factionColor}60` : 'rgba(59, 130, 246, 0.5)',
    borderWidth: '2px'
  }), [agent.faction, factionColor]);

  const nameStyle = useMemo(() => ({ 
    color: agent.faction ? `${factionColor}CC` : 'white' 
  }), [agent.faction, factionColor]);

  const factionBadgeStyle = useMemo(() => ({ 
    backgroundColor: `${factionColor}10`,
    color: `${factionColor}CC`,
    border: `1px solid ${factionColor}25`
  }), [factionColor]);

  const scrollbarStyle = useMemo(() => {
    return {
      scrollbarColor: agent.faction ? `${factionColor}80 transparent` : '',
      scrollbarWidth: 'thin' as const,
      scrollbarGutter: 'stable' as const
    };
  }, [agent.faction, factionColor]);

  return (
    <div 
      className="card overflow-hidden transition-all hover:border-primary-700 hover:glow-border"
      style={factionBorderStyle}
    >
      <div 
        className="p-4 border-b border-gray-800"
        style={headerBackgroundStyle}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div 
              className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0"
              style={avatarStyle}
            >
              <span 
                className="text-lg font-bold"
                style={nameStyle}
              >
                {agent.name.charAt(0)}
              </span>
            </div>
            <div>
              <h3 
                className="text-lg font-bold tracking-wide"
                style={nameStyle}
              >
                {agent.name}
              </h3>
              <div className="flex items-center gap-2 mt-1">
                <span className={`inline-block w-2 h-2 rounded-full ${getStatusColor(agent.status)}`}></span>
                <span className="text-xs text-gray-400 uppercase tracking-wider">{agent.status}</span>
                {agent.faction && (
                  <>
                    <span className="text-gray-500">•</span>
                    <span 
                      className="text-xs uppercase tracking-wider px-1.5 py-0.5 rounded-sm"
                      style={factionBadgeStyle}
                    >
                      {agent.faction}
                    </span>
                  </>
                )}
              </div>
            </div>
          </div>
          <Link 
            to={`/agents/${agent.id}`} 
            className="text-primary-400 hover:text-primary-300 transition-colors text-sm tracking-wide"
            style={{ color: agent.faction ? `${factionColor}CC` : '' }}
          >
            DETAILS
          </Link>
        </div>
      </div>
      
      <div className="border-b border-gray-800 bg-black/20">
        <div className="flex">
          <button
            className={`flex-1 px-4 py-2 text-xs font-medium tracking-wider uppercase ${
              activeTab === 'thoughts' ? 'bg-primary-900/50 text-primary-300 border-b border-primary-500' : 'text-gray-400 hover:bg-gray-800/30'
            }`}
            style={thoughtsTabStyle}
            onClick={() => handleTabChange('thoughts')}
          >
            Thoughts ({agent.thoughts.length})
          </button>
          <button
            className={`flex-1 px-4 py-2 text-xs font-medium tracking-wider uppercase ${
              activeTab === 'actions' ? 'bg-primary-900/50 text-primary-300 border-b border-primary-500' : 'text-gray-400 hover:bg-gray-800/30'
            }`}
            style={actionsTabStyle}
            onClick={() => handleTabChange('actions')}
          >
            Actions ({sortedActions.length})
          </button>
        </div>
      </div>
      
      <div 
        className="p-4 h-64 overflow-y-auto scrollbar-thin scrollbar-thumb-gray-700 scrollbar-track-transparent"
        style={scrollbarStyle}
      >
        {activeTab === 'thoughts' && (
          <div className="space-y-3">
            {sortedThoughts.length > 0 ? (
              sortedThoughts.map((thought) => {
                const emoji = getThoughtEmoji(thought.content);
                const formattedContent = formatThoughtContent(thought.content);
                const isExpanded = expandedThought === thought.id;
                
                return (
                  <div 
                    key={thought.id} 
                    className="bg-gray-800/30 p-3 rounded border border-gray-700/50 hover:border-gray-600/50 transition-colors"
                    style={{ 
                      borderColor: agent.faction ? `${factionColor}20` : '',
                      backgroundColor: agent.faction ? `${factionColor}08` : ''
                    }}
                  >
                    <div className="flex items-start gap-3">
                      <div className="text-xl flex-shrink-0 mt-0.5">{emoji}</div>
                      <div className="flex-grow overflow-hidden">
                        {isExpanded ? (
                          <div 
                            className="text-sm leading-relaxed"
                            style={{ 
                              wordBreak: 'break-word',
                              overflowWrap: 'break-word'
                            }}
                          >
                            <div dangerouslySetInnerHTML={{ __html: formattedContent }} />
                          </div>
                        ) : (
                          <div 
                            className="text-sm leading-relaxed max-h-10 overflow-hidden"
                            style={{ 
                              wordBreak: 'break-word',
                              overflowWrap: 'break-word'
                            }}
                          >
                            <div dangerouslySetInnerHTML={{ __html: formattedContent }} />
                          </div>
                        )}
                        <div className="flex items-center justify-between mt-2">
                          <div className="text-xs text-gray-500 flex items-center">
                            <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            {formatDistanceToNow(thought.timestamp, { addSuffix: true })}
                          </div>
                          <button 
                            onClick={() => toggleThoughtExpansion(thought.id)}
                            className="text-xs text-primary-400 hover:text-primary-300 flex items-center"
                            style={{ color: agent.faction ? `${factionColor}CC` : '' }}
                          >
                            {isExpanded ? 'COLLAPSE' : 'EXPAND'}
                            <svg 
                              className={`ml-1 h-3 w-3 transition-transform ${isExpanded ? 'rotate-180' : ''}`} 
                              fill="none" 
                              viewBox="0 0 24 24" 
                              stroke="currentColor"
                            >
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                            </svg>
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="flex flex-col items-center justify-center h-full text-gray-500">
                <div className="text-4xl mb-2">💭</div>
                <p className="text-sm">No thoughts recorded</p>
              </div>
            )}
          </div>
        )}
        
        {activeTab === 'actions' && (
          <div className="space-y-3">
            {sortedActions.length > 0 ? (
              sortedActions.map((action) => (
                <div 
                  key={action.id} 
                  className="bg-gray-800/30 p-3 rounded border border-gray-700/50 hover:border-gray-600/50 transition-colors"
                  style={{ 
                    borderColor: agent.faction ? `${factionColor}20` : '',
                    backgroundColor: agent.faction ? `${factionColor}08` : ''
                  }}
                >
                  <div className="flex flex-wrap justify-between items-start gap-2">
                    <div className="flex items-center">
                      <span className="mr-2 text-lg">
                        {getActionIcon(action.type)}
                      </span>
                      <span 
                        className="px-2 py-0.5 bg-gray-700/70 rounded text-xs font-medium tracking-wider"
                        style={{ 
                          backgroundColor: agent.faction ? `${factionColor}15` : '',
                          color: agent.faction ? `${factionColor}CC` : ''
                        }}
                      >
                        {action.type}
                      </span>
                    </div>
                    <span className={`text-xs font-medium tracking-wider ${getActionStatusColor(action.status)}`}>
                      {action.status.toUpperCase()}
                    </span>
                  </div>
                  <div className="mt-2">
                    <button 
                      onClick={() => toggleActionExpansion(action.id)}
                      className="text-xs text-primary-400 hover:text-primary-300 flex items-center"
                      style={{ color: agent.faction ? `${factionColor}CC` : '' }}
                    >
                      {expandedAction === action.id ? 'HIDE DETAILS' : 'VIEW DETAILS'}
                      <svg 
                        className={`ml-1 h-3 w-3 transition-transform ${expandedAction === action.id ? 'rotate-180' : ''}`} 
                        fill="none" 
                        viewBox="0 0 24 24" 
                        stroke="currentColor"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </button>
                    {expandedAction === action.id && (
                      <div className="mt-2">
                        <pre 
                          className="whitespace-pre-wrap text-xs bg-gray-900/70 p-2 rounded overflow-x-auto max-h-32 text-gray-300 font-mono scrollbar-thin scrollbar-thumb-gray-700 scrollbar-track-transparent"
                          style={{ 
                            backgroundColor: agent.faction ? `${factionColor}08` : '',
                            borderLeft: agent.faction ? `2px solid ${factionColor}40` : '',
                            scrollbarColor: agent.faction ? `${factionColor}80 transparent` : '',
                            scrollbarWidth: 'thin',
                            scrollbarGutter: 'stable'
                          }}
                        >
                          {JSON.stringify(action.details, null, 2)}
                        </pre>
                      </div>
                    )}
                  </div>
                  <div className="flex items-center mt-2 text-xs text-gray-500">
                    <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    {formatDistanceToNow(action.timestamp, { addSuffix: true })}
                  </div>
                </div>
              ))
            ) : (
              <div className="flex flex-col items-center justify-center h-full text-gray-500">
                <div className="text-4xl mb-2">⚡</div>
                <p className="text-sm">No actions recorded</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default AgentCard; 