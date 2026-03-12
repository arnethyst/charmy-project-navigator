import { StatusBadge } from './ui/StatusBadge';
import styles from './TaskCard.module.css';
import { clsx } from 'clsx';

interface User {
    id?: string;
    name?: string | null;
    username?: string;
    themeColor?: string;
}

interface Task {
    id: string;
    title: string;
    status: string;
    priority: string;
    assigneeId?: string | null;
    assignee?: User | null;
    tags?: any[] | null;
    role?: string | null;
}

const getPriorityStyle = (priority: string) => {
    switch (priority) {
        case 'HIGH':
        case 'URGENT':
            return { color: 'var(--color-rust, #cc3333)' };
        case 'MIDDLE':
            return { color: '#ddaa00' }; // yellow/orange
        case 'LOW':
            return { color: 'var(--color-moss-light, #88cc88)' }; // green/blue
        default:
            return { color: 'var(--text-main)' };
    }
};

// Map status to CSS variable for the stripe
const getStatusColorVar = (status: string) => {
    switch (status) {
        case 'IDEA': return 'var(--status-idea)';
        case 'SPEC': return 'var(--status-spec)';
        case 'WORKING': return 'var(--status-working)';
        case 'REVIEW': return 'var(--status-review)';
        case 'BLOCKED': return 'var(--status-blocked)';
        case 'DONE': return 'var(--status-done)';
        default: return 'var(--text-main)';
    }
};

export const TaskCard = ({ task, currentUserId, dragListeners, dragAttributes }: { task: Task, currentUserId?: string, dragListeners?: any, dragAttributes?: any }) => {
    const priorityStyle = getPriorityStyle(task.priority);
    const isOwnTask = currentUserId && task.assigneeId === currentUserId;

    return (
        <div className={styles.card} style={isOwnTask && task.assignee?.themeColor ? {
            border: `1px solid ${task.assignee.themeColor}`,
            boxShadow: `0 0 10px ${task.assignee.themeColor}22 inset`
        } : {}}>
            <div
                className={styles.stripe}
                style={{ backgroundColor: getStatusColorVar(task.status) }}
            />
            {/* Grip Icon */}
            <div
                {...dragListeners}
                {...dragAttributes}
                className="absolute top-1 right-1 text-[#969696]/40 text-[0.8rem] cursor-grab select-none leading-none hover:opacity-100 hover:text-[var(--color-moss-dark)] transition-all"
                title="Drag to move"
            >
                ::
            </div>

            <div className={styles.header}>
                <span className={styles.title}>{task.title}</span>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '4px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                        {task.role && (
                            <span className={clsx(
                                styles.roleBadge,
                                task.role === 'PLANNER' && styles.rolePlanner,
                                task.role === 'PROGRAMMER' && styles.roleProgrammer,
                                task.role === 'DESIGNER' && styles.roleDesigner
                            )}>
                                {task.role === 'PLANNER' ? 'PLN' : task.role === 'PROGRAMMER' ? 'PRG' : task.role === 'DESIGNER' ? 'DSG' : task.role}
                            </span>
                        )}
                        <StatusBadge status={task.status} />
                    </div>
                    {task.assignee && (
                        <div style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '4px',
                            fontSize: '0.65rem',
                            color: 'var(--text-muted)'
                        }}>
                            <div style={{
                                width: '12px',
                                height: '12px',
                                borderRadius: '50%',
                                backgroundColor: task.assignee.themeColor || 'var(--color-moss-dark)',
                                border: '1px solid rgba(255,255,255,0.2)'
                            }} title={task.assignee.name || task.assignee.username} />
                            {task.assignee.name || task.assignee.username}
                        </div>

                    )}
                </div>
            </div>

            <div className={styles.meta} style={{ marginTop: '4px' }}>
                {/* Assignee moved to header */}
                <span style={{ color: priorityStyle.color, fontSize: '0.7rem' }}>{task.priority}</span>
            </div>

            {Array.isArray(task.tags) && task.tags.length > 0 && (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', marginTop: '8px' }}>
                    {task.tags.map((tag: any) => (
                        <span key={tag.name || tag} style={{
                            fontSize: '0.6rem',
                            padding: '2px 4px',
                            border: '1px solid var(--text-muted)',
                            borderRadius: '4px',
                            color: 'var(--text-muted)',
                            fontFamily: 'inherit'
                        }}>
                            {tag.name || tag}
                        </span>
                    ))}
                </div>
            )}

        </div>
    );
};
