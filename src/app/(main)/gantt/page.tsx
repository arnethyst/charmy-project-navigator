'use client';

import React, { useState, useEffect } from 'react';
import { Gantt, Task, ViewMode } from 'gantt-task-react';
import 'gantt-task-react/dist/index.css';
import { getProjectTasks, updateTaskDates } from '@/actions/task';
import { getCurrentUser } from '@/actions/auth';
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
                const isDummy = task.id === 'dummy-start' || task.id === 'dummy-end' || (task.isDisabled && task.id !== 'milestone-base') || task.name.trim() === '';

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

                    // 個別のマイルストーンは一旦タスクリスト（行）としては除外する
                    if (t.isMilestone) return false;

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

                    // Override colors for milestones to make them stand out
                    if (t.isMilestone) {
                        colors.bg = 'rgba(239, 68, 68, 0.8)'; // Red
                        colors.selectedBg = '#dc2626';
                    }

                    return {
                        id: t.id,
                        type: t.isMilestone ? 'milestone' : 'task',
                        name: t.title,
                        start,
                        end,
                        progress: 0,
                        isDisabled: t.isMilestone ? !isAdmin : false,
                        isMilestone: t.isMilestone, // Internal tracking for sorting
                        styles: {
                            backgroundColor: colors.bg,
                            backgroundSelectedColor: colors.selectedBg,
                            progressColor: colors.bg,
                            progressSelectedColor: colors.selectedBg,
                        }
                    };
                });

                // Add base milestone for project scale
                const projectStart = new Date('2026-03-01T00:00:00');
                const projectEnd = new Date('2027-03-31T00:00:00');

                mappedTasks.push({
                    id: 'milestone-base',
                    type: 'project',
                    name: 'マイルストーン',
                    start: projectStart,
                    end: new Date(projectEnd.getFullYear(), projectEnd.getMonth(), projectEnd.getDate(), 23, 59, 59, 999),
                    progress: 0,
                    isDisabled: true,
                    isMilestone: true,
                    styles: {
                        backgroundColor: 'transparent',
                        backgroundSelectedColor: 'transparent',
                        progressColor: 'transparent',
                        progressSelectedColor: 'transparent',
                    }
                });

                // Sort tasks: Milestones strictly at the top, followed by chronological ordering
                mappedTasks.sort((a: any, b: any) => {
                    if (a.isMilestone && !b.isMilestone) return -1;
                    if (!a.isMilestone && b.isMilestone) return 1;
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

    useEffect(() => {
        if (isLoading || tasks.length === 0 || milestones.length === 0) return;

        let observer: MutationObserver | null = null;
        let debounceTimer: NodeJS.Timeout | null = null;
        let isUnmounted = false;

        const renderMilestones = () => {
            if (isUnmounted) return;
            const svg = document.querySelector('.gantt-container .scroll-container svg') || document.querySelector('.gantt-container svg');
            if (!svg) return;

            // Find the base task rect (we know our base task is top and colored #fca5a5)
            const barRects = Array.from(svg.querySelectorAll('rect')).filter(r => 
                r.getAttribute('fill') === '#fca5a5' || 
                (r.style && r.style.fill === '#fca5a5') ||
                r.getAttribute('fill') === 'rgb(252, 165, 165)'
            );
            
            let baseRect: SVGRectElement | null = null;
            if (barRects.length > 0) {
                // sort by y just in case
                barRects.sort((a, b) => parseFloat(a.getAttribute('y') || '0') - parseFloat(b.getAttribute('y') || '0'));
                baseRect = barRects[0];
            }

            if (!baseRect) return;

            // 既存のオーバーレイを確認、あれば削除
            let overlayG = svg.querySelector('.milestones-overlay');
            if (overlayG) {
                overlayG.remove();
            }

            const x1 = parseFloat(baseRect.getAttribute('x') || '0');
            const y = parseFloat(baseRect.getAttribute('y') || '0');
            const height = parseFloat(baseRect.getAttribute('height') || '70');

            const chartStartDate = tasks.reduce((minDate, task) => {
                return task.start.getTime() < minDate.getTime() ? task.start : minDate;
            }, new Date('2030-01-01'));

            overlayG = document.createElementNS('http://www.w3.org/2000/svg', 'g');
            overlayG.setAttribute('class', 'milestones-overlay');
            (overlayG as HTMLElement).style.pointerEvents = 'none';

            milestones.forEach(m => {
                const msTime = m.dueDate ? new Date(m.dueDate).getTime() : 
                               m.startDate ? new Date(m.startDate).getTime() : 
                               new Date(m.createdAt).getTime();

                const diffDays = (msTime - chartStartDate.getTime()) / (1000 * 60 * 60 * 24);
                // columnWidth = 60
                const xPos = x1 + diffDays * 60; 
                
                // Vertical Line
                const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
                line.setAttribute('x1', xPos.toString());
                line.setAttribute('y1', '0');
                line.setAttribute('x2', xPos.toString());
                line.setAttribute('y2', '2000'); // Sufficiently long
                line.setAttribute('stroke', 'rgba(239, 68, 68, 0.4)');
                line.setAttribute('stroke-width', '2');
                line.setAttribute('stroke-dasharray', '4,4');
                overlayG.appendChild(line);

                const targetY = y + height / 2;

                const groupInfo = document.createElementNS('http://www.w3.org/2000/svg', 'g');
                groupInfo.setAttribute('transform', `translate(${xPos}, ${targetY})`);

                // Diamond with Glow
                const glow = document.createElementNS('http://www.w3.org/2000/svg', 'polygon');
                glow.setAttribute('points', '-10,0 0,-10 10,0 0,10');
                glow.setAttribute('fill', 'rgba(239, 68, 68, 0.3)');
                glow.setAttribute('filter', 'blur(4px)');
                
                const polygon = document.createElementNS('http://www.w3.org/2000/svg', 'polygon');
                polygon.setAttribute('points', '-8,0 0,-8 8,0 0,8');
                polygon.setAttribute('fill', '#ef4444');
                polygon.setAttribute('stroke', '#fff');
                polygon.setAttribute('stroke-width', '1.5');

                const textShadow = document.createElementNS('http://www.w3.org/2000/svg', 'text');
                textShadow.setAttribute('x', '16');
                textShadow.setAttribute('y', '4');
                textShadow.setAttribute('font-size', '12');
                textShadow.setAttribute('fill', '#000');
                textShadow.setAttribute('stroke', '#fff');
                textShadow.setAttribute('stroke-width', '4');
                textShadow.setAttribute('stroke-linejoin', 'round');
                textShadow.setAttribute('font-weight', 'bold');
                textShadow.setAttribute('font-family', 'monospace');
                textShadow.textContent = m.title;

                const textMain = document.createElementNS('http://www.w3.org/2000/svg', 'text');
                textMain.setAttribute('x', '16');
                textMain.setAttribute('y', '4');
                textMain.setAttribute('font-size', '12');
                textMain.setAttribute('fill', '#ef4444');
                textMain.setAttribute('font-weight', 'bold');
                textMain.setAttribute('font-family', 'monospace');
                textMain.textContent = m.title;

                groupInfo.appendChild(glow);
                groupInfo.appendChild(polygon);
                groupInfo.appendChild(textShadow);
                groupInfo.appendChild(textMain);

                overlayG.appendChild(groupInfo);
            });

            // appendChild into the bar's parent group so it moves properly with the document tree
            const parentG = baseRect.parentElement;
            if (parentG && parentG.tagName.toLowerCase() === 'g') {
                parentG.appendChild(overlayG);
            } else {
                svg.appendChild(overlayG);
            }
        };

        const tryInjectAndObserve = () => {
            const svg = document.querySelector('.gantt-container .scroll-container svg') || document.querySelector('.gantt-container svg');
            if (svg && svg.querySelector('rect')) {
                renderMilestones();
                
                // Observer for Re-rendering Resistance
                observer = new MutationObserver((mutations) => {
                    if (isUnmounted) return;
                    
                    const isOnlyOurOverlay = mutations.every(m => {
                        let selfRelated = false;
                        m.addedNodes.forEach(n => {
                            if ((n as Element).classList && (n as Element).classList.contains('milestones-overlay')) selfRelated = true;
                        });
                        m.removedNodes.forEach(n => {
                            if ((n as Element).classList && (n as Element).classList.contains('milestones-overlay')) selfRelated = true;
                        });
                        return selfRelated;
                    });

                    if (!isOnlyOurOverlay) {
                        if (debounceTimer) clearTimeout(debounceTimer);
                        debounceTimer = setTimeout(() => {
                            renderMilestones();
                        }, 50); // debounce
                    }
                });

                const containerToObserve = document.querySelector('.gantt-container') || document.body;
                observer.observe(containerToObserve, {
                    childList: true,
                    subtree: true,
                    attributes: false, 
                });

                return true;
            }
            return false;
        };

        if (!tryInjectAndObserve()) {
            const intervalId = setInterval(() => {
                if (tryInjectAndObserve()) {
                    clearInterval(intervalId);
                }
            }, 500);
            
            return () => {
                isUnmounted = true;
                clearInterval(intervalId);
                if (observer) observer.disconnect();
                if (debounceTimer) clearTimeout(debounceTimer);
                const ex = document.querySelector('.milestones-overlay');
                if (ex) ex.remove();
            };
        }

        return () => {
            isUnmounted = true;
            if (observer) observer.disconnect();
            if (debounceTimer) clearTimeout(debounceTimer);
            const existingOverlay = document.querySelector('.milestones-overlay');
            if (existingOverlay) existingOverlay.remove();
        };
    }, [isLoading, tasks, milestones]);

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