# [`Substreams`](https://substreams.streamingfast.io/) Google Sheets sink module

[<img alt="github" src="https://img.shields.io/badge/Github-substreams.sheets-8da0cb?style=for-the-badge&logo=github" height="20">](https://github.com/pinax-network/substreams-sink-sheets)
[<img alt="npm" src="https://img.shields.io/npm/v/substreams-sink-sheets.svg?style=for-the-badge&color=CB0001&logo=npm" height="20">](https://www.npmjs.com/package/substreams-sink-sheets)
[<img alt="GitHub Workflow Status" src="https://img.shields.io/github/actions/workflow/status/pinax-network/substreams-sink-sheets/ci.yml?branch=main&style=for-the-badge" height="20">](https://github.com/pinax-network/substreams-sink-sheets/actions?query=branch%3Amain)

> `substreams-sink-sheets` pushes [Substreams DatabaseChanges](https://github.com/streamingfast/substreams-database-change/blob/develop/proto/substreams/sink/database/v1/database.proto) map outputs to [Google Sheets](https://developers.google.com/sheets/api/reference/rest/).

## CLI
[**Use pre-built binaries**](https://github.com/pinax-network/substreams-sink-sheets/releases)
- [x] MacOS
- [x] Linux
- [x] Windows

**Install** globally via npm
```console
$ npm install -g substreams-sink-sheets
```

**Create new Google Sheets spreadsheet**
```console
$ substreams-sink-sheets create [options]
```

**Stream substream output to Google Sheets**
```console
$ substreams-sink-sheets run [options] <spkg> <spreadsheet-id>
```

The `spreadsheet-id` can be found in the URL of the Google Sheets document: https://docs.google.com/spreadsheets/d/**${ID}**/edit 

**List compatible output modules for a given substream**
```console
$ substreams-sink-sheets list [options] <spkg>
```

**Help**
```console
$ substreams-sink-sheets <run|create|list> -h
```

## Features

- Consume `*.spkg` from:
  - [x] Load URL or IPFS
  - [ ] Read from `*.spkg` local filesystem
  - [ ] Read from `substreams.yaml`
- [x] List compatible modules from `.spkg`
- [GoogleSheet API](https://developers.google.com/sheets/api/reference/rest/) support
  - [x] Authenticate via JWT credentials
  - [x] Append row to sheet
  - [ ] Work with different credentials (service account, OAuth, etc.)
  - [ ] Permission checking for editing
- [GoogleDrive API](https://developers.google.com/drive/api/v3/reference) support
  - [ ] Update permissions
- [x] Select columns to output
  - [x] Time (`date,year,month,day,timestamp,seconds`)
  - [x] Block (`block_num`)
  - [x] `DatabaseChanges`
  - [x] Add missing columns headers to sheet if specified
- [x] Create a new sheet if no `spreadsheetId` specified
- [x] Set `start-block` & `end-block`
- [x] Select `outputModule` (default `db_out`)
- [x] Select Substream endpoint (default `mainnet.eth.streamingfast.io:443`)
- `DatabaseChanges` support
  - [ ] UNSET
  - [x] CREATE
  - [ ] UPDATE
  - [ ] DELETE
- Rate limiting
  - [x] 1 request per second (Google rate limit is 100 requests per 100 seconds)
- Winston logger
  - `NODE_ENV='production'` to silent logging

## Google API authentication

Authenticate to Google Sheets using either OAuth2 tokens or a service account credential file.

First, create a new project from the [Google Cloud developer console](https://console.cloud.google.com) or select an existing one.

Then go to **APIs & Services** to enable the Google Sheets API.

![gauth_readme_1](https://user-images.githubusercontent.com/23462475/223189947-b8b10d57-9b79-4ea9-8847-253281f8fde7.png)

![gauth_readme_2](https://user-images.githubusercontent.com/23462475/223189999-04ad861f-079b-437b-82c9-a4960da86218.png)

### OAuth2

OAuth2 allows the application to access the documents of a user on its behalf by requesting its consent. To set it up, go to the **OAuth consent screen** to setup the scope and permissions of the OAuth authentication.

Select the user type and add the `auth/spreadsheets` scope.

![gauth_readme_3](https://user-images.githubusercontent.com/23462475/223190885-55aa8546-6602-425c-a248-8044d172a4f0.png)

![gauth_readme_4](https://user-images.githubusercontent.com/23462475/223190932-4a6e4adf-6fa9-41d9-8342-75a1301adfbc.png)

Then, you want to add an **OAuth client ID** for [NextAuthJS](https://next-auth.js.org/) to use to issue authentication requests to Google. For local deployement, you want to add `localhost:3000` as an authorized origin. The callback url is provided by the NextAuthJS library (see the [docs](https://authjs.dev/reference/oauth-providers/google) for more information). 

![gauth_readme_5](https://user-images.githubusercontent.com/23462475/223191678-18b29385-745e-428c-a79b-e4354ba8f663.png)

![gauth_readme_6](https://user-images.githubusercontent.com/23462475/223191718-89613498-5a11-472f-b52d-92bff5ff1f29.png)

After getting the *Google Client ID* and *Google Client Secret*, add these to your `.env.local` in the source directory of the application.

![gauth_readme_7](https://user-images.githubusercontent.com/23462475/223192240-0c150950-5ea9-4387-a658-4b2198d1fdba.png)

**.env.local**
```env
GOOGLE_CLIENT_ID="<your-client-id>"
GOOGLE_CLIENT_SECRET="<your-client-secret>"
```

And you're done ! You should be able to use the `Sign In with Google` feature to authenticate with your Google Account. 

If using the CLI, you will need your *refresh* token to generate access tokens from Google's endpoint.
```bash
REFRESH_TOKEN="<your-refresh-token>"
ACCESS_TOKEN="$(curl https://oauth2.googleapis.com/token -s --data-binary "client_id=<your-client-id>&client_secret=<your-client-secret>&refresh_token=$REFRESH_TOKEN&grant_type=refresh_token" | jq .access_token)"
```

### Service account

Alternatively, if using the CLI, you can use a [service account](https://cloud.google.com/iam/docs/service-account-overview) for pushing data to your Google spreadsheet.

Create a new service account from the **IAM & Admin** page and enter a name.

![gauth_readme_8](https://user-images.githubusercontent.com/23462475/223193796-21b6e195-0eee-4abb-8d36-c6553a52339c.png)

Then, edit the service account details to add a new JSON key. Download it, rename it to `credentials.json` and move it to the source folder (for convenience).

![gauth_readme_9](https://user-images.githubusercontent.com/23462475/223193964-4e017a17-4dad-4a7b-8827-1f1bea613d1e.png)

![gauth_readme_10](https://user-images.githubusercontent.com/23462475/223194315-fef75a04-cc4d-4ddf-902f-664f52529432.png)

You can now use it by passing the `--service-account-file credentials.json` argument.

**IMPORTANT**: in order for the service account to be able to access your spreadsheet, you must enable sharing (either to everyone or by using the service account email found in the credentials file).

![gauth_readme_11](https://user-images.githubusercontent.com/23462475/223197936-47c06829-6e92-4068-b90e-2742863fcd69.png)

## References

- https://developers.google.com/sheets/api/guides/concepts#cell
- https://developers.google.com/sheets/api/reference/rest/v4/ValueInputOption
- https://developers.google.com/sheets/api/reference/rest/v4/spreadsheets.values/append#insertdataoption

## Further resources

- [Substreams documentation](https://substreams.streamingfast.io)
- [Substreams `DatabaseChanges`](https://github.com/streamingfast/substreams-database-change)
