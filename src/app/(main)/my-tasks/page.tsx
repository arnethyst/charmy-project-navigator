'use client';

import { useState, useEffect } from 'react';
import { getMyTasks, updateTaskStatus, getMySystemLogs, markSystemLogsAsRead } from '@/actions/task';
import { getPersonalMemo, updatePersonalMemo } from '@/actions/user';
import { getUsers, getCurrentUser } from '@/actions/auth';
import { useRouter } from 'next/navigation';
import { TaskModal } from '@/components/TaskModal';
import { ReviewRequestModal } from '@/components/ReviewRequestModal';
import { ReviewRequestsList } from '@/components/ReviewRequestsList';
import { PixelButton } from '@/components/ui/PixelButton';
import { MossyFrame } from '@/components/ui/MossyFrame';

interface Task {
    id: string;
    title: string;
    description: string | null;
    type: string;
    status: string;
    priority: string;
    dueDate: Date | null;
    assignee: {
        name: string | null;
        username: string;
    } | null;
}

export default function MyTasksPage() {
    const router = useRouter();
    const [tasks, setTasks] = useState<Task[]>([]);
    const [users, setUsers] = useState<any[]>([]);
    const [currentUserId, setCurrentUserId] = useState<string>('');
    const [systemLogs, setSystemLogs] = useState<any[]>([]);
    const [showModal, setShowModal] = useState(false);
    const [showReviewModalTaskId, setShowReviewModalTaskId] = useState<string | null>(null);
    const [memo, setMemo] = useState('');
    const [saveStatus, setSaveStatus] = useState<'IDLE' | 'SAVING' | 'SAVED'>('IDLE');
    const [isInitialLoad, setIsInitialLoad] = useState(true);
    const [filterStatus, setFilterStatus] = useState<string>('ALL');
    const [isSystemLogsExpanded, setIsSystemLogsExpanded] = useState(false);

    const loadInitialData = async () => {
        try {
            const dbMemo = await getPersonalMemo();
            if (dbMemo !== null) setMemo(dbMemo);

            const dbUsers = await getUsers();
            setUsers(dbUsers);

            const u = await getCurrentUser();
            if (u) setCurrentUserId(u.id);

            // Automatically mark all system logs as read when page is opened
            await markSystemLogsAsRead();
            await loadSystemLogs();

        } catch (error) {
            console.error('Failed to load initial data', error);
        } finally {
            setIsInitialLoad(false);
        }
    };

    const loadSystemLogs = async () => {
        const logs = await getMySystemLogs();
        if (logs) {
            setSystemLogs(logs);
        }
    };

    useEffect(() => {
        loadTasks();
        loadInitialData();

        const interval = setInterval(loadSystemLogs, 10000); // Poll every 10s
        return () => clearInterval(interval);
    }, []);

    useEffect(() => {
        if (isInitialLoad) return;

        setSaveStatus('IDLE');
        const timeoutId = setTimeout(async () => {
            setSaveStatus('SAVING');
            try {
                await updatePersonalMemo(memo);
                setSaveStatus('SAVED');
            } catch (error) {
                console.error('Failed to save memo', error);
                setSaveStatus('IDLE');
            }
        }, 1000);

        return () => clearTimeout(timeoutId);
    }, [memo, isInitialLoad]);

    const loadTasks = async () => {
        const res = await getMyTasks();
        if (res.tasks) {
            setTasks(res.tasks as any);
        }
    };

    const handleMemoChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        setMemo(e.target.value);
    };

    const handleUpdateStatus = async (taskId: string, newStatus: string) => {
        try {
            await updateTaskStatus(taskId, newStatus);
            await loadTasks();
        } catch (error) {
            console.error('Failed to update status:', error);
        }
    };

    const handleMarkSystemLogsAsRead = async () => {
        try {
            await markSystemLogsAsRead();
            await loadSystemLogs();
        } catch (error) {
            console.error('Failed to mark system logs as read:', error);
        }
    };

    const myTasks = tasks.filter(t => t.type === 'TASK');
    const myBugs = tasks.filter(t => t.type === 'BUG');
    const displayedTasks = filterStatus === 'ALL' ? myTasks : myTasks.filter(t => t.status === filterStatus);

    const getStatusInfo = (status: string) => {
        switch (status) {
            case 'TODO': return { label: '未着手', color: 'var(--text-muted)' };
            case 'IN_PROGRESS': return { label: '作業中', color: 'var(--color-rust)' };
            case 'REVIEW': return { label: '確認待ち', color: 'var(--color-flower)' };
            case 'DONE': return { label: '完了', color: 'var(--color-moss-dark)' };
            default: return { label: status, color: 'var(--text-main)' };
        }
    };

    const StatusBadge = ({ status }: { status: string }) => {
        const info = getStatusInfo(status);
        return (
            <span style={{
                border: `1px solid ${info.color}`,
                color: info.color,
                padding: '2px 6px',
                fontSize: '0.7rem',
                fontWeight: 'bold',
                backgroundColor: 'rgba(0,0,0,0.05)',
                textTransform: 'uppercase'
            }}>
                [{info.label}]
            </span>
        );
    };

    const getPriorityColor = (priority: string) => {
        switch (priority) {
            case 'HIGH':
            case 'URGENT':
                return 'var(--color-rust, #cc3333)';
            case 'MIDDLE':
                return '#ddaa00'; // yellow/orange
            case 'LOW':
                return 'var(--color-moss-light, #88cc88)'; // green/blue
            default:
                return 'var(--text-main)';
        }
    };

    const DueDateDisplay = ({ date }: { date: Date | null }) => {
        if (!date) return <span style={{ opacity: 0.5 }}>期限設定なし</span>;

        const d = new Date(date);
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const taskDate = new Date(d);
        taskDate.setHours(0, 0, 0, 0);

        let color = 'inherit';
        let weight = 'normal';
        let prefix = '';

        if (taskDate < today) {
            color = '#ff3333';
            weight = 'bold';
            prefix = '⚠️ 期限超過: ';
        } else if (taskDate.getTime() === today.getTime()) {
            color = '#cccc00';
            weight = 'bold';
            prefix = '⚡ 今日まで: ';
        }

        return (
            <span style={{ color, fontWeight: weight }}>
                {prefix}{d.toLocaleDateString('ja-JP')}
            </span>
        );
    };

    return (
        <div style={{ padding: '2rem', height: '100%', display: 'flex', flexDirection: 'column', gap: '2rem' }}>
            {/* System Info Area */}
            <div
                onClick={() => systemLogs.length > 0 && setIsSystemLogsExpanded(!isSystemLogsExpanded)}
                style={{
                    border: '1px solid var(--color-moss-light)',
                    backgroundColor: 'rgba(157, 191, 103, 0.1)',
                    color: 'var(--color-moss-dark)',
                    padding: '0.5rem 1rem',
                    fontFamily: 'monospace',
                    cursor: systemLogs.length > 0 ? 'pointer' : 'default',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '1rem',
                    fontSize: '0.9rem',
                    transition: 'all 0.2s ease-in-out'
                }}
                className={systemLogs.length > 0 ? "hover:bg-[rgba(157,191,103,0.2)]" : ""}
            >
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', width: '100%' }}>
                    <span style={{ fontWeight: 'bold' }}>[システム情報]</span>
                    {systemLogs.length > 0 ? (
                        <div style={{ display: 'flex', justifyContent: 'space-between', flex: 1, alignItems: 'center' }}>
                            <span style={{ color: 'var(--color-moss-dark)', fontWeight: 'bold' }}>
                                🔔 あなたのタスクや操作に関する最新のアクティビティが {systemLogs.length} 件あります
                                {` `}{isSystemLogsExpanded ? '▲ 閉じる' : '▼ 展開'}
                            </span>
                            <button
                                onClick={(e) => { e.stopPropagation(); handleMarkSystemLogsAsRead(); }}
                                className="hover:bg-[var(--color-moss-dark)] hover:text-[var(--bg-main)] transition-colors"
                                style={{
                                    border: '1px solid var(--color-moss-dark)',
                                    color: 'var(--color-moss-dark)',
                                    backgroundColor: 'transparent',
                                    padding: '2px 8px',
                                    fontSize: '0.8rem',
                                    fontWeight: 'bold',
                                    cursor: 'pointer'
                                }}
                            >
                                【すべて既読にする】
                            </button>
                        </div>
                    ) : (
                        <span>システムは正常に稼働しています。最近のアクティビティはありません。</span>
                    )}
                </div>

                {isSystemLogsExpanded && systemLogs.length > 0 && (
                    <div style={{
                        borderTop: '1px solid rgba(157, 191, 103, 0.3)',
                        paddingTop: '0.5rem',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '0.5rem',
                        maxHeight: '200px',
                        overflowY: 'auto'
                    }} className="hacker-scroll">
                        {systemLogs.map((log: any) => (
                            <div key={log.id} 
                                onClick={(e) => {
                                    e.stopPropagation();
                                    router.push(`/tasks/${log.taskId}`);
                                }}
                                className="group"
                                style={{
                                    padding: '0.8rem 1rem',
                                    backgroundColor: 'transparent',
                                    borderLeft: '3px solid var(--color-moss-light)',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '1rem',
                                    cursor: 'pointer',
                                    transition: 'all 0.2s ease',
                                    boxShadow: '0 0 0 rgba(157, 191, 103, 0)'
                                }}
                                onMouseEnter={(e) => {
                                    e.currentTarget.style.backgroundColor = 'rgba(157, 191, 103, 0.15)';
                                    e.currentTarget.style.boxShadow = 'inset 4px 0 0 var(--color-moss-dark)';
                                }}
                                onMouseLeave={(e) => {
                                    e.currentTarget.style.backgroundColor = 'transparent';
                                    e.currentTarget.style.boxShadow = '0 0 0 rgba(157, 191, 103, 0)';
                                }}
                            >
                                <span style={{ opacity: 0.5, fontSize: '0.8rem', minWidth: '40px' }}>
                                    {new Date(log.createdAt).toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' })}
                                </span>
                                <span style={{ flex: 1, color: 'var(--text-main)' }}>
                                    {log.content}
                                </span>
                                <span className="opacity-0 group-hover:opacity-100 transition-opacity" style={{ color: 'var(--color-moss-light)', fontSize: '0.8rem', fontWeight: 'bold' }}>
                                    [ 詳細へ &gt; ]
                                </span>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: '2rem', flex: 1, minHeight: 0 }}>

                {/* Left Column: Tasks & Bugs */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem', overflowY: 'auto', paddingRight: '0.5rem' }}>

                    {/* My Tasks */}
                    <MossyFrame title={
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
                            <span>▶ 担当タスク一覧</span>
                            <div style={{ display: 'flex', gap: '4px', fontSize: '0.8rem', fontFamily: 'monospace' }}>
                                {['ALL', 'TODO', 'IN_PROGRESS', 'REVIEW', 'DONE'].map(status => {
                                    const labels: Record<string, string> = { ALL: 'すべて', TODO: '未着手', IN_PROGRESS: '作業中', REVIEW: '確認待ち', DONE: '完了' };
                                    const isActive = filterStatus === status;
                                    return (
                                        <button
                                            key={status}
                                            onClick={() => setFilterStatus(status)}
                                            style={{
                                                backgroundColor: isActive ? 'var(--color-moss-light)' : 'transparent',
                                                color: isActive ? '#000' : 'var(--color-moss-light)',
                                                border: isActive ? '2px solid var(--color-moss-light)' : '1px solid rgba(157, 191, 103, 0.3)',
                                                padding: '4px 12px',
                                                cursor: 'pointer',
                                                fontWeight: isActive ? 'bold' : 'normal',
                                                transition: 'all 0.2s',
                                                outline: 'none',
                                                transform: isActive ? 'scale(1.05)' : 'none',
                                                zIndex: isActive ? 1 : 0,
                                                boxShadow: isActive ? '0 0 8px rgba(157, 191, 103, 0.5)' : 'none'
                                            }}
                                            onMouseEnter={(e) => { if (!isActive) { e.currentTarget.style.backgroundColor = 'rgba(157, 191, 103, 0.1)'; e.currentTarget.style.borderColor = 'var(--color-moss-dark)'; } }}
                                            onMouseLeave={(e) => { if (!isActive) { e.currentTarget.style.backgroundColor = 'transparent'; e.currentTarget.style.borderColor = 'rgba(157, 191, 103, 0.3)'; } }}
                                        >
                                            {labels[status]}
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                    }>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1.5rem', alignItems: 'center' }}>
                            <div style={{ fontSize: '0.9rem' }}>あなたに割り当てられたタスクです。</div>
                        </div>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                            {displayedTasks.length === 0 && <div style={{ opacity: 0.5, fontStyle: 'italic', textAlign: 'center', padding: '2rem' }}>該当するタスクはありません。</div>}
                            {displayedTasks.map(task => (
                                <div key={task.id}
                                    onClick={() => router.push(`/tasks/${task.id}`)}
                                    className="group"
                                    style={{
                                        border: filterStatus !== 'ALL' && filterStatus === task.status ? '1px solid var(--color-moss-light)' : '1px solid var(--text-main)',
                                        backgroundColor: filterStatus !== 'ALL' && filterStatus === task.status ? 'rgba(157, 191, 103, 0.05)' : 'var(--bg-sunken)',
                                        boxShadow: filterStatus !== 'ALL' && filterStatus === task.status ? '0 0 5px rgba(157, 191, 103, 0.2) inset' : 'none',
                                        padding: '1rem',
                                        display: 'flex',
                                        justifyContent: 'space-between',
                                        alignItems: 'flex-start',
                                        color: 'var(--text-main)',
                                        position: 'relative',
                                        cursor: 'pointer',
                                        transition: 'all 0.2s'
                                    }}>
                                    <div style={{ flex: 1 }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.3rem' }}>
                                            <StatusBadge status={task.status} />
                                            <span style={{ fontWeight: 'bold', fontSize: '1rem' }}>{task.title}</span>
                                        </div>
                                        {task.description && (
                                            <div style={{ fontSize: '0.85rem', opacity: 0.8, marginBottom: '0.5rem', whiteSpace: 'pre-wrap' }}>
                                                {task.description}
                                            </div>
                                        )}
                                        <div style={{ fontSize: '0.8rem', display: 'flex', gap: '1.5rem' }}>
                                            <span>
                                                優先度: <strong style={{ color: getPriorityColor(task.priority) }}>{task.priority}</strong>
                                            </span>
                                            <DueDateDisplay date={task.dueDate} />
                                        </div>
                                    </div>

                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem', minWidth: '80px' }}>
                                        {task.status === 'TODO' && (
                                            <button
                                                onClick={(e) => { e.stopPropagation(); handleUpdateStatus(task.id, 'IN_PROGRESS') }}
                                                className="hover:bg-[var(--text-main)] hover:text-[var(--bg-main)] transition-colors"
                                                style={{ border: '1px solid var(--text-main)', background: 'transparent', color: 'var(--text-main)', cursor: 'pointer', fontSize: '0.75rem', padding: '6px 12px', fontWeight: 'bold' }}
                                                title="作業開始"
                                            >
                                                {"> 開始"}
                                            </button>
                                        )}
                                        {task.status === 'IN_PROGRESS' && (
                                            <button
                                                onClick={(e) => { e.stopPropagation(); setShowReviewModalTaskId(task.id); }}
                                                className="hover:bg-[var(--color-flower)] hover:text-black transition-colors"
                                                style={{ border: '1px solid var(--color-flower)', color: 'var(--color-flower)', background: 'transparent', cursor: 'pointer', fontSize: '0.75rem', padding: '6px 12px', fontWeight: 'bold' }}
                                                title="報告/確認依頼"
                                            >
                                                {"^ 報告"}
                                            </button>
                                        )}
                                        {task.status === 'REVIEW' && (
                                            <button
                                                onClick={(e) => { e.stopPropagation(); handleUpdateStatus(task.id, 'DONE') }}
                                                className="hover:bg-[var(--color-moss-dark)] hover:text-white transition-colors"
                                                style={{ border: '1px solid var(--color-moss-dark)', color: 'var(--color-moss-dark)', background: 'transparent', cursor: 'pointer', fontSize: '0.75rem', padding: '6px 12px', fontWeight: 'bold' }}
                                                title="完了にする"
                                            >
                                                {"v 完了"}
                                            </button>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </MossyFrame>

                    {/* Review Requests */}
                    <ReviewRequestsList />

                    {/* Anomaly Detected (Bugs) */}
                    <div style={{
                        border: '2px solid var(--color-rust)',
                        padding: '1.5rem',
                        position: 'relative',
                        backgroundColor: 'rgba(192, 108, 75, 0.05)'
                    }}>
                        <div style={{
                            position: 'absolute',
                            top: '-12px',
                            left: '20px',
                            backgroundColor: 'var(--bg-main)',
                            padding: '0 10px',
                            color: 'var(--color-rust)',
                            fontWeight: 'bold',
                            fontFamily: 'monospace',
                            fontSize: '0.9rem'
                        }}>
                            [ ⚠️ 異常検知 (バグ報告) ]
                        </div>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                            {myBugs.length === 0 && <div style={{ color: 'var(--color-rust)', opacity: 0.7, fontSize: '0.9rem', textAlign: 'center', padding: '1rem' }}>異常は検知されていません。システムは安定しています。</div>}
                            {myBugs.map(bug => (
                                <div key={bug.id}
                                    onClick={() => router.push(`/tasks/${bug.id}`)}
                                    style={{
                                        border: '1px dashed var(--color-rust)',
                                        backgroundColor: 'rgba(192, 108, 75, 0.03)',
                                        padding: '1rem',
                                        color: 'var(--text-main)',
                                        cursor: 'pointer'
                                    }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                        <span style={{ fontWeight: 'bold' }}>[BUG] {bug.title}</span>
                                        <StatusBadge status={bug.status} />
                                    </div>
                                    <div style={{ fontSize: '0.85rem', marginTop: '0.5rem', opacity: 0.8 }}>{bug.description}</div>
                                </div>
                            ))}
                        </div>
                    </div>

                </div>

                {/* Right Column: Personal Memo */}
                <div style={{ display: 'flex', flexDirection: 'column', minHeight: 0 }}>
                    <MossyFrame title="▶ 個人メモ (スクラッチパッド)" style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
                        <div style={{ flex: 1, backgroundColor: '#000000', padding: '2px', border: '1px solid #333' }}>
                            <textarea
                                value={memo}
                                onChange={handleMemoChange}
                                placeholder="Local scratchpad... Enter notes here."
                                style={{
                                    width: '100%',
                                    height: '100%',
                                    backgroundColor: '#000000',
                                    color: '#00ff00',
                                    fontFamily: '"Courier New", Courier, monospace',
                                    fontSize: '0.9rem',
                                    lineHeight: '1.4',
                                    border: 'none',
                                    padding: '1rem',
                                    resize: 'none',
                                    outline: 'none',
                                    caretColor: '#00ff00'
                                }}
                                className="hacker-scroll"
                            />
                        </div>
                        <div style={{
                            backgroundColor: '#00ff00',
                            color: '#000',
                            fontWeight: 'bold',
                            fontSize: '0.7rem',
                            padding: '2px 8px',
                            fontFamily: 'monospace',
                            display: 'flex',
                            justifyContent: 'space-between'
                        }}>
                            <span style={{ display: 'flex', gap: '1rem' }}>
                                <span>-- EDITOR --</span>
                                {saveStatus === 'SAVING' && <span>[ ! ] SAVING...</span>}
                                {saveStatus === 'SAVED' && <span>[ OK ] SAVED</span>}
                            </span>
                            <span>CHARS: {memo.length}</span>
                        </div>
                    </MossyFrame>
                </div>
            </div>

            {showModal && (
                <TaskModal
                    onClose={() => setShowModal(false)}
                    onSuccess={() => {
                        loadTasks();
                    }}
                />
            )}

            {showReviewModalTaskId && (
                <ReviewRequestModal
                    taskId={showReviewModalTaskId}
                    users={users}
                    currentUserId={currentUserId}
                    onClose={() => setShowReviewModalTaskId(null)}
                    onSuccess={() => {
                        setShowReviewModalTaskId(null);
                        loadTasks();
                    }}
                />
            )}

            <style jsx global>{`
                .hacker-scroll::-webkit-scrollbar {
                    width: 8px;
                }
                .hacker-scroll::-webkit-scrollbar-track {
                    background: #111;
                }
                .hacker-scroll::-webkit-scrollbar-thumb {
                    background: #008800;
                    border: 1px solid #00ff00;
                }
                .hacker-scroll::-webkit-scrollbar-thumb:hover {
                    background: #00bb00;
                }
            `}</style>
        </div>
    );
}
