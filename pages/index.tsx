import { useSession, signIn, signOut } from 'next-auth/react'
import { useEffect } from 'react'

export function StartStreamingForm() {
    const handleSubmit = async ( event ) => {
        event.preventDefault()
        const data = {
            spkg: event.target['package-file'].value,
            spreadsheetId: event.target['spreadsheet-id'].value,
            args: {
                substreamsEndpoint: event.target['substream-endpoint'].value,
                startBlock: event.target['starting-block'].value,
                stopBlock: event.target['ending-block'].value,
                columns: event.target['columns'].value.split(','),
                range: event.target['spreadsheet-range'].value,
                addHeaderRow: event.target['header-row'].checked,
                outputModule: event.target['output-module'].value,
            }
        }

        const options = {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(data),
        }

        const response = await fetch('/api/run', options)
        const result = await response.json()

        console.log(`Result: ${result}`)
    }

    return (
        <form onSubmit={handleSubmit}>
            <label htmlFor="package-file">Package file location</label>
            <input id="package-file" name="package-file" type="text" placeholder="https://github.com/pinax-network/substreams/releases/download/eosio.token-v0.4.2/eosio-token-v0.4.2.spkg" title="URL or IPFS hash or local file." required="required"/>

            <label htmlFor="spreadsheet-id">Spreadsheet identifier</label>
            <input id="spreadsheet-id" name="spreadsheet-id" type="text" placeholder="1mm1t9-bvviKUxOdyiA6uYKmWnS4e_JaldmO3qFuomSY" title="Found in the URL of the Google Sheet (e.g https://docs.google.com/spreadsheets/d/{ID}/edit)." required="required"/>

            <label htmlFor="output-module">Output module</label>
            <select id="output-module" name="output-module">
                <option value="db_out">db_out</option>
            </select>

            <label htmlFor="substream-endpoint">Substream endpoint</label>
            <input id="substream-endpoint" name="substream-endpoint" type="text" defaultValue="eos.firehose.eosnation.io:9001" title="The endpoint running the chosen substream."/>

            <label htmlFor="starting-block">Starting block</label>
            <input id="starting-block" name="starting-block" type="number" defaultValue="295690000" title="First block for the streamed data."/>

            <label htmlFor="ending-block">Ending block</label>
            <input id="ending-block" name="ending-block" type="text" placeholder="295690000, +5, ..." defaultValue="+10" title="Last block for the streamed data. Leave empty for non-stop streaming. Can be relative to the starting block using +X."/>

            <label htmlFor="columns">Columns</label>
            <input id="columns" name="columns" type="text" placeholder="timestamp,block_num" defaultValue="timestamp,block_num" title="Output columns filter as a comma separated list."/>

            <label htmlFor="header-row">Add header row to the spreadsheet ?</label>
            <input id="header-row" name="header-row" type="checkbox" defaultChecked="checked"/>

            <label htmlFor="spreadsheet-range">Spreadsheet range</label>
            <input id="spreadsheet-range" name="spreadsheet-range" type="text" placeholder="Sheet1" defaultValue="Sheet1" title="The name of the target spreadsheet."/>

            <button type="submit">Start streaming</button>
        </form>
    )
}

export default function LandingPage() {
    const { data: session, status } = useSession()

    useEffect(() => {
        if (session?.error === 'RefreshAccessTokenError') {
            signIn() // Force sign in to hopefully resolve error
        }
    }, [session])

    if (status === 'loading') {
        return <p>Hang on there...</p>
    }

    if (status === 'authenticated') {
        return (
            <>
                <p>Signed in as {session?.user?.email}</p>
                <button onClick={() => signOut()}>Sign out</button>
                <StartStreamingForm />
            </>
        )
    }

    return (
        <>
            <p>Not signed in.</p>
            <button onClick={() => signIn('google')}>Sign in</button>
        </>
    )
}