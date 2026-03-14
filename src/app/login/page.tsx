import { getUsers } from '../../actions/auth';
import { MossyFrame } from '../../components/ui/MossyFrame';
import styles from './page.module.css';
import { AuthForm } from '../../components/AuthForm';

export const dynamic = 'force-dynamic';

export default async function LoginPage() {
    const users = await getUsers();

    return (
        <main className={styles.main}>
            {/* Background ASCII Art */}
            <div className={styles.asciiBackground}>
                {`
   _______  __   __  _______  ______   _______  __   __ 
  |       ||  | |  ||   _   ||    _ | |       ||  | |  |
  |       ||  |_|  ||  |_|  ||   | || |  _____||  |_|  |
  |       ||       ||       ||   |_||_| | |_____ |       |
  |      _||       ||       ||    __  | |_____  ||_     _|
  |     |_ |   _   ||   _   ||   |  | |  _____| |  |   |  
  |_______||__| |__||__| |__||___|  |_| |_______|  |___|  
   _______  ______    _______  ___      _______  _______ 
  |       ||    _ |  |       ||   |    |       ||       |
  |    _  ||   | ||  |   _   ||   |    |    ___||       |
  |   |_| ||   |_||_ |  | |  ||   |    |   |___ |       |
  |    ___||    __  ||  |_|  ||   |___ |    ___||      _|
  |   |    |   |  | ||       ||       ||   |___ |     |_ 
  |___|    |___|  |_||_______||_______||_______||_______|
`}
            </div>

            {/* Moss Decorations - Moderate */}
            {Array.from({ length: 20 }).map((_, i) => (
                <div
                    key={`moss-${i}`}
                    className={styles.mossDecoration}
                    style={{
                        top: `${Math.random() * 100}%`,
                        left: `${Math.random() * 100}%`,
                        opacity: Math.random() * 0.5 + 0.3,
                        transform: `scale(${Math.random() * 1.5 + 0.5})`,
                    }}
                />
            ))}
            {Array.from({ length: 10 }).map((_, i) => (
                <div
                    key={`flower-${i}`}
                    className={styles.flowerDecoration}
                    style={{
                        top: `${Math.random() * 100}%`,
                        left: `${Math.random() * 100}%`,
                        transform: `scale(${Math.random() * 1.2 + 0.8})`,
                    }}
                />
            ))}

            <MossyFrame title="認証システム" className={styles.loginFrame}>
                <p className={styles.instruction}>
                    端末にアクセスするユーザーを識別してください。
                </p>
                <AuthForm users={users} />
            </MossyFrame>
        </main>
    );
}

