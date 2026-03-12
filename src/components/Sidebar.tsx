import Link from 'next/link';
import styles from './Sidebar.module.css';
import { getCurrentUser, logout } from '@/actions/auth';
import { getUnreadSystemLogsCount } from '@/actions/task';
import { PixelButton } from './ui/PixelButton';
import { clsx } from 'clsx';

export async function Sidebar() {
    const user = await getCurrentUser();
    const unreadLogsCount = await getUnreadSystemLogsCount();

    if (!user) return null;

    return (
        <aside className={styles.sidebar}>
            <div className={styles.logo}>
                CHARMY<br />NAVIGATOR
            </div>

            <nav className={styles.nav}>
                <Link href="/" className={styles.navLink}>
                    [ ] ホーム
                </Link>
                <Link href="/my-tasks" className={styles.navLink}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <span>[!] マイタスク</span>
                        {unreadLogsCount > 0 && (
                            <span className={styles.badge}>{unreadLogsCount}</span>
                        )}
                    </div>
                </Link>
                <Link href="/kanban" className={styles.navLink}>
                    [=] ボード
                </Link>
                <Link href="/gantt" className={styles.navLink}>
                    [#] チャート
                </Link>
                <Link href="/tasks/new" className={styles.navLink}>
                    [+] 新規タスク
                </Link>
            </nav>

            <div className={styles.userProfileContainer}>
                <div 
                    className={styles.avatar} 
                    style={{ backgroundColor: user.themeColor || 'var(--color-rust)' }}
                    title={user.name || user.username}
                >
                    {user.avatar || '[?]'}
                </div>
                <div className={styles.userNameContainer}>
                    <div className={styles.userName}>{user.name || user.username}</div>
                </div>
                <form action={logout} className={styles.logoutForm}>
                    <button 
                        type="submit" 
                        className={styles.logoutIconButton}
                        style={{ '--theme-color': user.themeColor || 'var(--color-rust)' } as React.CSSProperties}
                        title="ログアウト"
                    >
                        ⏻
                    </button>
                </form>
            </div>
        </aside>
    );
}
