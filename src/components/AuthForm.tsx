'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { login, signup } from '@/actions/auth';
import { PixelButton } from '@/components/ui/PixelButton';
import styles from '../app/login/page.module.css';

interface User {
    id: string;
    username: string;
    name: string | null;
    role: string;
    avatar: string | null;
    themeColor: string;
}

export function AuthForm({ users }: { users: User[] }) {
    const router = useRouter();
    const [mode, setMode] = useState<'LOGIN' | 'SIGNUP'>('LOGIN');
    const [selectedUser, setSelectedUser] = useState<User | null>(null);
    const [password, setPassword] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState(false); // Controls full-screen success overlay
    const [isSubmitting, setIsSubmitting] = useState(false); // Controls button loading state
    const [loadingText, setLoadingText] = useState('');
    const [showPassword, setShowPassword] = useState(false);

    // Signup states
    const [signupData, setSignupData] = useState({
        username: '',
        password: '',
        role: 'PROGRAMMER',
        avatar: '[o_o]',
        themeColor: '#4af626',
        passkey: ''
    });

    const simulateLoading = async () => {
        // This function now runs while the full-screen overlay is visible
        const chars = '||||||||||';
        for (let i = 1; i <= chars.length; i++) {
            setLoadingText(`[${chars.substring(0, i)}${' '.repeat(chars.length - i)}] ${i * 10}%`);
            await new Promise(r => setTimeout(r, 150));
        }
        setLoadingText('認証完了。ワークスペース.zipを展開します...');
        await new Promise(r => setTimeout(r, 500));
    };

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);

        if (!selectedUser) return;

        try {
            setIsSubmitting(true);
            // @ts-ignore
            const res = await login(selectedUser.id, password);

            if (res?.error) {
                setError(`[ERROR] ACCESS DENIED: ${res.error}`);
                setIsSubmitting(false);
            } else if (res?.success && res?.redirectUrl) {
                // Success! Trigger full-screen animation
                setLoading(true); // Show overlay
                await simulateLoading(); // Run animation
                router.push(res.redirectUrl);
            }
        } catch (err) {
            setError('[ERROR] ACCESS DENIED: 不正なユーザーを検知しました。');
            setIsSubmitting(false);
        }
    };

    const handleSignup = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        // Create FormData from state since controlled inputs are used,
        // but easier to just use the form element if available.
        // Actually, we are using controlled inputs for state (signupData),
        // but simple form submission can use FormData from event target.
        const formData = new FormData(e.currentTarget as HTMLFormElement);

        // Ensure themeColor and other hidden fields are included
        // They are present as hidden inputs or select values in the form.

        try {
            setIsSubmitting(true);
            // @ts-ignore - The action generic return type issue in Next.js 14 server actions
            const res = await signup(formData);

            if (res?.error) {
                setError(`[ERROR] ACCESS DENIED: ${res.error}`);
                setIsSubmitting(false);
            } else if (res?.success && res?.redirectUrl) {
                // Success! Trigger full-screen animation
                setLoading(true); // Show overlay
                await simulateLoading();
                router.push(res.redirectUrl);
            }
        } catch (err) {
            setError('[ERROR] ACCESS DENIED: 不正なユーザーを検知しました。');
            setIsSubmitting(false);
        }
    };

    const PasswordToggle = () => (
        <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            style={{
                position: 'absolute',
                right: '10px',
                top: '50%',
                transform: 'translateY(-50%)',
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                fontFamily: 'monospace',
                fontSize: '1rem',
                color: 'var(--text-muted)',
                zIndex: 10
            }}
            title={showPassword ? "Hide Password" : "Show Password"}
        >
            {showPassword ? '[o_o]' : '[-_-]'}
        </button>
    );

    return (
        <div style={{ padding: '1rem' }}>
            {/* Tabs */}
            <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.5rem', justifyContent: 'center' }}>
                <PixelButton
                    onClick={() => { setMode('LOGIN'); setError(null); }}
                    style={{ opacity: mode === 'LOGIN' ? 1 : 0.5, backgroundColor: mode === 'LOGIN' ? 'var(--color-rust)' : undefined }}
                >
                    ログイン
                </PixelButton>
                <PixelButton
                    onClick={() => { setMode('SIGNUP'); setError(null); }}
                    style={{ opacity: mode === 'SIGNUP' ? 1 : 0.5, backgroundColor: mode === 'SIGNUP' ? 'var(--color-rust)' : undefined }}
                >
                    新規登録
                </PixelButton>
            </div>

            {error && (
                <div style={{ color: '#ff3333', textAlign: 'center', marginBottom: '1rem', fontFamily: 'monospace', fontWeight: 'bold' }}>
                    {error}
                </div>
            )}

            {mode === 'LOGIN' && (
                <div className={styles.userList}>
                    {!selectedUser ? (
                        users.map((user) => (
                            <div key={user.id} onClick={() => setSelectedUser(user)}>
                                <PixelButton className={styles.userButton}>
                                    <div
                                        className={styles.avatarPlaceholder}
                                        style={{ backgroundColor: user.themeColor || 'var(--bg-sunken)' }}
                                    >
                                        {user.avatar || '[?]'}
                                    </div>
                                    <div className={styles.userInfo}>
                                        <span className={styles.userName}>{user.name || user.username}</span>
                                        <span className={styles.userRole}>{user.role}</span>
                                    </div>
                                </PixelButton>
                            </div>
                        ))
                    ) : (
                        <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '1rem', alignItems: 'center' }}>
                            <div className={styles.userButton} style={{ pointerEvents: 'none' }}>
                                <div className={styles.avatarPlaceholder} style={{ backgroundColor: selectedUser.themeColor || 'var(--bg-sunken)' }}>{selectedUser.avatar || '[?]'}</div>
                                <div className={styles.userInfo}>
                                    <span className={styles.userName}>{selectedUser.name}</span>
                                    <span className={styles.userRole}>{selectedUser.role}</span>
                                </div>
                            </div>

                            <div className={styles.inputWrapper}>
                                <input
                                    type={showPassword ? "text" : "password"}
                                    name="password"
                                    placeholder="パスワード"
                                    value={password}
                                    onChange={e => setPassword(e.target.value)}
                                    className={styles.input}
                                    style={{ paddingRight: '3.5rem' }} // Space for toggle
                                    required
                                />
                                <span className={styles.cursor} style={{ left: `calc(0.8rem + ${password.length}ch)` }}>_</span>
                                <PasswordToggle />
                            </div>

                            <div style={{ display: 'flex', gap: '1rem', width: '100%' }}>
                                <PixelButton type="button" onClick={() => { setSelectedUser(null); setPassword(''); setError(null); }} style={{ flex: 1 }}>
                                    戻る
                                </PixelButton>
                                <PixelButton type="submit" disabled={isSubmitting} style={{ flex: 2 }}>
                                    {isSubmitting ? '処理中...' : 'ログイン'}
                                </PixelButton>
                            </div>
                        </form>
                    )}
                </div>
            )}

            {mode === 'SIGNUP' && (
                <form onSubmit={handleSignup} style={{ display: 'flex', flexDirection: 'column', gap: '1.2rem', maxWidth: '350px', margin: '0 auto' }}>
                    <label>
                        <span className={styles.label}>ユーザー名</span>
                        <div className={styles.inputWrapper}>
                            <input
                                type="text"
                                name="username"
                                required
                                className={styles.input}
                                autoComplete="off"
                                value={signupData.username}
                                onChange={e => setSignupData({ ...signupData, username: e.target.value })}
                            />
                            <span className={styles.cursor} style={{ left: `calc(0.8rem + ${signupData.username.length}ch)` }}>_</span>
                        </div>
                    </label>

                    <label>
                        <span className={styles.label}>パスワード</span>
                        <div className={styles.inputWrapper}>
                            <input
                                type={showPassword ? "text" : "password"}
                                name="password"
                                required
                                className={styles.input}
                                style={{ paddingRight: '3.5rem' }}
                                value={signupData.password}
                                onChange={e => setSignupData({ ...signupData, password: e.target.value })}
                            />
                            <span className={styles.cursor} style={{ left: `calc(0.8rem + ${signupData.password.length}ch)` }}>_</span>
                            <PasswordToggle />
                        </div>
                    </label>

                    <label>
                        <span className={styles.label}>テーマカラー</span>
                        <input type="hidden" name="themeColor" value={signupData.themeColor} />
                        <div className={styles.colorOptions}>
                            {[
                                { color: '#0000ff', name: 'Blue' },
                                { color: '#ff0000', name: 'Red' },
                                { color: '#00ff00', name: 'Green' },
                                { color: '#ffff00', name: 'Yellow' },
                                { color: '#00ffff', name: 'Cyan' },
                                { color: '#ff00ff', name: 'Pink' },
                                { color: '#ff8800', name: 'Orange' },
                                { color: '#ccff00', name: 'Yellow-Green' },
                                { color: '#6600cc', name: 'Dark Purple' },
                            ].map((opt) => (
                                <div
                                    key={opt.color}
                                    className={`${styles.colorOption} ${signupData.themeColor === opt.color ? styles.selected : ''}`}
                                    style={{ backgroundColor: opt.color }}
                                    onClick={() => setSignupData({ ...signupData, themeColor: opt.color })}
                                    title={opt.name}
                                />
                            ))}
                        </div>
                    </label>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                        <label>
                            <span className={styles.label}>役職</span>
                            <select name="role" className={styles.select}>
                                <option value="PLANNER">プランナー</option>
                                <option value="PROGRAMMER">プログラマー</option>
                                <option value="DESIGNER">デザイナー</option>
                            </select>
                        </label>
                        <label>
                            <span className={styles.label}>アバター</span>
                            <select name="avatar" className={styles.select} style={{ fontFamily: 'monospace' }}>
                                <option value="[o_o]">[o_o]</option>
                                <option value="[-_-]">[-_-]</option>
                                <option value="[^_^]">[^_^]</option>
                                <option value="[>_<]">[&gt;_&lt;]</option>
                                <option value="[@_@]">[@_@]</option>
                                <option value="[*_*]">[*_*]</option>
                                <option value="[T_T]">[T_T]</option>
                                <option value="[x_x]">[x_x]</option>
                                <option value="[~_~]">[~_~]</option>
                                <option value="['.']">['.']</option>
                            </select>
                        </label>
                    </div>

                    <div className={styles.sectionDivider}>
                        <label>
                            <span className={`${styles.label} ${styles.passkeyLabel}`}>プロジェクトパスキー</span>
                            <div className={styles.inputWrapper}>
                                <input
                                    type={showPassword ? "text" : "password"}
                                    name="passkey"
                                    required
                                    className={`${styles.input} ${styles.passkeyInput}`}
                                    style={{ paddingRight: '3.5rem' }}
                                    value={signupData.passkey}
                                    onChange={e => setSignupData({ ...signupData, passkey: e.target.value })}
                                />
                                <span className={styles.cursor} style={{ left: `calc(0.8rem + ${signupData.passkey.length}ch)` }}>_</span>
                                <PasswordToggle />
                            </div>
                        </label>
                    </div>

                    <PixelButton type="submit" disabled={isSubmitting} style={{ marginTop: '1rem', width: '100%' }}>
                        {isSubmitting ? '処理中...' : 'アカウント作成'}
                    </PixelButton>
                </form>
            )}
            {/* Full Screen Loading Overlay */}
            {loading && (
                <div style={{
                    position: 'fixed',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    backgroundColor: '#000000', // Fully Black
                    zIndex: 9999,
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#00ff00', // Terminal Green
                    fontFamily: '"Courier New", Courier, monospace',
                }}>
                    <div style={{
                        fontSize: '2.5rem',
                        fontWeight: 'bold',
                        animation: 'pulse 0.8s infinite alternate',
                        marginBottom: '2rem',
                        textShadow: '0 0 15px #00ff00',
                        letterSpacing: '2px'
                    }}>
                        SYSTEM AUTHENTICATION
                    </div>
                    <div style={{
                        fontSize: '1.2rem',
                        whiteSpace: 'pre',
                        textAlign: 'center',
                        color: '#ccffcc'
                    }}>
                        {loadingText}
                    </div>
                    <style jsx>{`
                        @keyframes pulse {
                            from { opacity: 0.7; text-shadow: 0 0 10px #00ff00; }
                            to { opacity: 1; text-shadow: 0 0 25px #00ff00; }
                        }
                    `}</style>
                </div>
            )}
        </div>
    );
}
