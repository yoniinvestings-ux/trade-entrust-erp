import { useState, useRef, useEffect, KeyboardEvent, useMemo } from 'react';
import { Textarea } from '@/components/ui/textarea';
import { useTeamMembersList } from '@/hooks/useTeamMembers';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';

interface MentionInputProps {
  value: string;
  onChange: (value: string, mentions: string[]) => void;
  placeholder?: string;
  className?: string;
  minRows?: number;
}

interface MentionData {
  name: string;
  id: string;
  startIndex: number; // Position in stored format
  endIndex: number;
}

export function MentionInput({ 
  value, 
  onChange, 
  placeholder = 'Write an update... Use @ to mention team members',
  className,
  minRows = 3 
}: MentionInputProps) {
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [suggestionIndex, setSuggestionIndex] = useState(0);
  const [mentionSearch, setMentionSearch] = useState('');
  const [cursorPosition, setCursorPosition] = useState<{ top: number; left: number } | null>(null);
  const [displayCursor, setDisplayCursor] = useState(0);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  
  const { data: teamMembers = [] } = useTeamMembersList();

  const filteredMembers = teamMembers.filter(member =>
    member.display_name.toLowerCase().includes(mentionSearch.toLowerCase())
  ).slice(0, 5);

  // Extract mention data from stored value
  const extractMentionData = (text: string): MentionData[] => {
    const mentionPattern = /@\[([^\]]+)\]\(([^)]+)\)/g;
    const mentions: MentionData[] = [];
    let match;
    while ((match = mentionPattern.exec(text)) !== null) {
      mentions.push({
        name: match[1],
        id: match[2],
        startIndex: match.index,
        endIndex: match.index + match[0].length
      });
    }
    return mentions;
  };

  const extractMentionIds = (text: string): string[] => {
    return extractMentionData(text).map(m => m.id);
  };

  // Convert stored format to display format
  const storedToDisplay = (stored: string): string => {
    return stored.replace(/@\[([^\]]+)\]\([^)]+\)/g, '@$1');
  };

  // Display value computed from stored value
  const displayValue = useMemo(() => storedToDisplay(value), [value]);

  // Convert display cursor position to stored cursor position
  const displayToStoredPos = (displayPos: number): number => {
    const mentions = extractMentionData(value);
    let offset = 0;
    
    for (const mention of mentions) {
      const displayStart = mention.startIndex - offset;
      const displayLen = mention.name.length + 1; // @name
      const storedLen = mention.endIndex - mention.startIndex;
      
      if (displayPos <= displayStart) {
        break;
      }
      
      if (displayPos <= displayStart + displayLen) {
        // Inside a mention in display format
        return mention.endIndex;
      }
      
      offset += storedLen - displayLen;
    }
    
    return displayPos + offset;
  };

  // Convert stored cursor position to display cursor position
  const storedToDisplayPos = (storedPos: number): number => {
    const mentions = extractMentionData(value);
    let offset = 0;
    
    for (const mention of mentions) {
      if (storedPos <= mention.startIndex) {
        break;
      }
      
      if (storedPos <= mention.endIndex) {
        // Inside a mention in stored format - position at end in display
        return mention.startIndex - offset + mention.name.length + 1;
      }
      
      const displayLen = mention.name.length + 1;
      const storedLen = mention.endIndex - mention.startIndex;
      offset += storedLen - displayLen;
    }
    
    return storedPos - offset;
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newDisplayValue = e.target.value;
    const displayCursorPos = e.target.selectionStart;
    setDisplayCursor(displayCursorPos);
    
    // Check if we're in a mention context (typing after @)
    const textBeforeCursor = newDisplayValue.slice(0, displayCursorPos);
    const mentionMatch = textBeforeCursor.match(/@(\w*)$/);
    
    if (mentionMatch) {
      setMentionSearch(mentionMatch[1]);
      setShowSuggestions(true);
      setSuggestionIndex(0);
      
      if (textareaRef.current) {
        const rect = textareaRef.current.getBoundingClientRect();
        setCursorPosition({
          top: rect.height + 4,
          left: 0,
        });
      }
    } else {
      setShowSuggestions(false);
    }
    
    // Convert display changes back to stored format
    const newStoredValue = displayToStored(value, displayValue, newDisplayValue);
    onChange(newStoredValue, extractMentionIds(newStoredValue));
  };

  // Convert display format back to stored format, preserving existing mentions
  const displayToStored = (oldStored: string, oldDisplay: string, newDisplay: string): string => {
    const mentions = extractMentionData(oldStored);
    
    if (mentions.length === 0) {
      // No mentions to preserve
      return newDisplay;
    }
    
    // Build a new stored string by mapping through the display string
    // and replacing @name with @[name](id) where applicable
    let result = newDisplay;
    
    // Sort mentions by name length (longest first) to avoid partial replacements
    const sortedMentions = [...mentions].sort((a, b) => b.name.length - a.name.length);
    
    for (const mention of sortedMentions) {
      const displayForm = `@${mention.name}`;
      const storedForm = `@[${mention.name}](${mention.id})`;
      
      // Only replace if the display form exists in new display
      if (result.includes(displayForm)) {
        // Replace first occurrence (could be multiple same-name mentions)
        result = result.replace(displayForm, storedForm);
      }
    }
    
    return result;
  };

  const insertMention = (member: { user_id: string; display_name: string }) => {
    if (!textareaRef.current) return;
    
    const cursorPos = textareaRef.current.selectionStart;
    const textBeforeCursor = displayValue.slice(0, cursorPos);
    const textAfterCursor = displayValue.slice(cursorPos);
    
    // Find and replace the @ trigger in display text
    const mentionStart = textBeforeCursor.lastIndexOf('@');
    const newTextBefore = textBeforeCursor.slice(0, mentionStart);
    
    // Insert the stored format into the value
    const mentionMarkup = `@[${member.display_name}](${member.user_id}) `;
    const displayMention = `@${member.display_name} `;
    
    // Build new stored value
    const storedCursorPos = displayToStoredPos(cursorPos);
    const storedMentionStart = displayToStoredPos(mentionStart);
    const storedTextBefore = value.slice(0, storedMentionStart);
    const storedTextAfter = value.slice(storedCursorPos);
    
    const newStoredValue = storedTextBefore + mentionMarkup + storedTextAfter;
    
    onChange(newStoredValue, extractMentionIds(newStoredValue));
    setShowSuggestions(false);
    
    // Focus back on textarea at correct position
    setTimeout(() => {
      if (textareaRef.current) {
        const newDisplayCursor = newTextBefore.length + displayMention.length;
        textareaRef.current.focus();
        textareaRef.current.setSelectionRange(newDisplayCursor, newDisplayCursor);
      }
    }, 0);
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (!showSuggestions || filteredMembers.length === 0) return;
    
    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSuggestionIndex(prev => Math.min(prev + 1, filteredMembers.length - 1));
        break;
      case 'ArrowUp':
        e.preventDefault();
        setSuggestionIndex(prev => Math.max(prev - 1, 0));
        break;
      case 'Enter':
        if (showSuggestions) {
          e.preventDefault();
          insertMention(filteredMembers[suggestionIndex]);
        }
        break;
      case 'Escape':
        setShowSuggestions(false);
        break;
    }
  };

  // Close suggestions on click outside
  useEffect(() => {
    const handleClickOutside = () => setShowSuggestions(false);
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, []);

  return (
    <div className="relative">
      <Textarea
        ref={textareaRef}
        value={displayValue}
        onChange={handleInputChange}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        className={cn('resize-none', className)}
        rows={minRows}
      />
      
      {showSuggestions && filteredMembers.length > 0 && cursorPosition && (
        <div 
          className="absolute z-50 w-64 bg-popover border rounded-md shadow-lg overflow-hidden"
          style={{ top: cursorPosition.top, left: cursorPosition.left }}
          onClick={(e) => e.stopPropagation()}
        >
          {filteredMembers.map((member, index) => (
            <button
              key={member.user_id}
              className={cn(
                'w-full flex items-center gap-2 px-3 py-2 text-sm text-left hover:bg-accent',
                index === suggestionIndex && 'bg-accent'
              )}
              onClick={() => insertMention(member)}
            >
              <Avatar className="h-6 w-6">
                <AvatarImage src={member.avatar_url || undefined} />
                <AvatarFallback className="text-xs">
                  {member.display_name.charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <div className="font-medium truncate">{member.display_name}</div>
                {member.role && (
                  <div className="text-xs text-muted-foreground capitalize">{member.role}</div>
                )}
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// Helper to render content with highlighted mentions
export function renderContentWithMentions(content: string) {
  const parts = content.split(/(@\[[^\]]+\]\([^)]+\))/g);
  
  return parts.map((part, index) => {
    const mentionMatch = part.match(/@\[([^\]]+)\]\(([^)]+)\)/);
    if (mentionMatch) {
      return (
        <span key={index} className="text-primary font-medium">
          @{mentionMatch[1]}
        </span>
      );
    }
    return <span key={index}>{part}</span>;
  });
}