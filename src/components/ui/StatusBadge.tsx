import React from 'react';
import styles from './StatusBadge.module.css';
import { clsx } from 'clsx';

export type TaskStatus = 'TODO' | 'IN_PROGRESS' | 'REVIEW' | 'DONE';

interface StatusBadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
    status: string | TaskStatus;
}

export const StatusBadge = ({ status, className, ...props }: StatusBadgeProps) => {
    const label = {
        'TODO': '未着手',
        'IN_PROGRESS': '作業中',
        'REVIEW': '確認待ち',
        'DONE': '完了'
    }[status as string] || status;

    return (
        <span
            className={clsx(styles.badge, styles[status as string], className)}
            {...props}
        >
            {label}
        </span>
    );
};
