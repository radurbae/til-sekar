import Header from "@/components/Header/Header";
import Link from "next/link";
import styles from "./page.module.css";

export const metadata = {
    title: "About | TIL",
    description: "Tentang website Today I Learned",
};

export default function AboutPage() {
    return (
        <>
            <Header />
            <main className={styles.main}>
                <div className={`container ${styles.page}`}>
                    <div className={styles.header}>
                        <Link href="/" className={styles.backLink}>
                            ← Back
                        </Link>
                        <h1 className={styles.title}>About</h1>
                    </div>
                    <div className={styles.content}>
                        <p>
                            TIL (Today I Learned) adalah kumpulan catatan singkat tentang
                            hal-hal yang Sekar pelajari setiap hari.
                        </p>
                        <p>
                            Setiap catatan berisi pembelajaran kecil yang mungkin berguna
                            untuk referensi di masa depan atau bermanfaat bagi orang lain.
                        </p>
                        <p>
                            Website ini dibangun dengan Next.js dan di-host sebagai proyek
                            open source.
                        </p>
                    </div>
                </div>
            </main>
        </>
    );
}
