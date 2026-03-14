import { getProjectTasks } from "../../actions/task";
import prisma from "../../lib/prisma";
import { getCurrentUser, getUsers } from "../../actions/auth";
import Link from "next/link";

import { MossyFrame } from "../../components/ui/MossyFrame";
import { TaskCard } from "../../components/TaskCard";
import { ProgressBar } from "../../components/ui/ProgressBar";
import { TypingGreeting } from "../../components/TypingGreeting";
import styles from "./Dashboard.module.css";

export default async function DashboardPage() {
    const currentUser = await getCurrentUser();
    if (!currentUser) return null;

    const allTasks = await getProjectTasks() || [];
    const allUsers = await getUsers() || [];

    // Stats
    const totalStats = allTasks.length;
    const doneStats = allTasks.filter(t => t.status === 'DONE').length;

    // 1. My Focus (Assigned to user, not DONE, sorted by due date)
    const myFocusTasks = allTasks
        .filter(t => t.assigneeId === currentUser.id && t.status !== 'DONE')
        .sort((a, b) => {
            if (!a.dueDate) return 1;
            if (!b.dueDate) return -1;
            return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
        });

    // 2. Anomalies (Bugs, not DONE)
    const anomalies = allTasks.filter(t => t.type === 'BUG' && t.status !== 'DONE');

    // 3. System Logs (Fetch from SystemLog table)
    const recentLogs = await prisma.systemLog.findMany({
        take: 5,
        orderBy: {
            createdAt: 'desc'
        },
        include: {
            task: {
                select: { id: true, title: true }
            }
        }
    });

    const systemLogs = recentLogs.map((log: any) => {
        const timeStr = new Date(log.createdAt).toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' });
        return {
            id: log.taskId,
            time: timeStr,
            msg: log.content
        };
    });

    // 4. Team Load (Non-DONE tasks per user)
    // 4. Team Load (Non-DONE tasks per user, AI excluded)
    const humanUsers = allUsers.filter(u => u.username !== 'charmy' && u.name !== 'Charmy');
    
    const teamLoad = humanUsers.map(user => {
        const userTasksCount = allTasks.filter(t => t.assigneeId === user.id && t.status !== 'DONE').length;
        const isMe = user.id === currentUser.id;
        return {
            id: user.id,
            name: `${user.name || user.username}${isMe ? ' (YOU)' : ''}`,
            load: userTasksCount
        };
    }).sort((a, b) => b.load - a.load); // Sort by highest load first

    return (
        <div className={styles.dashboardGrid}>
            {/* 1. Header with Typing Animation and Status */}
            <div className={styles.headerItem}>
                <TypingGreeting name={currentUser.name || currentUser.username} />
                <div className={styles.statusInfo}>
                    [ SYSTEM: NOMINAL ^_^ ] [ STATUS: ONLINE ]
                </div>
            </div>

            {/* 2. Overall Progress */}
            <div className={styles.progressItem}>
                <MossyFrame title="▶ プロジェクト全体進捗">
                    <ProgressBar value={doneStats} max={totalStats} label={`PROJECT COMPLETION: ${doneStats}/${totalStats}`} />
                </MossyFrame>
            </div>

            {/* 3. My Focus */}
            <div className={styles.focusItem}>
                <MossyFrame title="▶ 本日の注力タスク">
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))', gap: '1rem' }}>
                        {myFocusTasks.length === 0 ? (
                            <p className="pixel-text" style={{ color: 'var(--text-muted)' }}>急ぎのタスクはありません。</p>
                        ) : (
                            myFocusTasks.map(task => {
                                const isUrgent = task.priority === 'HIGH' || (task.dueDate && new Date(task.dueDate) < new Date());
                                return (
                                    <Link key={task.id} href={`/tasks/${task.id}`} className={styles.interactiveLink}>
                                        <div style={isUrgent ? { border: '1px solid var(--color-rust)', padding: '2px', height: '100%' } : { height: '100%' }}>
                                            <TaskCard task={task} />
                                            {isUrgent && <div style={{ fontSize: '0.6rem', color: 'var(--color-rust)', fontWeight: 'bold', textAlign: 'center' }}>[ URGENT / ATTENTION ]</div>}
                                        </div>
                                    </Link>
                                );
                            })
                        )}
                    </div>
                </MossyFrame>
            </div>

            {/* 4. Anomaly Detected (Bugs) */}
            <div className={styles.anomalyItem}>
                <MossyFrame title="[ ⚠️ 重大異常検知 ]" variant="danger">
                    {anomalies.length === 0 ? (
                        <p className="pixel-text" style={{ color: 'var(--text-muted)' }}>異常なし。システムは正常です。</p>
                    ) : (
                        anomalies.map(bug => (
                            <Link key={bug.id} href={`/tasks/${bug.id}`} className={styles.anomalyLink}>
                                <div className={styles.anomalyEntry}>
                                    [!] {bug.title}
                                </div>
                            </Link>
                        ))
                    )}
                </MossyFrame>
            </div>

            {/* 5. System Logs */}
            <div className={styles.logsItem}>
                <MossyFrame title="▶ 最新システムログ">
                    <div style={{ maxHeight: '150px', overflowY: 'auto' }}>
                        {systemLogs.length === 0 ? (
                            <p className="pixel-text" style={{ color: 'var(--text-muted)' }}>ログはありません。</p>
                        ) : (
                            systemLogs.map((log: any, i: number) => (
                                <Link key={i} href={`/tasks/${log.id}`} className={styles.logLink}>
                                    <div className={styles.logEntry}>
                                        <span className={styles.logTime}>[{log.time}]</span>
                                        <span className="pixel-text">{log.msg}</span>
                                    </div>
                                </Link>
                            ))
                        )}
                    </div>
                </MossyFrame>
            </div>

            {/* 6. Team Load */}
            <div className={styles.teamItem}>
                <MossyFrame title="▶ メンバー負荷状況">
                    <div className={styles.teamList}>
                        {teamLoad.map((member) => (
                            <div key={member.id} className={styles.teamMember}>
                                <span className="pixel-text">{member.name}</span>
                                <span className={styles.loadBadge}>{member.load} TASKS</span>
                            </div>
                        ))}
                    </div>
                </MossyFrame>
            </div>
        </div>
    );
}
