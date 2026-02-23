import { useState } from 'react';
import '../styles/RFIDRegistration.css';

interface SerialPort {
    open: () => Promise<void>;
    close: () => Promise<void>;
    readable: ReadableStream<Uint8Array>;
    writable: WritableStream<Uint8Array>;
}

// API Configuration - change this for production
const API_ENDPOINT = 'http://localhost:3000/api/register';

export function RFIDRegistration() {
    const [rfid, setRfid] = useState('');
    const [name, setName] = useState('');
    const [port, setPort] = useState<SerialPort | null>(null);
    const [isConnected, setIsConnected] = useState(false);
    const [response, setResponse] = useState<{ status: string; rfid: string; name: string } | null>(null);
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    // Request serial port connection
    const connectToSerial = async () => {
        try {
            setError('');
            const selectedPort = await (navigator as any).serial.requestPort();
            await selectedPort.open({ baudRate: 9600 });
            setPort(selectedPort);
            setIsConnected(true);
            readFromSerial(selectedPort);
        } catch (err) {
            setError(`Błąd łączenia z czytnikiem ${err instanceof Error ? err.message : String(err)}`);
            setIsConnected(false);
        }
    };

    // Read data from serial port
    const readFromSerial = async (serialPort: SerialPort) => {
        try {
            const reader = serialPort.readable?.getReader();
            if (!reader) {
                setError('Błąd łączenia z czytnikiem');
                return;
            }

            const decoder = new TextDecoder();
            let buffer = '';

            while (true) {
                const { value, done } = await reader.read();
                if (done) {
                    reader.releaseLock();
                    break;
                }

                // Decode the received data
                const text = decoder.decode(value);
                buffer += text;

                // Check if we have a complete RFID (usually sent with newline)
                const lines = buffer.split('\n');

                // Keep the last incomplete line in buffer
                buffer = lines[lines.length - 1];

                // Process complete lines
                for (let i = 0; i < lines.length - 1; i++) {
                    const line = lines[i].trim();
                    if (line) {
                        // Update RFID field with the received data
                        setRfid(line);
                    }
                }
            }
        } catch (err) {
            if ((err as Error).name !== 'NotAllowedError') {
                setError(`Błąd czytnika: ${err instanceof Error ? err.message : String(err)}`);
            }
            setIsConnected(false);
        }
    };

    // Disconnect from serial port
    const disconnectSerial = async () => {
        try {
            if (port) {
                await port.close();
                setPort(null);
                setIsConnected(false);
                setRfid('');
                setError('');
            }
        } catch (err) {
            setError(`Nie udało się rozłączyć czytnika: ${err instanceof Error ? err.message : String(err)}`);
        }
    };

    // Handle form submission
    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!rfid.trim()) {
            setError('Zeskanuj tag przed wysłaniem');
            return;
        }

        if (!name.trim()) {
            setError('Podaj imię przed wysłaniem');
            return;
        }

        setIsLoading(true);
        setError('');
        setResponse(null);

        try {
            const res = await fetch(API_ENDPOINT, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    rfid: rfid.trim(),
                    name: name.trim(),
                }),
            });

            if (!res.ok) {
                throw new Error(`HTTP error! status: ${res.status}`);
            }

            const data = await res.json();
            setResponse(data);
            setRfid('');
            setName('');
        } catch (err) {
            setError(`Bład rejestracji: ${err instanceof Error ? err.message : String(err)}`);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="rfid-container">
            <div className="card">
                <h1>Rejestracja uczestnika</h1>

                {/* Serial Connection Section */}
                <div className="section">
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '2px solid #667eea', paddingBottom: '10px', marginBottom: '15px' }}>
                        <h2 style={{ margin: 0, borderBottom: 'none', paddingBottom: 15 }}>Status połączenia z czytnikiem:</h2>
                        <div className="status-badge">
                            {isConnected ? (
                                <span className="status-connected">Połączono z czytnikiem</span>
                            ) : (
                                <span className="status-disconnected">Nie połączono z czytnikiem</span>
                            )}
                        </div>
                    </div>

                    <div className="button-group">
                        {!isConnected && (
                            <button onClick={connectToSerial} className="btn btn-primary">
                                Połącz z czytnikiem
                            </button>
                        )}
                    </div>
                </div>

                {/* Registration Form Section */}
                {isConnected && (
                    <div className="section">
                        <h2>Zarejestruj</h2>
                        <form onSubmit={handleSubmit}>
                            <div className="form-group">
                                <label htmlFor="rfid">RFID ID:</label>
                                <input
                                    id="rfid"
                                    type="text"
                                    value={rfid}
                                    onChange={(e) => setRfid(e.target.value)}
                                    placeholder="Zeskanuj tag"
                                    className="input-field"
                                />
                            </div>

                            <div className="form-group">
                                <label htmlFor="name">Imię uczestnika:</label>
                                <input
                                    id="name"
                                    type="text"
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                    placeholder="Wpisz imię uczestnika"
                                    className="input-field"
                                />
                            </div>

                            <button type="submit" className="btn btn-success" disabled={isLoading}>
                                {isLoading ? 'Rejestruję...' : 'Zarejestruj'}
                            </button>
                        </form>
                    </div>
                )}

                {/* Response Section */}
                {response && (
                    <div className="section response-success">
                        <h3>Zarejestrowano!</h3>
                        <p><strong>Status:</strong> {response.status}</p>
                        <p><strong>RFID:</strong> {response.rfid}</p>
                        <p><strong>Imię:</strong> {response.name}</p>
                    </div>
                )}

                {/* Error Section */}
                {error && (
                    <div className="section response-error">
                        <h3>Błąd</h3>
                        <p>{error}</p>
                    </div>
                )}
            </div>
        </div>
    );
}
