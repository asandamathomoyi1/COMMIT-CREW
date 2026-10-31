import React from 'react';

import { Pressable, StyleSheet, View } from 'react-native';

import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';

import { Ionicons } from '@expo/vector-icons';

import HomeScreen from '../screens/HomeScreen';
import MedicationsScreen from '../screens/MedicationsScreen';
import HistoryScreen from '../screens/HistoryScreen';
import CommunityScreen from '../screens/CommunityScreen';
import ProfileScreen from '../screens/ProfileScreen';

import { colors } from '../theme/colors';

const Tab = createBottomTabNavigator();

function AddPlaceholder() {
  return <View style={styles.placeholder} />;
}

export default function MainTabs({ navigation }) {
  return (
    <Tab.Navigator
      initialRouteName="Home"
      screenOptions={({ route }) => ({
        headerShown: false,

        tabBarActiveTintColor: colors.primary,

        tabBarInactiveTintColor: colors.textLight,

        tabBarHideOnKeyboard: true,

        tabBarStyle: styles.tabBar,

        tabBarItemStyle: styles.tabBarItem,

        tabBarLabelStyle: styles.tabBarLabel,

        tabBarIcon: ({ color, focused }) => {
          let iconName;

          switch (route.name) {
            case 'Home':
              iconName = focused ? 'home' : 'home-outline';
              break;

            case 'Medications':
              iconName = focused ? 'medical' : 'medical-outline';
              break;

            case 'History':
              iconName = focused ? 'time' : 'time-outline';
              break;

            case 'Community':
              iconName = focused ? 'people' : 'people-outline';
              break;

            case 'Profile':
              iconName = focused ? 'person' : 'person-outline';
              break;

            default:
              iconName = 'add';
          }

          return <Ionicons name={iconName} size={21} color={color} />;
        },
      })}
    >
      <Tab.Screen name="Home" component={HomeScreen} />

      <Tab.Screen
        name="Medications"
        component={MedicationsScreen}
        options={{
          tabBarLabel: 'Meds',
        }}
      />

      <Tab.Screen
        name="Add"
        component={AddPlaceholder}
        options={{
          tabBarLabel: '',
          tabBarIcon: () => null,

          tabBarButton: () => (
            <View style={styles.addButtonContainer}>
              <Pressable
                onPress={() => navigation.navigate('AddMedication')}
                style={({ pressed }) => [styles.addButton, pressed && styles.addButtonPressed]}
              >
                <Ionicons name="add" size={31} color={colors.white} />
              </Pressable>
            </View>
          ),
        }}
      />

      <Tab.Screen name="History" component={HistoryScreen} />

      <Tab.Screen
        name="Community"
        component={CommunityScreen}
        options={{
          tabBarLabel: 'Community',
        }}
      />

      <Tab.Screen name="Profile" component={ProfileScreen} />
    </Tab.Navigator>
  );
}

const styles = StyleSheet.create({
  placeholder: {
    flex: 1,
    backgroundColor: colors.background,
  },

  tabBar: {
    height: 78,

    paddingTop: 7,
    paddingBottom: 10,

    backgroundColor: colors.white,

    borderTopWidth: 1,
    borderTopColor: colors.border,

    elevation: 14,

    shadowColor: colors.black,

    shadowOffset: {
      width: 0,
      height: -4,
    },

    shadowOpacity: 0.06,
    shadowRadius: 10,
  },

  tabBarItem: {
    paddingHorizontal: 0,
  },

  tabBarLabel: {
    fontSize: 10,
    fontWeight: '700',
    marginTop: 1,
  },

  addButtonContainer: {
    flex: 1,

    alignItems: 'center',
    justifyContent: 'center',
  },

  addButton: {
    width: 56,
    height: 56,

    borderRadius: 19,

    backgroundColor: colors.primary,

    alignItems: 'center',
    justifyContent: 'center',

    marginTop: -24,

    borderWidth: 4,
    borderColor: colors.background,

    shadowColor: colors.primary,

    shadowOffset: {
      width: 0,
      height: 7,
    },

    shadowOpacity: 0.28,
    shadowRadius: 10,

    elevation: 9,
  },

  addButtonPressed: {
    opacity: 0.85,

    transform: [
      {
        scale: 0.94,
      },
    ],
  },
});
