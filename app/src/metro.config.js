const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);


// config.resolver.assetExts.push('tflite');
// config.resolver.assetExts.push('txt');

// module.exports = config;

module.exports = (async () => {
  const {
    resolver: { sourceExts, assetExts },
  } = await getDefaultConfig(__dirname);
  return {
    resolver: {
      assetExts: [
        ...assetExts,
        'tflite',
        'txt',
        'png',
        'jpg',
        'jpeg',
        'gif',
        'svg',
      ],
      sourceExts: sourceExts
    },
  };
})();
