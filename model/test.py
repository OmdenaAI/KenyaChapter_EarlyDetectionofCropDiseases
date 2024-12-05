import numpy as np
from PIL import Image

import argparse

parser = argparse.ArgumentParser()
parser.add_argument("-i", "--img-path", required=True)
parser.add_argument("-m", "--model", required=True)


MODEL_ASSETS_PATH = "../app/src/assets/models"


def read_labelmap_file(labelmap_path):
    with open(labelmap_path) as f:
        return [label.strip() for label in f.readlines()]


def call_inference(img: str | Image.Image, interpreter):
    if isinstance(img, str):
        img = Image.open(img).convert()
    elif not isinstance(img, Image.Image):
        raise TypeError("image arg provided is neither a string nor a PIL image")

    input_tensor_type = interpreter.get_input_details()[0]["dtype"]
    input_shape = list(interpreter.get_input_details()[0]["shape"][1:3])
    input_data = img.resize(input_shape)
    input_data = np.array(input_data, dtype=input_tensor_type)[None, ...]
    if input_tensor_type == np.float32:
        input_data /= 255
    interpreter.set_tensor(interpreter.get_input_details()[0]["index"], input_data)
    interpreter.invoke()
    return [
        interpreter.get_tensor(out_tensor["index"])[0]
        for out_tensor in interpreter.get_output_details()
    ]


def get_model_tflite(model_name):
    import tensorflow as tf

    labelmap_path = f"{MODEL_ASSETS_PATH}/{model_name}-labelmap.txt"
    labelmap = read_labelmap_file(labelmap_path)

    model_path = f"{MODEL_ASSETS_PATH}/{model_name}-f16.tflite"
    model_interpreter = tf.lite.Interpreter(model_path)
    model_interpreter.allocate_tensors()
    return model_interpreter, labelmap


def test_tflite(img: str | Image.Image, model_interpreter, labelmap):
    outputs = call_inference(img, model_interpreter)
    return labelmap[np.argmax(outputs[0])]


if __name__ == "__main__":
    args = parser.parse_args()
    img_path, model = args.img_path, args.model
    match model:
        case "auto":
            crop_type = test_tflite(img_path, *get_model_tflite(model))
            print(crop_type)
            disease = test_tflite(img_path, *get_model_tflite(crop_type))
            print(disease)

        case "beans" | "cassava" | "maize" | "tomato":
            disease = test_tflite(img_path, *get_model_tflite(model))
            print(disease)
    print("completed")
