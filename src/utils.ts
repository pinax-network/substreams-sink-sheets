import * as fs from 'fs'

export function readFileSync(filepath: string): string {
    if ( !filepath ) throw new Error(`[${filepath}] file not found`);
    try {
        return fs.readFileSync(filepath, 'utf-8');
    } catch (e) {
        throw new Error('error reading file');
    }
}

export function timeout(ms: number) {
    return new Promise(resolve => setTimeout(resolve, ms));
}