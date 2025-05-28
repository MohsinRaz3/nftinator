import fs from 'fs';
import path from 'path';
import archiver from 'archiver';

export async function GET() {
    try {
        const downloadsDir = path.join(process.cwd(), 'public', 'downloads', 'ipfs_json_files');
        
        if (!fs.existsSync(downloadsDir)) {
            return Response.json({ error: 'No files found to zip' }, { status: 404 });
        }

        const files = fs.readdirSync(downloadsDir).filter(file => file.endsWith('.json'));
        
        if (files.length === 0) {
            return Response.json({ error: 'No JSON files found to zip' }, { status: 404 });
        }

        // Create zip file
        const zipPath = path.join(process.cwd(), 'public', 'downloads', 'ipfs_files.zip');
        const output = fs.createWriteStream(zipPath);
        const archive = archiver('zip', { zlib: { level: 9 } });

        return new Promise((resolve, reject) => {
            output.on('close', () => {
                const zipBuffer = fs.readFileSync(zipPath);
                fs.unlinkSync(zipPath); // Clean up temp file
                
                resolve(new Response(zipBuffer, {
                    headers: {
                        'Content-Type': 'application/zip',
                        'Content-Disposition': 'attachment; filename="ipfs_files.zip"'
                    }
                }));
            });

            archive.on('error', (err) => {
                reject(Response.json({ error: 'Failed to create zip' }, { status: 500 }));
            });

            archive.pipe(output);

            files.forEach(file => {
                const filePath = path.join(downloadsDir, file);
                archive.file(filePath, { name: file });
            });

            archive.finalize();
        });
    } catch (error) {
        return Response.json({ error: 'Server error: ' + error.message }, { status: 500 });
    }
}