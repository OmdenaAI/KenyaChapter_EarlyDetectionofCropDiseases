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


def get_efficientdet_tflite():
    import tensorflow as tf

    efficientdet_labelmap_path = f"{MODEL_ASSETS_PATH}/efficientdet-labelmap.txt"
    efficientdet_labelmap = read_labelmap_file(efficientdet_labelmap_path)

    efficientdet_model_path = f"{MODEL_ASSETS_PATH}/efficientdet.tflite"
    efficientdet_interpreter = tf.lite.Interpreter(efficientdet_model_path)
    efficientdet_interpreter.allocate_tensors()
    return efficientdet_interpreter, efficientdet_labelmap


def test_efficientdet_tflite(
    img: str | Image.Image, efficientdet_interpreter, efficientdet_labelmap
):
    out_box, out_class, out_score, *_ = call_inference(img, efficientdet_interpreter)
    return out_box[0], efficientdet_labelmap[int(out_class[0])], out_score[0]


def get_mobilenetv3_tflite():
    import tensorflow as tf

    mobilenetv3_labelmap_path = f"{MODEL_ASSETS_PATH}/mobilenetv3-labelmap.txt"
    mobilenetv3_labelmap = read_labelmap_file(mobilenetv3_labelmap_path)

    mobilenetv3_model_path = f"{MODEL_ASSETS_PATH}/mobilenetv3.tflite"
    mobilenetv3_interpreter = tf.lite.Interpreter(mobilenetv3_model_path)
    mobilenetv3_interpreter.allocate_tensors()
    return mobilenetv3_interpreter, mobilenetv3_labelmap


def test_mobilenetv3_tflite(
    img: str | Image.Image, mobilenetv3_interpreter, mobilenetv3_labelmap
):
    outputs = call_inference(img, mobilenetv3_interpreter)
    return mobilenetv3_labelmap[np.argmax(outputs[0])]


if __name__ == "__main__":
    args = parser.parse_args()
    img_path, model = args.img_path, args.model
    match model:
        case "mobilenetv3":
            out = test_mobilenetv3_tflite(img_path, *get_mobilenetv3_tflite())
            print(out)
        case "efficientdet":
            out = test_efficientdet_tflite(img_path, *get_efficientdet_tflite())
            print(out)
    print("completed")
