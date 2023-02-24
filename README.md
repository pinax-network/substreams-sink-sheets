# [`Substreams`](https://substreams.streamingfast.io/) Google Sheets sink module

[<img alt="github" src="https://img.shields.io/badge/Github-substreams.sheets-8da0cb?style=for-the-badge&logo=github" height="20">](https://github.com/pinax-network/substreams-sink-sheets)
[<img alt="npm" src="https://img.shields.io/npm/v/substreams-sink-sheets.svg?style=for-the-badge&color=CB0001&logo=npm" height="20">](https://www.npmjs.com/package/substreams-sink-sheets)
[<img alt="GitHub Workflow Status" src="https://img.shields.io/github/actions/workflow/status/pinax-network/substreams-sink-sheets/ci.yml?branch=main&style=for-the-badge" height="20">](https://github.com/pinax-network/substreams-sink-sheets/actions?query=branch%3Amain)

> `substreams-sink-sheets` pushes [Substreams DatabaseChanges](https://github.com/streamingfast/substreams-database-change/blob/develop/proto/substreams/sink/database/v1/database.proto) map `db_out` outputs to [Google Sheets](https://developers.google.com/sheets/api/reference/rest/).

### Further resources

- [Substreams documentation](https://substreams.streamingfast.io)
- [Substreams `DatabaseChanges`](https://github.com/streamingfast/substreams-database-change)

## CLI
[**Use pre-built binaries**](https://github.com/pinax-network/substreams-sink-sheets/releases)
- [x] MacOS
- [x] Linux
- [x] Windows

**Install** globally via npm
```
$ npm install -g substreams-sink-sheets
```

**Run**
```
$ substreams-sink-sheets run [options] <spkg>
```

## Features
- Consume `*.spkg` from:
  - [x] Load URL or IPFS
  - [ ] Read from `*.spkg` local filesystem
  - [ ] Read from `substreams.yaml`
* [x] List compatible modules from `.spkg`
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
  - [x] Add missing columns headers to sheet if not present
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
  - [ ] Batch updates
- Winston logger
  - `NODE_ENV='production'` to silent logging

## References

- https://developers.google.com/sheets/api/guides/concepts#cell
- https://developers.google.com/sheets/api/reference/rest/v4/ValueInputOption
- https://developers.google.com/sheets/api/reference/rest/v4/spreadsheets.values/append#insertdataoption