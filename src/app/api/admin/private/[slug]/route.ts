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

interface RouteParams {
    params: Promise<{ slug: string }>;
}

// GET - Get single private note by slug
export async function GET(request: NextRequest, { params }: RouteParams) {
    try {
        const { slug } = await params;
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

        const filePath = `private/${slug}.md`;
        const response = await fetch(
            `https://api.github.com/repos/${owner}/${repo}/contents/${filePath}`,
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
                return NextResponse.json(
                    { error: 'Note not found' },
                    { status: 404 }
                );
            }
            throw new Error('Failed to fetch private note');
        }

        const data = await response.json();
        const rawContent = Buffer.from(data.content, 'base64').toString('utf-8');

        // Parse frontmatter and content
        const frontmatterMatch = rawContent.match(/^---\n([\s\S]*?)\n---\n\n?([\s\S]*)$/);
        if (!frontmatterMatch) {
            return NextResponse.json(
                { error: 'Invalid note format' },
                { status: 400 }
            );
        }

        const frontmatter = frontmatterMatch[1];
        const noteContent = frontmatterMatch[2];

        const titleMatch = frontmatter.match(/title:\s*"?([^"\n]+)"?/);
        const dateMatch = frontmatter.match(/date:\s*(\S+)/);
        const moodMatch = frontmatter.match(/mood:\s*(.+)/);

        return NextResponse.json({
            slug,
            sha: data.sha,
            title: titleMatch ? titleMatch[1].trim() : slug,
            date: dateMatch ? dateMatch[1] : 'Unknown',
            mood: moodMatch ? moodMatch[1].trim() : '',
            content: noteContent,
        });
    } catch (error) {
        console.error('Error fetching private note:', error);
        return NextResponse.json(
            { error: 'Failed to fetch private note' },
            { status: 500 }
        );
    }
}

// PUT - Update private note
export async function PUT(request: NextRequest, { params }: RouteParams) {
    try {
        const { slug } = await params;
        const body = await request.json();
        const { title, mood, content, password, sha } = body;

        if (!password || !verifyPassword(password)) {
            return NextResponse.json(
                { error: 'Unauthorized' },
                { status: 401 }
            );
        }

        if (!title || !content || !sha) {
            return NextResponse.json(
                { error: 'Title, content and sha are required' },
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

        // Get current file to preserve original date
        const currentResponse = await fetch(
            `https://api.github.com/repos/${owner}/${repo}/contents/private/${slug}.md`,
            {
                headers: {
                    'Authorization': `token ${token}`,
                    'Accept': 'application/vnd.github.v3+json',
                },
            }
        );

        let originalDate = new Date().toISOString().split('T')[0];
        if (currentResponse.ok) {
            const currentData = await currentResponse.json();
            const currentContent = Buffer.from(currentData.content, 'base64').toString('utf-8');
            const dateMatch = currentContent.match(/date:\s*(\S+)/);
            if (dateMatch) {
                originalDate = dateMatch[1];
            }
        }

        const sanitizedTitle = title.replace(/"/g, "'");

        const frontmatter = `---
title: "${sanitizedTitle}"
date: ${originalDate}
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
                    message: `Update private note: ${title}`,
                    content: fileContent,
                    sha: sha,
                    branch: 'main',
                }),
            }
        );

        if (!response.ok) {
            const error = await response.json();
            console.error('GitHub API error:', error);
            return NextResponse.json(
                { error: 'Failed to update note on GitHub' },
                { status: 500 }
            );
        }

        return NextResponse.json({
            success: true,
            message: 'Catatan berhasil diperbarui!',
        });
    } catch (error) {
        console.error('Error updating private note:', error);
        return NextResponse.json(
            { error: 'Failed to update private note' },
            { status: 500 }
        );
    }
}

// DELETE - Delete private note
export async function DELETE(request: NextRequest, { params }: RouteParams) {
    try {
        const { slug } = await params;
        const body = await request.json();
        const { password, sha } = body;

        if (!password || !verifyPassword(password)) {
            return NextResponse.json(
                { error: 'Unauthorized' },
                { status: 401 }
            );
        }

        if (!sha) {
            return NextResponse.json(
                { error: 'SHA is required' },
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

        const filePath = `private/${slug}.md`;

        const response = await fetch(
            `https://api.github.com/repos/${owner}/${repo}/contents/${filePath}`,
            {
                method: 'DELETE',
                headers: {
                    'Authorization': `token ${token}`,
                    'Content-Type': 'application/json',
                    'Accept': 'application/vnd.github.v3+json',
                },
                body: JSON.stringify({
                    message: `Delete private note: ${slug}`,
                    sha: sha,
                    branch: 'main',
                }),
            }
        );

        if (!response.ok) {
            const error = await response.json();
            console.error('GitHub API error:', error);
            return NextResponse.json(
                { error: 'Failed to delete note on GitHub' },
                { status: 500 }
            );
        }

        return NextResponse.json({
            success: true,
            message: 'Catatan berhasil dihapus!',
        });
    } catch (error) {
        console.error('Error deleting private note:', error);
        return NextResponse.json(
            { error: 'Failed to delete private note' },
            { status: 500 }
        );
    }
}
