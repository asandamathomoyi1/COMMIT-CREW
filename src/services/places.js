/*
|--------------------------------------------------------------------------
| GOOGLE PLACES (New) – PHARMACY SEARCH
|--------------------------------------------------------------------------
| Uses the Places API (New) REST endpoints:
|   - Nearby Search : pharmacies around the member, closest first
|   - Text Search   : a pharmacy name / "open now" / "24 hour" search
|
| Setup: put your key in .env as EXPO_PUBLIC_GOOGLE_PLACES_API_KEY
| (see README_SETUP.md) and enable "Places API (New)" in Google Cloud.
|--------------------------------------------------------------------------
*/

const API_KEY = process.env.EXPO_PUBLIC_GOOGLE_PLACES_API_KEY;

const BASE_URL = 'https://places.googleapis.com/v1/places';

const DEFAULT_RADIUS_METERS = 5000;

const MAX_RESULTS = 20;

const REQUEST_TIMEOUT_MS = 12000;

const FIELD_MASK = [
  'places.id',
  'places.displayName',
  'places.formattedAddress',
  'places.shortFormattedAddress',
  'places.location',
  'places.rating',
  'places.userRatingCount',
  'places.nationalPhoneNumber',
  'places.internationalPhoneNumber',
  'places.googleMapsUri',
  'places.businessStatus',
  'places.currentOpeningHours.openNow',
  'places.regularOpeningHours.weekdayDescriptions',
].join(',');

export function isPlacesConfigured() {
  return Boolean(API_KEY);
}

function toRadians(degrees) {
  return (degrees * Math.PI) / 180;
}

// Straight-line distance in metres (haversine).
export function distanceInMeters(from, to) {
  const earthRadius = 6371000;

  const deltaLat = toRadians(to.latitude - from.latitude);
  const deltaLon = toRadians(to.longitude - from.longitude);

  const a =
    Math.sin(deltaLat / 2) ** 2 +
    Math.cos(toRadians(from.latitude)) *
      Math.cos(toRadians(to.latitude)) *
      Math.sin(deltaLon / 2) ** 2;

  return earthRadius * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export function formatDistance(meters) {
  if (meters == null || Number.isNaN(meters)) {
    return '';
  }

  if (meters < 1000) {
    return `${Math.round(meters / 10) * 10} m`;
  }

  return `${(meters / 1000).toFixed(1)} km`;
}

// Google lists weekdays Monday-first; JavaScript's getDay() is Sunday-first.
function getTodayHours(weekdayDescriptions) {
  if (!Array.isArray(weekdayDescriptions) || weekdayDescriptions.length !== 7) {
    return null;
  }

  const line = weekdayDescriptions[(new Date().getDay() + 6) % 7];

  const separatorIndex = line.indexOf(':');

  return separatorIndex >= 0 ? line.slice(separatorIndex + 1).trim() : line;
}

function normalisePlace(place, origin) {
  const location = place.location
    ? { latitude: place.location.latitude, longitude: place.location.longitude }
    : null;

  return {
    id: place.id,
    name: place.displayName?.text ?? 'Pharmacy',
    address: place.shortFormattedAddress ?? place.formattedAddress ?? '',
    fullAddress: place.formattedAddress ?? '',
    location,
    distanceMeters: location && origin ? distanceInMeters(origin, location) : null,
    rating: place.rating ?? null,
    ratingCount: place.userRatingCount ?? 0,
    phone: place.nationalPhoneNumber ?? place.internationalPhoneNumber ?? null,
    phoneForDialling: place.internationalPhoneNumber ?? place.nationalPhoneNumber ?? null,
    mapsUri: place.googleMapsUri ?? null,
    isOpenNow:
      typeof place.currentOpeningHours?.openNow === 'boolean'
        ? place.currentOpeningHours.openNow
        : null,
    todayHours: getTodayHours(place.regularOpeningHours?.weekdayDescriptions),
    isClosedPermanently: place.businessStatus === 'CLOSED_PERMANENTLY',
  };
}

async function callPlaces(endpoint, body) {
  if (!API_KEY) {
    throw new Error(
      'Pharmacy search is not set up yet. Add EXPO_PUBLIC_GOOGLE_PLACES_API_KEY to the .env file and restart the app.'
    );
  }

  const controller = new AbortController();

  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const response = await fetch(`${BASE_URL}${endpoint}`, {
      method: 'POST',
      signal: controller.signal,
      headers: {
        'Content-Type': 'application/json',
        'X-Goog-Api-Key': API_KEY,
        'X-Goog-FieldMask': FIELD_MASK,
      },
      body: JSON.stringify(body),
    });

    const json = await response.json().catch(() => ({}));

    if (!response.ok) {
      throw new Error(json?.error?.message ?? `Google Places returned an error (${response.status}).`);
    }

    return json.places ?? [];
  } catch (error) {
    if (error?.name === 'AbortError') {
      throw new Error('The pharmacy search took too long. Check your connection and try again.');
    }

    throw error;
  } finally {
    clearTimeout(timeout);
  }
}

function circle(location, radius) {
  return {
    circle: {
      center: { latitude: location.latitude, longitude: location.longitude },
      radius,
    },
  };
}

function finish(places, origin) {
  return places
    .map((place) => normalisePlace(place, origin))
    .filter((place) => !place.isClosedPermanently)
    .sort((a, b) => (a.distanceMeters ?? Infinity) - (b.distanceMeters ?? Infinity));
}

// Pharmacies closest to the member.
export async function searchNearbyPharmacies(location, radius = DEFAULT_RADIUS_METERS) {
  const places = await callPlaces(':searchNearby', {
    includedTypes: ['pharmacy'],
    maxResultCount: MAX_RESULTS,
    rankPreference: 'DISTANCE',
    languageCode: 'en',
    locationRestriction: circle(location, radius),
  });

  return finish(places, location);
}

// A name search ("Dis-Chem"), "open now", "24 hour pharmacy", and so on.
export async function searchPharmaciesByText(
  query,
  location,
  { openNow = false, radius = DEFAULT_RADIUS_METERS * 2 } = {}
) {
  const body = {
    textQuery: query,
    includedType: 'pharmacy',
    pageSize: MAX_RESULTS,
    languageCode: 'en',
  };

  if (location) {
    body.locationBias = circle(location, radius);
  }

  if (openNow) {
    body.openNow = true;
  }

  const places = await callPlaces(':searchText', body);

  return finish(places, location);
}

export function buildDirectionsUrl(place) {
  const destination = place.location
    ? `${place.location.latitude},${place.location.longitude}`
    : encodeURIComponent(place.fullAddress || place.name);

  return (
    `https://www.google.com/maps/dir/?api=1&destination=${destination}` +
    (place.id ? `&destination_place_id=${place.id}` : '')
  );
}
