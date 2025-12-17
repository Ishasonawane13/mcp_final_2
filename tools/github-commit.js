import { Octokit } from "@octokit/rest";
import fs from "fs"
import path from "path"

export async function autoCommitAndPush(params) {
    if (!process.env.GITHUB_TOKEN) {
        throw new Error("GITHUB_TOKEN not set in environment");
    }

    const octokit = new Octokit({
        auth: process.env.GITHUB_TOKEN,
    });

    const { localPath, repo: repoName, branch: branchName, mess = null } = params;
    const owner = "Ishasonawane13"
    const repo = repoName;
    const branch = branchName;

    try {
        if (!fs.existsSync(localPath)) {
            throw new Error(`file path does not exists`)
        }
        const message = mess || `Auto commit on ${new Date().toISOString()}`;
        const files = getAllFiles(localPath);
        if (files.length === 0) {
            throw new Error(`Files does not exist`)
        }
        const { data: refData } = await octokit.rest.git.getRef({
            owner,
            repo,
            ref: `heads/${branch}`,
        })

        const currentCommitSha = refData.object.sha;

        const { data: commitData } = await octokit.rest.git.getCommit({
            owner,
            repo,
            commit_sha: currentCommitSha
        })

        const baseTreeSha = commitData.tree.sha;
        const blobShas = [];
        for (let i = 0; i < files.length; i++) {
            const file = files[i];
            const content = fs.readFileSync(file.path);
            const { data: blob } = await octokit.rest.git.createBlob({
                owner,
                repo,
                content: content.toString('base64'),
                encoding: 'base64'
            })
            blobShas.push({
                path: file.relativePath,
                mode: '100644',
                type: 'blob',
                sha: blob.sha
            });
            if ((i + 1) % 10 === 0 || i === files.length - 1) {
                console.log(`  Uploaded ${i + 1}/${files.length} files`);
            }
        }
        const { data: newTree } = await octokit.rest.git.createTree({
            owner,
            repo,
            tree: blobShas,
            base_tree: baseTreeSha
        })
        const { data: newCommit } = await octokit.rest.git.createCommit({
            owner,
            repo,
            message: message,
            tree: newTree.sha,
            parents: [currentCommitSha]
        })

        await octokit.rest.git.updateRef({
            owner,
            repo,
            ref: `heads/${branch}`,
            sha: newCommit.sha
        })

        return {
            success: true,
            sha: newCommit.sha,
            message: message
        }

    } catch (error) {
        if (error.status === 401) {
            console.error("Invalid token");
        } else if (error.status === 404) {
            console.error("Repo or branch not found");
        } else {
            console.error("Commit failed:", error.message || error);
        }
        throw error;
    }
}

function getAllFiles(dirPath, arrayOfFiles = [], basePath = dirPath) {
    try {
        const files = fs.readdirSync(dirPath);
        // Files/folders to ignore
        const ignoreList = [
            '.git',
            'node_modules',
            '.DS_Store',
            'dist',
            'build',
            '.env',
            '.env.local',
            'package-lock.json',
            'yarn.lock',
            'pnpm-lock.yaml'
        ];

        files.forEach(
            (file) => {
                if (ignoreList.includes(file)) {
                    return;
                }
                const filePath = path.join(dirPath, file)
                if (fs.statSync(filePath).isDirectory()) {
                    arrayOfFiles = getAllFiles(filePath, arrayOfFiles, basePath);
                } else {
                    arrayOfFiles.push({
                        path: filePath,
                        relativePath: path.relative(basePath, filePath).replace(/\\/g, "/")
                    })
                }
            }
        )
        return arrayOfFiles;

    } catch (error) {
        console.error("Error reading files:", error);
        throw error;
    }
}

// Note: removed auto-run to avoid unintended commits when the module loads.
