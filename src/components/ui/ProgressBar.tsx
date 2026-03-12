import styles from './ProgressBar.module.css';

export const ProgressBar = ({ value, max, label }: { value: number, max: number, label?: string }) => {
    const percentage = Math.min(100, Math.max(0, (value / max) * 100)) || 0;

    return (
        <div className={styles.container}>
            {label && <div className="pixel-text" style={{ marginBottom: '4px', fontSize: '0.8rem' }}>{label}</div>}
            <div className={styles.track}>
                <div
                    className={styles.fill}
                    style={{ width: `${percentage}%` }}
                ></div>
            </div>
        </div>
    );
};
