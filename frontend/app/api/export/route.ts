import { NextResponse } from 'next/server';
import puppeteer from 'puppeteer';

export async function POST(req: Request) {
    try {
        const { html, width, height, theme, styles } = await req.json();

        if (!html) {
            return NextResponse.json(
                { error: 'Missing HTML content' },
                { status: 400 }
            );
        }

        const browser = await puppeteer.launch({
            headless: true,
            executablePath: process.env.PUPPETEER_EXECUTABLE_PATH || undefined,
            args: [
                '--no-sandbox',
                '--disable-setuid-sandbox',
                '--disable-dev-shm-usage'
            ]
        });

        const page = await browser.newPage();

        const padding = 20;
        await page.setViewport({
            width: Math.round(width + (padding * 2)),
            height: Math.round(height + (padding * 2)),
            deviceScaleFactor: 2,
        });

        const fullContent = `
            <!DOCTYPE html>
            <html class="${theme}">
            <head>
                <meta charset="UTF-8">
                <style>
                    /* Reset defaults to ensure consistent rendering */
                    body { 
                        margin: 0; 
                        padding: ${padding}px; 
                        box-sizing: border-box; 
                        font-family: sans-serif; 
                        background-color: ${theme === 'dark' ? '#020817' : '#ffffff'};
                        color: ${theme === 'dark' ? '#f8fafc' : '#020817'};
                    }
                    *, *:before, *:after { box-sizing: inherit; }
                    
                    /* Inject captured styles from the client */
                    ${styles}
                </style>
            </head>
            <body>
                <div id="export-container" style="display: inline-block; width: 100%; height: 100%;">
                    ${html}
                </div>
            </body>
            </html>
        `;

        await page.setContent(fullContent, {
            waitUntil: 'networkidle0',
            timeout: 30000
        });

        const buffer = await page.screenshot({
            type: 'png',
            fullPage: true,
            omitBackground: false
        });

        await browser.close();

        return new NextResponse(buffer as any, {
            headers: {
                'Content-Type': 'image/png',
                'Content-Disposition': 'attachment; filename="dashboard-export.png"'
            }
        });

    } catch (error) {
        console.error('Puppeteer Export Error:', error);
        return NextResponse.json(
            { error: 'Failed to generate image', details: error instanceof Error ? error.message : String(error) },
            { status: 500 }
        );
    }
}
