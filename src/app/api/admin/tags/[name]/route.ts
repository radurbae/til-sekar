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

// PUT - Rename tag (update all articles using this tag)
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
        const decodedOldName = decodeURIComponent(oldName);

        // Update each file that has this tag
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

            // Check if this file has the old tag
            const tagPattern = new RegExp(`^\\s+-\\s+${decodedOldName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s*$`, 'm');
            if (!tagPattern.test(content)) {
                continue;
            }

            // Replace tag
            const newContent = content.replace(tagPattern, `  - ${newName}`);

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
                        message: `Rename tag: ${decodedOldName} → ${newName}`,
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
            message: `Tag renamed. ${updatedCount} article(s) updated.`,
        });
    } catch (error) {
        console.error('Error renaming tag:', error);
        return NextResponse.json({ error: 'Failed to rename tag' }, { status: 500 });
    }
}

// DELETE - Remove tag from all articles
export async function DELETE(request: NextRequest, { params }: RouteParams) {
    try {
        const { name: tagName } = await params;
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
        const decodedTagName = decodeURIComponent(tagName);

        // Update each file that has this tag
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

            // Check if this file has this tag
            const tagPattern = new RegExp(`^\\s+-\\s+${decodedTagName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s*$`, 'm');
            if (!tagPattern.test(content)) {
                continue;
            }

            // Remove the tag line
            const newContent = content.replace(tagPattern, '').replace(/\n\n+/g, '\n\n');

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
                        message: `Remove tag: ${decodedTagName}`,
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
            message: `Tag deleted from ${updatedCount} article(s).`,
        });
    } catch (error) {
        console.error('Error deleting tag:', error);
        return NextResponse.json({ error: 'Failed to delete tag' }, { status: 500 });
    }
}
