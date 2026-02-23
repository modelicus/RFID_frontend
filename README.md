# RFID Registration Frontend

A React + TypeScript + Vite application for registering RFID tags via ESP32 over Web Serial API.

## Features

- **Web Serial API Integration**: Connect to ESP32 microcontroller via Chromium browser
- **Real-time RFID Reading**: Automatically captures RFID IDs from serial port
- **User Registration**: Simple form to enter user name and submit RFID data
- **HTTP API Integration**: Sends registration data to backend API at `/api/register`
- **Responsive UI**: Works on desktop and mobile browsers that support Web Serial API

## Prerequisites

- Chromium-based browser (Chrome, Edge, etc.) with Web Serial API support
- ESP32 microcontroller connected via USB
- Backend API server running at the host location with `/api/register` endpoint

## Getting Started

### Installation

```bash
npm install
```

### Development

```bash
npm run dev
```

The application will start at `http://localhost:5173`

### Build

```bash
npm run build
```

Output will be in the `dist/` directory.

## How to Use

1. **Connect to ESP32**:
   - Click "Connect to ESP32" button
   - Select your ESP32 device from the browser's serial port picker
   - The status will change to "Connected"

2. **Register RFID**:
   - Scan an RFID tag with your ESP32 reader
   - The RFID ID will auto-populate in the "RFID ID" field
   - Enter the person's name in the "Name" field
   - Click "Submit" to register

3. **View Response**:
   - Success: See the registration confirmation
   - Error: Check the error message and try again

## Expected API Format

### Request
```json
{
    "rfid": "04A3F1B29C",
    "name": "John Doe"
}
```

### Response
```json
{
    "status": "registered",
    "rfid": "04A3F1B29C",
    "name": "John Doe"
}
```

## Browser Compatibility

- Chrome/Chromium 89+
- Microsoft Edge 89+
- Other Chromium-based browsers with Web Serial API support

## Note

Web Serial API requires:
- HTTPS (or localhost for development)
- User permission to access serial ports
- Compatible USB-to-Serial drivers on the host system
