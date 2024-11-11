module.exports = function (api) {
  api.cache(true);
  return {
    plugins: [
      ["react-native-worklets-core/plugin"],
    ],
    // module:metro-react-native-babel-preset
    presets: ['babel-preset-expo'],
  };
};
