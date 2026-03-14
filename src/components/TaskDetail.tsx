'use client';

import { useState, useCallback } from 'react';
import { updateTask, deleteTask, markTaskSystemLogsAsRead } from '../actions/task';
import { uploadImage } from '../actions/upload';
import { MossyFrame } from './ui/MossyFrame';
import { PixelButton } from './ui/PixelButton';
import { StatusBadge } from './ui/StatusBadge';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { ReviewRequestModal } from './ReviewRequestModal';
import { CommentSection } from './CommentSection';
import { useRouter } from 'next/navigation';
import CreatableSelect from 'react-select/creatable';
import { getAllTags } from '../actions/tag';
import { useEffect } from 'react';
// import styles from './TaskDetail.module.css'; // Inline styles for speed for now or reuse?

export function TaskDetail({ task, users, currentUserId }: { task: any, users: any[], currentUserId: string }) {
    const [isEditing, setIsEditing] = useState(false);
    const [title, setTitle] = useState(task.title);
    const [description, setDescription] = useState(task.description || '');
    const [assigneeId, setAssigneeId] = useState(task.assigneeId || '');
    const [priority, setPriority] = useState(task.priority);
    const [startDate, setStartDate] = useState(task.startDate ? new Date(task.startDate).toISOString().split('T')[0] : '');
    const [dueDate, setDueDate] = useState(task.dueDate ? new Date(task.dueDate).toISOString().split('T')[0] : '');
    
    // Role and Tags
    const [role, setRole] = useState(task.role || 'PROGRAMMER');
    const [availableTags, setAvailableTags] = useState<{value: string, label: string}[]>([]);
    const [selectedTags, setSelectedTags] = useState<readonly {value: string, label: string}[]>(
        Array.isArray(task.tags) ? task.tags.map((t: any) => ({ value: t.name, label: t.name })) : []
    );

    const [isDragging, setIsDragging] = useState(false);
    const [showReviewModal, setShowReviewModal] = useState(false);
    const router = useRouter();

    useEffect(() => {
        getAllTags().then(tags => {
            setAvailableTags(tags.map((t: any) => ({ value: t.name, label: t.name })));
        });
    }, []);

    // Force scroll to top when opening a task detail page to combat browser auto-focus leaping
    // and automatically mark any system logs for this task as read for the current user.
    useEffect(() => {
        // Reset scroll position of the main content area
        const mainContent = document.querySelector('main');
        if (mainContent) {
            mainContent.scrollTop = 0;
        } else {
            window.scrollTo(0, 0);
        }
        markTaskSystemLogsAsRead(task.id);
    }, [task.id]);

    const handleDeleteTask = async () => {
        if (window.confirm('本当にこのタスクを削除しますか？\nこの操作は取り消せません。')) {
            await deleteTask(task.id);
            router.push('/');
        }
    };

    const handleSave = async () => {
        await updateTask(task.id, {
            title,
            description,
            role,
            assigneeId: assigneeId || null,
            priority,
            startDate: startDate ? new Date(startDate) : null,
            dueDate: dueDate ? new Date(dueDate) : null,
            tagsStr: JSON.stringify(selectedTags.map(t => t.value))
        });
        setIsEditing(false);
    };

    const handleUpload = async (file: File) => {
        if (!file.type.startsWith('image/')) return;

        try {
            const formData = new FormData();
            formData.append('file', file);
            const url = await uploadImage(formData);

            // Append markdown image syntax
            const imageMarkdown = `\n![${file.name}](${url})\n`;
            setDescription((prev: string) => prev + imageMarkdown);
        } catch (e) {
            console.error("Upload failed", e);
            alert("画像のアップロードに失敗しました");
        }
    };

    const handleUpdateStatus = async (newStatus: string) => {
        await updateTask(task.id, { status: newStatus });
        // The page will automatically re-render with new props because of revalidatePath in updateTask
    };

    const onDrop = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(false);

        if (!isEditing) return;

        if (e.dataTransfer.files && e.dataTransfer.files[0]) {
            handleUpload(e.dataTransfer.files[0]);
        }
    }, [isEditing]);

    const onPaste = useCallback((e: React.ClipboardEvent) => {
        if (!isEditing) return;
        if (e.clipboardData.files && e.clipboardData.files[0]) {
            handleUpload(e.clipboardData.files[0]);
        }
    }, [isEditing]);

    return (
        <div style={{ maxWidth: '800px', margin: '0 auto' }}>
            <MossyFrame title={isEditing ? 'タスク編集' : task.title}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>

                    {/* Header Controls */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                            {!isEditing && (
                                <div style={{ display: 'flex', gap: '0.5rem' }}>
                                    {task.status === 'TODO' && (
                                        <button onClick={() => handleUpdateStatus('IN_PROGRESS')} className="hover:bg-[var(--text-main)] hover:text-[var(--bg-main)] transition-colors" style={{ border: '1px solid var(--text-main)', background: 'transparent', color: 'var(--text-main)', cursor: 'pointer', fontSize: '0.8rem', padding: '6px 12px', fontWeight: 'bold' }}>{"> 作業開始"}</button>
                                    )}
                                    {task.status === 'IN_PROGRESS' && (
                                        <button onClick={() => setShowReviewModal(true)} className="hover:bg-[var(--color-flower)] hover:text-black transition-colors" style={{ border: '1px solid var(--color-flower)', color: 'var(--color-flower)', background: 'transparent', cursor: 'pointer', fontSize: '0.8rem', padding: '6px 12px', fontWeight: 'bold' }}>{"^ 報告/確認依頼"}</button>
                                    )}
                                    {task.status === 'REVIEW' && (
                                        <>
                                            <button onClick={() => handleUpdateStatus('IN_PROGRESS')} className="hover:bg-[var(--color-rust)] hover:text-white transition-colors" style={{ border: '1px solid var(--color-rust)', color: 'var(--color-rust)', background: 'transparent', cursor: 'pointer', fontSize: '0.8rem', padding: '6px 12px', fontWeight: 'bold' }}>{"< FB・差し戻し"}</button>
                                            <button onClick={() => handleUpdateStatus('DONE')} className="hover:bg-[var(--color-moss-dark)] hover:text-white transition-colors" style={{ border: '1px solid var(--color-moss-dark)', color: 'var(--color-moss-dark)', background: 'transparent', cursor: 'pointer', fontSize: '0.8rem', padding: '6px 12px', fontWeight: 'bold' }}>{"v 完了にする"}</button>
                                        </>
                                    )}
                                </div>
                            )}
                            {!isEditing && task.assignee && (
                                <span className="pixel-text" style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                                    担当: {task.assignee.name || task.assignee.username}
                                </span>
                            )}
                        </div>
                        <PixelButton onClick={() => isEditing ? handleSave() : setIsEditing(true)}>
                            {isEditing ? '変更を保存' : 'タスク編集'}
                        </PixelButton>
                    </div>

                    {/* Main Content */}
                    {isEditing ? (
                        <div
                            style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}
                            onDragOver={e => { e.preventDefault(); setIsDragging(true); }}
                            onDragLeave={() => setIsDragging(false)}
                            onDrop={onDrop}
                        >
                            {isDragging && (
                                <div style={{
                                    position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 100,
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    color: 'white', fontSize: '2rem', pointerEvents: 'none'
                                }}>
                                    画像をドロップしてアップロード
                                </div>
                            )}
                            <label>
                                <span className="pixel-text">タイトル</span>
                                <input
                                    value={title}
                                    onChange={e => setTitle(e.target.value)}
                                    style={{ width: '100%', padding: '0.5rem', fontFamily: 'inherit', backgroundColor: 'var(--bg-sunken)', border: '2px solid var(--text-main)' }}
                                />
                            </label>

                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                                <label>
                                    <span className="pixel-text">担当者</span>
                                    <select
                                        value={assigneeId}
                                        onChange={e => setAssigneeId(e.target.value)}
                                        style={{ width: '100%', padding: '0.5rem', fontFamily: 'inherit', backgroundColor: 'var(--bg-sunken)', border: '2px solid var(--text-main)' }}
                                    >
                                        <option value="">(未割り当て)</option>
                                        {users.map(u => (
                                            <option key={u.id} value={u.id}>{u.name || u.username}</option>
                                        ))}
                                    </select>
                                </label>
                                <label>
                                    <span className="pixel-text">優先度</span>
                                    <select
                                        value={priority}
                                        onChange={e => setPriority(e.target.value)}
                                        style={{ width: '100%', padding: '0.5rem', fontFamily: 'inherit', backgroundColor: 'var(--bg-sunken)', border: '2px solid var(--text-main)' }}
                                    >
                                        <option value="LOW">低 (LOW)</option>
                                        <option value="MIDDLE">中 (MIDDLE)</option>
                                        <option value="HIGH">高 (HIGH)</option>
                                    </select>
                                </label>
                                <label>
                                    <span className="pixel-text">ロール (担当役割)</span>
                                    <select
                                        value={role}
                                        onChange={e => setRole(e.target.value)}
                                        style={{ width: '100%', padding: '0.5rem', fontFamily: 'inherit', backgroundColor: 'var(--bg-sunken)', border: '2px solid var(--text-main)' }}
                                    >
                                        <option value="PLANNER">プランナー</option>
                                        <option value="PROGRAMMER">プログラマー</option>
                                        <option value="DESIGNER">デザイナー</option>
                                    </select>
                                </label>
                            </div>

                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                                <label>
                                    <span className="pixel-text">開始日</span>
                                    <input
                                        type="date"
                                        value={startDate}
                                        onChange={e => setStartDate(e.target.value)}
                                        style={{ width: '100%', padding: '0.5rem', fontFamily: 'inherit', backgroundColor: 'var(--bg-sunken)', border: '2px solid var(--text-main)' }}
                                    />
                                </label>
                                <label>
                                    <span className="pixel-text">締切日</span>
                                    <input
                                        type="date"
                                        value={dueDate}
                                        onChange={e => setDueDate(e.target.value)}
                                        style={{ width: '100%', padding: '0.5rem', fontFamily: 'inherit', backgroundColor: 'var(--bg-sunken)', border: '2px solid var(--text-main)' }}
                                    />
                                </label>
                            </div>

                            <label>
                                <span className="pixel-text">分類タグ (複数選択・新規作成可)</span>
                                <div style={{color: '#000'}}>
                                    <CreatableSelect
                                        isMulti
                                        options={availableTags}
                                        value={selectedTags}
                                        onChange={(newValue) => setSelectedTags(newValue)}
                                        placeholder="タグを入力..."
                                        formatCreateLabel={(inputValue) => `「${inputValue}」を新規作成`}
                                        styles={{
                                            control: (base) => ({
                                                ...base,
                                                backgroundColor: 'var(--bg-sunken)',
                                                borderColor: 'var(--text-main)',
                                                borderWidth: '2px',
                                                borderRadius: '0',
                                            })
                                        }}
                                    />
                                </div>
                            </label>

                            <label>
                                <span className="pixel-text">詳細・メモ (Markdown, 画像はDrag&DropまたはPaste)</span>
                                <textarea
                                    value={description}
                                    onChange={e => setDescription(e.target.value)}
                                    onPaste={onPaste}
                                    rows={10}
                                    style={{ width: '100%', padding: '0.5rem', fontFamily: 'inherit', backgroundColor: 'var(--bg-sunken)', border: '2px solid var(--text-main)' }}
                                    autoFocus={false}
                                />
                            </label>
                        </div>
                    ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                            {/* Progress Step Diagram */}
                            <div style={{
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center',
                                padding: '1.5rem',
                                backgroundColor: 'var(--bg-sunken)',
                                border: '1px solid rgba(157, 191, 103, 0.3)',
                                position: 'relative'
                            }}>
                                <div style={{ position: 'absolute', top: '50%', left: '10%', right: '10%', height: '2px', backgroundColor: 'var(--color-metal)', zIndex: 0 }} />
                                {['TODO', 'IN_PROGRESS', 'REVIEW', 'DONE'].map((step, idx) => {
                                    const labels: Record<string, string> = { 'TODO': '未着手', 'IN_PROGRESS': '作業中', 'REVIEW': '確認待ち', 'DONE': '完了' };
                                    const colors: Record<string, string> = { 'TODO': 'var(--text-muted)', 'IN_PROGRESS': 'var(--color-rust)', 'REVIEW': 'var(--color-flower)', 'DONE': 'var(--color-moss-dark)' };

                                    const steps = ['TODO', 'IN_PROGRESS', 'REVIEW', 'DONE'];
                                    const currentIndex = steps.indexOf(task.status);

                                    const isPast = idx < currentIndex;
                                    const isCurrent = idx === currentIndex;
                                    const isFuture = idx > currentIndex;

                                    return (
                                        <div key={step} style={{
                                            position: 'relative',
                                            zIndex: 1,
                                            display: 'flex',
                                            flexDirection: 'column',
                                            alignItems: 'center',
                                            gap: '0.5rem'
                                        }}>
                                            <div style={{
                                                width: isCurrent ? '20px' : '14px',
                                                height: isCurrent ? '20px' : '14px',
                                                borderRadius: '50%',
                                                backgroundColor: isPast || isCurrent ? colors[step] : 'var(--bg-sunken)',
                                                border: `2px solid ${isFuture ? 'var(--color-metal)' : colors[step]}`,
                                                boxShadow: isCurrent ? `0 0 10px ${colors[step]}` : 'none',
                                                transition: 'all 0.3s'
                                            }} />
                                            <span style={{
                                                fontSize: '0.8rem',
                                                fontWeight: isCurrent ? 'bold' : 'normal',
                                                color: isPast || isCurrent ? 'var(--text-main)' : 'var(--text-muted)'
                                            }}>{labels[step]}</span>
                                        </div>
                                    );
                                })}
                            </div>

                            {/* Meta Data View Terminal Style */}
                            <div style={{
                                display: 'grid',
                                gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
                                gap: '1px',
                                backgroundColor: 'var(--color-moss-dark)',
                                border: '2px solid var(--color-moss-dark)',
                                marginTop: '1rem',
                                marginBottom: '1rem'
                            }}>
                                <div style={{ display: 'flex', flexDirection: 'column', backgroundColor: 'var(--bg-sunken)', padding: '0.8rem', gap: '0.3rem' }}>
                                    <span style={{ fontSize: '0.8rem', color: 'var(--color-moss-light)', fontWeight: 'bold', fontFamily: 'monospace' }}>[ 優先度 ]</span>
                                    <span style={{ fontWeight: 'bold', fontSize: '1.1rem', color: task.priority === 'HIGH' ? 'var(--color-rust)' : task.priority === 'MIDDLE' ? '#ddaa00' : 'var(--color-moss-light)' }}>
                                        {task.priority}
                                    </span>
                                </div>
                                <div style={{ display: 'flex', flexDirection: 'column', backgroundColor: 'var(--bg-sunken)', padding: '0.8rem', gap: '0.3rem' }}>
                                    <span style={{ fontSize: '0.8rem', color: 'var(--color-moss-light)', fontWeight: 'bold', fontFamily: 'monospace' }}>[ 開始日 ]</span>
                                    <span style={{ fontWeight: 'bold', fontSize: '1.1rem' }}>{task.startDate ? new Date(task.startDate).toLocaleDateString('ja-JP') : '-----'}</span>
                                </div>
                                <div style={{ display: 'flex', flexDirection: 'column', backgroundColor: 'var(--bg-sunken)', padding: '0.8rem', gap: '0.3rem' }}>
                                    <span style={{ fontSize: '0.8rem', color: 'var(--color-moss-light)', fontWeight: 'bold', fontFamily: 'monospace' }}>[ 期限 ]</span>
                                    <span style={{ fontWeight: 'bold', fontSize: '1.1rem', color: task.dueDate && new Date(task.dueDate) < new Date() ? 'var(--color-rust)' : 'inherit' }}>
                                        {task.dueDate ? new Date(task.dueDate).toLocaleDateString('ja-JP') : '-----'}
                                    </span>
                                </div>
                                <div style={{ display: 'flex', flexDirection: 'column', backgroundColor: 'var(--bg-sunken)', padding: '0.8rem', gap: '0.3rem' }}>
                                    <span style={{ fontSize: '0.8rem', color: 'var(--color-moss-light)', fontWeight: 'bold', fontFamily: 'monospace' }}>[ ロール ]</span>
                                    <span style={{ fontWeight: 'bold', fontSize: '1.1rem', color: task.role === 'PLANNER' ? 'var(--color-sunflower)' : task.role === 'DESIGNER' ? 'var(--color-flower)' : 'var(--color-moss-light)' }}>
                                        {task.role === 'PLANNER' ? 'プランナー' : task.role === 'DESIGNER' ? 'デザイナー' : 'プログラマー'}
                                    </span>
                                </div>
                                <div style={{ display: 'flex', flexDirection: 'column', backgroundColor: 'var(--bg-sunken)', padding: '0.8rem', gap: '0.3rem' }}>
                                    <span style={{ fontSize: '0.8rem', color: 'var(--color-moss-light)', fontWeight: 'bold', fontFamily: 'monospace' }}>[ タグ ]</span>
                                    <span style={{ fontWeight: 'bold', fontSize: '1.1rem' }}>
                                        {Array.isArray(task.tags) && task.tags.length > 0 
                                            ? task.tags.map((t: any) => t.name).join(', ') 
                                            : '-----'}
                                    </span>
                                </div>
                            </div>

                            <div className="markdown-content" style={{ padding: '1rem', backgroundColor: 'var(--bg-sunken)', minHeight: '150px', lineHeight: '1.6' }}>
                                {task.description ? (
                                    <ReactMarkdown remarkPlugins={[remarkGfm]}>{task.description}</ReactMarkdown>
                                ) : (
                                    <span style={{ color: 'var(--text-muted)' }}>詳細はありません。</span>
                                )}
                            </div>

                            {!isEditing && (
                                <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '1rem' }}>
                                    <button
                                        onClick={handleDeleteTask}
                                        style={{ color: 'var(--color-rust)', fontSize: '0.8rem', background: 'none', border: 'none', cursor: 'pointer', opacity: 0.6 }}
                                        className="hover:opacity-100 transition-opacity"
                                    >
                                        [!] このタスクを削除する
                                    </button>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </MossyFrame>

            {/* Add Comments Section Below the Main Task Frame */}
            {!isEditing && (
                <CommentSection taskId={task.id} currentUserId={currentUserId} />
            )}

            {showReviewModal && (
                <ReviewRequestModal
                    taskId={task.id}
                    users={users}
                    currentUserId={currentUserId}
                    onClose={() => setShowReviewModal(false)}
                    onSuccess={() => {
                        setShowReviewModal(false);
                    }}
                />
            )}
        </div>
    );
}
