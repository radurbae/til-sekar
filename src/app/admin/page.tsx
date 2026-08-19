"use client";

import Header from "@/components/Header/Header";
import Link from "next/link";
import { useState, useEffect, useCallback } from "react";
import styles from "./page.module.css";
import dynamic from "next/dynamic";

// Dynamic import to avoid SSR issues with TipTap
const RichTextEditor = dynamic(
    () => import("@/components/RichTextEditor/RichTextEditor"),
    { ssr: false, loading: () => <div style={{ padding: '1rem', color: '#666' }}>Loading editor...</div> }
);

import {
    LayoutDashboard,
    FileText,
    Folder,
    Tags,
    PenSquare,
    List,
    Save,
    Edit,
    Trash2,
    LogOut,
    Lock,
    AlertTriangle,
    X,
    Check,
    BookOpen,
    Plus
} from "lucide-react";

interface Article {
    slug: string;
    sha: string;
    title: string;
    date: string;
    category: string;
    tags: string[];
    content?: string;
}

interface Category {
    name: string;
    count: number;
}

interface Tag {
    name: string;
    count: number;
}

interface PrivateNote {
    slug: string;
    sha: string;
    title: string;
    date: string;
    mood: string;
    content?: string;
}

type MainTab = "write" | "manage-articles" | "categories" | "private-notes";

export default function AdminPage() {
    // Auth state
    const [isLoggedIn, setIsLoggedIn] = useState(false);
    const [password, setPassword] = useState("");
    const [loginError, setLoginError] = useState("");
    const [isLoggingIn, setIsLoggingIn] = useState(false);

    // Navigation state
    const [mainTab, setMainTab] = useState<MainTab>("write");

    // Article form state
    const [title, setTitle] = useState("");
    const [category, setCategory] = useState("");
    const [tags, setTags] = useState("");
    const [content, setContent] = useState("");
    const [message, setMessage] = useState("");
    const [isLoading, setIsLoading] = useState(false);

    // Article management state
    const [articles, setArticles] = useState<Article[]>([]);
    const [isLoadingArticles, setIsLoadingArticles] = useState(false);
    const [editingArticle, setEditingArticle] = useState<Article | null>(null);
    const [deleteConfirm, setDeleteConfirm] = useState<Article | null>(null);

    // Categories and Tags state
    const [categories, setCategories] = useState<Category[]>([]);
    const [tagsData, setTagsData] = useState<Tag[]>([]);
    const [isLoadingCategories, setIsLoadingCategories] = useState(false);
    const [isLoadingTags, setIsLoadingTags] = useState(false);

    // Category/Tag management state
    const [editingCategory, setEditingCategory] = useState<Category | null>(null);
    const [editingTag, setEditingTag] = useState<Tag | null>(null);
    const [deleteCategoryConfirm, setDeleteCategoryConfirm] = useState<Category | null>(null);
    const [deleteTagConfirm, setDeleteTagConfirm] = useState<Tag | null>(null);
    const [newCategoryName, setNewCategoryName] = useState("");
    const [newTagName, setNewTagName] = useState("");

    // Private notes state
    const [notes, setNotes] = useState<PrivateNote[]>([]);
    const [isLoadingNotes, setIsLoadingNotes] = useState(false);
    const [isWritingNote, setIsWritingNote] = useState(false);
    const [editingNote, setEditingNote] = useState<PrivateNote | null>(null);
    const [deleteNoteConfirm, setDeleteNoteConfirm] = useState<PrivateNote | null>(null);
    const [noteTitle, setNoteTitle] = useState("");
    const [noteMood, setNoteMood] = useState("");
    const [noteContent, setNoteContent] = useState("");

    // Fetch articles
    const fetchArticles = useCallback(async () => {
        setIsLoadingArticles(true);
        try {
            const response = await fetch("/api/admin/articles", {
                headers: { "x-admin-password": password },
            });
            const data = await response.json();
            if (response.ok) {
                setArticles(data.articles || []);
            }
        } catch (error) {
            console.error("Failed to fetch articles:", error);
        } finally {
            setIsLoadingArticles(false);
        }
    }, [password]);

    // Fetch categories
    const fetchCategories = useCallback(async () => {
        setIsLoadingCategories(true);
        try {
            const response = await fetch("/api/admin/categories", {
                headers: { "x-admin-password": password },
            });
            const data = await response.json();
            if (response.ok) {
                setCategories(data.categories || []);
            }
        } catch (error) {
            console.error("Failed to fetch categories:", error);
        } finally {
            setIsLoadingCategories(false);
        }
    }, [password]);

    // Fetch tags
    const fetchTags = useCallback(async () => {
        setIsLoadingTags(true);
        try {
            const response = await fetch("/api/admin/tags", {
                headers: { "x-admin-password": password },
            });
            const data = await response.json();
            if (response.ok) {
                setTagsData(data.tags || []);
            }
        } catch (error) {
            console.error("Failed to fetch tags:", error);
        } finally {
            setIsLoadingTags(false);
        }
    }, [password]);

    // Fetch private notes
    const fetchNotes = useCallback(async () => {
        setIsLoadingNotes(true);
        try {
            const response = await fetch("/api/admin/private", {
                headers: { "x-admin-password": password },
            });
            const data = await response.json();
            if (response.ok) {
                setNotes(data.notes || []);
            }
        } catch (error) {
            console.error("Failed to fetch private notes:", error);
        } finally {
            setIsLoadingNotes(false);
        }
    }, [password]);

    // Effects for fetching data
    useEffect(() => {
        if (isLoggedIn && mainTab === "manage-articles") {
            fetchArticles();
        }
    }, [isLoggedIn, mainTab, fetchArticles]);

    useEffect(() => {
        if (isLoggedIn && mainTab === "categories") {
            fetchCategories();
        }
    }, [isLoggedIn, mainTab, fetchCategories]);


    useEffect(() => {
        if (isLoggedIn && mainTab === "private-notes") {
            fetchNotes();
        }
    }, [isLoggedIn, mainTab, fetchNotes]);

    // Login handler
    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoggingIn(true);
        setLoginError("");

        try {
            const response = await fetch("/api/admin", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ action: "login", password }),
            });

            const data = await response.json();

            if (response.ok && data.success) {
                setIsLoggedIn(true);
            } else {
                setLoginError(data.error || "Password salah");
            }
        } catch {
            setLoginError("Gagal terhubung ke server");
        } finally {
            setIsLoggingIn(false);
        }
    };

    // Create article handler
    const handleCreate = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        setMessage("");

        try {
            const response = await fetch("/api/admin", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    title,
                    category: category || "TIL",
                    tags,
                    content,
                    password,
                }),
            });

            const data = await response.json();

            if (response.ok) {
                setMessage(`✅ ${data.message}`);
                setTitle("");
                setContent("");
                setTags("");
                setCategory("");
            } else {
                setMessage(`❌ Error: ${data.error}`);
            }
        } catch {
            setMessage("❌ Failed to connect to server");
        } finally {
            setIsLoading(false);
        }
    };

    // Edit article handler
    const handleEdit = async (article: Article) => {
        try {
            const response = await fetch(`/api/admin/articles/${article.slug}`, {
                headers: { "x-admin-password": password },
            });
            const data = await response.json();
            if (response.ok) {
                setEditingArticle({
                    ...article,
                    content: data.content,
                });
            }
        } catch (error) {
            console.error("Failed to fetch article:", error);
        }
    };

    // Update article handler
    const handleUpdate = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!editingArticle) return;

        setIsLoading(true);
        setMessage("");

        try {
            const response = await fetch(`/api/admin/articles/${editingArticle.slug}`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    title: editingArticle.title,
                    category: editingArticle.category,
                    tags: editingArticle.tags.join(", "),
                    content: editingArticle.content,
                    password,
                    sha: editingArticle.sha,
                }),
            });

            const data = await response.json();

            if (response.ok) {
                setMessage(`✅ ${data.message}`);
                setEditingArticle(null);
                fetchArticles();
            } else {
                setMessage(`❌ Error: ${data.error}`);
            }
        } catch {
            setMessage("❌ Failed to update article");
        } finally {
            setIsLoading(false);
        }
    };

    // Delete article handler
    const handleDelete = async () => {
        if (!deleteConfirm) return;

        setIsLoading(true);

        try {
            const response = await fetch(`/api/admin/articles/${deleteConfirm.slug}`, {
                method: "DELETE",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    password,
                    sha: deleteConfirm.sha,
                }),
            });

            const data = await response.json();

            if (response.ok) {
                setMessage(`✅ ${data.message}`);
                setDeleteConfirm(null);
                fetchArticles();
            } else {
                setMessage(`❌ Error: ${data.error}`);
            }
        } catch {
            setMessage("❌ Failed to delete article");
        } finally {
            setIsLoading(false);
        }
    };

    // Rename category handler
    const handleRenameCategory = async () => {
        if (!editingCategory || !newCategoryName.trim()) return;
        setIsLoading(true);
        try {
            const response = await fetch(`/api/admin/categories/${encodeURIComponent(editingCategory.name)}`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ newName: newCategoryName, password }),
            });
            const data = await response.json();
            if (response.ok) {
                setMessage(`✅ ${data.message}`);
                setEditingCategory(null);
                setNewCategoryName("");
                fetchCategories();
            } else {
                setMessage(`❌ Error: ${data.error}`);
            }
        } catch {
            setMessage("❌ Failed to rename category");
        } finally {
            setIsLoading(false);
        }
    };

    // Delete category handler
    const handleDeleteCategory = async () => {
        if (!deleteCategoryConfirm) return;
        setIsLoading(true);
        try {
            const response = await fetch(`/api/admin/categories/${encodeURIComponent(deleteCategoryConfirm.name)}`, {
                method: "DELETE",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ password }),
            });
            const data = await response.json();
            if (response.ok) {
                setMessage(`✅ ${data.message}`);
                setDeleteCategoryConfirm(null);
                fetchCategories();
            } else {
                setMessage(`❌ Error: ${data.error}`);
            }
        } catch {
            setMessage("❌ Failed to delete category");
        } finally {
            setIsLoading(false);
        }
    };

    // Rename tag handler
    const handleRenameTag = async () => {
        if (!editingTag || !newTagName.trim()) return;
        setIsLoading(true);
        try {
            const response = await fetch(`/api/admin/tags/${encodeURIComponent(editingTag.name)}`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ newName: newTagName, password }),
            });
            const data = await response.json();
            if (response.ok) {
                setMessage(`✅ ${data.message}`);
                setEditingTag(null);
                setNewTagName("");
                fetchTags();
            } else {
                setMessage(`❌ Error: ${data.error}`);
            }
        } catch {
            setMessage("❌ Failed to rename tag");
        } finally {
            setIsLoading(false);
        }
    };

    // Delete tag handler
    const handleDeleteTag = async () => {
        if (!deleteTagConfirm) return;
        setIsLoading(true);
        try {
            const response = await fetch(`/api/admin/tags/${encodeURIComponent(deleteTagConfirm.name)}`, {
                method: "DELETE",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ password }),
            });
            const data = await response.json();
            if (response.ok) {
                setMessage(`✅ ${data.message}`);
                setDeleteTagConfirm(null);
                fetchTags();
            } else {
                setMessage(`❌ Error: ${data.error}`);
            }
        } catch {
            setMessage("❌ Failed to delete tag");
        } finally {
            setIsLoading(false);
        }
    };

    // Create private note handler
    const handleCreateNote = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        setMessage("");
        try {
            const response = await fetch("/api/admin/private", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    title: noteTitle,
                    mood: noteMood,
                    content: noteContent,
                    password,
                }),
            });
            const data = await response.json();
            if (response.ok) {
                setMessage(`✅ ${data.message}`);
                setNoteTitle("");
                setNoteMood("");
                setNoteContent("");
                setIsWritingNote(false);
                fetchNotes();
            } else {
                setMessage(`❌ Error: ${data.error}`);
            }
        } catch {
            setMessage("❌ Gagal menyimpan catatan");
        } finally {
            setIsLoading(false);
        }
    };

    // Open note for editing
    const handleEditNote = async (note: PrivateNote) => {
        try {
            const response = await fetch(`/api/admin/private/${note.slug}`, {
                headers: { "x-admin-password": password },
            });
            const data = await response.json();
            if (response.ok) {
                setEditingNote({ ...note, content: data.content });
                setNoteTitle(data.title);
                setNoteMood(data.mood || "");
                setNoteContent(data.content || "");
                setIsWritingNote(true);
            }
        } catch (error) {
            console.error("Failed to fetch note:", error);
        }
    };

    // Update private note handler
    const handleUpdateNote = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!editingNote) return;
        setIsLoading(true);
        setMessage("");
        try {
            const response = await fetch(`/api/admin/private/${editingNote.slug}`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    title: noteTitle,
                    mood: noteMood,
                    content: noteContent,
                    password,
                    sha: editingNote.sha,
                }),
            });
            const data = await response.json();
            if (response.ok) {
                setMessage(`✅ ${data.message}`);
                setEditingNote(null);
                setNoteTitle("");
                setNoteMood("");
                setNoteContent("");
                setIsWritingNote(false);
                fetchNotes();
            } else {
                setMessage(`❌ Error: ${data.error}`);
            }
        } catch {
            setMessage("❌ Gagal memperbarui catatan");
        } finally {
            setIsLoading(false);
        }
    };

    // Delete private note handler
    const handleDeleteNote = async () => {
        if (!deleteNoteConfirm) return;
        setIsLoading(true);
        try {
            const response = await fetch(`/api/admin/private/${deleteNoteConfirm.slug}`, {
                method: "DELETE",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ password, sha: deleteNoteConfirm.sha }),
            });
            const data = await response.json();
            if (response.ok) {
                setMessage(`✅ ${data.message}`);
                setDeleteNoteConfirm(null);
                fetchNotes();
            } else {
                setMessage(`❌ Error: ${data.error}`);
            }
        } catch {
            setMessage("❌ Gagal menghapus catatan");
        } finally {
            setIsLoading(false);
        }
    };

    // Login Screen
    if (!isLoggedIn) {
        return (
            <>
                <Header />
                <main className={styles.main}>
                    <div className={`container ${styles.loginContainer}`}>
                        <div className={styles.loginBox}>
                            <div className={styles.loginHeader}>
                                <Lock size={48} strokeWidth={1.5} className={styles.loginIcon} />
                                <h1 className={styles.loginTitle}>Admin Login</h1>
                            </div>
                            <p className={styles.loginSubtitle}>
                                Masukkan password untuk mengakses halaman admin
                            </p>

                            <form onSubmit={handleLogin} className={styles.loginForm}>
                                <div className={styles.field}>
                                    <label htmlFor="password">Password</label>
                                    <input
                                        type="password"
                                        id="password"
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        placeholder="Masukkan password admin"
                                        required
                                        autoFocus
                                    />
                                </div>

                                {loginError && (
                                    <div className={styles.loginError}>{loginError}</div>
                                )}

                                <button
                                    type="submit"
                                    className={styles.loginButton}
                                    disabled={isLoggingIn}
                                >
                                    {isLoggingIn ? "Memverifikasi..." : "Masuk"}
                                </button>
                            </form>

                            <Link href="/" className={styles.backToHome}>
                                ← Kembali ke beranda
                            </Link>
                        </div>
                    </div>
                </main>
            </>
        );
    }

    // Dashboard
    return (
        <>
            <Header />
            <main className={styles.main}>
                <div className={`container ${styles.dashboard}`}>
                    {/* Header */}
                    <div className={styles.dashboardHeader}>
                        <Link href="/" className={styles.backLink}>
                            <span>Back to Home</span>
                        </Link>
                        <h1 className={styles.dashboardTitle}>
                            <span>Admin Dashboard</span>
                        </h1>
                    </div>

                    {/* Main Tabs */}
                    <div className={styles.tabsContainer}>
                        <button
                            className={`${styles.tab} ${mainTab === "write" ? styles.tabActive : ""}`}
                            onClick={() => { setMainTab("write"); setEditingArticle(null); }}
                        >
                            <span>Tulis Baru</span>
                        </button>
                        <button
                            className={`${styles.tab} ${mainTab === "manage-articles" ? styles.tabActive : ""}`}
                            onClick={() => setMainTab("manage-articles")}
                        >
                            <span>Kelola Artikel</span>
                        </button>
                        <button
                            className={`${styles.tab} ${mainTab === "categories" ? styles.tabActive : ""}`}
                            onClick={() => setMainTab("categories")}
                        >
                            <span>Kategori</span>
                        </button>
                        <button
                            className={`${styles.tab} ${styles.privateTab} ${mainTab === "private-notes" ? styles.tabActive : ""}`}
                            onClick={() => { setMainTab("private-notes"); setEditingArticle(null); }}
                        >
                            <span>Catatan Pribadi</span>
                        </button>

                    </div>

                    {/* Message Display */}
                    {message && (
                        <div className={styles.message}>{message}</div>
                    )}

                    {/* Write Tab */}
                    {mainTab === "write" && !editingArticle && (
                        <div className={styles.tabContent}>
                                <form onSubmit={handleCreate} className={styles.form}>
                                    <div className={styles.field}>
                                        <label htmlFor="title">Judul</label>
                                        <input
                                            type="text"
                                            id="title"
                                            value={title}
                                            onChange={(e) => setTitle(e.target.value)}
                                            placeholder="Judul artikel"
                                            required
                                        />
                                    </div>

                                    <div className={styles.row}>
                                        <div className={styles.field}>
                                            <label htmlFor="category">Kategori</label>
                                            <input
                                                type="text"
                                                id="category"
                                                value={category}
                                                onChange={(e) => setCategory(e.target.value)}
                                                placeholder="Contoh: Book, TIL, Programming"
                                            />
                                            <span className={styles.fieldHint}>
                                                Ketik kategori bebas. Jika tidak ada, akan dibuat otomatis.
                                            </span>
                                        </div>

                                        <div className={styles.field}>
                                            <label htmlFor="tags">Tags (comma separated)</label>
                                            <input
                                                type="text"
                                                id="tags"
                                                value={tags}
                                                onChange={(e) => setTags(e.target.value)}
                                                placeholder="book-summary, psychology"
                                            />
                                        </div>
                                    </div>

                                    <div className={styles.field}>
                                        <label>Konten</label>
                                        <RichTextEditor
                                            content={content}
                                            onChange={setContent}
                                            placeholder="Mulai menulis artikel..."
                                        />
                                    </div>

                                    <button
                                        type="submit"
                                        className={styles.submit}
                                        disabled={isLoading}
                                    >
                                        <Save size={18} strokeWidth={1.5} />
                                        {isLoading ? "Menyimpan..." : "Simpan & Publish"}
                                    </button>
                                </form>
                            </div>
                    )}

                            {/* Edit Form - Show regardless of tab if editing */}
                            {editingArticle && (
                                <form onSubmit={handleUpdate} className={styles.form}>
                                    <div className={styles.editHeader}>
                                        <h3>Edit Artikel</h3>
                                        <button
                                            type="button"
                                            className={styles.cancelButton}
                                            onClick={() => setEditingArticle(null)}
                                        >
                                            <X size={16} strokeWidth={1.5} />
                                            <span>Batal</span>
                                        </button>
                                    </div>

                                    <div className={styles.field}>
                                        <label htmlFor="editTitle">Judul</label>
                                        <input
                                            type="text"
                                            id="editTitle"
                                            value={editingArticle.title}
                                            onChange={(e) => setEditingArticle({ ...editingArticle, title: e.target.value })}
                                            required
                                        />
                                    </div>

                                    <div className={styles.row}>
                                        <div className={styles.field}>
                                            <label htmlFor="editCategory">Kategori</label>
                                            <input
                                                type="text"
                                                id="editCategory"
                                                value={editingArticle.category}
                                                onChange={(e) => setEditingArticle({ ...editingArticle, category: e.target.value })}
                                            />
                                        </div>

                                        <div className={styles.field}>
                                            <label htmlFor="editTags">Tags (comma separated)</label>
                                            <input
                                                type="text"
                                                id="editTags"
                                                value={editingArticle.tags.join(", ")}
                                                onChange={(e) => setEditingArticle({
                                                    ...editingArticle,
                                                    tags: e.target.value.split(",").map(t => t.trim()).filter(Boolean)
                                                })}
                                            />
                                        </div>
                                    </div>

                                    <div className={styles.field}>
                                        <label>Konten</label>
                                        <RichTextEditor
                                            content={editingArticle.content || ""}
                                            onChange={(newContent) => setEditingArticle({ ...editingArticle, content: newContent })}
                                            placeholder="Edit konten artikel..."
                                        />
                                    </div>

                                    <button
                                        type="submit"
                                        className={styles.submit}
                                        disabled={isLoading}
                                    >
                                        <Save size={18} strokeWidth={1.5} />
                                        {isLoading ? "Menyimpan..." : "Update Artikel"}
                                    </button>
                                </form>
                            )}

                            {/* Article List */}
                            {mainTab === "manage-articles" && !editingArticle && (
                                <div className={styles.articleList}>
                                    {isLoadingArticles ? (
                                        <div className={styles.loading}>Memuat artikel...</div>
                                    ) : articles.length === 0 ? (
                                        <div className={styles.emptyState}>Belum ada artikel</div>
                                    ) : (
                                        <table className={styles.table}>
                                            <thead>
                                                <tr>
                                                    <th>Judul</th>
                                                    <th>Kategori</th>
                                                    <th>Tanggal</th>
                                                    <th>Aksi</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {articles.map((article) => (
                                                    <tr key={article.slug}>
                                                        <td className={styles.titleCell}>{article.title}</td>
                                                        <td>
                                                            <span className={styles.badge}>{article.category}</span>
                                                        </td>
                                                        <td className={styles.dateCell}>{article.date}</td>
                                                        <td className={styles.actionsCell}>
                                                            <button
                                                                className={styles.editButton}
                                                                onClick={() => {
                                                                    handleEdit(article);
                                                                    // We don't need to change tab, editingArticle overrides view
                                                                }}
                                                                title="Edit"
                                                            >
                                                                <Edit size={16} strokeWidth={1.5} />
                                                            </button>
                                                            <button
                                                                className={styles.deleteButton}
                                                                onClick={() => setDeleteConfirm(article)}
                                                                title="Hapus"
                                                            >
                                                                <Trash2 size={16} strokeWidth={1.5} />
                                                            </button>
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    )}
                                </div>
                            )}


                    {/* Categories Tab */}
                    {mainTab === "categories" && (
                        <div className={styles.tabContent}>
                            <div className={styles.infoBox}>
                                <div className={styles.infoIcon}><AlertTriangle size={20} strokeWidth={1.5} /></div>
                                <div>Klik tombol Edit atau Hapus untuk mengelola kategori di semua artikel.</div>
                            </div>
                            {isLoadingCategories ? (
                                <div className={styles.loading}>Memuat kategori...</div>
                            ) : categories.length === 0 ? (
                                <div className={styles.emptyState}>Belum ada kategori</div>
                            ) : (
                                <div className={styles.cardGrid}>
                                    {categories.map((cat) => (
                                        <div key={cat.name} className={styles.card}>
                                            <div className={styles.cardIcon}>📁</div>
                                            <div className={styles.cardName}>{cat.name}</div>
                                            <div className={styles.cardCount}>{cat.count} artikel</div>
                                            <div className={styles.cardActions}>
                                                <button
                                                    className={styles.editButton}
                                                    onClick={() => { setEditingCategory(cat); setNewCategoryName(cat.name); }}
                                                    title="Edit"
                                                >
                                                    <Edit size={16} strokeWidth={1.5} />
                                                </button>
                                                <button
                                                    className={styles.deleteButton}
                                                    onClick={() => setDeleteCategoryConfirm(cat)}
                                                    title="Hapus"
                                                >
                                                    <Trash2 size={16} strokeWidth={1.5} />
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}

                    {/* Private Notes Tab */}
                    {mainTab === "private-notes" && !editingArticle && (
                        <div className={styles.tabContent}>
                            {/* Private area banner */}
                            <div className={styles.privateHeader}>
                                <div className={styles.privateHeaderIcon}>📔</div>
                                <div className={styles.privateHeaderText}>
                                    <h2>Catatan Pribadi</h2>
                                    <p>Tersimpan di folder private — tidak pernah tampil di halaman publik</p>
                                </div>
                            </div>

                            {/* Form: Write / Edit Note */}
                            {isWritingNote ? (
                                <form onSubmit={editingNote ? handleUpdateNote : handleCreateNote} className={styles.form}>
                                    <div className={styles.noteFormHeader}>
                                        <h3>{editingNote ? "✏️ Edit Catatan" : "✍️ Catatan Baru"}</h3>
                                        <button
                                            type="button"
                                            className={styles.cancelButton}
                                            onClick={() => {
                                                setIsWritingNote(false);
                                                setEditingNote(null);
                                                setNoteTitle("");
                                                setNoteMood("");
                                                setNoteContent("");
                                            }}
                                        >
                                            <X size={14} strokeWidth={1.5} />
                                            <span>Batal</span>
                                        </button>
                                    </div>

                                    <div className={styles.field}>
                                        <label htmlFor="noteTitle">Judul</label>
                                        <input
                                            type="text"
                                            id="noteTitle"
                                            value={noteTitle}
                                            onChange={(e) => setNoteTitle(e.target.value)}
                                            placeholder="Judul catatan..."
                                            required
                                            autoFocus
                                        />
                                    </div>

                                    <div className={styles.field}>
                                        <label>Mood</label>
                                        <div className={styles.moodSelector}>
                                            {["😊 Senang", "😌 Tenang", "🤔 Bingung", "😤 Frustrasi", "😔 Sedih", "🔥 Semangat", "💡 Insight", "😴 Lelah"].map((m) => (
                                                <button
                                                    key={m}
                                                    type="button"
                                                    className={`${styles.moodOption} ${noteMood === m ? styles.moodOptionActive : ""}`}
                                                    onClick={() => setNoteMood(noteMood === m ? "" : m)}
                                                >
                                                    {m}
                                                </button>
                                            ))}
                                        </div>
                                    </div>

                                    <div className={styles.field}>
                                        <label>Isi Catatan</label>
                                        <RichTextEditor
                                            content={noteContent}
                                            onChange={setNoteContent}
                                            placeholder="Tulis apa saja di sini..."
                                        />
                                    </div>

                                    <button
                                        type="submit"
                                        className={styles.submitNote}
                                        disabled={isLoading}
                                    >
                                        <Save size={18} strokeWidth={1.5} />
                                        {isLoading ? "Menyimpan..." : (editingNote ? "Perbarui Catatan" : "Simpan Catatan")}
                                    </button>
                                </form>
                            ) : (
                                /* Note List */
                                <div>
                                    <div className={styles.noteFormHeader}>
                                        <h3>📋 Semua Catatan ({notes.length})</h3>
                                        <button
                                            className={styles.newNoteButton}
                                            onClick={() => {
                                                setIsWritingNote(true);
                                                setEditingNote(null);
                                                setNoteTitle("");
                                                setNoteMood("");
                                                setNoteContent("");
                                            }}
                                        >
                                            <Plus size={14} strokeWidth={1.5} />
                                            Tulis Catatan Baru
                                        </button>
                                    </div>

                                    {isLoadingNotes ? (
                                        <div className={styles.loading}>Memuat catatan...</div>
                                    ) : notes.length === 0 ? (
                                        <div className={styles.emptyState}>
                                            <p>Belum ada catatan pribadi.</p>
                                            <p style={{ fontSize: '0.875rem', marginTop: '0.5rem' }}>Klik &quot;Tulis Catatan Baru&quot; untuk mulai.</p>
                                        </div>
                                    ) : (
                                        <div className={styles.noteList}>
                                            {notes.map((note) => (
                                                <div key={note.slug} className={styles.noteCard}>
                                                    <div className={styles.noteCardLeft}>
                                                        <div className={styles.noteCardTitle}>{note.title}</div>
                                                        <div className={styles.noteCardMeta}>
                                                            <span>{note.date}</span>
                                                            {note.mood && (
                                                                <span className={styles.moodBadge}>{note.mood}</span>
                                                            )}
                                                        </div>
                                                    </div>
                                                    <div className={styles.noteCardActions}>
                                                        <button
                                                            className={styles.editButton}
                                                            onClick={() => handleEditNote(note)}
                                                            title="Edit"
                                                        >
                                                            <Edit size={16} strokeWidth={1.5} />
                                                        </button>
                                                        <button
                                                            className={styles.deleteButton}
                                                            onClick={() => setDeleteNoteConfirm(note)}
                                                            title="Hapus"
                                                        >
                                                            <Trash2 size={16} strokeWidth={1.5} />
                                                        </button>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    )}


                    {/* Info Box */}
                    <div className={styles.info}>
                        <p>
                            <strong>Catatan:</strong> Perubahan akan langsung di-commit ke GitHub
                            dan ter-deploy otomatis ke Vercel. Proses deploy membutuhkan
                            waktu ~1-2 menit.
                        </p>
                    </div>
                </div>

                {/* Delete Confirmation Modal */}
                {deleteConfirm && (
                    <div className={styles.modalOverlay}>
                        <div className={styles.modal}>
                            <div className={styles.modalHeader}>
                                <AlertTriangle size={32} strokeWidth={1.5} className={styles.warningIcon} />
                                <h3>Konfirmasi Hapus</h3>
                            </div>
                            <p>Apakah Anda yakin ingin menghapus artikel:</p>
                            <p className={styles.modalTitle}>&ldquo;{deleteConfirm.title}&rdquo;</p>
                            <p className={styles.modalWarning}>Tindakan ini tidak dapat dibatalkan!</p>
                            <div className={styles.modalActions}>
                                <button
                                    className={styles.cancelButton}
                                    onClick={() => setDeleteConfirm(null)}
                                >
                                    Batal
                                </button>
                                <button
                                    className={styles.confirmDeleteButton}
                                    onClick={handleDelete}
                                    disabled={isLoading}
                                >
                                    {isLoading ? "Menghapus..." : "Ya, Hapus"}
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {/* Edit Category Modal */}
                {editingCategory && (
                    <div className={styles.modalOverlay}>
                        <div className={styles.modal}>
                            <h3>✏️ Edit Kategori</h3>
                            <p>Ubah nama kategori &ldquo;{editingCategory.name}&rdquo;</p>
                            <p className={styles.modalHint}>Akan diubah di {editingCategory.count} artikel</p>
                            <input
                                type="text"
                                value={newCategoryName}
                                onChange={(e) => setNewCategoryName(e.target.value)}
                                className={styles.modalInput}
                                placeholder="Nama kategori baru"
                            />
                            <div className={styles.modalActions}>
                                <button
                                    className={styles.cancelButton}
                                    onClick={() => { setEditingCategory(null); setNewCategoryName(""); }}
                                >
                                    Batal
                                </button>
                                <button
                                    className={styles.submit}
                                    onClick={handleRenameCategory}
                                    disabled={isLoading || !newCategoryName.trim()}
                                >
                                    {isLoading ? "Menyimpan..." : "Simpan"}
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {/* Delete Category Confirmation Modal */}
                {deleteCategoryConfirm && (
                    <div className={styles.modalOverlay}>
                        <div className={styles.modal}>
                            <h3>⚠️ Hapus Kategori</h3>
                            <p>Apakah Anda yakin ingin menghapus kategori:</p>
                            <p className={styles.modalTitle}>&ldquo;{deleteCategoryConfirm.name}&rdquo;</p>
                            <p className={styles.modalHint}>{deleteCategoryConfirm.count} artikel akan diubah ke kategori &ldquo;General&rdquo;</p>
                            <div className={styles.modalActions}>
                                <button
                                    className={styles.cancelButton}
                                    onClick={() => setDeleteCategoryConfirm(null)}
                                >
                                    Batal
                                </button>
                                <button
                                    className={styles.confirmDeleteButton}
                                    onClick={handleDeleteCategory}
                                    disabled={isLoading}
                                >
                                    {isLoading ? "Menghapus..." : "Ya, Hapus"}
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {/* Edit Tag Modal */}
                {editingTag && (
                    <div className={styles.modalOverlay}>
                        <div className={styles.modal}>
                            <h3>✏️ Edit Tag</h3>
                            <p>Ubah nama tag &ldquo;{editingTag.name}&rdquo;</p>
                            <p className={styles.modalHint}>Akan diubah di {editingTag.count} artikel</p>
                            <input
                                type="text"
                                value={newTagName}
                                onChange={(e) => setNewTagName(e.target.value)}
                                className={styles.modalInput}
                                placeholder="Nama tag baru"
                            />
                            <div className={styles.modalActions}>
                                <button
                                    className={styles.cancelButton}
                                    onClick={() => { setEditingTag(null); setNewTagName(""); }}
                                >
                                    Batal
                                </button>
                                <button
                                    className={styles.submit}
                                    onClick={handleRenameTag}
                                    disabled={isLoading || !newTagName.trim()}
                                >
                                    {isLoading ? "Menyimpan..." : "Simpan"}
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {/* Delete Tag Confirmation Modal */}
                {deleteTagConfirm && (
                    <div className={styles.modalOverlay}>
                        <div className={styles.modal}>
                            <h3>⚠️ Hapus Tag</h3>
                            <p>Apakah Anda yakin ingin menghapus tag:</p>
                            <p className={styles.modalTitle}>&ldquo;{deleteTagConfirm.name}&rdquo;</p>
                            <p className={styles.modalHint}>Tag akan dihapus dari {deleteTagConfirm.count} artikel</p>
                            <div className={styles.modalActions}>
                                <button
                                    className={styles.cancelButton}
                                    onClick={() => setDeleteTagConfirm(null)}
                                >
                                    Batal
                                </button>
                                <button
                                    className={styles.confirmDeleteButton}
                                    onClick={handleDeleteTag}
                                    disabled={isLoading}
                                >
                                    {isLoading ? "Menghapus..." : "Ya, Hapus"}
                                </button>
                            </div>
                        </div>
                    </div>
                )}
                {/* Delete Note Confirmation Modal */}
                {deleteNoteConfirm && (
                    <div className={styles.modalOverlay}>
                        <div className={styles.modal}>
                            <div className={styles.modalHeader}>
                                <AlertTriangle size={32} strokeWidth={1.5} className={styles.warningIcon} />
                                <h3>Hapus Catatan?</h3>
                            </div>
                            <p>Apakah kamu yakin ingin menghapus:</p>
                            <p className={styles.modalTitle}>&ldquo;{deleteNoteConfirm.title}&rdquo;</p>
                            <p className={styles.modalWarning}>Tindakan ini tidak dapat dibatalkan!</p>
                            <div className={styles.modalActions}>
                                <button
                                    className={styles.cancelButton}
                                    onClick={() => setDeleteNoteConfirm(null)}
                                >
                                    Batal
                                </button>
                                <button
                                    className={styles.confirmDeleteButton}
                                    onClick={handleDeleteNote}
                                    disabled={isLoading}
                                >
                                    {isLoading ? "Menghapus..." : "Ya, Hapus"}
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </main>
        </>
    );
}
