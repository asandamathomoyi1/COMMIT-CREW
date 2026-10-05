import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
} from 'react-native';

// ---------------------------------------------------------------------------
// TEMPORARY MOCK DATA
// Replace this with a fetch from your database (e.g. Firestore collection
// "pharmacyDeals" or a REST endpoint). Keep the same field names below and
// the rest of the screen works unchanged.
// ---------------------------------------------------------------------------
const MOCK_DEALS = [
  {
    id: '1',
    pharmacyName: 'Clicks Pharmacy',
    discount: '10% off selected medication',
    distanceKm: 2.3,
    isPromoted: true,
  },
  {
    id: '2',
    pharmacyName: 'Dis-Chem',
    discount: '15% off vitamins & supplements',
    distanceKm: 3.8,
    isPromoted: true,
  },
  {
    id: '3',
    pharmacyName: 'Local Care Pharmacy',
    discount: 'Free delivery on repeat prescriptions',
    distanceKm: 1.1,
    isPromoted: false,
  },
  {
    id: '4',
    pharmacyName: 'MediWell Pharmacy',
    discount: '5% off chronic medication',
    distanceKm: 4.6,
    isPromoted: false,
  },
];

function DealCard({ deal, onViewDeal }) {
  return (
    <View style={[styles.card, deal.isPromoted && styles.cardPromoted]}>
      {deal.isPromoted && (
        <View style={styles.promotedBadge}>
          <Text style={styles.promotedBadgeText}>PROMOTED</Text>
        </View>
      )}

      <View style={styles.cardHeader}>
        <View style={styles.pharmacyIcon}>
          <Text style={styles.pharmacyIconText}></Text>
        </View>
        <View style={styles.cardHeaderText}>
          <Text style={styles.pharmacyName}>{deal.pharmacyName}</Text>
          <Text style={styles.distanceText}>{deal.distanceKm} km away</Text>
        </View>
      </View>

      <Text style={styles.dealText}>{deal.discount}</Text>

      <TouchableOpacity
        style={styles.viewDealButton}
        onPress={() => onViewDeal(deal)}
      >
        <Text style={styles.viewDealText}>View Deal</Text>
      </TouchableOpacity>
    </View>
  );
}

export default function PharmacyDealsScreen({ navigation }) {
  const [deals] = useState(MOCK_DEALS);

  // Promoted (paid) deals surface first, then the rest ordered by distance.
  const sortedDeals = useMemo(() => {
    return [...deals].sort((a, b) => {
      if (a.isPromoted !== b.isPromoted) return a.isPromoted ? -1 : 1;
      return a.distanceKm - b.distanceKm;
    });
  }, [deals]);

  const handleViewDeal = (deal) => {
    // Navigate to a deal detail screen once you build one, e.g.:
    // navigation.navigate('DealDetail', { dealId: deal.id });
    console.log('View deal pressed:', deal.pharmacyName);
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Pharmacy Deals</Text>
        <Text style={styles.headerSubtitle}>
          Special offers from pharmacies near you
        </Text>
      </View>

      <FlatList
        data={sortedDeals}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        renderItem={({ item }) => (
          <DealCard deal={item} onViewDeal={handleViewDeal} />
        )}
        ListEmptyComponent={
          <Text style={styles.emptyText}>No deals nearby right now.</Text>
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 12,
  },
  headerTitle: {
    fontSize: 26,
    fontWeight: 'bold',
    color: '#1a2a3a',
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#7a8a9a',
    marginTop: 4,
  },
  listContent: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 16,
    marginBottom: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
    elevation: 3,
  },
  cardPromoted: {
    borderWidth: 1.5,
    borderColor: '#4a90d9',
  },
  promotedBadge: {
    position: 'absolute',
    top: 12,
    right: 12,
    backgroundColor: '#4a90d9',
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  promotedBadgeText: {
    color: '#ffffff',
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  pharmacyIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#f0f7ff',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  pharmacyIconText: {
    fontSize: 20,
  },
  cardHeaderText: {
    flex: 1,
  },
  pharmacyName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1a2a3a',
  },
  distanceText: {
    fontSize: 12,
    color: '#a0aec0',
    marginTop: 2,
  },
  dealText: {
    fontSize: 15,
    color: '#2ecc71',
    fontWeight: '600',
    marginBottom: 14,
  },
  viewDealButton: {
    backgroundColor: '#4a90d9',
    borderRadius: 10,
    paddingVertical: 10,
    alignItems: 'center',
  },
  viewDealText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
  },
  emptyText: {
    textAlign: 'center',
    color: '#a0aec0',
    marginTop: 40,
  },
});