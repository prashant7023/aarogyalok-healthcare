import { useEffect, useRef, useState } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { MapPin, Navigation, Search, X } from 'lucide-react';

const DEFAULT_CENTER = [73.0243, 26.2389];

export default function MapboxLocationPicker({
    open,
    token,
    initialLocation,
    onConfirm,
    onClose,
    title = 'Select Location on Map',
}) {
    const mapRef = useRef(null);
    const mapInstanceRef = useRef(null);
    const markerRef = useRef(null);

    const [selected, setSelected] = useState(initialLocation || null);
    const [query, setQuery] = useState('');
    const [results, setResults] = useState([]);
    const [searching, setSearching] = useState(false);
    const [gettingCurrent, setGettingCurrent] = useState(false);

    const setMarker = (lng, lat) => {
        if (!mapInstanceRef.current) return;

        if (!markerRef.current) {
            markerRef.current = new mapboxgl.Marker({ color: '#005bd3' })
                .setLngLat([lng, lat])
                .addTo(mapInstanceRef.current);
            return;
        }

        markerRef.current.setLngLat([lng, lat]);
    };

    const reverseGeocode = async (lng, lat) => {
        const response = await fetch(
            `https://api.mapbox.com/geocoding/v5/mapbox.places/${lng},${lat}.json?access_token=${token}&limit=1`
        );
        const data = await response.json();
        return data?.features?.[0]?.place_name || `Lat ${lat.toFixed(5)}, Lng ${lng.toFixed(5)}`;
    };

    const updateSelectedLocation = async (lng, lat, explicitAddress) => {
        const address = explicitAddress || (await reverseGeocode(lng, lat));

        setMarker(lng, lat);
        setSelected({ latitude: lat, longitude: lng, address });
    };

    const handleSearch = async () => {
        if (!query.trim()) {
            setResults([]);
            return;
        }

        setSearching(true);
        try {
            const response = await fetch(
                `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(query)}.json?access_token=${token}&limit=6&country=IN`
            );
            const data = await response.json();
            setResults(data?.features || []);
        } catch (error) {
            setResults([]);
        } finally {
            setSearching(false);
        }
    };

    const handlePickSearchResult = async (place) => {
        const [lng, lat] = place.center;

        if (mapInstanceRef.current) {
            mapInstanceRef.current.flyTo({ center: [lng, lat], zoom: 14 });
        }

        await updateSelectedLocation(lng, lat, place.place_name);
        setResults([]);
    };

    const useCurrentLocation = () => {
        if (!navigator.geolocation) {
            alert('Geolocation is not supported in this browser.');
            return;
        }

        setGettingCurrent(true);

        navigator.geolocation.getCurrentPosition(
            async (position) => {
                const lat = position.coords.latitude;
                const lng = position.coords.longitude;

                if (mapInstanceRef.current) {
                    mapInstanceRef.current.flyTo({ center: [lng, lat], zoom: 14 });
                }

                await updateSelectedLocation(lng, lat);
                setGettingCurrent(false);
            },
            () => {
                setGettingCurrent(false);
                alert('Unable to fetch your current location.');
            },
            { enableHighAccuracy: true, timeout: 12000 }
        );
    };

    useEffect(() => {
        if (!open || !mapRef.current || mapInstanceRef.current) {
            return;
        }

        mapboxgl.accessToken = token;

        const initialCenter = initialLocation
            ? [initialLocation.longitude, initialLocation.latitude]
            : DEFAULT_CENTER;

        const map = new mapboxgl.Map({
            container: mapRef.current,
            style: 'mapbox://styles/mapbox/streets-v12',
            center: initialCenter,
            zoom: initialLocation ? 13 : 10,
        });

        map.addControl(new mapboxgl.NavigationControl(), 'top-right');

        map.on('click', async (event) => {
            const { lng, lat } = event.lngLat;
            await updateSelectedLocation(lng, lat);
        });

        mapInstanceRef.current = map;

        if (initialLocation) {
            setMarker(initialLocation.longitude, initialLocation.latitude);
        }

        return () => {
            markerRef.current?.remove();
            markerRef.current = null;
            map.remove();
            mapInstanceRef.current = null;
        };
    }, [open, token]);

    useEffect(() => {
        if (!open) {
            setResults([]);
            setQuery('');
        }
    }, [open]);

    if (!open) return null;

    return (
        <div style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(15, 23, 42, 0.55)',
            zIndex: 999,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '1rem',
        }}>
            <div style={{
                width: 'min(920px, 100%)',
                maxHeight: '92vh',
                overflow: 'auto',
                background: '#fff',
                borderRadius: '12px',
                border: '1px solid #e1e3e5',
                boxShadow: '0 20px 40px rgba(15, 23, 42, 0.25)',
            }}>
                <div style={{
                    padding: '0.9rem 1rem',
                    borderBottom: '1px solid #e1e3e5',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: '0.75rem',
                }}>
                    <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 700, color: '#303030' }}>{title}</h3>
                    <button
                        onClick={onClose}
                        style={{
                            border: '1px solid #e1e3e5',
                            background: '#fff',
                            borderRadius: '8px',
                            width: 32,
                            height: 32,
                            cursor: 'pointer',
                            display: 'inline-flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                        }}
                    >
                        <X size={16} color="#6b7280" />
                    </button>
                </div>

                <div style={{ padding: '0.9rem 1rem', display: 'grid', gap: '0.75rem' }}>
                    <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', alignItems: 'center' }}>
                        <div style={{ position: 'relative', flex: 1, minWidth: 220 }}>
                            <input
                                className="input"
                                placeholder="Search hospital / clinic location"
                                value={query}
                                onChange={(event) => setQuery(event.target.value)}
                                onKeyDown={(event) => {
                                    if (event.key === 'Enter') {
                                        event.preventDefault();
                                        handleSearch();
                                    }
                                }}
                                style={{ width: '100%', paddingRight: 34 }}
                            />
                            <Search size={14} color="#9ca3af" style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)' }} />
                        </div>
                        <button
                            type="button"
                            onClick={handleSearch}
                            style={{
                                border: 'none',
                                background: '#005bd3',
                                color: '#fff',
                                borderRadius: '8px',
                                padding: '0.55rem 0.85rem',
                                fontWeight: 600,
                                cursor: 'pointer',
                                fontSize: '0.8rem',
                            }}
                        >
                            {searching ? 'Searching...' : 'Search'}
                        </button>
                        <button
                            type="button"
                            onClick={useCurrentLocation}
                            style={{
                                border: '1px solid #dbeafe',
                                background: '#ebf4ff',
                                color: '#005bd3',
                                borderRadius: '8px',
                                padding: '0.55rem 0.85rem',
                                fontWeight: 700,
                                cursor: 'pointer',
                                fontSize: '0.8rem',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '5px',
                            }}
                        >
                            <Navigation size={13} /> {gettingCurrent ? 'Locating...' : 'Use Current Location'}
                        </button>
                    </div>

                    {results.length > 0 && (
                        <div style={{ border: '1px solid #e1e3e5', borderRadius: '8px', maxHeight: 180, overflowY: 'auto' }}>
                            {results.map((place) => (
                                <button
                                    key={place.id}
                                    type="button"
                                    onClick={() => handlePickSearchResult(place)}
                                    style={{
                                        width: '100%',
                                        textAlign: 'left',
                                        border: 'none',
                                        borderBottom: '1px solid #f1f2f3',
                                        padding: '0.55rem 0.7rem',
                                        background: '#fff',
                                        cursor: 'pointer',
                                        fontSize: '0.8rem',
                                        color: '#303030',
                                    }}
                                >
                                    {place.place_name}
                                </button>
                            ))}
                        </div>
                    )}

                    <div ref={mapRef} style={{ height: 390, borderRadius: '10px', overflow: 'hidden', border: '1px solid #e1e3e5' }} />

                    <div style={{
                        display: 'flex',
                        gap: '0.6rem',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        flexWrap: 'wrap',
                        padding: '0.75rem',
                        border: '1px solid #e1e3e5',
                        borderRadius: '8px',
                        background: '#f8fafc',
                    }}>
                        <div style={{ fontSize: '0.8rem', color: '#334155', display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <MapPin size={14} color="#005bd3" />
                            {selected
                                ? `${selected.address} (${selected.latitude.toFixed(5)}, ${selected.longitude.toFixed(5)})`
                                : 'Click on map, search location, or use current location'}
                        </div>

                        <div style={{ display: 'flex', gap: '0.5rem' }}>
                            <button
                                type="button"
                                onClick={onClose}
                                style={{
                                    border: '1px solid #e1e3e5',
                                    background: '#fff',
                                    color: '#475569',
                                    borderRadius: '8px',
                                    padding: '0.5rem 0.8rem',
                                    fontWeight: 600,
                                    cursor: 'pointer',
                                    fontSize: '0.8rem',
                                }}
                            >
                                Close
                            </button>
                            <button
                                type="button"
                                disabled={!selected}
                                onClick={() => onConfirm(selected)}
                                style={{
                                    border: 'none',
                                    background: selected ? '#005bd3' : '#93c5fd',
                                    color: '#fff',
                                    borderRadius: '8px',
                                    padding: '0.5rem 0.8rem',
                                    fontWeight: 700,
                                    cursor: selected ? 'pointer' : 'not-allowed',
                                    fontSize: '0.8rem',
                                }}
                            >
                                Confirm Location
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
