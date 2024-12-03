import { Tensor, TensorflowModel } from "react-native-fast-tflite";
import { Asset } from "expo-asset";
import { readAsStringAsync } from "expo-file-system";
import {
	fitRects,
	ImageFormat,
	PaintStyle,
	PointMode,
	Skia,
	SkImage,
	SkSize,
	StrokeCap,
} from "@shopify/react-native-skia";

import RNFetchBlob from "rn-fetch-blob";

type TypedArray = Float32Array | Uint8Array;
export type ModelDetection = {
	box: number[];
	score: number;
	classIdx: number;
	className?: string;
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

export const draw_uint8_arr_to_skImg = (
	img_arr: Uint8Array,
	img_size: SkSize
) => {
	let channels = img_arr?.length / img_size.width / img_size.height;

	const surface = Skia.Surface.Make(img_size.width, img_size.height);
	let offset = 0;
	let pixel_color = null;
	for (let j = 0; j < img_size.height; ++j)
		for (let i = 0; i < img_size.width; ++i) {
			offset = j * img_size.width * channels + i * channels;
			const drawn_pixel = Skia.Paint();
			drawn_pixel.setStrokeCap(StrokeCap.Square);
			drawn_pixel.setStyle(PaintStyle.Fill);
			drawn_pixel.setStrokeWidth(2);
			pixel_color = Float32Array.from([
				// use 0-3 for the default use case of having only 3 channels after removing alpha
				img_arr[offset] / 255,
				img_arr[offset + 1] / 255,
				img_arr[offset + 2] / 255,

				// Alpha channel for Color Type 4 (RGBA_8888), or the default type for loaded & un-modified images
				// img_arr[offset + 3] / 255,
				1,
			]);
			drawn_pixel.setColor(pixel_color);

			surface
				?.getCanvas()
				.drawPoints(PointMode.Points, [{ y: j, x: i }], drawn_pixel);
		}

	return surface?.makeImageSnapshot();
};

export const write_skImage_to_file = (image: SkImage, img_path: string) => {
	const img_b64 = image.encodeToBase64(ImageFormat.JPEG, 100);
	RNFetchBlob.fs
		.writeFile(img_path, img_b64, "base64")
		.then((res) =>
			console.log(
				"[MyInfoLog-skiaImage] Image written successfully, file size = ",
				res
			)
		)
		.catch((e) => console.log("[MyErrLog-skiaImage]", e));
};

export const resize_skia_img = (image: SkImage, img_size: SkSize) => {
	const oldRect = Skia.XYWHRect(0, 0, image.width(), image.height());
	const newRect = Skia.XYWHRect(0, 0, img_size.width, img_size.height);
	const surface = Skia.Surface.Make(img_size.width, img_size.height);
	const { src, dst } = fitRects("cover", oldRect, newRect);
	surface?.getCanvas().drawImageRect(image, src, dst, Skia.Paint());
	const surfaceout = surface?.makeImageSnapshot();
	return surfaceout ?? image;
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
		console.log("[MyErrLog-skiaImage] invalid image data");
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

export const remove_skimage_alpha_channel = (image: SkImage) => {
	switch (image.getImageInfo().colorType) {
		// see here: https://github.com/Shopify/react-native-skia/blob/main/packages/skia/src/skia/types/Image/ColorType.ts
		case 3:
			return remove_alpha_channel(image.readPixels(), 0);
		case 4:
		case 6:
		case 7:
		case 8:
		case 12:
		case 13:
		case 15:
		case 16:
		case 18:
			return remove_alpha_channel(image.readPixels(), 3);
	}
};

export const get_img_model_input = async (
	img_input: any,
	img_size: SkSize,
	input_type_float: boolean
) => {
	if (!img_input) return console.log("[MyErrLog-imgInput]");
	return Skia.Data.fromURI(img_input)
		.then((imageData) => {
			const image = Skia.Image.MakeImageFromEncoded(imageData);
			if (!image) return console.log("[MyErrLog-skiaImage]");

			const resized_img = resize_skia_img(image, img_size);
			if (!resized_img) return console.log("[MyErrLog-skiaImage]");

			const rgb_image_arr = remove_skimage_alpha_channel(resized_img);
			if (!rgb_image_arr)
				return console.log("[MyErrLog-skiaImage] bad rgb_image_arr");

			let out_img_arr = rgb_image_arr;
			if (input_type_float && rgb_image_arr instanceof Uint8Array) {
				const rgb_img_flt = convert_img_arr_to_float(rgb_image_arr);
				if (!rgb_img_flt)
					return console.log("[MyErrLog-skiaImage] bad floatImg");
				out_img_arr = rgb_img_flt;
			} else if (!input_type_float && rgb_image_arr instanceof Float32Array) {
				const rgb_img_int = convert_img_arr_to_int(rgb_image_arr);
				if (!rgb_img_int) return console.log("[MyErrLog-skiaImage] bad intImg");
				out_img_arr = rgb_img_int;
			}

			return out_img_arr;
		})
		.catch((e) => console.log(`[MyErrLog-skiaModelInput] ${e}`));
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
