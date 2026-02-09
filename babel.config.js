module.exports = function(api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    // Adăugăm direct și plugin-ul de reanimated
    plugins: ['react-native-reanimated/plugin'],
  };
};