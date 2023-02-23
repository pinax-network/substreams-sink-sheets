# [`Substreams`](https://substreams.streamingfast.io/) Google Sheets sink module

> `substreams-sink-sheets` pushes [Substreams DatabaseChanges](https://github.com/streamingfast/substreams-database-change/blob/develop/proto/substreams/sink/database/v1/database.proto) map output to a Google Sheets spreadsheet of your choice.

## Features
- Consume `*.spkg` from:
  - [x] Load URL or IPFS
  - [ ] Read from `*.spkg` local filesystem
  - [ ] Read from `substreams.yaml`
- GoogleSheet API support
  - [x] Authenticate via JWT credentials
  - [x] Append row to sheet
  - [ ] Work with different credentials (service account, OAuth, etc.)
  - [ ] Permission checking for editing
- [x] Select columns to output
  - [ ] Time (`date,year,month,day,timestamp,seconds`)
  - [ ] Block (`block_num`)
  - [x] `DatabaseChanges`
  - [ ] Read output fields from `.spkg`
      - If specified from CLI, great ! (warn if some not found in .spkg)
      - If not, allow user to select some or all via terminal
  - [ ] Add missing columns headers to sheet if not present
- [ ] Create a new sheet if no `spreadsheetId` specified
- [x] Set `start-block` & `end-block`
- [x] Select `outputModule` (default `db_out`)
- [x] Select Substream endpoint (default `mainnet.eth.streamingfast.io:443`)
- `DatabaseChanges` support
  - [ ] UNSET
  - [x] CREATE
  - [ ] UPDATE
  - [ ] DELETE
