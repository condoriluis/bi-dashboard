import { toast } from 'sonner';

function getPageStyles(): string {
    let css = '';
    try {

        for (let i = 0; i < document.styleSheets.length; i++) {
            const sheet = document.styleSheets[i];
            try {
                const rules = sheet.cssRules;
                for (let j = 0; j < rules.length; j++) {
                    css += rules[j].cssText + '\n';
                }
            } catch (e) {

                if (sheet.href) {
                    console.warn('Skipping CORS protected stylesheet:', sheet.href);
                }
            }
        }

        document.querySelectorAll('style').forEach(style => {
            css += style.innerHTML + '\n';
        });

    } catch (e) {
        console.warn('Error collecting page styles:', e);
    }
    return css;
}

async function getSerializedHTML(element: HTMLElement): Promise<string> {
    const clone = element.cloneNode(true) as HTMLElement;

    const originalCanvases = Array.from(element.querySelectorAll('canvas'));
    const clonedCanvases = Array.from(clone.querySelectorAll('canvas'));

    for (let i = 0; i < originalCanvases.length; i++) {
        const original = originalCanvases[i];
        const cloned = clonedCanvases[i];

        try {

            const dataUrl = original.toDataURL();
            const img = document.createElement('img');
            img.src = dataUrl;
            img.className = original.className;
            img.style.cssText = original.style.cssText;

            cloned.parentNode?.replaceChild(img, cloned);
        } catch (e) {
            console.warn('Failed to serialize canvas:', e);
        }
    }

    clone.querySelectorAll('.hide-on-export').forEach(el => el.remove());

    return clone.outerHTML;
}

export async function exportDashboardToPNG(
    elementId: string,
    fileName: string = 'dashboard'
): Promise<void> {
    let loadingToast: string | number | undefined;

    try {
        const element = document.getElementById(elementId);
        if (!element) throw new Error('Dashboard element not found');

        loadingToast = toast.loading('Generando exportación de alta fidelidad...');

        const rect = element.getBoundingClientRect();
        const width = rect.width;
        const height = rect.height;

        const html = await getSerializedHTML(element);
        const styles = getPageStyles();
        const isDark = document.documentElement.classList.contains('dark');

        const response = await fetch('/api/export', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                html,
                styles,
                width,
                height,
                theme: isDark ? 'dark' : 'light'
            })
        });

        if (!response.ok) {
            const err = await response.json();
            throw new Error(err.details || 'Export failed on server');
        }

        const blob = await response.blob();
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
        link.download = `${fileName}_${timestamp}.png`;
        link.href = url;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);

        toast.dismiss(loadingToast);
        toast.success('Dashboard exportado con éxito');

    } catch (error) {
        console.error('Export error:', error);
        toast.dismiss(loadingToast);
        toast.error('Error al exportar dashboard', {
            description: error instanceof Error ? error.message : 'Error desconocido'
        });
    }
}

export function isExportSupported(): boolean {
    return true;
}
