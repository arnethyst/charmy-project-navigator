import React from 'react';
import styles from './MossyFrame.module.css';
import { clsx } from 'clsx';

interface MossyFrameProps extends Omit<React.HTMLAttributes<HTMLDivElement>, 'title'> {
    title?: React.ReactNode;
    children: React.ReactNode;
    variant?: 'default' | 'danger';
}

export const MossyFrame = ({ title, children, className, variant = 'default', ...props }: MossyFrameProps) => {
    return (
        <div className={clsx(styles.container, styles[variant], className)} {...props}>
            {title && <div className={styles.title}>{title}</div>}
            {children}
        </div>
    );
};
