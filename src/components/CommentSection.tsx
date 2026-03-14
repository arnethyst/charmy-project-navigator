'use client';

import { useState, useEffect, useRef } from 'react';
import { getTaskComments, addComment } from '../actions/communications';
import { getUsers } from '../actions/auth';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

export function CommentSection({ taskId, currentUserId }: { taskId: string, currentUserId: string }) {
    const [comments, setComments] = useState<any[]>([]);
    const [newComment, setNewComment] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [allUsers, setAllUsers] = useState<any[]>([]);
    const [showSuggestions, setShowSuggestions] = useState(false);
    const [suggestions, setSuggestions] = useState<any[]>([]);
    const [cursorPos, setCursorPos] = useState(0);
    const bottomRef = useRef<HTMLDivElement>(null);
    const textareaRef = useRef<HTMLTextAreaElement>(null);

    const loadComments = async () => {
        const result = await getTaskComments(taskId);
        if (result.success) {
            setComments(result.comments || []);
        }
    };

    const loadUsers = async () => {
        const users = await getUsers();
        setAllUsers(users);
    };

    useEffect(() => {
        loadComments();
        loadUsers();
        const interval = setInterval(loadComments, 5000);
        return () => clearInterval(interval);
    }, [taskId]);

    const handleTextareaChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        const val = e.target.value;
        const pos = e.target.selectionStart;
        setNewComment(val);
        setCursorPos(pos);

        // Simple @ mention trigger
        const textBeforeCursor = val.slice(0, pos);
        const atMatch = textBeforeCursor.match(/@(\w*)$/);

        if (atMatch) {
            const query = atMatch[1].toLowerCase();
            const filtered = allUsers.filter(u => 
                u.username.toLowerCase().includes(query) || 
                (u.name && u.name.toLowerCase().includes(query))
            ).filter(u => u.id !== currentUserId); // Don't mention yourself
            
            setSuggestions(filtered);
            setShowSuggestions(filtered.length > 0);
        } else {
            setShowSuggestions(false);
        }
    };

    const selectSuggestion = (user: any) => {
        const textBeforeCursor = newComment.slice(0, cursorPos);
        const textAfterCursor = newComment.slice(cursorPos);
        const atMatch = textBeforeCursor.match(/@(\w*)$/);
        
        if (atMatch) {
            const newTextBefore = textBeforeCursor.slice(0, atMatch.index) + `@${user.username} `;
            setNewComment(newTextBefore + textAfterCursor);
            setShowSuggestions(false);
            textareaRef.current?.focus();
        }
    };

    const handleSubmit = async () => {
        if (!newComment.trim()) return;

        setIsSubmitting(true);
        const result = await addComment(taskId, newComment);
        if (result.success) {
            setNewComment('');
            await loadComments();
            bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
        } else {
            alert('コメントの送信に失敗しました: ' + result.error);
        }
        setIsSubmitting(false);
    };

    // Helper to highlight @mentions
    const processMentions = (content: string) => {
        // Highlight @username in blue
        return content.replace(/@([a-zA-Z0-9_-]+)/g, '<span style="color:#4D91FF;font-weight:bold;text-decoration:underline;">@$1</span>');
    };

    return (
        <div style={{
            marginTop: '2rem',
            border: '2px solid rgba(157, 191, 103, 0.3)',
            backgroundColor: 'var(--bg-sunken)',
            display: 'flex',
            flexDirection: 'column',
            position: 'relative'
        }}>
            <div style={{
                padding: '0.5rem 1rem',
                backgroundColor: 'rgba(157, 191, 103, 0.1)',
                borderBottom: '2px solid rgba(157, 191, 103, 0.3)',
                fontWeight: 'bold',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem'
            }}>
                <span style={{ color: 'var(--color-flower)' }}>#</span> COMMUNICATIONS
            </div>

            {/* Suggestions Popover */}
            {showSuggestions && (
                <div style={{
                    position: 'absolute',
                    bottom: '100%',
                    left: '1rem',
                    width: '250px',
                    maxHeight: '200px',
                    overflowY: 'auto',
                    backgroundColor: 'var(--bg-sunken)',
                    border: '2px solid var(--text-main)',
                    zIndex: 100,
                    boxShadow: '0 -4px 10px rgba(0,0,0,0.5)'
                }} className="hacker-scroll">
                    {suggestions.map(user => (
                        <div 
                            key={user.id} 
                            onClick={() => selectSuggestion(user)}
                            style={{
                                padding: '0.5rem 1rem',
                                cursor: 'pointer',
                                borderBottom: '1px solid rgba(255,255,255,0.1)',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '0.5rem'
                            }}
                            className="suggestion-item"
                        >
                            <span style={{ color: user.themeColor || 'var(--color-flower)' }}>{user.avatar || '[-]'}</span>
                            <span>{user.name || user.username} (@{user.username})</span>
                        </div>
                    ))}
                </div>
            )}

            {/* Comments List */}
            <div style={{ padding: '1rem', display: 'flex', flexDirection: 'column', gap: '1.5rem', maxHeight: '400px', overflowY: 'auto' }} className="hacker-scroll">
                {comments.length === 0 && <div style={{ color: 'var(--text-muted)', textAlign: 'center', padding: '2rem' }}>コメントはありません。</div>}

                {comments.map((comment) => {
                    const isMe = comment.authorId === currentUserId;
                    const date = new Date(comment.createdAt);
                    const formattedDate = `${date.getMonth() + 1}/${date.getDate()} ${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`;

                    return (
                        <div key={comment.id} style={{ display: 'flex', flexDirection: 'column', alignItems: isMe ? 'flex-end' : 'flex-start' }}>
                            <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', marginBottom: '4px', flexDirection: isMe ? 'row-reverse' : 'row' }}>
                                <div style={{
                                    width: '24px', height: '24px', borderRadius: '50%',
                                    backgroundColor: comment.author.themeColor || 'var(--color-metal)',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    fontWeight: 'bold', color: '#000', fontSize: '0.7rem'
                                }}>
                                    {comment.author.name?.[0] || comment.author.username[0]}
                                </div>
                                <span style={{ fontSize: '0.8rem', color: isMe ? 'var(--text-main)' : 'var(--text-muted)', fontWeight: isMe ? 'bold' : 'normal' }}>
                                    {comment.author.name || comment.author.username}
                                </span>
                                <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', opacity: 0.5 }}>{formattedDate}</span>
                            </div>

                            <div style={{
                                maxWidth: '85%',
                                padding: '0.8rem 1rem',
                                backgroundColor: isMe ? 'rgba(157, 191, 103, 0.15)' : 'rgba(255, 255, 255, 0.05)',
                                border: `1px solid ${isMe ? 'var(--color-moss-dark)' : 'rgba(255,255,255,0.1)'}`,
                                color: 'var(--text-main)',
                                fontSize: '0.9rem',
                                lineHeight: '1.5',
                                wordBreak: 'break-word',
                                borderTopLeftRadius: isMe ? '8px' : '0px',
                                borderTopRightRadius: isMe ? '0px' : '8px',
                                borderBottomLeftRadius: '8px',
                                borderBottomRightRadius: '8px'
                            }}>
                                <div className="markdown-content" dangerouslySetInnerHTML={{ __html: processMentions(comment.content) }} />
                            </div>
                        </div>
                    );
                })}
                <div ref={bottomRef} />
            </div>

            {/* Input Area */}
            <div style={{
                padding: '1rem',
                borderTop: '1px solid rgba(157, 191, 103, 0.3)',
                backgroundColor: 'rgba(0,0,0,0.3)',
                display: 'flex',
                gap: '1rem'
            }}>
                <textarea
                    ref={textareaRef}
                    value={newComment}
                    onChange={handleTextareaChange}
                    placeholder="コメントを入力... (@でメンション)"
                    rows={2}
                    style={{
                        flex: 1, padding: '0.8rem', backgroundColor: 'var(--bg-sunken)',
                        border: '1px solid var(--text-muted)', color: 'var(--text-main)', outlineColor: 'var(--color-flower)',
                        fontFamily: 'monospace', resize: 'none'
                    }}
                    autoFocus={false}
                    onKeyDown={(e) => {
                        if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
                            handleSubmit();
                        }
                    }}
                />
                <button
                    onClick={handleSubmit}
                    disabled={isSubmitting || !newComment.trim()}
                    style={{
                        padding: '0 1.5rem',
                        backgroundColor: isSubmitting || !newComment.trim() ? 'var(--color-metal)' : 'var(--color-moss-dark)',
                        color: isSubmitting || !newComment.trim() ? 'var(--bg-sunken)' : 'white',
                        border: 'none', cursor: isSubmitting || !newComment.trim() ? 'not-allowed' : 'pointer',
                        fontWeight: 'bold', fontFamily: 'monospace'
                    }}
                    className={!isSubmitting && newComment.trim() ? "hover:bg-[var(--text-main)] hover:text-black transition-colors" : ""}
                >
                    {isSubmitting ? '送信中' : '送信'}
                    <div style={{ fontSize: '0.6rem', marginTop: '4px', opacity: 0.7, fontWeight: 'normal' }}>Ctrl+Enter</div>
                </button>
            </div>

            <style jsx global>{`
                .suggestion-item:hover {
                    background-color: var(--color-moss-dark);
                    color: white;
                }
                .hacker-scroll::-webkit-scrollbar {
                    width: 8px;
                }
                .hacker-scroll::-webkit-scrollbar-track {
                    background: #111;
                }
                .hacker-scroll::-webkit-scrollbar-thumb {
                    background: #222;
                    border: 1px solid #444;
                }
                .hacker-scroll::-webkit-scrollbar-thumb:hover {
                    background: var(--color-moss-dark);
                }
            `}</style>
        </div>
    );
}
