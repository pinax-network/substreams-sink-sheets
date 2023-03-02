import fs from "fs";
import { Credentials, ServiceCredentials } from "../src/auth";

export async function parseServiceCredentials(json_file_url: string): Promise<ServiceCredentials> {
    // handle as URL
    if ( json_file_url.match(/https?:\/\//) ) {
        const response = await fetch(json_file_url)
        return await response.json()
    // handle as file
    } else {
        if ( fs.existsSync(json_file_url) === false ) throw new Error(`Credentials file not found: ${json_file_url}`)

        try {
            return JSON.parse(fs.readFileSync(json_file_url, {encoding: 'utf-8'}))
        } catch (e) {
            throw new Error(`Error parsing credentials file: ${json_file_url}`)
        }
    }
}

export async function handleCredentials(options: any): Promise<Credentials> {
    let credentials: Credentials = {
        access_token: options.accessToken,
        refresh_token: options.refreshToken,
    }
    if ( options.serviceAccountFile ) {
        credentials = await parseServiceCredentials(options.serviceAccountFile);
    }
    return credentials;
}