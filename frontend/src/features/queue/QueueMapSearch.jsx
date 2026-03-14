import { useEffect, useRef, useState } from 'react';
import { ArrowLeft, Navigation, Search, MapPin, Filter, Users, IndianRupee, Stethoscope, Clock } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import api from '../../shared/utils/api';

const MAPBOX_TOKEN = import.meta.env.VITE_MAPBOX_TOKEN || '';
const DEFAULT_CENTER = [73.0243, 26.2389];
const DISTANCE_OPTIONS = [1, 2, 5, 10, 15];

const escapeHtml = (value = '') =>
    String(value)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');

export default function QueueMapSearch() {
    const navigate = useNavigate();
    const mapContainerRef = useRef(null);
    const mapRef = useRef(null);
    const selectedMarkerRef = useRef(null);
    const doctorMarkersRef = useRef([]);

    const [locationQuery, setLocationQuery] = useState('');
    const [searchResults, setSearchResults] = useState([]);
    const [searching, setSearching] = useState(false);
    const [selectedLocation, setSelectedLocation] = useState(null);

    const [specialization, setSpecialization] = useState('');
    const [distanceKm, setDistanceKm] = useState(5);

    const [loadingNearby, setLoadingNearby] = useState(false);
    const [nearbyAppointments, setNearbyAppointments] = useState([]);

    const setSelectedMarker = (lng, lat) => {
        if (!mapRef.current) return;

        if (!selectedMarkerRef.current) {
            selectedMarkerRef.current = new mapboxgl.Marker({ color: '#005bd3' })
                .setLngLat([lng, lat])
                .addTo(mapRef.current);
            return;
        }

        selectedMarkerRef.current.setLngLat([lng, lat]);
    };

    const reverseGeocode = async (lng, lat) => {
        const response = await fetch(
            `https://api.mapbox.com/geocoding/v5/mapbox.places/${lng},${lat}.json?access_token=${MAPBOX_TOKEN}&limit=1`
        );
        const data = await response.json();
        return data?.features?.[0]?.place_name || `Lat ${lat.toFixed(5)}, Lng ${lng.toFixed(5)}`;
    };

    const setPickedLocation = async (lng, lat, explicitAddress) => {
        const address = explicitAddress || (await reverseGeocode(lng, lat));
        setSelectedMarker(lng, lat);
        setSelectedLocation({ latitude: lat, longitude: lng, address });
    };

    const initializeMap = () => {
        mapboxgl.accessToken = MAPBOX_TOKEN;
        const map = new mapboxgl.Map({
            container: mapContainerRef.current,
            style: 'mapbox://styles/mapbox/streets-v12',
            center: DEFAULT_CENTER,
            zoom: 10,
        });

        map.addControl(new mapboxgl.NavigationControl(), 'top-right');

        map.on('click', async (event) => {
            const { lng, lat } = event.lngLat;
            await setPickedLocation(lng, lat);
        });

        mapRef.current = map;
    };

    useEffect(() => {
        if (!mapContainerRef.current || mapRef.current) return;
        initializeMap();

        return () => {
            doctorMarkersRef.current.forEach((marker) => marker.remove());
            doctorMarkersRef.current = [];
            selectedMarkerRef.current?.remove();
            selectedMarkerRef.current = null;
            mapRef.current?.remove();
            mapRef.current = null;
        };
    }, []);

    useEffect(() => {
        if (!mapRef.current) return;

        doctorMarkersRef.current.forEach((marker) => marker.remove());
        doctorMarkersRef.current = [];

        nearbyAppointments.forEach((appointment) => {
            if (!appointment?.location?.coordinates || appointment.location.coordinates.length < 2) {
                return;
            }

            const [lng, lat] = appointment.location.coordinates;
            const markerElement = document.createElement('div');
            markerElement.style.cursor = 'pointer';
            markerElement.style.transform = 'translate(-50%, -100%)';
            markerElement.innerHTML = `
                <div style="
                    background:#fff;
                    border:2px solid #005bd3;
                    border-radius:14px;
                    box-shadow:0 6px 16px rgba(15,23,42,0.18);
                    padding:8px 10px;
                    min-width:170px;
                    max-width:210px;
                    font-family:system-ui,-apple-system,Segoe UI,Roboto,sans-serif;
                ">
                    <div style="font-size:12px;font-weight:800;color:#005bd3;line-height:1.25;margin-bottom:4px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">
                        Dr. ${escapeHtml(appointment.doctorName || 'Unknown')}
                    </div>
                    <div style="font-size:11px;color:#64748b;line-height:1.2;margin-bottom:6px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">
                        ${escapeHtml(appointment.specialization || 'General')}
                    </div>
                    <div style="display:flex;align-items:center;justify-content:space-between;gap:6px;">
                        <span style="font-size:12px;font-weight:800;color:#303030;white-space:nowrap;">₹${escapeHtml(appointment.price || 0)}</span>
                        <span style="font-size:11px;font-weight:700;color:#005bd3;background:#ebf4ff;border-radius:8px;padding:3px 7px;white-space:nowrap;">${escapeHtml(appointment.distanceKm)} km away</span>
                    </div>
                </div>
            `;

            markerElement.addEventListener('click', (event) => {
                event.stopPropagation();
                navigate('/queue/book', { state: { appointment } });
            });

            const marker = new mapboxgl.Marker({ element: markerElement, anchor: 'bottom' })
                .setLngLat([lng, lat])
                .addTo(mapRef.current);

            doctorMarkersRef.current.push(marker);
        });
    }, [nearbyAppointments, navigate]);

    const handleSearchLocation = async () => {
        if (!locationQuery.trim()) {
            setSearchResults([]);
            return;
        }

        setSearching(true);
        try {
            const response = await fetch(
                `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(locationQuery)}.json?access_token=${MAPBOX_TOKEN}&limit=6&country=IN`
            );
            const data = await response.json();
            setSearchResults(data?.features || []);
        } catch (error) {
            setSearchResults([]);
        } finally {
            setSearching(false);
        }
    };

    const handleSelectSearchResult = async (place) => {
        const [lng, lat] = place.center;

        if (mapRef.current) {
            mapRef.current.flyTo({ center: [lng, lat], zoom: 14 });
        }

        await setPickedLocation(lng, lat, place.place_name);
        setSearchResults([]);
    };

    const handleUseCurrentLocation = () => {
        if (!navigator.geolocation) {
            alert('Geolocation is not supported in this browser.');
            return;
        }

        navigator.geolocation.getCurrentPosition(
            async (position) => {
                const lat = position.coords.latitude;
                const lng = position.coords.longitude;

                if (mapRef.current) {
                    mapRef.current.flyTo({ center: [lng, lat], zoom: 14 });
                }

                await setPickedLocation(lng, lat);
            },
            () => alert('Unable to fetch your current location.'),
            { enableHighAccuracy: true, timeout: 12000 }
        );
    };

    const fetchNearbyDoctors = async () => {
        if (!selectedLocation) {
            alert('Please choose a location first (current location, search, or map click).');
            return;
        }

        setLoadingNearby(true);
        try {
            const params = new URLSearchParams();
            params.append('latitude', String(selectedLocation.latitude));
            params.append('longitude', String(selectedLocation.longitude));
            params.append('distanceKm', String(distanceKm));
            if (specialization) params.append('specialization', specialization);

            const response = await api.get(`/queue/appointments/nearby?${params.toString()}`);
            const data = response.data?.data || [];
            setNearbyAppointments(data);

            if (mapRef.current && data.length > 0) {
                const bounds = new mapboxgl.LngLatBounds();
                data.forEach((appointment) => {
                    if (appointment?.location?.coordinates?.length >= 2) {
                        bounds.extend(appointment.location.coordinates);
                    }
                });

                if (!bounds.isEmpty()) {
                    mapRef.current.fitBounds(bounds, { padding: 60, maxZoom: 14 });
                }
            }
        } catch (error) {
            console.error('Failed to fetch nearby appointments:', error);
            alert(error.response?.data?.message || 'Failed to fetch nearby doctors');
        } finally {
            setLoadingNearby(false);
        }
    };

    return (
        <div className="fade-in" style={{ display: 'grid', gap: '1rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.6rem' }}>
                <button
                    onClick={() => navigate('/queue')}
                    style={{
                        border: 'none',
                        background: 'transparent',
                        color: '#005bd3',
                        fontWeight: 700,
                        cursor: 'pointer',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '6px',
                        padding: 0,
                    }}
                >
                    <ArrowLeft size={16} /> Back to Queue
                </button>

                <h1 style={{ margin: 0, fontSize: '1.05rem', color: '#303030' }}>Find Nearby Doctors on Map</h1>
            </div>

            <div style={{
                border: '1px solid #e1e3e5',
                background: '#fff',
                borderRadius: '10px',
                padding: '0.8rem',
                display: 'grid',
                gap: '0.65rem',
            }}>
                <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                    <div style={{ position: 'relative', flex: 1, minWidth: 210 }}>
                        <input
                            className="input"
                            value={locationQuery}
                            onChange={(event) => setLocationQuery(event.target.value)}
                            onKeyDown={(event) => {
                                if (event.key === 'Enter') {
                                    event.preventDefault();
                                    handleSearchLocation();
                                }
                            }}
                            placeholder="Search hospital, area, or city"
                            style={{ width: '100%', paddingRight: 34 }}
                        />
                        <Search size={14} color="#9ca3af" style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)' }} />
                    </div>
                    <button
                        onClick={handleSearchLocation}
                        style={{ border: 'none', background: '#005bd3', color: '#fff', borderRadius: '8px', padding: '0.55rem 0.85rem', fontWeight: 700, cursor: 'pointer', fontSize: '0.8rem' }}
                    >
                        {searching ? 'Searching...' : 'Search'}
                    </button>
                    <button
                        onClick={handleUseCurrentLocation}
                        style={{ border: '1px solid #dbeafe', background: '#ebf4ff', color: '#005bd3', borderRadius: '8px', padding: '0.55rem 0.85rem', fontWeight: 700, cursor: 'pointer', fontSize: '0.8rem', display: 'inline-flex', alignItems: 'center', gap: '5px' }}
                    >
                        <Navigation size={13} /> Use Current Location
                    </button>
                </div>

                {searchResults.length > 0 && (
                    <div style={{ border: '1px solid #e1e3e5', borderRadius: '8px', maxHeight: 160, overflowY: 'auto' }}>
                        {searchResults.map((place) => (
                            <button
                                key={place.id}
                                onClick={() => handleSelectSearchResult(place)}
                                style={{ width: '100%', textAlign: 'left', border: 'none', borderBottom: '1px solid #f1f2f3', padding: '0.55rem 0.7rem', background: '#fff', cursor: 'pointer', fontSize: '0.8rem', color: '#303030' }}
                            >
                                {place.place_name}
                            </button>
                        ))}
                    </div>
                )}

                <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', alignItems: 'center' }}>
                    <div style={{ minWidth: 180 }}>
                        <label style={{ display: 'block', marginBottom: '0.2rem', fontSize: '0.72rem', color: '#64748b', fontWeight: 700 }}>
                            <Filter size={12} style={{ display: 'inline', marginBottom: '-2px', marginRight: 4 }} /> Specialization
                        </label>
                        <select className="input" value={specialization} onChange={(event) => setSpecialization(event.target.value)}>
                            <option value="">All Specializations</option>
                            <option value="Cardiology">Cardiology</option>
                            <option value="Dermatology">Dermatology</option>
                            <option value="Pediatrics">Pediatrics</option>
                            <option value="Orthopedics">Orthopedics</option>
                            <option value="General">General</option>
                            <option value="Neurology">Neurology</option>
                            <option value="ENT">ENT</option>
                            <option value="Gynecology">Gynecology</option>
                            <option value="Ophthalmology">Ophthalmology</option>
                            <option value="Dentistry">Dentistry</option>
                        </select>
                    </div>
                    <div style={{ minWidth: 160 }}>
                        <label style={{ display: 'block', marginBottom: '0.2rem', fontSize: '0.72rem', color: '#64748b', fontWeight: 700 }}>Distance</label>
                        <select className="input" value={distanceKm} onChange={(event) => setDistanceKm(Number(event.target.value))}>
                            {DISTANCE_OPTIONS.map((value) => (
                                <option key={value} value={value}>{value} km</option>
                            ))}
                        </select>
                    </div>
                    <button
                        onClick={fetchNearbyDoctors}
                        style={{ border: 'none', background: '#005bd3', color: '#fff', borderRadius: '8px', padding: '0.55rem 0.9rem', fontWeight: 700, cursor: 'pointer', fontSize: '0.8rem', marginTop: 20 }}
                    >
                        {loadingNearby ? 'Finding...' : 'Find Nearby Doctors'}
                    </button>
                </div>

                <div style={{ position: 'relative' }}>
                    <div ref={mapContainerRef} style={{ height: 420, borderRadius: '10px', border: '1px solid #e1e3e5', overflow: 'hidden' }} />
                </div>

                <div style={{ fontSize: '0.78rem', color: '#64748b', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <MapPin size={13} color="#005bd3" />
                    {selectedLocation
                        ? `${selectedLocation.address} (${selectedLocation.latitude.toFixed(5)}, ${selectedLocation.longitude.toFixed(5)})`
                        : 'Pick a location by map click, search, or current location'}
                </div>
            </div>

            {nearbyAppointments.length === 0 && (
                <div style={{ border: '1px dashed #e1e3e5', borderRadius: '10px', background: '#fff', padding: '0.9rem 1rem', color: '#8a8a8a', fontSize: '0.84rem' }}>
                    No nearby doctors found yet. Select location and click “Find Nearby Doctors”. Results will appear as markers on the map.
                </div>
            )}
        </div>
    );
}
