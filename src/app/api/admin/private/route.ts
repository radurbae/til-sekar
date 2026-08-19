import { NextRequest, NextResponse } from 'next/server';

// Helper to verify password
function verifyPassword(password: string): boolean {
    return password === (process.env.ADMIN_PASSWORD || 'savinasekardita');
}

// Helper to get GitHub config
function getGitHubConfig() {
    return {
        token: process.env.GITHUB_TOKEN,
        owner: process.env.GITHUB_REPO_OWNER || 'radurbae',
        repo: process.env.GITHUB_REPO_NAME || 'til_rads',
    };
}

// GET - List all private notes
export async function GET(request: NextRequest) {
    try {
        const password = request.headers.get('x-admin-password');

        if (!password || !verifyPassword(password)) {
            return NextResponse.json(
                { error: 'Unauthorized' },
                { status: 401 }
            );
        }

        const { token, owner, repo } = getGitHubConfig();

        if (!token) {
            return NextResponse.json(
                { error: 'GitHub token not configured' },
                { status: 500 }
            );
        }

        // Get all files in private directory
        const response = await fetch(
            `https://api.github.com/repos/${owner}/${repo}/contents/private`,
            {
                headers: {
                    'Authorization': `token ${token}`,
                    'Accept': 'application/vnd.github.v3+json',
                },
                cache: 'no-store',
            }
        );

        if (!response.ok) {
            if (response.status === 404) {
                // Directory doesn't exist yet, return empty list
                return NextResponse.json({ notes: [] });
            }
            throw new Error('Failed to fetch private notes from GitHub');
        }

        const files = await response.json();

        // Filter only .md files and fetch their content
        const mdFiles = files.filter((f: { name: string }) => f.name.endsWith('.md'));

        const notes = await Promise.all(
            mdFiles.map(async (file: { name: string; sha: string; download_url: string }) => {
                const contentResponse = await fetch(file.download_url, { cache: 'no-store' });
                const content = await contentResponse.text();

                // Parse frontmatter
                const frontmatterMatch = content.match(/^---\n([\s\S]*?)\n---/);
                if (!frontmatterMatch) {
                    return null;
                }

                const frontmatter = frontmatterMatch[1];
                const titleMatch = frontmatter.match(/title:\s*"?([^"\n]+)"?/);
                const dateMatch = frontmatter.match(/date:\s*(\S+)/);
                const moodMatch = frontmatter.match(/mood:\s*(.+)/);

                return {
                    slug: file.name.replace('.md', ''),
                    sha: file.sha,
                    title: titleMatch ? titleMatch[1].trim() : file.name.replace('.md', ''),
                    date: dateMatch ? dateMatch[1] : 'Unknown',
                    mood: moodMatch ? moodMatch[1].trim() : '',
                };
            })
        );

        // Filter nulls and sort by date (newest first)
        const validNotes = notes
            .filter(Boolean)
            .sort((a, b) => new Date(b!.date).getTime() - new Date(a!.date).getTime());

        return NextResponse.json({ notes: validNotes });
    } catch (error) {
        console.error('Error fetching private notes:', error);
        return NextResponse.json(
            { error: 'Failed to fetch private notes' },
            { status: 500 }
        );
    }
}

// POST - Create a new private note
export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { title, mood, content, password } = body;

        if (!password || !verifyPassword(password)) {
            return NextResponse.json(
                { error: 'Unauthorized' },
                { status: 401 }
            );
        }

        if (!title || !content) {
            return NextResponse.json(
                { error: 'Title and content are required' },
                { status: 400 }
            );
        }

        const { token, owner, repo } = getGitHubConfig();

        if (!token) {
            return NextResponse.json(
                { error: 'GitHub token not configured' },
                { status: 500 }
            );
        }

        // Create slug from title + timestamp to avoid collisions
        const baseSlug = title
            .toLowerCase()
            .replace(/[^a-z0-9\s-]/g, '')
            .replace(/\s+/g, '-')
            .replace(/-+/g, '-')
            .trim();
        const timestamp = Date.now();
        const slug = `${baseSlug}-${timestamp}`;

        // Format date
        const date = new Date().toISOString().split('T')[0];

        // Sanitize title
        const sanitizedTitle = title.replace(/"/g, "'");

        // Create frontmatter
        const frontmatter = `---
title: "${sanitizedTitle}"
date: ${date}
mood: ${mood || ''}
private: true
---

${content}`;

        const filePath = `private/${slug}.md`;
        const fileContent = Buffer.from(frontmatter).toString('base64');

        const response = await fetch(
            `https://api.github.com/repos/${owner}/${repo}/contents/${filePath}`,
            {
                method: 'PUT',
                headers: {
                    'Authorization': `token ${token}`,
                    'Content-Type': 'application/json',
                    'Accept': 'application/vnd.github.v3+json',
                },
                body: JSON.stringify({
                    message: `Add private note: ${title}`,
                    content: fileContent,
                    branch: 'main',
                }),
            }
        );

        if (!response.ok) {
            const error = await response.json();
            console.error('GitHub API error:', error);
            return NextResponse.json(
                { error: 'Failed to create note on GitHub' },
                { status: 500 }
            );
        }

        return NextResponse.json({
            success: true,
            slug,
            message: 'Catatan pribadi berhasil disimpan!',
        });
    } catch (error) {
        console.error('Private note API error:', error);
        return NextResponse.json(
            { error: 'Failed to create private note' },
            { status: 500 }
        );
    }
}
