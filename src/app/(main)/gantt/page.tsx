'use client';

import React, { useState, useEffect } from 'react';
import { Gantt, Task, ViewMode } from 'gantt-task-react';
import 'gantt-task-react/dist/index.css';
import { getProjectTasks, updateTaskDates } from '../../../actions/task';
import { getCurrentUser } from '../../../actions/auth';
import { useRouter } from 'next/navigation';

const CustomTaskListHeader: React.FC<any> = ({ headerHeight, fontFamily, fontSize, rowWidth }) => {
    return (
        <div style={{ display: 'flex', alignItems: 'center', width: '100%', height: headerHeight, borderBottom: '1px solid var(--color-moss-dark)', fontSize: '14px', fontWeight: 'bold', backgroundColor: '#111827', color: 'var(--color-moss-light)' }}>
            <div style={{ width: '180px', padding: '0 8px', overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis' }}>タスク名</div>
            <div style={{ width: '120px', padding: '0 8px', overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis' }}>開始日</div>
            <div style={{ width: '120px', padding: '0 8px', overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis' }}>締切日</div>
        </div>
    );
};

const CustomTaskListTable: React.FC<any> = ({ rowHeight, rowWidth, tasks, fontFamily, fontSize }) => {
    const router = useRouter();
    const formatFullDate = (date: Date) => {
        const y = date.getFullYear();
        const m = String(date.getMonth() + 1).padStart(2, '0');
        const d = String(date.getDate()).padStart(2, '0');
        return `${y}/${m}/${d}`;
    };

    return (
        <div style={{ width: rowWidth, fontFamily, fontSize, backgroundColor: '#1F2937', color: '#ffffff' }}>
            {tasks.map((task: Task) => {
                const isDummy = task.id === 'dummy-start' || task.id === 'dummy-end' || task.isDisabled || task.name.trim() === '';

                // ダミータスク（隠蔽）の場合
                if (isDummy) {
                    return <div key={task.id} style={{ height: rowHeight, width: '100%' }}></div>;
                }

                // 通常タスクの場合
                return (
                    <div
                        key={task.id}
                        style={{ display: 'flex', alignItems: 'center', width: '100%', height: rowHeight, borderBottom: '1px dotted rgba(157, 191, 103, 0.3)', fontSize: '14px', cursor: 'pointer', transition: 'background-color 0.2s' }}
                        onDoubleClick={() => router.push(`/tasks/${task.id}`)}
                        onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'rgba(157, 191, 103, 0.2)'}
                        onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                    >
                        <div style={{ width: '180px', padding: '0 8px', overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis', fontWeight: 'bold' }}>{task.name}</div>
                        <div style={{ width: '120px', padding: '0 8px', overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis', opacity: 0.8 }}>{formatFullDate(task.start)}</div>
                        <div style={{ width: '120px', padding: '0 8px', overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis', opacity: 0.8 }}>{formatFullDate(task.end)}</div>
                    </div>
                );
            })}
        </div>
    );
};

export default function GanttPage() {
    const router = useRouter();
    const [tasks, setTasks] = useState<Task[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [filterStatus, setFilterStatus] = useState<string>('ALL');
    const [filterAssignee, setFilterAssignee] = useState<string>('ALL');
    const [filterRole, setFilterRole] = useState<string>('ALL');
    const [filterTag, setFilterTag] = useState<string>('ALL');
    const [assigneeList, setAssigneeList] = useState<string[]>([]);
    const [tagList, setTagList] = useState<string[]>([]);
    
    // Milestone overlays
    const [milestones, setMilestones] = useState<any[]>([]);

    useEffect(() => {
        const fetchTasks = async () => {
            try {
                const [dbTasks, currentUser] = await Promise.all([
                    getProjectTasks(),
                    getCurrentUser()
                ]);

                const isAdmin = currentUser?.name === 'Charmy' || currentUser?.username === 'charmy';

                const getStatusColor = (status: string) => {
                    // pastel / somewhat transparent terminal colors
                    switch (status) {
                        case 'TODO': return { bg: 'rgba(229, 231, 235, 0.6)', selectedBg: 'rgba(229, 231, 235, 1)' }; // Light Gray
                        case 'IN_PROGRESS': return { bg: 'rgba(191, 219, 254, 0.7)', selectedBg: 'rgba(191, 219, 254, 1)' }; // Light Blue
                        case 'REVIEW': return { bg: 'rgba(254, 205, 211, 0.7)', selectedBg: 'rgba(254, 205, 211, 1)' }; // Light Rose
                        case 'DONE': return { bg: 'rgba(167, 243, 208, 0.7)', selectedBg: 'rgba(167, 243, 208, 1)' }; // Light Green
                        default: return { bg: 'rgba(136, 136, 136, 0.7)', selectedBg: 'rgba(136, 136, 136, 1)' };
                    }
                };

                // Extract unique assignees for filter UI robustly
                const uniqueAssignees = Array.from(
                    new Set(
                        dbTasks
                            .map((task: any) => {
                                if (!task.assignee) return null;
                                return typeof task.assignee === 'object' ? (task.assignee.name || task.assignee.username) : task.assignee;
                            })
                            .filter((name: any) => name && typeof name === 'string' && name.trim() !== "")
                    )
                );
                setAssigneeList(uniqueAssignees as string[]);

                // Extract unique tags for filter UI
                const uniqueTags = Array.from(
                    new Set(
                        dbTasks.flatMap((t: any) => {
                            if (!t.tags) return [];
                            return Array.isArray(t.tags) ? t.tags.map((tag: any) => typeof tag === 'string' ? tag : tag.name) : [];
                        })
                    )
                ).filter(Boolean).sort();
                setTagList(uniqueTags as string[]);

                // Extract milestones
                const milestoneTasks = dbTasks.filter((t: any) => t.isMilestone);
                setMilestones(milestoneTasks);

                // Filter tasks based on selected filters
                const filteredDbTasks = dbTasks.filter((t: any) => {
                    // Filter Status
                    if (filterStatus !== 'ALL' && t.status !== filterStatus) return false;

                    // Filter Assignee
                    const assigneeName = typeof t.assignee === 'object' ? (t.assignee?.name || t.assignee?.username) : t.assignee;
                    if (filterAssignee !== 'ALL' && assigneeName !== filterAssignee) return false;

                    // Filter Role
                    if (filterRole !== 'ALL' && t.role !== filterRole) return false;

                    // Filter Tag
                    if (filterTag !== 'ALL') {
                        if (!t.tags || !Array.isArray(t.tags)) return false;
                        const hasTag = t.tags.some((tag: any) => (tag.name || tag) === filterTag);
                        if (!hasTag) return false;
                    }

                    // Keep milestones in Gantt view but hide from Kanban

                    return true;
                });

                // Map DB tasks to Gantt Task format
                const mappedTasks: any[] = filteredDbTasks.map((t: any) => {
                    // Start date: use startDate, fallback to createdAt, fallback to current date
                    const start = t.startDate ? new Date(t.startDate) : (t.createdAt ? new Date(t.createdAt) : new Date());

                    // End date: use dueDate, fallback to start + 3 days
                    const end = t.dueDate ? new Date(t.dueDate) : new Date(start.getTime() + 3 * 24 * 60 * 60 * 1000);
                    // Force end date to 23:59:59 to avoid visual off-by-one bug
                    end.setHours(23, 59, 59, 999);

                    const colors = getStatusColor(t.status);

                    return {
                        id: t.id,
                        type: t.isMilestone ? 'milestone' : 'task',
                        name: t.title,
                        start,
                        end,
                        progress: 0,
                        isDisabled: t.isMilestone ? !isAdmin : false,
                        styles: {
                            backgroundColor: colors.bg,
                            backgroundSelectedColor: colors.selectedBg,
                            progressColor: colors.bg,
                            progressSelectedColor: colors.selectedBg,
                        }
                    };
                });

                // Sort tasks: Milestones strictly at the top, followed by chronological ordering
                mappedTasks.sort((a: any, b: any) => {
                    if (a.type === 'milestone' && b.type !== 'milestone') return -1;
                    if (a.type !== 'milestone' && b.type === 'milestone') return 1;
                    return a.start.getTime() - b.start.getTime();
                });

                setTasks(mappedTasks);
            } catch (error) {
                console.error('Failed to load tasks:', error);
            } finally {
                setIsLoading(false);
            }
        };

        fetchTasks();
    }, [filterStatus, filterAssignee, filterRole, filterTag]);

    const handleTaskChange = async (task: Task) => {
        if (task.isDisabled) return;

        // Snap to whole day
        const snappedStart = new Date(task.start.getFullYear(), task.start.getMonth(), task.start.getDate());
        const snappedEnd = new Date(task.end.getFullYear(), Math.max(task.end.getMonth(), task.start.getMonth()), task.end.getDate());

        // Fix snapping to force 00:00:00 for start, and 23:59:59 for end
        snappedStart.setHours(0, 0, 0, 0);
        snappedEnd.setHours(23, 59, 59, 999);

        // Ensure end date is not before start date due to weird snapping
        if (snappedEnd < snappedStart) {
            snappedEnd.setTime(snappedStart.getTime() + 86400000 - 1); // +1 day min minus 1ms
        }

        const snappedTask = { ...task, start: snappedStart, end: snappedEnd };

        // Optimistic UI update
        setTasks(tasks.map((t) => (t.id === task.id ? snappedTask : t)));
        // Persist change to DB
        await updateTaskDates(task.id, snappedStart, snappedEnd);
    };

    const handleTaskClick = (task: Task) => {
        if (!task.isDisabled && task.id !== 'dummy-start' && task.id !== 'dummy-end') {
            router.push(`/tasks/${task.id}`);
        }
    };

    return (
        <div className="p-6 h-full flex flex-col bg-[#111827]">
            <h1 className="text-2xl font-bold mb-6 text-[var(--color-moss-light)] border-b border-[var(--color-moss-dark)] pb-2 font-mono" style={{ textShadow: '0 0 5px var(--color-moss-light)' }}>
                &gt; GANTT_CHART
            </h1>

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
                    {/* 1. Status */}
                    <select
                        value={filterStatus}
                        onChange={(e) => setFilterStatus(e.target.value)}
                        style={{ padding: '0.3rem 0.5rem', fontFamily: 'inherit', backgroundColor: 'var(--bg-main)', border: '1px solid var(--color-moss-dark)', color: 'var(--text-main)', outline: 'none', fontSize: '0.9rem', cursor: 'pointer' }}
                    >
                        <option value="ALL">全ステータス</option>
                        <option value="TODO">未着手 (TODO)</option>
                        <option value="IN_PROGRESS">作業中 (IN_PROGRESS)</option>
                        <option value="REVIEW">確認待ち (REVIEW)</option>
                        <option value="DONE">完了 (DONE)</option>
                    </select>

                    {/* 2. Assignee */}
                    <select
                        value={filterAssignee}
                        onChange={(e) => setFilterAssignee(e.target.value)}
                        style={{ padding: '0.3rem 0.5rem', fontFamily: 'inherit', backgroundColor: 'var(--bg-main)', border: '1px solid var(--color-moss-dark)', color: 'var(--text-main)', outline: 'none', fontSize: '0.9rem', cursor: 'pointer' }}
                    >
                        <option value="ALL">全メンバー</option>
                        {assigneeList.map((name, idx) => (
                            <option key={idx} value={name}>{name}</option>
                        ))}
                    </select>

                    {/* 3. Tag */}
                    <select
                        value={filterTag}
                        onChange={(e) => setFilterTag(e.target.value)}
                        style={{ padding: '0.3rem 0.5rem', fontFamily: 'inherit', backgroundColor: 'var(--bg-main)', border: '1px solid var(--color-moss-dark)', color: 'var(--text-main)', outline: 'none', fontSize: '0.9rem', cursor: 'pointer' }}
                    >
                        <option value="ALL">全タグ</option>
                        {tagList.map((name, idx) => (
                            <option key={idx} value={name}>{name}</option>
                        ))}
                    </select>

                    {/* 4. Role */}
                    <select
                        value={filterRole}
                        onChange={(e) => setFilterRole(e.target.value)}
                        style={{ padding: '0.3rem 0.5rem', fontFamily: 'inherit', backgroundColor: 'var(--bg-main)', border: '1px solid var(--color-moss-dark)', color: 'var(--text-main)', outline: 'none', fontSize: '0.9rem', cursor: 'pointer' }}
                    >
                        <option value="ALL">全職種</option>
                        <option value="PLANNER">プランナー</option>
                        <option value="PROGRAMMER">プログラマー</option>
                        <option value="DESIGNER">デザイナー</option>
                    </select>
                </div>
            </div>

            <div className="flex-1 min-h-0 bg-[#1F2937] rounded-md overflow-hidden shadow-lg p-4 border border-[rgba(157,191,103,0.5)] relative">
                {isLoading ? (
                    <div className="flex items-center justify-center h-full">
                        <span className="text-[var(--color-moss-light)] font-mono animate-pulse">&gt; LOADING_TASKS...</span>
                    </div>
                ) : tasks.length === 0 ? (
                    <div className="flex items-center justify-center h-full border-2 border-dashed border-[rgba(157,191,103,0.3)] rounded">
                        <span className="text-[var(--color-moss-light)] font-mono">NO_TASKS_FOUND</span>
                    </div>
                ) : (
                    <div className="h-full overflow-auto gantt-theme-custom">

                        <div className="gantt-container h-full relative" style={{ position: 'relative', width: '100%' }}>
                            <Gantt
                                tasks={tasks}
                                viewMode={ViewMode.Day}
                                onDateChange={handleTaskChange}
                                onDoubleClick={handleTaskClick}
                                timeStep={86400000} // Force chart drag step to 1 day (ms)
                                locale="ja"
                                rowHeight={70}
                                listCellWidth="390px"
                                barCornerRadius={4}
                                todayColor="rgba(0, 0, 0, 0.05)"
                                TaskListHeader={CustomTaskListHeader}
                                TaskListTable={CustomTaskListTable}
                                columnWidth={60} // デフォルト値（ズーム等で変わる場合は変更推奨）
                            />
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}