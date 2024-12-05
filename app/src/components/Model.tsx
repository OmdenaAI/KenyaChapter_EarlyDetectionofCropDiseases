import { Tensor, TensorflowModel } from "react-native-fast-tflite";
import { Asset } from "expo-asset";
import { readAsStringAsync } from "expo-file-system";
import { ImageManipulator, SaveFormat } from "expo-image-manipulator";
import ReactNativeBlobUtil from "react-native-blob-util";
import jpeg from "jpeg-js";

type TypedArray = Float32Array | Uint8Array;
export type ModelDetection = {
	box: number[];
	score: number;
	classIdx: number;
	className?: string;
};

type ImageSize = {
	width: number;
	height: number;
};

export function tensorToString(tensor: Tensor): string {
	return `\n  - ${tensor.dataType} ${tensor.name}[${tensor.shape}]`;
}

export function modelToString(model: TensorflowModel): string {
	return !model
		? "TFLite Model not loaded"
		: `TFLite Model (${model.delegate}):\n` +
				`- Inputs: ${model.inputs.map(tensorToString).join("")}\n` +
				`- Outputs: ${model.outputs.map(tensorToString).join("")}`;
}

export const detectionModelPostProcess = (
	inference_results: any[]
): ModelDetection[] => {
	let detections: ModelDetection[] = [];
	let [boxes, classes, scores, num_detections] = inference_results;
	num_detections = num_detections[0] ?? 0;

	for (let i = 0, idx = 0; i < num_detections; i++, idx += 4) {
		detections.push({
			box: [boxes[idx], boxes[idx + 1], boxes[idx + 2], boxes[idx + 3]],
			score: scores[i],
			classIdx: classes[i],
		});
	}

	return detections;
};

export const fetch_labels = async (labels_path: any) => {
	const { localUri } = await Asset.fromModule(labels_path).downloadAsync();
	if (!localUri) {
		console.log("[MyErrLog-labels] Loading labels failed");
		return "";
	}
	return await readAsStringAsync(localUri);
};

export const convert_img_arr_to_float = (
	image: TypedArray | null
): Float32Array | null => {
	if (!image || !(image instanceof Uint8Array)) return image;
	return Float32Array.from(image).map((v) => v / 255);
};

export const convert_img_arr_to_int = (
	image: TypedArray | null
): Uint8Array | null => {
	if (!image || !(image instanceof Float32Array)) return image;
	return Uint8Array.from(image.map((v) => v * 255));
};

export const remove_alpha_channel = (
	image_arr: TypedArray | null,
	channel: number = 3
) => {
	if (
		!image_arr ||
		// alpha channel is either first or last channel; 0 or 3
		(channel != 0 && channel != 3) ||
		(!(image_arr instanceof Float32Array) &&
			!(image_arr instanceof Uint8Array)) ||
		image_arr.length % 4 != 0 // array size is invalid as a 4 channel data
	) {
		console.log("[MyErrLog-removeAlpha] invalid image data");
		return image_arr;
	}

	const result: any[] = Array((image_arr.length / 4) * 3);
	let res_itr = 0;
	if (channel == 0) {
		for (let i = 0; i < image_arr.length; i += 4)
			for (let j = 1; j < 4; ++j) {
				result[res_itr++] = image_arr[i + j];
			}
	} else {
		for (let i = 0; i < image_arr.length; i += 4)
			for (let j = 0; j < 3; ++j) {
				result[res_itr++] = image_arr[i + j];
			}
	}

	return image_arr instanceof Float32Array
		? new Float32Array(result)
		: new Uint8Array(result);
};

export const get_img_model_input = async (
	img_uri: any,
	img_size: ImageSize,
	input_type_float: boolean
) => {
	if (!img_uri) return console.log("[MyErrLog-imgInput]");

	const resized_img_ref = await ImageManipulator.manipulate(img_uri)
		.resize(img_size)
		.renderAsync();
	if (!resized_img_ref)
		return console.log("[MyErrLog-imgInput]", resized_img_ref);

	const resized_img = await resized_img_ref.saveAsync({
		format: SaveFormat.JPEG,
		compress: 0.9,
	});
	if (!resized_img) return console.log("[MyErrLog-imgInput]", resized_img);

	const resized_img_data = await ReactNativeBlobUtil.fs.readFile(
		resized_img.uri,
		"ascii"
	);
	if (!resized_img_data)
		return console.log("[MyErrLog-imgInput]", resized_img_data);

	let resized_img_arr = jpeg.decode(resized_img_data, {
		useTArray: true,
	}).data;
	if (!resized_img_arr)
		return console.log("[MyErrLog-imgInput]", resized_img_arr);

  // handling default use case; RGBA
	const rgb_image_arr = remove_alpha_channel(resized_img_arr, 3);
	if (!rgb_image_arr)
		return console.log("[MyErrLog-imgInput] bad rgb_image_arr");

	let out_img_arr = rgb_image_arr;
	if (input_type_float && rgb_image_arr instanceof Uint8Array) {
		const rgb_img_flt = convert_img_arr_to_float(rgb_image_arr);
		if (!rgb_img_flt) return console.log("[MyErrLog-inputImg] bad floatImg");
		out_img_arr = rgb_img_flt;
	} else if (!input_type_float && rgb_image_arr instanceof Float32Array) {
		const rgb_img_int = convert_img_arr_to_int(rgb_image_arr);
		if (!rgb_img_int) return console.log("[MyErrLog-inputImg] bad intImg");
		out_img_arr = rgb_img_int;
	}

	return out_img_arr;
};

export const argMax = (arr: Float32Array) => {
	if (arr.length === 0) return -1;

	let maxIndex = 0;
	for (let i = 1; i < arr.length; i++)
		if (arr[i] > arr[maxIndex]) {
			maxIndex = i;
		}
	return maxIndex;
};
