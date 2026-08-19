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
    params: Promise<{ name: string }>;
}

// PUT - Rename category (update all articles using this category)
export async function PUT(request: NextRequest, { params }: RouteParams) {
    try {
        const { name: oldName } = await params;
        const body = await request.json();
        const { newName, password } = body;

        if (!password || !verifyPassword(password)) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        if (!newName) {
            return NextResponse.json({ error: 'New name is required' }, { status: 400 });
        }

        const { token, owner, repo } = getGitHubConfig();

        if (!token) {
            return NextResponse.json({ error: 'GitHub token not configured' }, { status: 500 });
        }

        // Get all files in content directory
        const filesResponse = await fetch(
            `https://api.github.com/repos/${owner}/${repo}/contents/content`,
            {
                headers: {
                    'Authorization': `token ${token}`,
                    'Accept': 'application/vnd.github.v3+json',
                },
            }
        );

        if (!filesResponse.ok) {
            throw new Error('Failed to fetch files');
        }

        const files = await filesResponse.json();
        const mdFiles = files.filter((f: { name: string }) => f.name.endsWith('.md'));

        let updatedCount = 0;

        // Update each file that has this category
        for (const file of mdFiles) {
            const fileResponse = await fetch(
                `https://api.github.com/repos/${owner}/${repo}/contents/content/${file.name}`,
                {
                    headers: {
                        'Authorization': `token ${token}`,
                        'Accept': 'application/vnd.github.v3+json',
                    },
                }
            );

            if (!fileResponse.ok) continue;

            const fileData = await fileResponse.json();
            const content = Buffer.from(fileData.content, 'base64').toString('utf-8');

            // Check if this file has the old category
            const categoryMatch = content.match(/^category:\s*(.+)$/m);
            if (!categoryMatch || categoryMatch[1].trim() !== decodeURIComponent(oldName)) {
                continue;
            }

            // Replace category
            const newContent = content.replace(
                /^category:\s*.+$/m,
                `category: ${newName}`
            );

            // Update file on GitHub
            await fetch(
                `https://api.github.com/repos/${owner}/${repo}/contents/content/${file.name}`,
                {
                    method: 'PUT',
                    headers: {
                        'Authorization': `token ${token}`,
                        'Content-Type': 'application/json',
                        'Accept': 'application/vnd.github.v3+json',
                    },
                    body: JSON.stringify({
                        message: `Rename category: ${decodeURIComponent(oldName)} → ${newName}`,
                        content: Buffer.from(newContent).toString('base64'),
                        sha: fileData.sha,
                        branch: 'main',
                    }),
                }
            );

            updatedCount++;
        }

        return NextResponse.json({
            success: true,
            message: `Category renamed. ${updatedCount} article(s) updated.`,
        });
    } catch (error) {
        console.error('Error renaming category:', error);
        return NextResponse.json({ error: 'Failed to rename category' }, { status: 500 });
    }
}

// DELETE - Remove category (set to "General" for all articles)
export async function DELETE(request: NextRequest, { params }: RouteParams) {
    try {
        const { name: categoryName } = await params;
        const body = await request.json();
        const { password } = body;

        if (!password || !verifyPassword(password)) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { token, owner, repo } = getGitHubConfig();

        if (!token) {
            return NextResponse.json({ error: 'GitHub token not configured' }, { status: 500 });
        }

        // Get all files in content directory
        const filesResponse = await fetch(
            `https://api.github.com/repos/${owner}/${repo}/contents/content`,
            {
                headers: {
                    'Authorization': `token ${token}`,
                    'Accept': 'application/vnd.github.v3+json',
                },
            }
        );

        if (!filesResponse.ok) {
            throw new Error('Failed to fetch files');
        }

        const files = await filesResponse.json();
        const mdFiles = files.filter((f: { name: string }) => f.name.endsWith('.md'));

        let updatedCount = 0;

        // Update each file that has this category
        for (const file of mdFiles) {
            const fileResponse = await fetch(
                `https://api.github.com/repos/${owner}/${repo}/contents/content/${file.name}`,
                {
                    headers: {
                        'Authorization': `token ${token}`,
                        'Accept': 'application/vnd.github.v3+json',
                    },
                }
            );

            if (!fileResponse.ok) continue;

            const fileData = await fileResponse.json();
            const content = Buffer.from(fileData.content, 'base64').toString('utf-8');

            // Check if this file has this category
            const categoryMatch = content.match(/^category:\s*(.+)$/m);
            if (!categoryMatch || categoryMatch[1].trim() !== decodeURIComponent(categoryName)) {
                continue;
            }

            // Replace category with "General"
            const newContent = content.replace(
                /^category:\s*.+$/m,
                `category: General`
            );

            // Update file on GitHub
            await fetch(
                `https://api.github.com/repos/${owner}/${repo}/contents/content/${file.name}`,
                {
                    method: 'PUT',
                    headers: {
                        'Authorization': `token ${token}`,
                        'Content-Type': 'application/json',
                        'Accept': 'application/vnd.github.v3+json',
                    },
                    body: JSON.stringify({
                        message: `Remove category: ${decodeURIComponent(categoryName)} → General`,
                        content: Buffer.from(newContent).toString('base64'),
                        sha: fileData.sha,
                        branch: 'main',
                    }),
                }
            );

            updatedCount++;
        }

        return NextResponse.json({
            success: true,
            message: `Category deleted. ${updatedCount} article(s) set to "General".`,
        });
    } catch (error) {
        console.error('Error deleting category:', error);
        return NextResponse.json({ error: 'Failed to delete category' }, { status: 500 });
    }
}
