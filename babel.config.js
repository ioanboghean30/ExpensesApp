module.exports = function (api) {
  api.cache(true);
  return {
    presets: ["babel-preset-expo"],
    // Keep Reanimated plugin enabled for animations.
    plugins: ["react-native-reanimated/plugin"],
  };
};
