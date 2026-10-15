module.exports = ({ config }) => {
  const googleMapsApiKey = process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY || '';

  return {
    ...config,
    ios: {
      ...config.ios,
      config: {
        ...config.ios?.config,
        googleMapsApiKey,
      },
    },
    android: {
      ...config.android,
      config: {
        ...config.android?.config,
        googleMaps: {
          ...config.android?.config?.googleMaps,
          apiKey: googleMapsApiKey,
        },
      },
    },
    plugins: (config.plugins || []).map((plugin) => {
      if (Array.isArray(plugin) && plugin[0] === 'react-native-maps') {
        return [
          'react-native-maps',
          {
            ...plugin[1],
            androidGoogleMapsApiKey: googleMapsApiKey,
          },
        ];
      }
      return plugin;
    }),
  };
};
