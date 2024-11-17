const MODELS = [
  {
    model: require("@/assets/models/mobilenet3.tflite"),
    labels: require("@/assets/models/mobilenet_ImageNetLabels.txt"),
  },
  {
    model: require("@/assets/models/efficientdet.tflite"),
    labels: require("@/assets/models/efficientdet-coco-labels-2014_2017.txt"),
  },
];

export default MODELS;
