'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { DndContext, DragEndEvent, DragOverlay, DragStartEvent, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import { updateTaskStatus } from '../actions/task';
import { TaskCard } from './TaskCard';
import { StatusBadge, TaskStatus } from './ui/StatusBadge';
import { MossyFrame } from './ui/MossyFrame';
import styles from './KanbanBoard.module.css';

interface Task {
    id: string;
    title: string;
    status: string;
    priority: string;
    assigneeId?: string | null;
    assignee?: any;
    tags?: any[] | null;
    role?: string | null;
    isMilestone?: boolean;
}


const COLUMNS: TaskStatus[] = ['TODO', 'IN_PROGRESS', 'REVIEW', 'DONE'];

export function KanbanBoard({ initialTasks, users, currentUser }: { initialTasks: Task[], users: { id: string, name?: string | null, username?: string }[], currentUser: any | null }) {

    // First, remap old statuses to new statuses
    const mappedTasks = initialTasks.map(task => {
        let newStatus = task.status;
        if (newStatus === 'IDEA' || newStatus === 'SPEC') newStatus = 'TODO';
        if (newStatus === 'WORKING') newStatus = 'IN_PROGRESS';
        if (newStatus === 'BLOCKED') newStatus = 'REVIEW';
        return { ...task, status: newStatus };
    });

    // Auto-archive DONE tasks older than 72 hours
    const now = new Date();
    const visibleTasks = mappedTasks.filter(task => {
        // Hide milestones from the task board
        if (task.isMilestone) return false;

        if (task.status === 'DONE' && (task as any).updatedAt) {
            const updatedAt = new Date((task as any).updatedAt);
            const hoursDiff = (now.getTime() - updatedAt.getTime()) / (1000 * 60 * 60);
            if (hoursDiff > 72) return false;
        }
        return true;
    });

    const [tasks, setTasks] = useState(visibleTasks);
    const [activeId, setActiveId] = useState<string | null>(null);
    const [filterUser, setFilterUser] = useState('');
    const [filterTag, setFilterTag] = useState('');
    const [filterRole, setFilterRole] = useState('');


    const sensors = useSensors(
        useSensor(PointerSensor, {
            activationConstraint: {
                distance: 5, // Prevent accidental drags
            },
        })
    );

    // Extract all unique tags
    const allTags = Array.from(new Set(initialTasks.flatMap(t => {
        if (!t.tags) return [];
        return Array.isArray(t.tags) ? t.tags.map((tag: any) => typeof tag === 'string' ? tag : tag.name) : [];
    }))).sort();

    const handleDragStart = (event: DragStartEvent) => {
        setActiveId(event.active.id as string);
    };

    const handleDragEnd = async (event: DragEndEvent) => {
        const { active, over } = event;
        setActiveId(null); // Reset activeId after drag ends

        if (!over) return;

        const taskId = active.id as string;
        const newStatus = over.id as string;

        const task = tasks.find(t => t.id === taskId);
        if (!task || task.status === newStatus) return;

        // Optimistic update
        setTasks(currentTasks => currentTasks.map(t =>
            t.id === taskId ? { ...t, status: newStatus } : t
        ));

        try {
            await updateTaskStatus(taskId, newStatus);
        } catch (error) {
            // Revert on error
            console.error("Failed to update task status", error);
        }
    };

    const filteredTasks = tasks.filter(t => {
        const matchUser = filterUser ? t.assigneeId === filterUser : true;
        const matchTag = filterTag ? (Array.isArray(t.tags) && t.tags.some((tag: any) => (tag.name || tag) === filterTag)) : true;
        const matchRole = filterRole ? t.role === filterRole : true;
        return matchUser && matchTag && matchRole;
    });

    const displayUsers = users.filter(u => u.username !== 'charmy' && u.name !== 'Charmy');

    return (
        <div>
            {/* Filter Bar */}
            <div style={{
                marginBottom: '1rem',
                display: 'flex',
                alignItems: 'center',
                gap: '1rem',
                padding: '0.5rem 1rem',
                backgroundColor: 'rgba(157, 191, 103, 0.05)',
                border: '1px solid rgba(157, 191, 103, 0.3)',
                borderRadius: '4px'
            }}>
                <span style={{ color: 'var(--color-moss-light)', fontSize: '1.2rem' }}>🔍</span>
                <span className="pixel-text" style={{ color: 'var(--color-moss-dark)', fontWeight: 'bold' }}>絞り込み設定:</span>
                
                <div style={{ display: 'flex', gap: '0.5rem', flex: 1 }}>
                    <select
                        value={filterUser}
                        onChange={e => setFilterUser(e.target.value)}
                        style={{ padding: '0.3rem 0.5rem', fontFamily: 'inherit', backgroundColor: 'var(--bg-main)', border: '1px solid var(--color-moss-dark)', color: 'var(--text-main)', outline: 'none', fontSize: '0.9rem', cursor: 'pointer' }}
                    >
                        <option value="">全メンバー</option>
                        {displayUsers.map(u => <option key={u.id} value={u.id}>{u.name || u.username}</option>)}
                    </select>

                    <select
                        value={filterTag}
                        onChange={e => setFilterTag(e.target.value)}
                        style={{ padding: '0.3rem 0.5rem', fontFamily: 'inherit', backgroundColor: 'var(--bg-main)', border: '1px solid var(--color-moss-dark)', color: 'var(--text-main)', outline: 'none', fontSize: '0.9rem', cursor: 'pointer' }}
                    >
                        <option value="">タグを選択...</option>
                        {allTags.map(t => <option key={t} value={t}>{t}</option>)}
                    </select>

                    <select
                        value={filterRole}
                        onChange={e => setFilterRole(e.target.value)}
                        style={{ padding: '0.3rem 0.5rem', fontFamily: 'inherit', backgroundColor: 'var(--bg-main)', border: '1px solid var(--color-moss-dark)', color: 'var(--text-main)', outline: 'none', fontSize: '0.9rem', cursor: 'pointer' }}
                    >
                        <option value="">全職種</option>
                        <option value="PLANNER">プランナー (PLANNER)</option>
                        <option value="PROGRAMMER">プログラマー (PROGRAMMER)</option>
                        <option value="DESIGNER">デザイナー (DESIGNER)</option>
                    </select>
                </div>
            </div>

            <DndContext
                sensors={sensors}
                onDragStart={handleDragStart}
                onDragEnd={handleDragEnd}
            >
                <div className={styles.board}>
                    {COLUMNS.map(status => (
                        <DroppableColumn key={status} status={status} tasks={filteredTasks.filter(t => t.status === status)} currentUserId={currentUser?.id} />
                    ))}
                </div>

                <DragOverlay>
                    {activeId ? (
                        <div style={{ transform: 'rotate(2deg)' }}>
                            <TaskCard task={tasks.find(t => t.id === activeId)!} currentUserId={currentUser?.id} />
                        </div>
                    ) : null}
                </DragOverlay>

            </DndContext>
        </div>
    );
}


import { useDroppable } from '@dnd-kit/core';
import { useDraggable } from '@dnd-kit/core';

function DroppableColumn({ status, tasks, currentUserId }: { status: string, tasks: Task[], currentUserId: string | undefined }) {
    const { isOver, setNodeRef } = useDroppable({
        id: status,
    });

    const getStatusText = (status: string) => {
        switch (status) {
            case 'TODO': return '未着手';
            case 'IN_PROGRESS': return '作業中';
            case 'REVIEW': return '確認待ち';
            case 'DONE': return '完了';
            default: return status;
        }
    };

    return (
        <div ref={setNodeRef} className={styles.column} style={{
            backgroundColor: isOver ? 'rgba(0,0,0,0.05)' : 'transparent',
            border: isOver ? '2px dashed var(--color-moss-dark)' : '2px transparent'
        }}>
            <div className={styles.columnHeader}>
                <span style={{ fontWeight: 'bold', fontSize: '1.1rem', color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    {getStatusText(status)} <span style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>({tasks.length})</span>
                </span>
            </div>

            <div className={styles.taskList}>
                {tasks.map(task => (
                    <DraggableTask key={task.id} task={task} currentUserId={currentUserId} />
                ))}
            </div>
        </div>
    );
}

function DraggableTask({ task, currentUserId }: { task: Task, currentUserId: string | undefined }) {
    const isOwnTask = task.assigneeId === currentUserId;
    const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
        id: task.id,
        disabled: !isOwnTask
    });
    const router = useRouter();

    const style = transform ? {
        transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
        opacity: isDragging ? 0 : 1, // Hide original while dragging overlay
    } : undefined;

    return (
        <div ref={setNodeRef} style={style} onClick={() => router.push(`/tasks/${task.id}`)} className="cursor-pointer group">
            <TaskCard task={task} currentUserId={currentUserId} dragListeners={listeners} dragAttributes={attributes} />
        </div>
    );
}
