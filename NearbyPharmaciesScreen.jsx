import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  FlatList,
  ActivityIndicator,
  Linking,
} from 'react-native';
import * as Location from 'expo-location';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';

const GOOGLE_PLACES_API_KEY = process.env.EXPO_PUBLIC_GOOGLE_PLACES_API_KEY;

export default function NearbyPharmaciesScreen({ navigation }) {
  const [loading, setLoading] = useState(false);
  const [pharmacies, setPharmacies] = useState([]);
  const [errorMsg, setErrorMsg] = useState(null);
  const [hasSearched, setHasSearched] = useState(false);
  const [searchText, setSearchText] = useState('');

  const mapResults = (results) =>
    results.map((place) => ({
      id: place.place_id,
      name: place.name,
      address: place.vicinity || place.formatted_address,
      openNow: place.opening_hours?.open_now,
      rating: place.rating,
      lat: place.geometry?.location?.lat,
      lng: place.geometry?.location?.lng,
    }));

  const handleFindNearMe = async () => {
    setLoading(true);
    setErrorMsg(null);

    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        setErrorMsg('Location permission is needed to find nearby pharmacies.');
        setLoading(false);
        return;
      }

      const location = await Location.getCurrentPositionAsync({});
      const { latitude, longitude } = location.coords;

      const url =
        `https://maps.googleapis.com/maps/api/place/nearbysearch/json` +
        `?location=${latitude},${longitude}` +
        `&radius=3000` +
        `&type=pharmacy` +
        `&key=${GOOGLE_PLACES_API_KEY}`;

      const response = await fetch(url);
      const data = await response.json();

      if (data.status !== 'OK' && data.status !== 'ZERO_RESULTS') {
        throw new Error(data.error_message || data.status);
      }

      setPharmacies(mapResults(data.results || []));
      setHasSearched(true);
    } catch (err) {
      console.log('Pharmacy search failed:', err);
      setErrorMsg('Something went wrong finding pharmacies. Check your connection and try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleSearchByText = async () => {
    if (!searchText.trim()) return;

    setLoading(true);
    setErrorMsg(null);

    try {
      const query = encodeURIComponent(`pharmacy near ${searchText}`);
      const url =
        `https://maps.googleapis.com/maps/api/place/textsearch/json` +
        `?query=${query}` +
        `&key=${GOOGLE_PLACES_API_KEY}`;

      const response = await fetch(url);
      const data = await response.json();

      if (data.status !== 'OK' && data.status !== 'ZERO_RESULTS') {
        throw new Error(data.error_message || data.status);
      }

      setPharmacies(mapResults(data.results || []));
      setHasSearched(true);
    } catch (err) {
      console.log('Pharmacy search failed:', err);
      setErrorMsg('Something went wrong finding pharmacies. Check your connection and try again.');
    } finally {
      setLoading(false);
    }
  };

  const openInMaps = (item) => {
    const url = `https://www.google.com/maps/search/?api=1&query=${item.lat},${item.lng}`;
    Linking.openURL(url);
  };

  return (
    <SafeAreaView style={styles.container}>
      <LinearGradient
        colors={['#2F8FF3', '#1F6FE0']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.header}
      >
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
          activeOpacity={0.7}
        >
          <Ionicons name="arrow-back" size={22} color="#FFFFFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Nearby Pharmacies</Text>
        <Text style={styles.headerSubtitle}>
          Search a pharmacy close to you
        </Text>
      </LinearGradient>

      <View style={styles.body}>
        <View style={styles.searchRow}>
          <TextInput
            style={styles.searchInput}
            placeholder="Search by area, suburb, or pharmacy name"
            placeholderTextColor="#9CA3AF"
            value={searchText}
            onChangeText={setSearchText}
            onSubmitEditing={handleSearchByText}
            returnKeyType="search"
          />
          <TouchableOpacity
            style={styles.searchButton}
            onPress={handleSearchByText}
            disabled={loading}
          >
            <Ionicons name="search" size={18} color="#FFFFFF" />
          </TouchableOpacity>
        </View>

        {errorMsg && (
          <View style={styles.errorCard}>
            <Text style={styles.errorText}>{errorMsg}</Text>
          </View>
        )}

        {!hasSearched ? (
          <View style={styles.centerContent}>
            <View style={styles.iconCircle}>
              <Ionicons name="location-outline" size={40} color="#3B82F6" />
            </View>

            <Text style={styles.question}>Running low on medication?</Text>
            <Text style={styles.subtext}>
              Search above, or use your current location instead.
            </Text>

            <TouchableOpacity
              style={styles.button}
              onPress={handleFindNearMe}
              activeOpacity={0.85}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text style={styles.buttonText}>📍 Use My Current Location</Text>
              )}
            </TouchableOpacity>
          </View>
        ) : (
          <>
            <View style={styles.resultActions}>
              <TouchableOpacity onPress={handleFindNearMe} style={styles.refreshRow}>
                <Ionicons name="locate" size={16} color="#2F8FF3" />
                <Text style={styles.refreshText}>Use my location instead</Text>
              </TouchableOpacity>
            </View>

            <FlatList
              data={pharmacies}
              keyExtractor={(item) => item.id}
              contentContainerStyle={{ paddingBottom: 24 }}
              ListEmptyComponent={
                <Text style={styles.subtext}>No pharmacies found.</Text>
              }
              renderItem={({ item }) => (
                <TouchableOpacity style={styles.resultCard} onPress={() => openInMaps(item)}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.resultName}>{item.name}</Text>
                    <Text style={styles.resultAddress}>{item.address}</Text>
                  </View>
                  {item.openNow !== undefined && (
                    <View
                      style={[
                        styles.statusPill,
                        { backgroundColor: item.openNow ? '#E3F5E9' : '#FCE8E6' },
                      ]}
                    >
                      <Text
                        style={[
                          styles.statusPillText,
                          { color: item.openNow ? '#1E8E4E' : '#C5221F' },
                        ]}
                      >
                        {item.openNow ? 'Open' : 'Closed'}
                      </Text>
                    </View>
                  )}
                </TouchableOpacity>
              )}
            />
          </>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFFFFF' },
  header: {
    paddingTop: 24,
    paddingBottom: 28,
    paddingHorizontal: 20,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
  },
  backButton: {
    marginBottom: 10,
  },
  headerTitle: { fontSize: 24, fontWeight: '700', color: '#FFFFFF' },
  headerSubtitle: { fontSize: 13, color: '#DCEBFD', marginTop: 4 },
  body: { flex: 1, paddingHorizontal: 20 },
  searchRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 20,
  },
  searchInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 13,
    color: '#1F2937',
  },
  searchButton: {
    width: 46,
    height: 46,
    borderRadius: 14,
    backgroundColor: '#2F8FF3',
    alignItems: 'center',
    justifyContent: 'center',
  },
  errorCard: { backgroundColor: '#FCE8E6', borderRadius: 12, padding: 12, marginTop: 12 },
  errorText: { color: '#C5221F', fontSize: 12.5 },
  centerContent: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingBottom: 80 },
  iconCircle: {
    width: 84,
    height: 84,
    borderRadius: 42,
    backgroundColor: '#E6F0FE',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  question: { fontSize: 17, fontWeight: '700', color: '#1F2937', marginBottom: 6 },
  subtext: {
    fontSize: 13,
    color: '#9CA3AF',
    textAlign: 'center',
    paddingHorizontal: 30,
    marginBottom: 24,
  },
  button: {
    backgroundColor: '#2F8FF3',
    paddingVertical: 14,
    paddingHorizontal: 28,
    borderRadius: 14,
    minWidth: 200,
    alignItems: 'center',
  },
  buttonText: { color: '#FFFFFF', fontWeight: '700', fontSize: 15 },
  resultActions: { marginTop: 16, marginBottom: 4 },
  refreshRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  refreshText: { color: '#2F8FF3', fontWeight: '600', fontSize: 13 },
  resultCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 14,
    padding: 13,
    marginBottom: 10,
  },
  resultName: { fontSize: 14, fontWeight: '700', color: '#1F2937', marginBottom: 2 },
  resultAddress: { fontSize: 12, color: '#9CA3AF' },
  statusPill: { borderRadius: 999, paddingHorizontal: 10, paddingVertical: 4, marginLeft: 8 },
  statusPillText: { fontSize: 11, fontWeight: '700' },
});