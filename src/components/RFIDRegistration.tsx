import { useState } from 'react';
import '../styles/RFIDRegistration.css';
import logoSvg from '../assets/emporio-armani.svg';

interface SerialPort {
    open: () => Promise<void>;
    close: () => Promise<void>;
    readable: ReadableStream<Uint8Array>;
    writable: WritableStream<Uint8Array>;
}

// API Configuration - change this for production
const API_ENDPOINT = 'http://localhost:3000/api/register';

const AGE_GROUPS = ['18-25', '26-34', '35-45', '46-55', '55+'] as const;
const GENDERS = ['kobieta', 'mężczyzna', 'inna'] as const;

export function RFIDRegistration() {
    const [rfid, setRfid] = useState('');
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [ageGroup, setAgeGroup] = useState('');
    const [gender, setGender] = useState('');
    const [isConnected, setIsConnected] = useState(false);
    const [response, setResponse] = useState<{ status: string; rfid: string; name: string } | null>(null);
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    const connectToSerial = async () => {
        try {
            setError('');
            const selectedPort = await (navigator as any).serial.requestPort();
            await selectedPort.open({ baudRate: 9600 });
            setIsConnected(true);
            readFromSerial(selectedPort);
        } catch (err) {
            if ((err as Error).name !== 'NotFoundError') {
                setError(`Błąd łączenia z czytnikiem ${err instanceof Error ? err.message : String(err)}`);
            }
            setIsConnected(false);
        }
    };

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

                const text = decoder.decode(value);
                buffer += text;

                const lines = buffer.split('\n');
                buffer = lines[lines.length - 1];

                for (let i = 0; i < lines.length - 1; i++) {
                    const line = lines[i].trim();
                    if (line) {
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
        if (!email.trim()) {
            setError('Podaj adres e-mail');
            return;
        }
        if (!ageGroup) {
            setError('Wybierz grupę wiekową');
            return;
        }
        if (!gender) {
            setError('Wybierz płeć');
            return;
        }

        setIsLoading(true);
        setError('');
        setResponse(null);

        try {
            const res = await fetch(API_ENDPOINT, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    rfid: rfid.trim(),
                    name: name.trim(),
                    email: email.trim(),
                    age_group: ageGroup,
                    gender,
                }),
            });

            if (!res.ok) {
                throw new Error(`HTTP error! status: ${res.status}`);
            }

            const data = await res.json();
            setResponse(data);
        } catch (err) {
            setError(`Błąd rejestracji: ${err instanceof Error ? err.message : String(err)}`);
        } finally {
            setIsLoading(false);
        }
    };

    const handleSuccessDismiss = () => {
        setResponse(null);
        setRfid('');
        setName('');
        setEmail('');
        setAgeGroup('');
        setGender('');
    };

    const formDisabled = !isConnected;

    return (
        <div className="rfid-container">
            <div className="card">
                {/* Brand Header */}
                <div className="brand-header">
                    <img src={logoSvg} alt="Emporio Armani" className="brand-logo-img" />
                    <div className="divider" />
                    <h1 className="brand-title">Power of You</h1>
                    <p className="brand-subtitle">Rejestracja uczestnika</p>
                </div>

                {/* Registration Form - always visible, disabled when not connected */}
                <div className={`section form-section${formDisabled ? ' form-disabled' : ''}`}>
                    <form onSubmit={handleSubmit}>
                        {/* RFID Status */}
                        <div className={`rfid-status ${rfid ? 'rfid-scanned' : 'rfid-waiting'}`}>
                            <div className="rfid-dot" />
                            <span className="rfid-label">
                                {rfid ? 'Opaska zeskanowana' : 'Zeskanuj opaskę...'}
                            </span>
                        </div>

                        {/* Name */}
                        <div className="form-group">
                            <label htmlFor="name">Imię</label>
                            <input
                                id="name"
                                type="text"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                placeholder="Imię uczestnika"
                                className="input-field"
                                disabled={formDisabled}
                            />
                        </div>

                        {/* Email */}
                        <div className="form-group">
                            <label htmlFor="email">E-mail</label>
                            <input
                                id="email"
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                placeholder="adres@email.com"
                                className="input-field"
                                disabled={formDisabled}
                            />
                        </div>

                        {/* Age Group & Gender side by side */}
                        <div className="form-row">
                            <div className="form-group">
                                <label htmlFor="ageGroup">Grupa wiekowa</label>
                                <select
                                    id="ageGroup"
                                    value={ageGroup}
                                    onChange={(e) => setAgeGroup(e.target.value)}
                                    className={`select-field${!ageGroup ? ' placeholder-shown' : ''}`}
                                    disabled={formDisabled}
                                >
                                    <option value="">Wybierz...</option>
                                    {AGE_GROUPS.map((group) => (
                                        <option key={group} value={group}>{group}</option>
                                    ))}
                                </select>
                            </div>

                            <div className="form-group">
                                <label htmlFor="gender">Płeć</label>
                                <select
                                    id="gender"
                                    value={gender}
                                    onChange={(e) => setGender(e.target.value)}
                                    className={`select-field${!gender ? ' placeholder-shown' : ''}`}
                                    disabled={formDisabled}
                                >
                                    <option value="">Wybierz...</option>
                                    {GENDERS.map((g) => (
                                        <option key={g} value={g}>
                                            {g.charAt(0).toUpperCase() + g.slice(1)}
                                        </option>
                                    ))}
                                </select>
                            </div>
                        </div>

                        <button
                            type="submit"
                            className="btn btn-success"
                            disabled={formDisabled || isLoading}
                        >
                            {isLoading ? 'Rejestruję...' : 'Zarejestruj'}
                        </button>
                    </form>
                </div>

                {/* Error */}
                {error && (
                    <div className="response-error">
                        <h3>Błąd</h3>
                        <p>{error}</p>
                    </div>
                )}

                {/* Footer */}
                <div className="card-footer">
                    <img src={logoSvg} alt="Emporio Armani" className="footer-logo-img" />
                </div>

                {/* Staff utility: connection status */}
                <div className="connection-strip">
                    <div className="status-badge">
                        {isConnected ? (
                            <span className="status-connected">Połączono</span>
                        ) : (
                            <span className="status-disconnected">Nie połączono</span>
                        )}
                    </div>
                    {!isConnected && (
                        <button onClick={connectToSerial} className="btn-connect">
                            Połącz z czytnikiem
                        </button>
                    )}
                </div>
            </div>

            {/* Success Modal Overlay */}
            {response && (
                <div className="modal-overlay" onClick={handleSuccessDismiss}>
                    <div className="modal-card" onClick={(e) => e.stopPropagation()}>
                        <img src={logoSvg} alt="Emporio Armani" className="modal-logo-img" />
                        <div className="divider" style={{ margin: '16px auto' }} />
                        <h3 className="modal-name">{response.name}</h3>
                        <p className="modal-subtitle">Zarejestrowano</p>
                        <button className="btn btn-primary modal-btn" onClick={handleSuccessDismiss}>
                            OK
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
