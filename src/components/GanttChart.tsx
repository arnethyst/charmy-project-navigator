'use client';

import { useState, useMemo, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import styles from './GanttChart.module.css';
import Link from 'next/link';
import { updateTaskDates } from '../actions/task';
import clsx from 'clsx';

interface Task {
    id: string;
    title: string;
    status: string;
    startDate?: Date | string | null;
    dueDate?: Date | string | null;
    assigneeId?: string | null;
    assignee?: { name?: string | null, username?: string, avatar?: string | null } | null;
}

interface User {
    id: string;
    name?: string | null;
    username?: string;
}

type ViewMode = 'daily' | 'monthly';

export const GanttChart = ({ tasks, users, currentUser }: { tasks: Task[], users: User[], currentUser: User | null }) => {
    const isCharmy = currentUser?.name === 'Charmy' || currentUser?.username === 'charmy';
    const [viewMode, setViewMode] = useState<ViewMode>('daily');
    const [optimisticTasks, setOptimisticTasks] = useState<Task[]>(tasks);
    const rightPaneRef = useRef<HTMLDivElement>(null);
    const router = useRouter();

    useEffect(() => {
        setOptimisticTasks(tasks);
    }, [tasks]);

    const scheduledTasks = optimisticTasks.filter(t => t.startDate && t.dueDate && new Date(t.startDate) <= new Date(t.dueDate));
    const [selectedMonth, setSelectedMonth] = useState<string>('all');

    const availableMonths = useMemo(() => {
        const months = new Set<string>();
        scheduledTasks.forEach(t => {
            if (t.startDate) months.add(new Date(t.startDate).toISOString().slice(0, 7));
            if (t.dueDate) months.add(new Date(t.dueDate).toISOString().slice(0, 7));
        });
        return Array.from(months).sort();
    }, [scheduledTasks]);

    let minDate = new Date();
    let maxDate = new Date();

    if (selectedMonth !== 'all') {
        minDate = new Date(`${selectedMonth}-01T00:00:00`);
        maxDate = new Date(minDate);
        maxDate.setMonth(maxDate.getMonth() + 1);
        maxDate.setDate(0);
        maxDate.setHours(23, 59, 59, 999);
    } else {
        const dates = scheduledTasks.flatMap(t => [new Date(t.startDate!), new Date(t.dueDate!)]);
        minDate = dates.length ? new Date(Math.min(...dates.map(d => d.getTime()))) : new Date();
        maxDate = dates.length ? new Date(Math.max(...dates.map(d => d.getTime()))) : new Date();

        minDate.setHours(0, 0, 0, 0);
        maxDate.setHours(23, 59, 59, 999);

        if (viewMode === 'daily') {
            minDate.setDate(minDate.getDate() - 3);
            maxDate.setDate(maxDate.getDate() + 14);
        } else {
            minDate.setDate(1);
            minDate.setMonth(minDate.getMonth() - 1);
            maxDate.setDate(1);
            maxDate.setMonth(maxDate.getMonth() + 2);
            maxDate.setHours(23, 59, 59, 999);
        }
    }

    const DAY_WIDTH: Record<ViewMode, number> = { daily: 40, monthly: 40 }; // Hardcoded to 40 to match user's explicit w-[40px]
    const currentDayWidth = DAY_WIDTH[viewMode];

    const dayList: Date[] = [];
    const curr = new Date(minDate);
    while (curr <= maxDate) {
        dayList.push(new Date(curr));
        curr.setDate(curr.getDate() + 1);
    }
    const totalDays = dayList.length;

    const startOfMinDate = new Date(minDate);
    startOfMinDate.setHours(0, 0, 0, 0);

    const getLeftPx = (date: Date | string) => {
        if (!date) return 0;
        const d = new Date(date);
        if (isNaN(d.getTime())) return 0;

        d.setHours(0, 0, 0, 0);
        if (d < minDate) return 0;

        const diffTime = d.getTime() - startOfMinDate.getTime();
        const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));
        return diffDays * currentDayWidth;
    };

    const getWidthPx = (start: Date | string, end: Date | string) => {
        if (!start || !end) return 0;
        const s = new Date(start);
        const e = new Date(end);
        if (isNaN(s.getTime()) || isNaN(e.getTime())) return 0;

        s.setHours(0, 0, 0, 0);
        e.setHours(23, 59, 59, 999);

        const clampedStart = s < minDate ? new Date(minDate) : s;
        const clampedEnd = e > maxDate ? new Date(maxDate) : e;

        clampedStart.setHours(0, 0, 0, 0);
        clampedEnd.setHours(23, 59, 59, 999);

        if (clampedStart > clampedEnd) return 0;

        const diffTime = clampedEnd.getTime() - clampedStart.getTime();
        const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));
        return Math.max(0, diffDays) * currentDayWidth;
    };

    const isMilestone = (task: Task) => {
        if (!task.startDate || !task.dueDate) return false;
        const s = new Date(task.startDate);
        const e = new Date(task.dueDate);
        return s.getTime() === e.getTime();
    };

    interface DragContext {
        taskId: string;
        type: 'move' | 'resize';
        startX: number;
        originalStart: number;
        originalEnd: number;
    }
    const [dragCtx, setDragCtx] = useState<DragContext | null>(null);

    const handlePointerDown = (e: React.PointerEvent, taskId: string, type: 'move' | 'resize', task: Task) => {
        e.preventDefault();
        e.stopPropagation();
        (e.target as HTMLElement).setPointerCapture(e.pointerId);
        setDragCtx({
            taskId,
            type,
            startX: e.clientX,
            originalStart: new Date(task.startDate!).getTime(),
            originalEnd: new Date(task.dueDate!).getTime(),
        });
    };

    const handlePointerMove = (e: React.PointerEvent) => {
        if (!dragCtx) return;
        const deltaX = e.clientX - dragCtx.startX;
        const deltaDays = Math.round(deltaX / currentDayWidth);
        const deltaMs = deltaDays * 24 * 60 * 60 * 1000;

        setOptimisticTasks(prev => prev.map(t => {
            if (t.id === dragCtx.taskId) {
                if (dragCtx.type === 'move') {
                    return {
                        ...t,
                        startDate: new Date(dragCtx.originalStart + deltaMs),
                        dueDate: new Date(dragCtx.originalEnd + deltaMs),
                    };
                } else if (dragCtx.type === 'resize') {
                    const newEnd = Math.max(dragCtx.originalStart, dragCtx.originalEnd + deltaMs);
                    return { ...t, dueDate: new Date(newEnd) };
                }
            }
            return t;
        }));
    };

    const handlePointerUp = async (e: React.PointerEvent) => {
        if (!dragCtx) return;
        try { (e.target as HTMLElement).releasePointerCapture(e.pointerId); } catch (err) { }

        const updatedTask = optimisticTasks.find(t => t.id === dragCtx.taskId);
        setDragCtx(null);

        if (updatedTask && updatedTask.startDate && updatedTask.dueDate) {
            const origS = dragCtx.originalStart;
            const origE = dragCtx.originalEnd;
            if (new Date(updatedTask.startDate).getTime() !== origS || new Date(updatedTask.dueDate).getTime() !== origE) {
                setOptimisticTasks(prev => prev.map(t => t.id === updatedTask.id ? { ...t, startDate: new Date(updatedTask.startDate!), dueDate: new Date(updatedTask.dueDate!) } : t));

                try {
                    const res = await updateTaskDates(
                        updatedTask.id,
                        new Date(updatedTask.startDate).toISOString(),
                        new Date(updatedTask.dueDate).toISOString()
                    );

                    if (res?.error) {
                        alert(`Failed to save date: ${res.error}`);
                        setOptimisticTasks(tasks);
                    } else {
                        router.refresh();
                    }
                } catch (err) {
                    console.error('Error saving dates:', err);
                    alert('Error saving dates. Ensure the dev server is running.');
                    setOptimisticTasks(tasks);
                }
            }
        }
    };

    const tasksByUser = useMemo(() => {
        const grouped: Record<string, Task[]> = {};
        users.forEach(u => grouped[u.id] = []);
        grouped['unassigned'] = [];

        scheduledTasks.forEach(t => {
            const key = t.assigneeId || 'unassigned';
            if (grouped[key]) grouped[key].push(t);
            else grouped['unassigned'].push(t);
        });
        return grouped;
    }, [scheduledTasks, users]);

    const usersList = users.concat([{ id: 'unassigned', name: '未割り当て' }]);

    return (
        <div className="w-full h-full overflow-x-auto bg-[#e5e5dc] p-4 text-[#334433] font-mono">

            <div className="mb-4 flex items-center justify-between border-b border-[#334433] pb-2">
                <h2 className="text-xl font-bold">工程表 (GANTT CHART)</h2>
            </div>

            <div className="flex flex-col min-w-max border border-[#334433] bg-[#dcdcdc] shadow-lg">

                {/* 1. ヘッダー行 */}
                <div className="flex bg-[#e5e5dc] border-b border-[#334433]">
                    <div className="w-[150px] shrink-0 border-r border-[#334433] p-2 font-bold flex items-center">
                        Assignee
                    </div>
                    <div className="flex">
                        {dayList.map((day, index) => {
                            // オブジェクトか文字列か判定して日付を取得
                            const dateStr = day instanceof Date ? day.toISOString() : day;
                            const d = new Date(dateStr);
                            return (
                                <div key={index} className="w-[40px] shrink-0 border-r border-[#334433] text-center text-xs py-1 flex flex-col items-center justify-center">
                                    <span>{d.getDate()}</span>
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* 2. ユーザー行 */}
                {usersList.map((user) => {
                    const userTasks = scheduledTasks.filter(t => t.assigneeId === user.id || (user.id === 'unassigned' && !t.assigneeId));
                    if (user.id === 'unassigned' && userTasks.length === 0) return null;

                    return (
                        <div key={user.id} className="flex border-b border-[#334433]">

                            <div className="w-[150px] shrink-0 border-r border-[#334433] p-2 text-sm flex items-center bg-[#f0f0f0]">
                                {user.name || user.username}
                            </div>

                            <div className="relative flex">
                                {/* 背景マス目 */}
                                {dayList.map((_, index) => (
                                    <div key={`bg-${index}`} className="w-[40px] shrink-0 border-r border-[#334433] border-dashed h-[50px]"></div>
                                ))}

                                {/* タスクバー */}
                                {userTasks.map(task => {
                                    // 日付計算（エラーが起きないよう安全に計算）
                                    const chartStartStr = dayList[0] instanceof Date ? dayList[0].toISOString() : dayList[0];
                                    const chartStartDate = new Date(chartStartStr).getTime();
                                    const taskStartDate = new Date(task.startDate!).getTime();
                                    const taskEndDate = new Date(task.dueDate!).getTime();

                                    // 左端からの日数差分（マイナスなら0）
                                    const diffDays = Math.max(0, Math.floor((taskStartDate - chartStartDate) / (1000 * 60 * 60 * 24)));
                                    // タスクの期間
                                    const durationDays = Math.max(1, Math.ceil((taskEndDate - taskStartDate) / (1000 * 60 * 60 * 24)));

                                    return (
                                        <div
                                            key={task.id}
                                            className="absolute top-2 h-[34px] bg-[#cc6633] border border-black text-black text-xs p-1 rounded cursor-pointer overflow-hidden whitespace-nowrap z-10 hover:bg-[#b35929]"
                                            style={{ left: `${diffDays * 40}px`, width: `${durationDays * 40}px` }}
                                        >
                                            {task.title}
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    )
                })}
            </div>
        </div>
    );
};
