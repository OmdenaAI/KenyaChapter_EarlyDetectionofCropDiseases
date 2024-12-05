const MODELS = {
  'auto': {
    model: require("@/assets/models/auto-f16.tflite"),
    labels: require("@/assets/models/auto-labelmap.txt"),
  },
  'beans': {
    model: require("@/assets/models/beans-f16.tflite"),
    labels: require("@/assets/models/beans-labelmap.txt"),
  },
  'cassava': {
    model: require("@/assets/models/cassava-f16.tflite"),
    labels: require("@/assets/models/cassava-labelmap.txt"),
  },
  'maize': {
    model: require("@/assets/models/maize-f16.tflite"),
    labels: require("@/assets/models/maize-labelmap.txt"),
  },
  'tomato': {
    model: require("@/assets/models/tomato-f16.tflite"),
    labels: require("@/assets/models/tomato-labelmap.txt"),
  },
};

export default MODELS;
