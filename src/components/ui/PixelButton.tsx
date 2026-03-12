import React from 'react';
import styles from './PixelButton.module.css';
import { clsx } from 'clsx';

interface PixelButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
    variant?: 'default' | 'primary' | 'secondary' | 'outline';
}

export const PixelButton = ({ variant = 'default', className, ...props }: PixelButtonProps) => {
    return (
        <button
            className={clsx(styles.button, styles[variant], className)}
            {...props}
        />
    );
};
