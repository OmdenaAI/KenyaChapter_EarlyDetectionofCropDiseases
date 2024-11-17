import { Tensor, TensorflowModel } from "react-native-fast-tflite";
import { Asset } from "expo-asset";
import { readAsStringAsync } from "expo-file-system";
import { Skia, useImage } from "@shopify/react-native-skia";

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
	console.log("num_detections:", num_detections);

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
		console.log("[MyErrLog-1] Loading labels failed");
		return "";
	}
	return await readAsStringAsync(localUri);
};

export const get_img_model_input = async (img_input: any) => {
	if (!img_input) return console.log("MyErrLog-6");
	console.log(`get_img_model_input step 1: ${img_input}`);
	return Skia.Data.fromURI(img_input)
		.then((imageData) => {
			console.log(`get_img_model_input step 2: ${JSON.stringify(imageData)}`);
			const image = Skia.Image.MakeImageFromEncoded(imageData);
			if (!image) return console.log("MyErrLog-5");
			console.log(`img loading done, image[0] = ${image.readPixels()?.[0]}`);
			return image.readPixels();
		})
		.catch((e) => console.log(`MyErrLog-4 ${e}`));
};
