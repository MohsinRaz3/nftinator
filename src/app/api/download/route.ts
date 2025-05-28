import fs from 'fs';
import path from 'path';
import https from 'https';
import http from 'http';

const baseUrl = "https://gateway.pinit.io/ipfs/QmRYQaQR1gyAukfrUP386yx2PaR3xkaz4bnPWPGj2qknRk";

function  downloadFile(url: string, outputPath: string) {
    return new Promise((resolve, reject) => {
        const protocol = url.startsWith('https:') ? https : http;
        
        const request = protocol.get(url, { timeout: 10000 }, (response) => {
            if (response.statusCode === 200) {
                let data = '';
                
                response.on('data', (chunk) => {
                    data += chunk;
                });
                
                response.on('end', () => {
                    fs.writeFile(outputPath, data, 'utf8', (err) => {
                        if (err) {
                            reject(err);
                        } else {
                            resolve({ success: true, data });
                        }
                    });
                });
            } else {
                resolve({ success: false, statusCode: response.statusCode });
            }
        });
        
        request.on('error', (error) => {
            reject(error);
        });
        
        request.on('timeout', () => {
            request.destroy();
            reject(new Error('Request timeout'));
        });
    });
}

function sleep(ms: number) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

export async function POST(request: Request) {
    try {
        const { start = 0, end = 100, delay = 100 } = await request.json();

        if (start > end) {
            return Response.json({ error: 'Start must be less than or equal to end' }, { status: 400 });
        }

        const outputDir = path.join(process.cwd(), 'public', 'downloads', 'ipfs_json_files');
        
        if (!fs.existsSync(outputDir)) {
            fs.mkdirSync(outputDir, { recursive: true });
        }

        const results = [];
        const total = end - start + 1;
        
        for (let i = start; i <= end; i++) {
            const fileName = `${i}.json`;
            const fileUrl = `${baseUrl}/${fileName}`;
            const outputPath = path.join(outputDir, fileName);
            
            try {
                const result = await downloadFile(fileUrl, outputPath);
                
                if (result && typeof result === 'object' && 'success' in result) {
                    results.push({ 
                        fileName,
                        status: 'success',
                        progress: Math.round(((i - start + 1) / total) * 100)
                    });
                } else {
                    results.push({ 
                        fileName, 
                        status: 'failed', 
                        statusCode: result.statusCode || 'Unknown error',
                        progress: Math.round(((i - start + 1) / total) * 100)
                    });
                }
            } catch (error) {
                results.push({ 
                    fileName, 
                    status: 'error', 
                    error: error instanceof Error ? error.message : 'Unknown error',
                    progress: Math.round(((i - start + 1) / total) * 100)
                });
            }
            
            if (delay > 0 && i < end) {
                await sleep(delay);
            }
        }
        
        return Response.json({ 
            success: true,
            message: 'Download complete', 
            results,
            downloadPath: '/downloads/ipfs_json_files/'
        });
    } catch (error) {
        return Response.json({ error: 'Server error: ' + (error instanceof Error ? error.message : 'Unknown error') }, { status: 500 });
    }
}
