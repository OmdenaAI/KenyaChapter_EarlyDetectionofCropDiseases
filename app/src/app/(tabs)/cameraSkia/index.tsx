import React, { useState, useEffect } from "react";
import { StyleSheet, View } from "react-native";
import {
	Camera,
	useCameraDevice,
	useCameraPermission,
	useFrameProcessor,
	runAtTargetFps,
} from "react-native-vision-camera";
import { Options, useResizePlugin } from "vision-camera-resize-plugin";
import { useSharedValue } from "react-native-reanimated";
import {
	Skia,
	useImage,
	Image,
	SkData,
	Canvas,
	SkImage,
} from "@shopify/react-native-skia";
import { useRunOnJS } from "react-native-worklets-core";
import { createSkiaImageFromData } from "./utils";

import {
	Tensor,
	TensorflowModel,
	useTensorflowModel,
} from "react-native-fast-tflite";
import { Label } from "./component-label";

import { Asset } from "expo-asset";
import { readAsStringAsync } from "expo-file-system";

type PixelFormat = Options<"uint8">["pixelFormat"];

const WIDTH = 384;
const HEIGHT = 384;
const TARGET_TYPE = "uint8";
const TARGET_FORMAT: PixelFormat = "abgr";
const TARGET_FPS = 5;

const ASSETS_PATH = "@/assets/models/";
const MODELS = [
	{
		model: require(ASSETS_PATH + "mobilenet3.tflite"),
		labels: require(ASSETS_PATH + "mobilenet_ImageNetLabels.txt"),
		// labels_path: "mobilenet_ImageNetLabels.txt",
	},
	{
		model: require(ASSETS_PATH + "efficientdet.tflite"),
		labels: require(ASSETS_PATH + "efficientdet-coco-labels-2014_2017.txt"),
		// labels_path: "efficientdet-coco-labels-2014_2017.txt",
	},
];
const model_idx = 1;
const MODEL = MODELS[model_idx].model;
const LABELS = MODELS[model_idx].labels;
// const LABELS_PATH = ASSETS_PATH + MODELS[model_idx].labels_path;

function tensorToString(tensor: Tensor): string {
	return `\n  - ${tensor.dataType} ${tensor.name}[${tensor.shape}]`;
}

function modelToString(model: TensorflowModel): string {
	return (
		`TFLite Model (${model.delegate}):\n` +
		`- Inputs: ${model.inputs.map(tensorToString).join("")}\n` +
		`- Outputs: ${model.outputs.map(tensorToString).join("")}`
	);
}

type ModelDetection = {
	box: number[];
	score: number;
	classIdx: number;
	className?: string;
};

const postProcess = (inference_results: any[]): ModelDetection[] => {
	let detections: ModelDetection[] = [];
	let [boxes, classes, scores, num_detections] = inference_results;
	num_detections = num_detections[0] ?? 0;
	console.log("num_detections:", num_detections);

	for (let i = 0; i < num_detections; i++) {
		const idx = i * 4;
		detections.push({
			box: [boxes[idx], boxes[idx + 1], boxes[idx + 2], boxes[idx + 3]],
			score: scores[i],
			classIdx: classes[i],
		});
	}

	return detections;
};

const fetch_labels = async () => {
	const { localUri } = await Asset.fromModule(LABELS).downloadAsync();
	if (!localUri) {
		console.log("[WEEWA - WEEWA] LOAD LABELS FAILED");
		return "";
	}
	return await readAsStringAsync(localUri);
};

export default function App() {
	const permission = useCameraPermission();
	const previewImage = useSharedValue<SkImage | null>(null);

	useEffect(() => {
		permission.requestPermission();
	}, [permission]);

	let currentLabel = useSharedValue("");
	const model = useTensorflowModel(MODEL);
	const actual_model = model.state === "loaded" ? model.model : undefined;
	const img_input = useImage(require("@/assets/images/robot.512.png"));
	let [labels_map, set_labels_map] = useState<string[] | null>(null);

	if (!labels_map)
		fetch_labels()
			.then((data: string) => console.log(set_labels_map(data.split("\n"))))
			.catch((e) => console.log("[WEEWA - WEEWA] " + e));

	const { resize } = useResizePlugin();

	useEffect(() => {
		if (actual_model == null) return;
		console.log("printing the model after loading");
		// console.log("printing the model after loading" + actual_model);
		// console.log(`Model loaded! Shape:\n${modelToString(actual_model)}]`);

		// if (img_input == null) return;
		// // console.log(img_input);
		// console.log(img_input.getImageInfo());

		// console.log(labels_map);
		// if (labels_map == null) return;
		// console.log(labels_map);

		// // const result = resize(img_input, {
		// // 	scale: {
		// // 		// width: HEIGHT,
		// // 		// height: WIDTH,
		// // 		width: WIDTH,
		// // 		height: HEIGHT,
		// // 	},
		// // 	dataType: TARGET_TYPE,
		// // 	pixelFormat: TARGET_FORMAT,
		// // 	rotation: "90deg",
		// // });

		// const model_input = img_input.readPixels();
		// if (!model_input) return;

		// const model_results = actual_model?.runSync([model_input]);
		// // const model_results = actual_model?.runSync([result]);
		// if (!model_results) {
		// 	console.log("No inference results");
		// 	return;
		// }

		// console.log(model_results);
		// const inference_results = postProcess(model_results);
		// console.log(inference_results);
		// if (!inference_results.length) return;

		// currentLabel.value = labels_map[inference_results[0].classIdx];
	}, [actual_model, labels_map, img_input]);

	const device = useCameraDevice("front");
	const frameProcessor = useFrameProcessor((frame) => {
		"worklet";

		runAtTargetFps(TARGET_FPS, async () => {
			const result = resize(frame, {
				scale: {
					// width: HEIGHT,
					// height: WIDTH,
					width: WIDTH,
					height: HEIGHT,
				},
				dataType: TARGET_TYPE,
				pixelFormat: TARGET_FORMAT,
				rotation: "90deg",
			});
		});
	}, []);

	return (
		<View style={styles.container}>
			{/* {permission.hasPermission && device != null && (
				<Camera
					device={device}
					style={StyleSheet.absoluteFill}
					isActive={true}
					pixelFormat="yuv"
					frameProcessor={frameProcessor}
				/>
			)} */}
			<View style={styles.canvasWrapper}>
				<Label sharedValue={currentLabel} />
				<Canvas style={{ width: WIDTH, height: HEIGHT }}>
					<Image
						image={previewImage}
						// x={0}
						// y={0}
						width={WIDTH}
						height={HEIGHT}
						// fit="cover"
					/>
				</Canvas>
			</View>
		</View>
	);
}

const styles = StyleSheet.create({
	container: {
		flex: 1,
		alignItems: "center",
		justifyContent: "center",
	},
	canvasWrapper: {
		position: "absolute",
		top: "auto",
		left: "auto",
		// top: "43%",
		// left: "12%",
	},
});
