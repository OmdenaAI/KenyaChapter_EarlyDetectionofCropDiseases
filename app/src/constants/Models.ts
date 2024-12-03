const MODELS = {
  'all': {
    model: require("@/assets/models/all-f16.tflite"),
    labels: require("@/assets/models/all-labelmap.txt"),
  },
  'beans': {
    model: require("@/assets/models/beans-f16.tflite"),
    labels: require("@/assets/models/beans-labelmap.txt"),
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
