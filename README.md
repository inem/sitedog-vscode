# SiteDog Preview

VSCode extension for live preview of SiteDog project cards with smart date conversion.

## Features

- **Live Preview**: Real-time preview of SiteDog cards from `sitedog.yml` files
- **Smart Dates**: Convert "expires in: 90 days" → "expires_date: 2025-04-07"
- **Quick Access**: Toolbar buttons and context menu integration

## Usage

1. Open `sitedog.yml` file
2. Click toolbar buttons:
   - 👁️ **Preview** - Show live preview
   - 🕐 **Convert Dates** - Add absolute dates

### Date Conversion Example

**Before:**
```yaml
Token:
  expires in: 90 days
  name: vscode publish
```

**After:**
```yaml
Token:
  expires in: 90 days
  expires_date: 2025-04-07
  name: vscode publish
```

## Installation

### From VSIX
```bash
code --install-extension sitedog-preview-x.x.x.vsix
```

### Development
```bash
git clone <repo>
make build
make install
```

## Commands

- `Sitedog: Show Preview` - Live preview panel
- `Sitedog: Convert Relative Dates` - Add absolute dates
- `Sitedog: Refresh Preview` - Manual refresh

## Requirements

- VSCode 1.74.0+
- Internet connection (for external resources)

## Supported Date Formats

- `expires in: X days`
- `expires in: X weeks`
- `expires in: X months`
- `expires in: X years`

## License

MIT
